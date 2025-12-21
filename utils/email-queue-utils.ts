import { EmailQueue } from "../models/EmailQueue";
import { mailTransporter, getEnvVar } from "./misc-utils";
import mongoose from "mongoose";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: Array<
    { path: string } | { filename: string; content: string | Buffer }
  >;
  priority?: boolean;
}

interface RateLimitConfig {
  maxEmailsPerHour: number;
  maxEmailsPerDay: number;
}

export class EmailQueueService {
  private rateLimitConfig: RateLimitConfig;

  constructor(config?: RateLimitConfig) {
    // Default limits for typical personal email accounts (adjust to your limits)
    this.rateLimitConfig = config || {
      maxEmailsPerHour: 50, // Adjust to your provider's limit
      maxEmailsPerDay: 200, // Adjust to your provider's limit
    };
  }

  /**
   * Add email to queue
   */
  async queueEmail(emailOptions: EmailOptions): Promise<void> {
    try {
      await EmailQueue.create({
        to: emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
        text: emailOptions.text || "",
        from: emailOptions.from || process.env.SMTP_FROM,
        attachments: emailOptions.attachments || [],
        priority: emailOptions.priority || false,
        status: "pending",
      });
      console.log(
        `Email queued: ${emailOptions.subject} to ${emailOptions.to}`
      );
    } catch (error) {
      console.error("Error queueing email:", error);
      throw error;
    }
  }

  /**
   * Check if we're within rate limits
   */
  async canSendEmail(): Promise<boolean> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Count emails sent in last hour
    const sentLastHour = await EmailQueue.countDocuments({
      status: "sent",
      sentAt: { $gte: oneHourAgo },
    });

    // Count emails sent in last 24 hours
    const sentLastDay = await EmailQueue.countDocuments({
      status: "sent",
      sentAt: { $gte: oneDayAgo },
    });

    console.log(
      `Rate check: ${sentLastHour}/${this.rateLimitConfig.maxEmailsPerHour} per hour, ${sentLastDay}/${this.rateLimitConfig.maxEmailsPerDay} per day`
    );

    return (
      sentLastHour < this.rateLimitConfig.maxEmailsPerHour &&
      sentLastDay < this.rateLimitConfig.maxEmailsPerDay
    );
  }

  /**
   * Process email queue - send pending emails if within limits
   */
  async processQueue(): Promise<{
    sent: number;
    failed: number;
    skipped: number;
  }> {
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    try {
      // First, reset any stuck "processing" emails (older than 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      await EmailQueue.updateMany(
        {
          status: "processing",
          createdAt: { $lt: fiveMinutesAgo },
        },
        { $set: { status: "pending" } }
      );

      // Get pending emails that are due
      const pendingEmails = await EmailQueue.find({
        status: "pending",
        scheduledFor: { $lte: new Date() },
        attempts: { $lt: 3 }, // Or whatever your maxAttempts default is
      })
        .sort({ priority: -1, createdAt: 1 }) // Priority emails first, then oldest first
        .limit(10); // Process max 10 emails at a time

      if (pendingEmails.length === 0) {
        return { sent, failed, skipped };
      }

      console.log(`Processing ${pendingEmails.length} pending emails`);

      for (const emailDoc of pendingEmails) {
        // Check rate limits before each send
        if (!(await this.canSendEmail())) {
          console.log("Rate limit reached, stopping queue processing");
          skipped = pendingEmails.length - sent - failed;
          break;
        }

        try {
          // Atomically mark as processing to prevent race conditions
          const updateResult = await EmailQueue.updateOne(
            { _id: emailDoc._id, status: "pending" },
            { $set: { status: "processing" } }
          );

          // If no document was updated, another process is handling it
          if (updateResult.modifiedCount === 0) {
            console.log(`Email already being processed: ${emailDoc.subject}`);
            skipped++;
            continue;
          }

          // Send email
          await mailTransporter.sendMail({
            from: emailDoc.from,
            to: emailDoc.to,
            subject: emailDoc.subject,
            html: emailDoc.html,
            text: emailDoc.text,
            attachments: emailDoc.attachments || [],
          });

          // Mark as sent atomically
          await EmailQueue.updateOne(
            { _id: emailDoc._id },
            { $set: { status: "sent", sentAt: new Date() } }
          );

          sent++;
          console.log(`✓ Email sent: ${emailDoc.subject} to ${emailDoc.to}`);
        } catch (error: any) {
          // Update attempts and error atomically
          const currentAttempts = emailDoc.attempts + 1;
          const updateData: any = {
            $set: {
              attempts: currentAttempts,
              error: error.message || String(error),
            },
          };

          // Mark as failed if max attempts reached
          if (currentAttempts >= emailDoc.maxAttempts) {
            updateData.$set.status = "failed";
            console.error(
              `✗ Email failed permanently: ${emailDoc.subject} to ${emailDoc.to}`
            );
          } else {
            updateData.$set.status = "pending"; // Reset to pending for retry
            console.error(
              `✗ Email attempt ${currentAttempts} failed: ${emailDoc.subject}`
            );
          }

          await EmailQueue.updateOne({ _id: emailDoc._id }, updateData);
          failed++;
        }

        // Small delay between emails to avoid triggering spam filters
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error("Error processing email queue:", error);
    }

    return { sent, failed, skipped };
  }

  /**
   * Get queue statistics
   * @param verbose - If true, include detailed list of pending emails
   */
  async getQueueStats(verbose: boolean = false) {
    const pending = await EmailQueue.countDocuments({ status: "pending" });
    const sent = await EmailQueue.countDocuments({ status: "sent" });
    const failed = await EmailQueue.countDocuments({ status: "failed" });
    const total = await EmailQueue.countDocuments();

    const oldestPending = await EmailQueue.findOne({ status: "pending" })
      .sort({ createdAt: 1 })
      .select("createdAt");

    // Get rate limit info
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const sentLastHour = await EmailQueue.countDocuments({
      status: "sent",
      sentAt: { $gte: oneHourAgo },
    });

    const sentLastDay = await EmailQueue.countDocuments({
      status: "sent",
      sentAt: { $gte: oneDayAgo },
    });

    // Calculate when next email can be sent
    let nextAvailableIn: { minutes: number; reason: string } | null = null;

    if (sentLastHour >= this.rateLimitConfig.maxEmailsPerHour) {
      // Find oldest email in the last hour
      const oldestInHour = await EmailQueue.findOne({
        status: "sent",
        sentAt: { $gte: oneHourAgo },
      })
        .sort({ sentAt: 1 })
        .select("sentAt");

      if (oldestInHour?.sentAt) {
        const nextAvailableTime = new Date(
          oldestInHour.sentAt.getTime() + 60 * 60 * 1000
        );
        const minutesUntilAvailable = Math.ceil(
          (nextAvailableTime.getTime() - now.getTime()) / 1000 / 60
        );
        nextAvailableIn = {
          minutes: minutesUntilAvailable,
          reason: "hourly limit reached",
        };
      }
    } else if (sentLastDay >= this.rateLimitConfig.maxEmailsPerDay) {
      // Find oldest email in the last day
      const oldestInDay = await EmailQueue.findOne({
        status: "sent",
        sentAt: { $gte: oneDayAgo },
      })
        .sort({ sentAt: 1 })
        .select("sentAt");

      if (oldestInDay && oldestInDay.sentAt) {
        const nextAvailableTime = new Date(
          oldestInDay.sentAt.getTime() + 24 * 60 * 60 * 1000
        );
        const minutesUntilAvailable = Math.ceil(
          (nextAvailableTime.getTime() - now.getTime()) / 1000 / 60
        );
        nextAvailableIn = {
          minutes: minutesUntilAvailable,
          reason: "daily limit reached",
        };
      }
    }

    // Get pending emails details if verbose
    let pendingEmails: any[] | undefined;
    if (verbose) {
      const emails = await EmailQueue.find({ status: "pending" })
        .sort({ priority: -1, createdAt: 1 })
        .select("to subject createdAt priority")
        .lean();

      // Only include priority field if true (cleaner JSON output)
      pendingEmails = emails.map((email) => ({
        to: email.to,
        subject: email.subject,
        createdAt: email.createdAt,
        ...(email.priority && { priority: true }),
      }));
    }

    return {
      pending,
      sent,
      failed,
      total,
      oldestPendingAge: oldestPending
        ? Math.floor(
            (Date.now() - oldestPending.createdAt.getTime()) / 1000 / 60
          )
        : 0, // minutes
      rateLimit: {
        sentLastHour,
        maxEmailsPerHour: this.rateLimitConfig.maxEmailsPerHour,
        sentLastDay,
        maxEmailsPerDay: this.rateLimitConfig.maxEmailsPerDay,
        canSendMore:
          sentLastHour < this.rateLimitConfig.maxEmailsPerHour &&
          sentLastDay < this.rateLimitConfig.maxEmailsPerDay,
        nextAvailableIn,
      },
      ...(pendingEmails && { pendingEmails }),
    };
  }

  /**
   * Clean up old sent emails
   */
  async cleanupOldEmails(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await EmailQueue.deleteMany({
      status: "sent",
      sentAt: { $lt: cutoffDate },
    });

    console.log(`Cleaned up ${result.deletedCount} old emails`);
    return result.deletedCount;
  }
}

// Export singleton instance
export const emailQueueService = new EmailQueueService({
  // defaults are assumed 1&1 limits
  maxEmailsPerHour: parseInt(getEnvVar("EMAIL_LIMIT_HOUR") || "20"),
  maxEmailsPerDay: parseInt(getEnvVar("EMAIL_LIMIT_DAY") || "100"),
});
