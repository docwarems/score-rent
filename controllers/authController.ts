import { User } from "../models/User";
import { Score, ScoreType } from "../models/Score";
import { Checkout, checkoutSchema } from "../models/Checkout";
import jwt from "jsonwebtoken";
require("dotenv").config();
import nodemailer from "nodemailer";
var QRCode = require("qrcode");
import { v4 as uuidv4 } from "uuid";
import { score } from "../routes/authRoutes";
import mongoose from "mongoose";

// handle errors
const handleErrors = (err: any, type: string) => {
  console.log(err.message, err.code);
  let errors = {
    email: "",
    password: "",
    passwordRepeat: "",
    lastName: "",
    signature: "",
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
    if (type == "email") {
      errors.email = "Diese E-Mail Adresse ist bereits in Verwendung";
    } else if (type == "signature") {
      errors.signature = "Diese Notensignatur ist bereits in Verwendung";
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

// create json web token
const maxAge = 60 * 60;
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
    const imageData = fs.readFileSync(
      __dirname + "/../resources/hsc-logo-black.png"
    );
    zip.file("logo.png", imageData);
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
    { userId: user._id, email: user.email },
    process.env.EMAIL_VERIFICATION_SECRET!,
    { expiresIn: "5y" } // TODO: check in "y" valid
  );

  await createEspassFile(token); // TODO: in Memory statt speichern

  try {
    // const text = "userId=" + user._id + "&email=" + user.email;
    const url = await QRCode.toDataURL(token);

    const email = user.email;
    const subject = "Registrierung erfolgreich";
    const html = `
    Bitte speichern Sie den folgenden QRCode. Er wird für das Ausleihen von Noten benötigt.
    <p></p>
    E-Mail: ${user.email}<br>
    Name: ${user.firstName}&nbsp;${user.lastName}
    <p></p>      
    QR Code: <img src="${url}"/>    
  `;

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject,
      html,
      attachments: [{ path: url }, { path: "/tmp/hsc-noten.espass" }],
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
    res.status(201).json({ user: user._id });
  } catch (err) {
    const errors = handleErrors(err, "email");
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
    const errors = handleErrors(err, "email");
    res.status(400).json({ errors });
  }
};

module.exports.logout_get = (req: any, res: any) => {
  res.cookie("jwt", "", { maxAge: 1 });
  res.redirect("/");
};

module.exports.register_score_get = (req: any, res: any) => {
  res.redirect("/register-score");
};

module.exports.register_score_post = async (req: any, res: any) => {
  const { composer, work, signature, count } = req.body;

  try {
    const scoreType = await ScoreType.create({
      composer,
      work,
      signature,
      count,
    });

    // Nun die einzelnen Exemplare speichern
    for (let i = 1; i <= count; i++) {
      try {
        const score = await Score.create({
          signature,
          id: signature + "-" + i,
        });
      } catch (error) {
        console.error("Error creating score", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }

    res.status(201).json({ scoreType: scoreType._id });
  } catch (err) {
    const errors = handleErrors(err, "signature");
    res.status(400).json({ errors });
  }
};

module.exports.checkout_get = (req: any, res: any) => {
  res.redirect("/checkout");
};

module.exports.checkout_post = async (req: any, res: any) => {
  const { userId, scoreId, comment, allowDoubleCheckout } = req.body;

  try {
    if (userId && scoreId) {
      let score = await Score.findOne({ id: scoreId });
      if (score) {
        // check if this user already checked out a copy of this score type
        const scoreTypeId = scoreId.substr(
          0,
          (scoreId as string).lastIndexOf("-")
        );
        const existingScores = await Score.find({ checkedOutByUserId: userId });
        const existingScoreOfCurrentType = existingScores.find(
          (score) =>
            score.id.substr(0, score.id.lastIndexOf("-")) === scoreTypeId
        );
        const doubleCheckoutIsAllowed = allowDoubleCheckout === "allow";
        if (
          !existingScoreOfCurrentType ||
          (doubleCheckoutIsAllowed && comment)
        ) {
          const checkout = new Checkout({
            userId,
            scoreId,
            checkoutComment: comment,
            checkoutTimestamp: new Date(),
          });
          score.checkedOutByUserId = userId;
          score.checkouts.push(checkout);
          score = await score.save();
          if (score) {
            res.status(201).json({ checkoutScore: score });
          } else {
            res
              .status(400)
              .json({ errors: "Update score with checkout record failed" });
          }
        } else {
          res.status(400).json({
            errors: `User with Id ${userId} has already checked out score Id ${existingScoreOfCurrentType.id}. To allow another checkout check checkbox and specify reason in comment field.`,
          });
        }
      }
    } else if (scoreId) {
      const score = await Score.findOne({ id: scoreId });

      if (score) {
        const checkedOutByUserId = score.checkedOutByUserId;
        if (checkedOutByUserId) {
          // res.status(400).json({ message: `Score ${scoreId} already checked out by user Id ${checkedOutByUserId}` });
          res.status(400).json({
            errors: `Score ${scoreId} already checked out by user Id ${checkedOutByUserId}`,
          });
        } else {
          res.status(201).json({ checkoutScore: score });
        }
      } else {
        res.status(400).json({ errors: `Score with Id ${scoreId} not found` });
      }
    } else if (userId) {
      const user = await User.findOne({ _id: userId });

      if (user) {
        res.status(201).json({ checkoutUser: user });
      } else {
        res.status(400).json({ errors: `User with Id ${userId} not found` });
      }
    }
  } catch (error) {
    res.status(500).json({ error });
  }
};

module.exports.checkin_post = async (req: any, res: any) => {
  const { scoreId, comment } = req.body;

  try {
    if (scoreId && comment) {
      let score = await Score.findOne({ id: scoreId });
      if (score) {
        if (score.checkedOutByUserId) {
          // current checkout record should last element of array
          const checkout = score.checkouts[score.checkouts.length - 1];
          if (checkout.checkinTimestamp) {
            res.status(400).json({
              errors: `Checkout record not found for score with Id ${scoreId}`,
            });
          } else {
            score.checkedOutByUserId = "";
            checkout.checkinTimestamp = new Date();
            checkout.checkinComment = comment;

            score = await score.save();
            if (score) {
              res.status(201).json({ checkinScore: score });
            } else {
              res
                .status(400)
                .json({ errors: "Update score with checkout record failed" });
            }
          }
        }
      } else {
        res.status(400).json({
          errors: `Found score with Id ${scoreId} but it's not checked out`,
        });
      }
    } else if (scoreId) {
      const score = await Score.findOne({ id: scoreId });

      if (score) {
        const checkedOutByUserId = score.checkedOutByUserId;
        if (checkedOutByUserId) {
          const user = await User.findOne({ _id: checkedOutByUserId });
          if (user) {
            res.status(200).json({ checkinScore: score, checkinUser: user });
          } else {
            res.status(400).json({
              errors: `Score ${scoreId} checked out by user Id ${checkedOutByUserId}, but no user found this id`,
            });
          }
        } else {
          res
            .status(400)
            .json({ errors: `Score with Id ${scoreId} is not checked out` });
        }
      } else {
        res.status(400).json({ errors: `Score with Id ${scoreId} not found` });
      }
      // } else if (userId) {
      //   const user = await User.findOne({ _id: userId });

      //   if (user) {
      //     res.status(201).json({ checkoutUser: user });
      //   } else {
      //     res.status(400).json({ errors: "User not found" });
      //   }
    }
  } catch (error) {
    res.status(500).json({ error });
  }
};

module.exports.checkouts_post = async (req: any, res: any) => {
  const { signature, checkedOut } = req.body;
  const filter = signature ? { signature } : {};
  try {
    const scores = await Score.find(filter, "checkouts") // return only checkouts property
      .populate("checkouts")
      .exec(); // TODO: when exec and when not?

    const userIds = [];  // TODO: Set
    for (const score of scores) {
      for (const checkout of score.checkouts) {
        userIds.push(checkout.userId);
      }
    }
    const userObjectIds = userIds.map(
      (userId) => new mongoose.Types.ObjectId(userId)
    );

    const userMap = await (
      await User.find({ _id: { $in: userObjectIds } })
    ).reduce((map, user) => map.set(user._id.toString(), user), new Map());

    let checkouts = [];
    for (const score of scores) {
      for (const checkout of score.checkouts) {
        const user = userMap.get(checkout.userId);
        checkouts.push({ checkout, user });
      }
    }

    const onlyCheckedOut = checkedOut == "true";
    if (onlyCheckedOut) {
      checkouts = checkouts.filter(
        (checkout: any) => !checkout.checkinTimestamp
      ); // TODO: or filter by checkedOutByUser
    }

    const signatures = [
      { id: "VERD-REQ", name: "Verdi Requiem" },
      { id: "MOZ-REQ", name: "Mozart Requiem" },
    ]; // TODO: from db

    res.render("checkouts", {
      signatures,
      filter: { signature, checkedOut: onlyCheckedOut },
      checkouts: checkouts,
    });
  } catch (error) {
    res.status(500).json({ error });
  }
};
