// import User from "../models/User";
import { errorMonitor } from "nodemailer/lib/xoauth2";
import { User } from "../models/User";
import jwt from "jsonwebtoken";
require("dotenv").config();
import nodemailer from "nodemailer";
var QRCode = require("qrcode");

// handle errors
const handleErrors = (err: any) => {
  console.log(err.message, err.code);
  let errors = { email: "", password: "", passwordRepeat: "", lastName: "" };

  // incorrect email
  if (err.message === "incorrect email") {
    errors.email = "Die E-Mail Adresse ist unbekannt";
  }

  // incorrect password
  if (err.message === "incorrect password") {
    errors.password = "Das Passwort ist nicht korrekt";
  }

  if (err.message === "repeated password wrong") {
    errors.password =
      "Passwort und Passwort Wiederholung stimmen nicht überein";
  }

  // duplicate email error
  if (err.code === 11000) {
    errors.email = "Diese E-Mail Adresse ist bereits in Verwendung";
    return errors;
  }

  // validation errors
  if (err.message.includes("User validation failed")) {
    // console.log(err);
    Object.values(err.errors as { properties: any }).forEach(
      ({ properties }) => {
        // console.log(val);
        // console.log(properties);
        type ErrorKey = keyof typeof errors;
        errors[properties.path as ErrorKey] = properties.message;
      }
    );
  }

  return errors;
};

// create json web token
const maxAge = 3 * 24 * 60 * 60;
const createToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: maxAge,
  });
};

// controller actions
module.exports.signup_get = (req: any, res: any) => {
  res.render("signup");
};

module.exports.signup_success_get = (req: any, res: any) => {
  res.render("signup-success");
};

module.exports.login_get = (req: any, res: any) => {
  res.render("login");
};

enum EmailVerificationStatus {
  OK,
  NOT_REGISTERED,
  ALREADY_VERFIED,
}

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

/**
 * Create a espass (electronic smart pass) file to be opened with PassAndroid (and obviously only with this app)
 * - main.json (this constant); the message will converted to a QR Code
 * - icon.png with logo (HSC logo in resources folder)
 * - create a ZIP
 * - rename zip extension to espass
 * 
 * see: 
 * - https://datatypes.net/open-espass-files
 * - https://espass.it/
 * - Apple Passbook file reference: https://developer.apple.com/library/archive/documentation/UserExperience/Reference/PassKit_Bundle/Chapters/Introduction.html#//apple_ref/doc/uid/TP40012026-CH0-SW1
 */
const espassContent = '{"accentColor":"#ff0000ff","app":"passandroid","barCode":{"format":"QR_CODE","message":"email=ms2702@online.de&id=123456"},"description":"hsc user ","fields":[],"id":"009fb73a-6e5a-4870-a732-da5526a72863","locations":[],"type":"EVENT","validTimespans":[]}';

// Send email to the user after successful registration and verification
const sendVerificationSuccessfulEmail = async (user: any) => {
  try {
    const text = "userId=" + user._id + "&email=" + user.email;
    const url = await QRCode.toDataURL(text);
    // console.log(text, url);

    const email = user.email;
    const subject = "Registrierung erfolgreich";
    const html = `
    Bitte speichern Sie den folgenden QRCode. Er wird für das Ausleihen von Noten benötigt.
    <p></p>
    E-Mail: ${user.email}<br>
    Name: ${user.firstName}&nbsp;${user.lastName}
    <p></p>      
    Embedded image: <img src="${url}"/>
  `;

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject,
      html,
      attachments: [
        { path: url },
      ]
    };

    const result = await transporter.sendMail(mailOptions);
    if (transporter.logger) {
      console.log("Registration successful e-mail:", result);
    }
  } catch (err) {
    console.error(err);
  }
};

module.exports.verify_email_get = async (req: any, res: any) => {
  const token = req.query.token as string;
  const decodedToken = jwt.verify(
    token,
    process.env.EMAIL_VERIFICATION_SECRET!
  ) as { userId: string };

  let verificationResult: { status: EmailVerificationStatus; message: string };
  const user = await User.findById(decodedToken.userId);
  if (!user) {
    verificationResult = {
      status: EmailVerificationStatus.NOT_REGISTERED,
      message: "Benutzer nicht gefunden",
    };
  } else if (user.isVerified) {
    verificationResult = {
      status: EmailVerificationStatus.ALREADY_VERFIED,
      message: "Die E-Mail Adresse wurde bereits verifiziert",
    };
  } else {
    user.isVerified = true;
    user.verificationToken = undefined;

    try {
      await user.save();
      await sendVerificationSuccessfulEmail(user);
      verificationResult = {
        status: EmailVerificationStatus.OK,
        message: "Die E-Mail Adresse wurde erfolgreich verifiziert",
      };
    } catch (error) {
      console.error("Error verifying email", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  res.render("verify-email", {
    EmailVerificationStatus: EmailVerificationStatus,
    verificationResult: verificationResult,
  });
};

module.exports.signup_post = async (req: any, res: any) => {
  const {
    email,
    password,
    passwordRepeat,
    firstName,
    lastName,
    verificationToken,
  } = req.body;

  try {
    if (password !== passwordRepeat) {
      throw new Error("repeated password wrong");
    }

    const verificationToken = Math.random().toString(36).substr(2);
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      verificationToken,
    });
    const token = createToken(user._id as unknown as string);
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(201).json({ user: user._id });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};

module.exports.login_post = async (req: any, res: any) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);
    const token = createToken(user._id);
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(200).json({ user: user._id });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
};

module.exports.logout_get = (req: any, res: any) => {
  res.cookie("jwt", "", { maxAge: 1 });
  res.redirect("/");
};
