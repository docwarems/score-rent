import { User, Voice, voiceMap } from "../models/User";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import type { StringValue } from "ms";
import { mailTransporter } from "../utils/misc-utils";
import { stage, getEnvVar } from "../app";
require("dotenv").config();
var QRCode = require("qrcode");

const handleSaveErrors = (err: any, type: string | undefined) => {
  console.log(err.message, err.code);
  let errors = {
    userId: "",
    email: "",
    password: "",
    passwordRepeat: "",
    lastName: "",
  };

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

  if (err.code === 11000) {
    if (!type) {
    } else if (type == "email") {
      errors.email = "Diese E-Mail Adresse ist bereits in Verwendung";
    } else if (type == "userId") {
      errors.userId =
        "Die aus Vor- und Nachnamen gebildete User Id ist bereits in Verwendung. Bitte HSC kontaktieren!";
    }
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

// age in min of auth JWT and cookie
const maxAgeMin = 60 * 60;

const createToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: maxAgeMin,
  });
};

// controller actions
module.exports.signup_get = (req: any, res: any) => {
  res.render("signup", {
    admin: false,
    voices: Object.values(Voice),
    voiceMap,
  });
};

module.exports.signup_user_get = (req: any, res: any) => {
  res.render("signup", {
    admin: true,
    voices: Object.values(Voice),
    voiceMap,
  });
};

module.exports.signup_success_get = (req: any, res: any) => {
  const { admin } = req.query;
  res.render("signup-success", {
    admin: admin == "true",
  });
};

module.exports.login_get = (req: any, res: any) => {
  res.render("login");
};

enum EmailVerificationStatus {
  UNKNOWN,
  OK,
  NOT_REGISTERED,
  ALREADY_VERFIED,
  TOKEN_EXPIRED,
  INVALID_SIGNATURE,
}

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
async function createEspassFile(token: string) {
  return new Promise<void>((resolve, reject) => {
    var fs = require("fs");
    var JSZip = require("jszip");

    const id = uuidv4();

    var zip = new JSZip();
    zip.file(
      "main.json",
      `{"accentColor":"#ff0000ff","app":"passandroid","barCode":{"format":"QR_CODE","message":"${token}"},"description":"HSC Benutzer","fields":[],"id":"${id}","locations":[],"type":"EVENT","validTimespans":[]}`
    );
    // const imageData = fs.readFileSync(
    //   __dirname + "/../resources/hsc-logo-black.png"  // TODO: geht nicht auch cyclic
    // );
    // zip.file("logo.png", imageData);
    // ... and other manipulations

    zip
      .generateNodeStream({ type: "nodebuffer", streamFiles: true })
      .pipe(fs.createWriteStream("/tmp/hsc-noten.espass"))
      .on("finish", async function () {
        // JSZip generates a readable stream with a "end" event,
        // but is piped here in a writable stream which emits a "finish" event.
        console.log("espassfile written.");
        resolve();
      });
  });
}

// Send email to the user after successful registration and verification
const sendVerificationSuccessfulEmail = async (user: any) => {
  // we encode the user data into a JWT in order to prohibit manual QRCode creation outside the app
  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "5y" }
  );

  // das sparen wir uns vorerst mal
  // await createEspassFile(token); // TODO: in Memory statt speichern

  try {
    // const text = "userId=" + user._id + "&email=" + user.email;
    const url = await QRCode.toDataURL(token);

    const email = user.email;
    const subject = "Registrierung erfolgreich";
    const html = `
    Du wurdest erfolgreich in der Noten Ausleihe Datenbank des Hans-Sachs-Chor registriert.<br>
    <a href="${process.env.CYCLIC_URL}">Zum Login</a><br><br>
    Bitte speichere den folgenden QR Code wenn du dazu in der Lage bist. Er vereinfacht das künftige Ausleihen von Noten (kein Leihzettel mehr nötig).<br>
    Der QR Code kann aber auch jederzeit nach dem Login in der App angezeigt werden.
    <p></p>
    E-Mail: ${user.email}<br>
    Name: ${user.fullName()}
    <p></p>      
    QR Code: <img src="${url}"/>    
  `;

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject,
      html,
      // attachments: [{ path: url }, { path: "/tmp/hsc-noten.espass" }],
      attachments: [{ path: url }],
    };

    const result = await mailTransporter.sendMail(mailOptions);
    if (mailTransporter.logger) {
      console.log("Registration successful e-mail:", result);
    }
  } catch (err) {
    console.error(err);
  }
};

module.exports.verify_email_get = async (req: any, res: any) => {
  let verificationResult: {
    status: EmailVerificationStatus;
    message: string;
  } = {
    status: EmailVerificationStatus.UNKNOWN,
    message: "unknown error",
  };

  try {
    const token = req.query.token as string;
    const decodedToken = jwt.verify(
      token,
      process.env.EMAIL_VERIFICATION_SECRET!
    ) as { userId: string };

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
  } catch (e: any) {
    console.error(`e=${e}`);
    if (e.name && e.name === "TokenExpiredError") {
      verificationResult = {
        status: EmailVerificationStatus.TOKEN_EXPIRED,
        message: "Die Gültigkeit des Link ist abgelaufen",
      };
    } else if (e.name && e.name === "JsonWebTokenError") {
      verificationResult = {
        status: EmailVerificationStatus.INVALID_SIGNATURE,
        message: "Der Link ist ungültig",
      };
    }
  } finally {
    res.render("verify-email", {
      EmailVerificationStatus: EmailVerificationStatus, // make enum known to EJS
      verificationResult,
    });
  }
};

/**
 * User signup (optionally by admin)
 * Signup by admin will not trigger e-mail verification
 */
module.exports.signup_post = async (req: any, res: any) => {
  let {
    email,
    password,
    passwordRepeat,
    firstName, // TODO: Mindestlänge 2 wg. User Id
    lastName,
    voice,
  } = req.body;

  try {
    const byAdmin = !password;

    let isManuallyRegistered;
    if (byAdmin) {
      password = `${process.env.MANUAL_REGISTRATION_PASSWORD}`; // not critical because e-mail verification required to activate account
      isManuallyRegistered = true;
      if (email == "") {
        email = undefined; // will avoid duplicate key error
      }
    } else {
      if (password !== passwordRepeat) {
        throw new Error("repeated password wrong");
      }
      isManuallyRegistered = false;
    }

    firstName = firstName.trim();
    lastName = lastName.trim();
    const userId = User.generateUserId(firstName, lastName);
    if (!userId) {
      res.status(400).json({
        status: `Interner Fehler bei Bildung der User id. Bitte den HSC kontaktieren unter ${process.env.SMTP_FROM}!`,
      });
    }

    const verificationToken = byAdmin
      ? undefined
      : Math.random().toString(36).substring(2);

    try {
      const user = await User.create({
        id: userId,
        email,
        password,
        firstName,
        lastName,
        voice,
        verificationToken,
        isManuallyRegistered,
      });
      res.status(201).json({ user: user._id });
    } catch (createError: any) {
      // Check if it's a duplicate key error for userId
      if (createError.code === 11000 && createError.keyValue?.id) {
        // Find the existing user with this userId
        const existingUser = await User.findOne({ id: userId });

        // Check if it's a manually registered user with empty email
        if (
          existingUser &&
          existingUser.isManuallyRegistered &&
          !existingUser.email
        ) {
          // Update the existing user with new data
          existingUser.email = email;
          existingUser.password = password;
          existingUser.firstName = firstName;
          existingUser.lastName = lastName;
          existingUser.voice = voice;
          existingUser.verificationToken = verificationToken;
          existingUser.isManuallyRegistered = isManuallyRegistered;
          existingUser.isPasswordHashed = false; // Will trigger re-hashing

          await existingUser.save();
          res.status(201).json({ user: existingUser._id });
        } else {
          // It's a real duplicate - throw the error to be handled below
          throw createError;
        }
      } else {
        // Other errors - throw to be handled below
        throw createError;
      }
    }
  } catch (err: any) {
    let type: string | undefined = undefined;
    if (err.keyValue?.id) {
      type = "userId";
    } else if (err.keyValue?.email) {
      type = "email";
    }
    const errors = handleSaveErrors(err, type);
    res.status(400).json({ errors });
  }
};

module.exports.login_post = async (req: any, res: any) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);
    const token = createToken(user._id);
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAgeMin * 1000 });
    res.status(200).json({ user: user._id });
  } catch (err) {
    const errors = handleSaveErrors(err, "email");
    res.status(400).json({ errors });
  }
};

module.exports.logout_get = (req: any, res: any) => {
  res.cookie("jwt", "", { maxAge: 1 });
  res.redirect("/");
};

module.exports.password_forgotten_post = async (req: any, res: any) => {
  const { email } = req.body;
  try {
    const user: any = await User.findOne({ email });
    if (user) {
      // E-Mail senden
      await sendPasswordResetEmail(user);
      console.log("password reset successfully requested for: ", email);
    } else {
      console.log(
        "password reset requested for unknown e-mail address: ",
        email
      );
    }
    res.status(201).json({});
  } catch (err) {}
};

async function sendPasswordResetEmail(user: any) {
  const token = jwt.sign(
    { userId: user._id },
    process.env.EMAIL_VERIFICATION_SECRET!,
    { expiresIn: (getEnvVar("EMAIL_JWT_EXPIRY") || "24h") as StringValue }
  );
  const resetPasswordUrl = `${process.env.CYCLIC_URL}/verify-password-reset-email?token=${token}`;
  const email = user.email;
  const subject = "Passwort Zurücksetzen";
  const html = `
  Du hast diese Mail erhalten weil du bei der Notenverwaltung des Hans-Sachs-Chor ein Zurücksetzen des Passwort angefordert hast.<br>
  Bitte klicke auf den folgenden Link um dein Passwort zurückzusetzen: <a href="${resetPasswordUrl}">${resetPasswordUrl}</a>
  `;
  const mailOptions = { from: process.env.SMTP_FROM, to: email, subject, html };
  try {
    const result = await mailTransporter.sendMail(mailOptions);
    if (mailTransporter.logger) {
      console.log("Password reset e-mail:", result);
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}

module.exports.password_forgotten_success_get = (req: any, res: any) => {
  res.render("password-forgotten-success");
};

module.exports.verify_password_reset_email_get = async (req: any, res: any) => {
  let verificationResult: {
    userId: string | undefined;
    status: EmailVerificationStatus;
    message: string;
  } = {
    userId: undefined,
    status: EmailVerificationStatus.UNKNOWN,
    message: "unknown error",
  };

  try {
    const token = req.query.token as string;
    const decodedToken = jwt.verify(
      token,
      process.env.EMAIL_VERIFICATION_SECRET!
    ) as { userId: string };

    const user = await User.findById(decodedToken.userId);
    if (user) {
      verificationResult = {
        userId: user.id,
        status: EmailVerificationStatus.OK,
        message: "Die E-Mail Adresse wurde erfolgreich verifiziert",
      };
    } else {
      verificationResult = {
        userId: undefined,
        status: EmailVerificationStatus.NOT_REGISTERED,
        message: "Benutzer nicht gefunden",
      };
    }
  } catch (e: any) {
    console.error(`e=${e}`);
    if (e.name && e.name === "TokenExpiredError") {
      verificationResult = {
        userId: undefined,
        status: EmailVerificationStatus.TOKEN_EXPIRED,
        message: "Die Gültigkeit des Link ist abgelaufen",
      };
    } else if (e.name && e.name === "JsonWebTokenError") {
      verificationResult = {
        userId: undefined,
        status: EmailVerificationStatus.INVALID_SIGNATURE,
        message: "Der Link ist ungültig",
      };
    }
  } finally {
    res.render("password-reset", {
      EmailVerificationStatus: EmailVerificationStatus, // make enum known to EJS
      verificationResult,
    });
  }
};

module.exports.password_reset_post = async (req: any, res: any) => {
  let { userId, password, passwordRepeat } = req.body;

  // TODO: insecure; anyone can reset a password if the person knows a valid userId

  try {
    if (password !== passwordRepeat) {
      throw new Error("repeated password wrong");
    }

    const user = await User.findOne({ id: userId });
    if (user) {
      user.password = password;
      user.isPasswordHashed = false;

      // if user not verified yet, set as verified because password reset proves e-mail ok
      if (!user.isVerified) {
        user.isVerified = true;
        user.isManuallyRegistered = false;
        await sendVerificationSuccessfulEmail(user);
      }

      await user.save();

      res.status(201).json({ user: user.id });
    } else {
      res.status(400).json({ errors: `User with Id ${userId} not found` });
    }
  } catch (err: any) {
    let type: string | undefined = undefined;
    const errors = handleSaveErrors(err, type);
    res.status(400).json({ errors });
  }
};

module.exports.password_reset_success_get = (req: any, res: any) => {
  res.render("password-reset-success");
};

module.exports.not_verified_post = async (req: any, res: any) => {
  const user = res.locals.user;
  if (user) {
    if (!user.isVerified) {
      const verificationToken = Math.random().toString(36).substring(2);
      user.verificationToken = verificationToken;
      await user.save(); // will send verification e-mail
      res.status(201).json({ user: user._id });
    } else {
      res.status(400).json({ errors: `User ${user.id} already verified` });
    }
  } else {
    res.status(400).json({ errors: `User not found in response` });
  }
};
