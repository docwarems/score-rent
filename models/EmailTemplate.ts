import mongoose from "mongoose";

const emailTemplateSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  subject: {
    type: String,
    required: true,
  },
  html: {
    type: String,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: String,
  },
});

export const EmailTemplate = mongoose.model(
  "EmailTemplate",
  emailTemplateSchema
);
