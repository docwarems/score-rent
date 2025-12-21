import { Model, Schema, model } from "mongoose";
const { isEmail } = require("validator");
import bcrypt from "bcrypt";
import jwt, { sign } from "jsonwebtoken";
import type { StringValue } from "ms";
import { mailTransporter, stage, getEnvVar } from "../utils/misc-utils";
import { emailQueueService } from "../utils/email-queue-utils";
require("dotenv").config();

// the adding of a static User Method from the JS code had to be rewritten according to
// https://mongoosejs.com/docs/typescript/statics-and-methods.html

export const USER_UNKNOWN = "un.known";

// export enum SingGroup {
//   SOPRANO = "S",
//   ALTO = "A",
//   TENOR = "T",
//   BASS = "B",
// }
export enum Voice {
  SOPRANO = "S",
  ALTO = "A",
  TENOR = "T",
  BASS = "B",
}
export const voiceMap: Map<Voice, string> = new Map();
voiceMap.set(Voice.SOPRANO, "Sopran");
voiceMap.set(Voice.ALTO, "Alt");
voiceMap.set(Voice.TENOR, "Tenor");
voiceMap.set(Voice.BASS, "Bass");

export enum MemberState {
  MEMBER = "M",
  STUDENT = "S",
  GUEST = "G",
}

export interface IUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  // singGroup: string;
  voice: string;
  memberState: string;
  isVerified: boolean;
  verificationToken: String | undefined;
  isAdmin: boolean;
  isManuallyRegistered: boolean;
  isPasswordHashed: boolean;
  isPlaywright: boolean;
  active: boolean;
}

// methods
export interface IUserMethods {
  fullName(): string;
}

// statics
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
    // required: [true, "Bitte E-Mail angeben"],  // normally yes, but not all users must have one; not mandatory for manual signup by admin
    unique: true, // if existing
    sparse: true, // allow multiple users with undefined email (email will not appear as property in db)
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
  // singGroup: {
  //   type: String,
  //   enum: Object.values(SingGroup),
  // },
  voice: {
    type: String,
    enum: Object.values(Voice),
  },
  memberState: {
    type: String,
    enum: Object.values(MemberState),
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
  isPasswordHashed: {
    type: Boolean,
    default: false,
  },
  isPlaywright: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: true,
  },
});
userSchema.method("fullName", function fullName() {
  return this.firstName + " " + this.lastName;
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
userSchema.static(
  "generateUserId",
  function generateUserId(firstName: string, lastName: string) {
    firstName = convertToGermanCharacterRules(firstName);
    lastName = convertToGermanCharacterRules(lastName).replace(" ", "");
    let userId = firstName.substring(0, 2) + "." + lastName.substring(0, 6);

    const regexp = new RegExp("^[a-z]{2}.[a-z]{2,6}$");
    if (!userId.match(regexp)) {
      console.error("User Id does not match regexp: ", userId);
      userId = "";
    }

    return userId;
  }
);

/**
 * Adds or increments a numeric suffix to a userId
 * Examples:
 *   mi.suedka -> mi.suedka01
 *   mi.suedka01 -> mi.suedka02
 *   mi.suedka99 -> mi.suedka100
 */
function incrementUserIdSuffix(userId: string): string {
  // Check if userId already has a numeric suffix
  const match = userId.match(/^(.+?)(\d+)$/);

  if (match) {
    // Has numeric suffix - increment it
    const base = match[1];
    const currentNumber = parseInt(match[2], 10);
    const nextNumber = currentNumber + 1;
    // Pad with leading zeros to match original length (minimum 2 digits)
    const paddedNumber = nextNumber
      .toString()
      .padStart(Math.max(2, match[2].length), "0");
    return base + paddedNumber;
  } else {
    // No suffix - add 01
    return userId + "01";
  }
}

export { incrementUserIdSuffix };

// fire a function before doc saved to db
userSchema.pre("save", async function (next: any) {
  // TODO: we must ensure that e-mail doesn't exist because we have no longer a unique constraint on email field because we need to be able to manually register users without email

  if (!this.isPasswordHashed) {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
    this.isPasswordHashed = true;
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

// Send verification email to the user
async function sendVerificationEmail(user: any) {
  const token = jwt.sign(
    { userId: user._id },
    process.env.EMAIL_VERIFICATION_SECRET!,
    { expiresIn: (getEnvVar("EMAIL_JWT_EXPIRY") || "24h") as StringValue }
  );
  const verificationUrl = `${process.env.CYCLIC_URL}/verify-email?token=${token}`;
  const email = user.email;
  const subject = "Email Überprüfung";
  const html = `
  Du hast diese Mail erhalten weil du dich bei der Notenverwaltung des Hans-Sachs-Chor registriert hast.<br>
  Bitte klicke auf den folgenden Link um die E-Mail Adresse zu bestätigen: <a href="${verificationUrl}">${verificationUrl}</a>
  `;
  const mailOptions = { from: process.env.SMTP_FROM, to: email, subject, html };

  const result = await emailQueueService.queueEmail(mailOptions);
  if (mailTransporter.logger) {
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

function enum2array(e: typeof Voice | typeof MemberState) {
  return Object.entries(e).map(([key, value]) => ({ key, value }));
}

export const User = model<IUser, UserModel>("User", userSchema);
