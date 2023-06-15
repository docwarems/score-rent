import { Model, Schema, model } from "mongoose";
const { isEmail } = require("validator");
import bcrypt from "bcrypt";
import jwt, { sign } from "jsonwebtoken";
import nodemailer from "nodemailer";
require("dotenv").config();

// the adding of a static User Method from the JS code had to be rewritten according to
// https://mongoosejs.com/docs/typescript/statics-and-methods.html

interface IScore {
  composer: string;
  work: string;
  signature: string;
  count: number;
}

interface ScoreModel extends Model<IScore> {
//   login(email: string, password: string): any;
}

const scoreSchema = new Schema<IScore, ScoreModel>({
  composer: {
    type: String,
    required: [true, "Bitte Komponist angeben"],
    unique: true,
  },
  work: {
    type: String,
    required: [true, "Bitte Werk angeben"],
    unique: true,
  },
  signature: {
    type: String,
    required: [true, "Bitte Signatur angeben"],
    lowercase: true,
    unique: true,
  },
  count: {
    type: Number,
    required: [true, "Bitte Anzahl angeben"],
  },
});

export const Score = model<IScore, ScoreModel>("Score", scoreSchema);
