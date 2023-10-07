import { Model, Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import jwt, { sign } from "jsonwebtoken";
import nodemailer from "nodemailer";
require("dotenv").config();

export interface ICheckout {
  _id: string;
  userId: string;
  scoreId: string;
  checkoutTimestamp: Date;
  checkoutComment: string;
  checkoutConfirmationEmailNotSent: boolean;
  checkinTimestamp: Date;
  checkinComment: string;
  checkinConfirmationEmailNotSent: boolean;
}

export const checkoutSchema = new Schema<ICheckout>({
  _id: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  scoreId: {
    type: String,
    required: true,
  },
  checkoutTimestamp: {
    type: Date,
    required: false,
  },
  checkoutComment: {
    type: String,
    required: false,
  },
  checkoutConfirmationEmailNotSent: {
    type: Boolean,
    required: false,
  },
  checkinTimestamp: {
    type: Date,
    required: false,
  },
  checkinComment: {
    type: String,
    required: false,
  },
  checkinConfirmationEmailNotSent: {
    type: Boolean,
    required: false,
  },
});

export const Checkout = model("Checkout", checkoutSchema);
