"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = require("../models/User");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
require("dotenv").config();
const nodemailer_1 = __importDefault(require("nodemailer"));
var QRCode = require("qrcode");
// handle errors
const handleErrors = (err) => {
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
        Object.values(err.errors).forEach(({ properties }) => {
            errors[properties.path] = properties.message;
        });
    }
    return errors;
};
// create json web token
const maxAge = 3 * 24 * 60 * 60;
const createToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: maxAge,
    });
};
// controller actions
module.exports.signup_get = (req, res) => {
    res.render("signup");
};
module.exports.signup_success_get = (req, res) => {
    res.render("signup-success");
};
module.exports.login_get = (req, res) => {
    res.render("login");
};
var EmailVerificationStatus;
(function (EmailVerificationStatus) {
    EmailVerificationStatus[EmailVerificationStatus["OK"] = 0] = "OK";
    EmailVerificationStatus[EmailVerificationStatus["NOT_REGISTERED"] = 1] = "NOT_REGISTERED";
    EmailVerificationStatus[EmailVerificationStatus["ALREADY_VERFIED"] = 2] = "ALREADY_VERFIED";
})(EmailVerificationStatus || (EmailVerificationStatus = {}));
// Create a nodemailer transporter TODO: dupliziert von app.ts
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    greetingTimeout: 1000 * 10,
    logger: !!process.env.SMTP_DEBUG && process.env.SMTP_DEBUG.toLowerCase() == "true",
});
// Send email to the user after successful registration and verification
const sendVerificationSuccessfulEmail = (user) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const text = "userId=" + user._id + "&email=" + user.email;
        const url = yield QRCode.toDataURL(text);
        // console.log(text, url);
        const email = user.email;
        const subject = "Registrierung erfolgreich";
        const html = `
    Bitte speichern Sie den folgenden QRCode. Er wird für das Ausleihen von Noten benötigt.
    <p></p>
    E-Mail: ${user.email}<br>
    Name: ${user.firstName}&nbsp;${user.lastName}
    <p></p>      
    Embedded image: <img src="${url}"/>'
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
        const result = yield transporter.sendMail(mailOptions);
        if (transporter.logger) {
            console.log("Registration successful e-mail:", result);
        }
    }
    catch (err) {
        console.error(err);
    }
});
module.exports.verify_email_get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.query.token;
    const decodedToken = jsonwebtoken_1.default.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
    let verificationResult;
    const user = yield User_1.User.findById(decodedToken.userId);
    if (!user) {
        verificationResult = {
            status: EmailVerificationStatus.NOT_REGISTERED,
            message: "Benutzer nicht gefunden",
        };
    }
    else if (user.isVerified) {
        verificationResult = {
            status: EmailVerificationStatus.ALREADY_VERFIED,
            message: "Die E-Mail Adresse wurde bereits verifiziert",
        };
    }
    else {
        user.isVerified = true;
        user.verificationToken = undefined;
        try {
            yield user.save();
            yield sendVerificationSuccessfulEmail(user);
            verificationResult = {
                status: EmailVerificationStatus.OK,
                message: "Die E-Mail Adresse wurde erfolgreich verifiziert",
            };
        }
        catch (error) {
            console.error("Error verifying email", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
    res.render("verify-email", {
        EmailVerificationStatus: EmailVerificationStatus,
        verificationResult: verificationResult,
    });
});
module.exports.signup_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, passwordRepeat, firstName, lastName, verificationToken, } = req.body;
    try {
        if (password !== passwordRepeat) {
            throw new Error("repeated password wrong");
        }
        const verificationToken = Math.random().toString(36).substr(2);
        const user = yield User_1.User.create({
            email,
            password,
            firstName,
            lastName,
            verificationToken,
        });
        const token = createToken(user._id);
        res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
        res.status(201).json({ user: user._id });
    }
    catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
});
module.exports.login_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield User_1.User.login(email, password);
        const token = createToken(user._id);
        res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
        res.status(200).json({ user: user._id });
    }
    catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
});
module.exports.logout_get = (req, res) => {
    res.cookie("jwt", "", { maxAge: 1 });
    res.redirect("/");
};