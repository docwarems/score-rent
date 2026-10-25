import mongoose from "mongoose";

const emailQueueSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  html: {
    type: String,
    required: true,
  },
  text: {
    type: String,
  },
  from: {
    type: String,
    required: true,
  },
  attachments: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  priority: {
    type: Boolean,
    default: false,
  },
  campaign: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["pending", "processing", "sent", "failed"],
    default: "pending",
  },
  attempts: {
    type: Number,
    default: 0,
  },
  maxAttempts: {
    type: Number,
    default: 3,
  },
  error: {
    type: String,
  },
  sentAt: {
    type: Date,
  },
  dryRun: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  scheduledFor: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient querying
emailQueueSchema.index({ status: 1, priority: -1, scheduledFor: 1 });
// Index for filtering emails belonging to a mass mailing campaign
emailQueueSchema.index({ campaign: 1, createdAt: -1 });

export const EmailQueue = mongoose.model("EmailQueue", emailQueueSchema);
