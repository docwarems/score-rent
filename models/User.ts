import { Model, Schema, model } from "mongoose";
const { isEmail } = require("validator");
import bcrypt from "bcrypt";
import jwt, { sign } from "jsonwebtoken";
import nodemailer from "nodemailer";
require("dotenv").config();

// the adding of a static User Method from the JS code had to be rewritten according to
// https://mongoosejs.com/docs/typescript/statics-and-methods.html

export interface IUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  verificationToken: String | undefined;
  isAdmin: boolean;
  isManuallyRegistered: boolean;
}

export interface IUserMethods {
  fullName(): string;
}

interface UserModel extends Model<IUser> {
  login(email: string, password: string): any;
  generateUserId(firstName: string, lastName: string): string;
}

const userSchema = new Schema<IUser, UserModel, IUserMethods>({
  id: {
    // vv.nnnnnn z.B. mi.suedka; wird als Referenz zu anderen Objekten verwendet, damit diese sprechend ist
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  email: {
    type: String,
    // required: [true, "Bitte E-Mail angeben"],  // normal schon; aber nicht alle haben eine; für manuelle Registrierung
    unique: true, // wenn vorhanden
    sparse: true, // mehrere null Werte erlaubt
    lowercase: true,
    // validate: [isEmail, "Bitte eine gültige E-Mail-Adresse angeben"],  TODO: Validierung nur wenn nicht leer
  },
  password: {
    type: String,
    required: [true, "Bitte Kennwort angeben"],
    minlength: [6, "Die minimale Kennwort Länge sind 6 Zeichen"],
  },
  firstName: {
    type: String,
    required: [true, "Bitte Vornamen angeben"], // damit vv.nnnnnn User Id gebildet werden kann.
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
  isManuallyRegistered: {
    type: Boolean,
    default: false,
  },
});
userSchema.method('fullName', function fullName() {
  return this.firstName + ' ' + this.lastName;
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
userSchema.static('generateUserId', function generateUserId(firstName: string, lastName: string) {
  firstName = convertToGermanCharacterRules(firstName);
  lastName = convertToGermanCharacterRules(lastName).replace(" ", "");
  let userId = firstName.substring(0, 2) + "." + lastName.substring(0, 6);

  const regexp = new RegExp("^[a-z]{2}.[a-z]{2,6}$");
  if (!userId.match(regexp)) {
    console.error("User Id does not match regexp: ", userId);
    userId = "";
  }

  return userId;
});

// fire a function before doc saved to db
userSchema.pre("save", async function (next: any) {
  // TODO: we must ensure that e-mail doesn't exist because we have no longer a unique constraint on email field because we need to be able to manually register users without email

  // we must ensure that the password will only be hashed if it is not already hashed
  // we doesn't have a safe criteria for this right now
  const salt = await bcrypt.genSalt();
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
  const subject = "Email Überprüfung";
  const html = `
  Du hast diese Mail erhalten weil du dich bei der Notenverwaltung des Hans-Sachs-Chor registriert hast.<br>
  Bitte klicke auf den folgenden Link um die E-Mail Adresse zu bestätigen: <a href="${verificationUrl}">${verificationUrl}</a>
  `;
  const mailOptions = { from: process.env.SMTP_FROM, to: email, subject, html };

  const result = await transporter.sendMail(mailOptions);
  // const smtpDebug = process.env.SMTP_DEBUG && process.env.SMTP_DEBUG.toLowerCase() == "true",
  if (transporter.logger) {
    console.log("Verification e-mail:", result);
  }
}

function convertToGermanCharacterRules(name: string): string {
  // Replace umlauts and special characters with their German equivalents
  const germanRulesMap: { [key: string]: string } = {
    ä: "ae",
    ö: "oe",
    ü: "ue",
    ß: "ss",
  };

  return name
    .toLowerCase()
    .replace(/[äöüß]/g, (match) => germanRulesMap[match] || "");
}

export const User = model<IUser, UserModel>("User", userSchema);
