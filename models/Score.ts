import { Model, Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import jwt, { sign } from "jsonwebtoken";
import nodemailer from "nodemailer";
require("dotenv").config();

interface IScoreType {
    composer: string;
    work: string;
    signature: string;
    count: number;
  }
  
  interface ScoreTypeModel extends Model<IScoreType> {
  }
  
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
  
interface IScore {
  signature: string;
  id: string; // <signature>-<#>
  extId: string;
  state: string;
}

interface ScoreModel extends Model<IScore> {}

const scoreSchema = new Schema<IScore, ScoreModel>({
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
});

export const ScoreType = model<IScoreType, ScoreTypeModel>(
    "ScoreType",
    scoreTypeSchema
  );  
export const Score = model<IScore, ScoreModel>("Score", scoreSchema);

