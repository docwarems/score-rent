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
const localLogOnlyMode = !process.env.AWS_LAMBDA_FUNCTION_NAME &&
    process.env.EMAIL_QUEUE_MODE === "log";
class EmailQueueService {
    constructor(config) {
        this.workerTriggerRequested = false;
        // Default limits for typical personal email accounts (adjust to your limits)
        const parsedBatchSize = parseInt((0, misc_utils_1.getEnvVar)("EMAIL_BATCH_SIZE") || "5", 10);
        this.rateLimitConfig = Object.assign({ maxEmailsPerHour: 50, maxEmailsPerDay: 200, batchSize: parsedBatchSize }, (config !== null && config !== void 0 ? config : {}));
    }
    /**
     * Add email to queue
     */
    queueEmail(emailOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate email format before storing
                if (!emailOptions.to || !emailOptions.to.includes("@")) {
                    console.error(`WARNING: Invalid email address detected: "${emailOptions.to}". Expected format: user@domain.com`);
                }
                // Debug: check for non-ASCII characters in email
                const emailCharCodes = Array.from(emailOptions.to).map((c) => `${c}(${c.charCodeAt(0)})`);
                if (emailOptions.to.includes(" ") || emailOptions.to.includes("\u00a0")) {
                    console.warn(`WARNING: Email contains space/non-breaking-space: ${emailOptions.to}. Char codes: ${emailCharCodes.join(", ")}`);
                }
                yield EmailQueue_1.EmailQueue.create({
                    to: emailOptions.to,
                    subject: emailOptions.subject,
                    html: emailOptions.html,
                    text: emailOptions.text || "",
                    from: emailOptions.from || process.env.SMTP_FROM,
                    attachments: emailOptions.attachments || [],
                    priority: emailOptions.priority || false,
                    campaign: emailOptions.campaign,
                    status: "pending",
                });
                this.workerTriggerRequested = true;
                console.log(`Email queued: ${emailOptions.subject} to ${emailOptions.to}`);
            }
            catch (error) {
                console.error("Error queueing email:", error);
                throw error;
            }
        });
    }
    consumeWorkerTriggerRequest() {
        const requested = this.workerTriggerRequested;
        this.workerTriggerRequested = false;
        return requested;
    }
    getNextProcessingTime() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date();
            const pendingEmail = yield EmailQueue_1.EmailQueue.findOne({
                status: "pending",
                attempts: { $lt: 3 },
            })
                .sort({ scheduledFor: 1, createdAt: 1 })
                .select("scheduledFor")
                .lean();
            if (!pendingEmail) {
                return null;
            }
            const sentToday = yield EmailQueue_1.EmailQueue.find({
                status: "sent",
                dryRun: { $ne: true },
                sentAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
            })
                .sort({ sentAt: 1 })
                .select("sentAt")
                .lean();
            const sentThisHour = sentToday.filter((email) => email.sentAt && email.sentAt >= new Date(now.getTime() - 60 * 60 * 1000));
            let quotaAvailableAt = now.getTime();
            if (sentThisHour.length >= this.rateLimitConfig.maxEmailsPerHour) {
                const index = sentThisHour.length - this.rateLimitConfig.maxEmailsPerHour;
                quotaAvailableAt = Math.max(quotaAvailableAt, sentThisHour[index].sentAt.getTime() + 60 * 60 * 1000 + 1000);
            }
            if (sentToday.length >= this.rateLimitConfig.maxEmailsPerDay) {
                const index = sentToday.length - this.rateLimitConfig.maxEmailsPerDay;
                quotaAvailableAt = Math.max(quotaAvailableAt, sentToday[index].sentAt.getTime() + 24 * 60 * 60 * 1000 + 1000);
            }
            const scheduledAt = (_b = (_a = pendingEmail.scheduledFor) === null || _a === void 0 ? void 0 : _a.getTime()) !== null && _b !== void 0 ? _b : now.getTime();
            return new Date(Math.max(quotaAvailableAt, scheduledAt));
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
                dryRun: { $ne: true },
                sentAt: { $gte: oneHourAgo },
            });
            // Count emails sent in last 24 hours
            const sentLastDay = yield EmailQueue_1.EmailQueue.countDocuments({
                status: "sent",
                dryRun: { $ne: true },
                sentAt: { $gte: oneDayAgo },
            });
            // Only log if there are pending emails
            const pendingCount = yield EmailQueue_1.EmailQueue.countDocuments({ status: "pending" });
            if (pendingCount > 0) {
                console.log(`Rate check: ${sentLastHour}/${this.rateLimitConfig.maxEmailsPerHour} per hour, ${sentLastDay}/${this.rateLimitConfig.maxEmailsPerDay} per day`);
            }
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
            let dryRun = 0;
            let failed = 0;
            let skipped = 0;
            try {
                // First, reset any stuck "processing" emails (older than 5 minutes)
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                yield EmailQueue_1.EmailQueue.updateMany({
                    status: "processing",
                    createdAt: { $lt: fiveMinutesAgo },
                }, { $set: { status: "pending" } });
                // Get pending emails that are due
                const pendingEmails = yield EmailQueue_1.EmailQueue.find({
                    status: "pending",
                    scheduledFor: { $lte: new Date() },
                    attempts: { $lt: 3 }, // Or whatever your maxAttempts default is
                })
                    .sort({ priority: -1, createdAt: 1 }) // Priority emails first, then oldest first
                    .limit(this.rateLimitConfig.batchSize);
                if (pendingEmails.length === 0) {
                    return { sent, dryRun, failed, skipped };
                }
                const totalPending = yield EmailQueue_1.EmailQueue.countDocuments({
                    status: "pending",
                });
                console.log(`Processing ${pendingEmails.length} of ${totalPending} pending emails`);
                for (const emailDoc of pendingEmails) {
                    console.log(`[${sent + dryRun + failed + skipped + 1}/${pendingEmails.length}] Processing email: ${emailDoc.subject} to ${emailDoc.to}`);
                    // Check rate limits before each send
                    if (!localLogOnlyMode && !(yield this.canSendEmail())) {
                        console.log("Rate limit reached, stopping queue processing");
                        skipped = pendingEmails.length - sent - failed;
                        break;
                    }
                    try {
                        // Atomically mark as processing to prevent race conditions
                        const updateResult = yield EmailQueue_1.EmailQueue.updateOne({ _id: emailDoc._id, status: "pending" }, { $set: { status: "processing" } });
                        // If no document was updated, another process is handling it
                        if (updateResult.modifiedCount === 0) {
                            console.log(`  Email already being processed, skipping`);
                            skipped++;
                            continue;
                        }
                        if (localLogOnlyMode) {
                            console.log(`[EMAIL DRY RUN] Would send to ${emailDoc.to}: ${emailDoc.subject}`);
                        }
                        else {
                            yield misc_utils_1.mailTransporter.sendMail({
                                from: emailDoc.from,
                                to: emailDoc.to,
                                subject: emailDoc.subject,
                                html: emailDoc.html,
                                text: emailDoc.text,
                                attachments: emailDoc.attachments || [],
                            });
                        }
                        // Complete dry runs without counting them as delivered or quota usage.
                        yield EmailQueue_1.EmailQueue.updateOne({ _id: emailDoc._id }, {
                            $set: {
                                status: "sent",
                                sentAt: new Date(),
                                dryRun: localLogOnlyMode,
                            },
                        });
                        if (localLogOnlyMode) {
                            dryRun++;
                        }
                        else {
                            sent++;
                            console.log(`✓ Email sent: ${emailDoc.subject} to ${emailDoc.to}`);
                        }
                    }
                    catch (error) {
                        // Log full error for debugging
                        console.error("Email send error:", error);
                        // Update attempts and error atomically
                        const currentAttempts = emailDoc.attempts + 1;
                        const updateData = {
                            $set: {
                                attempts: currentAttempts,
                                error: error.message || String(error),
                            },
                        };
                        // Mark as failed if max attempts reached
                        if (currentAttempts >= emailDoc.maxAttempts) {
                            updateData.$set.status = "failed";
                            console.error(`✗ Email failed permanently: ${emailDoc.subject} to ${emailDoc.to}. Error: ${error.message}`);
                        }
                        else {
                            updateData.$set.status = "pending"; // Reset to pending for retry
                            console.error(`✗ Email attempt ${currentAttempts} failed: ${emailDoc.subject}. Error: ${error.message}`);
                        }
                        yield EmailQueue_1.EmailQueue.updateOne({ _id: emailDoc._id }, updateData);
                        failed++;
                    }
                    // Small delay between emails to avoid triggering spam filters
                    yield new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }
            catch (error) {
                console.error("Error processing email queue:", error);
            }
            return { sent, dryRun, failed, skipped };
        });
    }
    /**
     * Get queue statistics
     * @param verbose - If true, include detailed list of pending emails
     */
    getQueueStats(verbose = false) {
        return __awaiter(this, void 0, void 0, function* () {
            // Query pending emails once to ensure consistency
            const pendingEmailDocs = yield EmailQueue_1.EmailQueue.find({ status: "pending" })
                .sort({ priority: -1, createdAt: 1 })
                .select("to subject createdAt priority campaign")
                .lean();
            const pending = pendingEmailDocs.length;
            const oldestPending = pendingEmailDocs.length > 0
                ? pendingEmailDocs[pendingEmailDocs.length - 1]
                : null;
            const sent = yield EmailQueue_1.EmailQueue.countDocuments({
                status: "sent",
                dryRun: { $ne: true },
            });
            const dryRun = yield EmailQueue_1.EmailQueue.countDocuments({
                status: "sent",
                dryRun: true,
            });
            const failed = yield EmailQueue_1.EmailQueue.countDocuments({ status: "failed" });
            const total = yield EmailQueue_1.EmailQueue.countDocuments();
            // Get rate limit info
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const sentLastHour = yield EmailQueue_1.EmailQueue.countDocuments({
                status: "sent",
                dryRun: { $ne: true },
                sentAt: { $gte: oneHourAgo },
            });
            const sentLastDay = yield EmailQueue_1.EmailQueue.countDocuments({
                status: "sent",
                dryRun: { $ne: true },
                sentAt: { $gte: oneDayAgo },
            });
            // Calculate when next email can be sent
            let nextAvailableIn = null;
            if (sentLastHour >= this.rateLimitConfig.maxEmailsPerHour) {
                // Find oldest email in the last hour
                const oldestInHour = yield EmailQueue_1.EmailQueue.findOne({
                    status: "sent",
                    dryRun: { $ne: true },
                    sentAt: { $gte: oneHourAgo },
                })
                    .sort({ sentAt: 1 })
                    .select("sentAt");
                if (oldestInHour === null || oldestInHour === void 0 ? void 0 : oldestInHour.sentAt) {
                    const nextAvailableTime = new Date(oldestInHour.sentAt.getTime() + 60 * 60 * 1000);
                    const minutesUntilAvailable = Math.ceil((nextAvailableTime.getTime() - now.getTime()) / 1000 / 60);
                    nextAvailableIn = {
                        minutes: minutesUntilAvailable,
                        reason: "hourly limit reached",
                    };
                }
            }
            else if (sentLastDay >= this.rateLimitConfig.maxEmailsPerDay) {
                // Find oldest email in the last day
                const oldestInDay = yield EmailQueue_1.EmailQueue.findOne({
                    status: "sent",
                    dryRun: { $ne: true },
                    sentAt: { $gte: oneDayAgo },
                })
                    .sort({ sentAt: 1 })
                    .select("sentAt");
                if (oldestInDay && oldestInDay.sentAt) {
                    const nextAvailableTime = new Date(oldestInDay.sentAt.getTime() + 24 * 60 * 60 * 1000);
                    const minutesUntilAvailable = Math.ceil((nextAvailableTime.getTime() - now.getTime()) / 1000 / 60);
                    nextAvailableIn = {
                        minutes: minutesUntilAvailable,
                        reason: "daily limit reached",
                    };
                }
            }
            // Format pending emails for verbose output
            let pendingEmails;
            if (verbose) {
                // Only include priority field if true (cleaner JSON output)
                pendingEmails = pendingEmailDocs.map((email) => (Object.assign({ to: email.to, subject: email.subject, createdAt: email.createdAt, campaign: email.campaign }, (email.priority && { priority: true }))));
            }
            return Object.assign({ pending,
                sent,
                dryRun,
                failed,
                total, oldestPendingAge: oldestPending
                    ? Math.floor((Date.now() - oldestPending.createdAt.getTime()) / 1000 / 60)
                    : 0, rateLimit: {
                    sentLastHour,
                    maxEmailsPerHour: this.rateLimitConfig.maxEmailsPerHour,
                    sentLastDay,
                    maxEmailsPerDay: this.rateLimitConfig.maxEmailsPerDay,
                    canSendMore: sentLastHour < this.rateLimitConfig.maxEmailsPerHour &&
                        sentLastDay < this.rateLimitConfig.maxEmailsPerDay,
                    nextAvailableIn,
                } }, (pendingEmails && { pendingEmails }));
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
    batchSize: parseInt((0, misc_utils_1.getEnvVar)("EMAIL_BATCH_SIZE") || "5"),
});
