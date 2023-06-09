import { Model, Schema, model } from "mongoose";
const { isEmail } = require("validator");
import bcrypt from "bcrypt";
import jwt, { sign } from "jsonwebtoken";
import nodemailer from "nodemailer";
require("dotenv").config();

// the adding of a static User Method from the JS code had to be rewritten according to
// https://mongoosejs.com/docs/typescript/statics-and-methods.html

interface IUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  verificationToken: String | undefined;
  isAdmin: boolean;
}

interface UserModel extends Model<IUser> {
  login(email: string, password: string): any;
}

const userSchema = new Schema<IUser, UserModel>({
  email: {
    type: String,
    required: [true, "Bitte E-Mail angeben"],
    unique: true,
    lowercase: true,
    validate: [isEmail, "Bitte eine gültige E-Mail-Adresse angeben"],
  },
  password: {
    type: String,
    required: [true, "Bitte Kennwort angeben"],
    minlength: [6, "Die minimale Kennwort Länge sind 6 Zeichen"],
  },
  firstName: {
    type: String,
    required: false,
  },
  lastName: {
    type: String,
    required: [true, "Bitte Nachnamen angeben"],
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  isAdmin: {
    type: Boolean,
    default: false,
  },
});
userSchema.static(
  "login",
  async function login(email: string, password: string) {
    const user: any = await this.findOne({ email });
    if (user) {
      const auth = await bcrypt.compare(password, user.password);
      if (auth) {
        return user;
      }
      throw Error("incorrect password");
    }
    throw Error("incorrect email");
  }
);

// fire a function before doc saved to db
userSchema.pre("save", async function (next: any) {
  const salt = await bcrypt.genSalt();

  // we must ensure that the password will only be hashed if it is not already hashed
  // we doesn't have a safe criteria for this right now
  if (!this.isVerified) {
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// fire a function after doc saved to db
userSchema.post("save", async function (doc: any, next: any) {
  // for new registered users send verification e-mail
  if (this.verificationToken) {
    await sendVerificationEmail(this);
  }
  next();
});

// Create a nodemailer transporter TODO: dupliziert von app.ts
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT!),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  greetingTimeout: 1000 * 10,
  logger:
    !!process.env.SMTP_DEBUG && process.env.SMTP_DEBUG.toLowerCase() == "true",
});
transporter.verify(function (error, success) {
  if (error) {
    console.log(error);
  } else {
    console.log("SMTP server is ready to take our messages");
  }
});

// Send verification email to the user
async function sendVerificationEmail(user: any) {
  const token = jwt.sign(
    { userId: user._id },
    process.env.EMAIL_VERIFICATION_SECRET!,
    { expiresIn: "1h" }
  );
  const verificationUrl = `${process.env.CYCLIC_URL}/verify-email?token=${token}`;
  const email = user.email;
  const subject = "Email Verification";
  const html = `Please click on the following link to verify your email address: <a href="${verificationUrl}">${verificationUrl}</a>`;
  const mailOptions = { from: process.env.SMTP_FROM, to: email, subject, html };

  const result = await transporter.sendMail(mailOptions);
  // const smtpDebug = process.env.SMTP_DEBUG && process.env.SMTP_DEBUG.toLowerCase() == "true",
  if (transporter.logger) {
    console.log("Verification e-mail:", result);
  }
}

export const User = model<IUser, UserModel>("User", userSchema);
