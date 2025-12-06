"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailQueue = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const emailQueueSchema = new mongoose_1.default.Schema({
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
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending',
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
emailQueueSchema.index({ status: 1, scheduledFor: 1 });
exports.EmailQueue = mongoose_1.default.model('EmailQueue', emailQueueSchema);
