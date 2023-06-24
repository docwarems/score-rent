import { Model, Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import jwt, { sign } from "jsonwebtoken";
import nodemailer from "nodemailer";
require("dotenv").config();

export interface ICheckout {
  userId: string;
  scoreId: string;
  checkoutTimestamp: string;
  checkoutComment: string;
  checkinTimestamp: string;
  checkinComment: string;
}

interface CheckoutModel extends Model<ICheckout> {}

export const checkoutSchema = new Schema<ICheckout, CheckoutModel>({
  userId: {
    type: String,
    required: true,
  },
  scoreId: {
    type: String,
    required: true,
  },
  checkoutTimestamp: {
    type: String,
    required: false,
  },
  checkoutComment: {
    type: String,
    required: false,
  },
  checkinTimestamp: {
    type: String,
    required: false,
  },
  checkinComment: {
    type: String,
    required: false,
  },
});

export const Checkout = model("Checkout", checkoutSchema);
