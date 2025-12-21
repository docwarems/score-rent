"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailQueueService = exports.EmailQueueService = void 0;
const EmailQueue_1 = require("../models/EmailQueue");
const misc_utils_1 = require("./misc-utils");
class EmailQueueService {
    constructor(config) {
        // Default limits for typical personal email accounts (adjust to your limits)
        this.rateLimitConfig = config || {
            maxEmailsPerHour: 50,
            maxEmailsPerDay: 200, // Adjust to your provider's limit
        };
    }
    /**
     * Add email to queue
     */
    queueEmail(emailOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield EmailQueue_1.EmailQueue.create({
                    to: emailOptions.to,
                    subject: emailOptions.subject,
                    html: emailOptions.html,
                    text: emailOptions.text || "",
                    from: emailOptions.from || process.env.SMTP_FROM,
                    status: "pending",
                });
                console.log(`Email queued: ${emailOptions.subject} to ${emailOptions.to}`);
            }
            catch (error) {
                console.error("Error queueing email:", error);
                throw error;
            }
        });
    }
    /**
     * Check if we're within rate limits
     */
    canSendEmail() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            // Count emails sent in last hour
            const sentLastHour = yield EmailQueue_1.EmailQueue.countDocuments({
                status: "sent",
                sentAt: { $gte: oneHourAgo },
            });
            // Count emails sent in last 24 hours
            const sentLastDay = yield EmailQueue_1.EmailQueue.countDocuments({
                status: "sent",
                sentAt: { $gte: oneDayAgo },
            });
            console.log(`Rate check: ${sentLastHour}/${this.rateLimitConfig.maxEmailsPerHour} per hour, ${sentLastDay}/${this.rateLimitConfig.maxEmailsPerDay} per day`);
            return (sentLastHour < this.rateLimitConfig.maxEmailsPerHour &&
                sentLastDay < this.rateLimitConfig.maxEmailsPerDay);
        });
    }
    /**
     * Process email queue - send pending emails if within limits
     */
    processQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            let sent = 0;
            let failed = 0;
            let skipped = 0;
            try {
                // Get pending emails that are due
                const pendingEmails = yield EmailQueue_1.EmailQueue.find({
                    status: "pending",
                    scheduledFor: { $lte: new Date() },
                    attempts: { $lt: 3 }, // Or whatever your maxAttempts default is
                })
                    .sort({ createdAt: 1 })
                    .limit(10); // Process max 10 emails at a time
                if (pendingEmails.length === 0) {
                    return { sent, failed, skipped };
                }
                console.log(`Processing ${pendingEmails.length} pending emails`);
                for (const emailDoc of pendingEmails) {
                    // Check rate limits before each send
                    if (!(yield this.canSendEmail())) {
                        console.log("Rate limit reached, stopping queue processing");
                        skipped = pendingEmails.length - sent - failed;
                        break;
                    }
                    try {
                        // Send email
                        yield misc_utils_1.mailTransporter.sendMail({
                            from: emailDoc.from,
                            to: emailDoc.to,
                            subject: emailDoc.subject,
                            html: emailDoc.html,
                            text: emailDoc.text,
                        });
                        // Mark as sent
                        emailDoc.status = "sent";
                        emailDoc.sentAt = new Date();
                        yield emailDoc.save();
                        sent++;
                        console.log(`✓ Email sent: ${emailDoc.subject} to ${emailDoc.to}`);
                    }
                    catch (error) {
                        // Update attempts and error
                        emailDoc.attempts += 1;
                        emailDoc.error = error.message || String(error);
                        // Mark as failed if max attempts reached
                        if (emailDoc.attempts >= emailDoc.maxAttempts) {
                            emailDoc.status = "failed";
                            console.error(`✗ Email failed permanently: ${emailDoc.subject} to ${emailDoc.to}`);
                        }
                        else {
                            console.error(`✗ Email attempt ${emailDoc.attempts} failed: ${emailDoc.subject}`);
                        }
                        yield emailDoc.save();
                        failed++;
                    }
                    // Small delay between emails to avoid triggering spam filters
                    yield new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }
            catch (error) {
                console.error("Error processing email queue:", error);
            }
            return { sent, failed, skipped };
        });
    }
    /**
     * Get queue statistics
     */
    getQueueStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const pending = yield EmailQueue_1.EmailQueue.countDocuments({ status: "pending" });
            const sent = yield EmailQueue_1.EmailQueue.countDocuments({ status: "sent" });
            const failed = yield EmailQueue_1.EmailQueue.countDocuments({ status: "failed" });
            const total = yield EmailQueue_1.EmailQueue.countDocuments();
            const oldestPending = yield EmailQueue_1.EmailQueue.findOne({ status: "pending" })
                .sort({ createdAt: 1 })
                .select("createdAt");
            return {
                pending,
                sent,
                failed,
                total,
                oldestPendingAge: oldestPending
                    ? Math.floor((Date.now() - oldestPending.createdAt.getTime()) / 1000 / 60)
                    : 0, // minutes
            };
        });
    }
    /**
     * Clean up old sent emails
     */
    cleanupOldEmails(daysToKeep = 30) {
        return __awaiter(this, void 0, void 0, function* () {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const result = yield EmailQueue_1.EmailQueue.deleteMany({
                status: "sent",
                sentAt: { $lt: cutoffDate },
            });
            console.log(`Cleaned up ${result.deletedCount} old emails`);
            return result.deletedCount;
        });
    }
}
exports.EmailQueueService = EmailQueueService;
// Export singleton instance
exports.emailQueueService = new EmailQueueService({
    // defaults are assumed 1&1 limits
    maxEmailsPerHour: parseInt((0, misc_utils_1.getEnvVar)("EMAIL_LIMIT_HOUR") || "20"),
    maxEmailsPerDay: parseInt((0, misc_utils_1.getEnvVar)("EMAIL_LIMIT_DAY") || "100"),
});
