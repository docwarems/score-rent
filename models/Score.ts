import { Model, Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import jwt, { sign } from "jsonwebtoken";
import nodemailer from "nodemailer";
import { ICheckout, Checkout, checkoutSchema } from "./Checkout";
require("dotenv").config();

interface IScoreType {
  composer: string;
  work: string;
  signature: string;
  count: number;
}

interface ScoreTypeModel extends Model<IScoreType> {}

const scoreTypeSchema = new Schema<IScoreType, ScoreTypeModel>({
  composer: {
    type: String,
    required: [true, "Bitte Komponist angeben"],
    unique: true,
  },
  work: {
    type: String,
    required: [true, "Bitte Werk angeben"],
  },
  signature: {
    type: String,
    required: [true, "Bitte Signatur angeben"],
    uppercase: true,
    unique: true,
  },
  count: {
    type: Number,
    required: [true, "Bitte Anzahl angeben"],
  },
});

export interface IScore {
  signature: string;
  id: string; // <signature>-<#>
  extId: string;
  state: string;
  checkedOutByUserId: string;
  checkouts: [ICheckout];
}

const scoreSchema = new Schema<IScore>({
  signature: {
    type: String,
    required: [true, "Bitte Signatur angeben"],
    uppercase: true,
  },
  id: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
  },
  extId: {
    type: String,
  },
  state: {
    type: String,
  },
  checkedOutByUserId: {
    type: String,
  },
  checkouts: {
    type: [checkoutSchema],
  },
});

export const Score = model<IScore>("Score", scoreSchema);

export const ScoreType = model<IScoreType, ScoreTypeModel>(
  "ScoreType",
  scoreTypeSchema
);
