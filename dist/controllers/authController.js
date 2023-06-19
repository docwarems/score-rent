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
const Score_1 = require("../models/Score");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
require("dotenv").config();
const nodemailer_1 = __importDefault(require("nodemailer"));
var QRCode = require("qrcode");
const uuid_1 = require("uuid");
// handle errors
const handleErrors = (err, type) => {
    console.log(err.message, err.code);
    let errors = { email: "", password: "", passwordRepeat: "", lastName: "", signature: "" };
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
        }
        else if (type == "signature") {
            errors.signature = "Diese Notensignatur ist bereits in Verwendung";
        }
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
const maxAge = 60 * 60;
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
function createEspassFile(token) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            var fs = require("fs");
            var JSZip = require("jszip");
            const id = (0, uuid_1.v4)();
            var zip = new JSZip();
            zip.file("main.json", `{"accentColor":"#ff0000ff","app":"passandroid","barCode":{"format":"QR_CODE","message":"${token}"},"description":"HSC Benutzer","fields":[],"id":"${id}","locations":[],"type":"EVENT","validTimespans":[]}`);
            const imageData = fs.readFileSync(__dirname + "/../resources/hsc-logo-black.png");
            zip.file("logo.png", imageData);
            // ... and other manipulations
            zip
                .generateNodeStream({ type: "nodebuffer", streamFiles: true })
                .pipe(fs.createWriteStream("/tmp/hsc-noten.espass"))
                .on("finish", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    // JSZip generates a readable stream with a "end" event,
                    // but is piped here in a writable stream which emits a "finish" event.
                    console.log("espassfile written.");
                    resolve();
                });
            });
        });
    });
}
// Send email to the user after successful registration and verification
const sendVerificationSuccessfulEmail = (user) => __awaiter(void 0, void 0, void 0, function* () {
    // we encode the user data into a JWT in order to prohibit manual QRCode creation outside the app
    const token = jsonwebtoken_1.default.sign({ userId: user._id, email: user.email }, process.env.EMAIL_VERIFICATION_SECRET, { expiresIn: "5y" } // TODO: check in "y" valid
    );
    yield createEspassFile(token); // TODO: in Memory statt speichern
    try {
        // const text = "userId=" + user._id + "&email=" + user.email;
        const url = yield QRCode.toDataURL(token);
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
        res.status(201).json({ user: user._id });
    }
    catch (err) {
        const errors = handleErrors(err, "email");
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
        const errors = handleErrors(err, "email");
        res.status(400).json({ errors });
    }
});
module.exports.logout_get = (req, res) => {
    res.cookie("jwt", "", { maxAge: 1 });
    res.redirect("/");
};
module.exports.register_score_get = (req, res) => {
    res.redirect("/register-score");
};
module.exports.register_score_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { composer, work, signature, count } = req.body;
    try {
        const scoreType = yield Score_1.ScoreType.create({
            composer,
            work,
            signature,
            count,
        });
        // Nun die einzelnen Exemplare speichern
        for (let i = 1; i <= count; i++) {
            try {
                const score = yield Score_1.Score.create({
                    signature,
                    id: signature + "-" + i,
                });
            }
            catch (error) {
                console.error("Error creating score", error);
                res.status(500).json({ message: "Internal server error" });
            }
        }
        res.status(201).json({ scoreType: scoreType._id });
    }
    catch (err) {
        const errors = handleErrors(err, "signature");
        res.status(400).json({ errors });
    }
});
module.exports.checkout_get = (req, res) => {
    res.redirect("/checkout");
};
module.exports.checkout_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, scoreId } = req.body;
    try {
        if (scoreId) {
            console.log("checkout_post", scoreId);
            const score = yield Score_1.Score.findOne({ _id: "6490059f08678ddf446c7244" });
            if (score) {
                console.log("checkout_post", score);
                res.status(201).json({ checkoutScore: score });
            }
            else {
                res.status(400).json({ message: "Score not found" });
            }
        }
        else if (userId) {
            // const userId = "6489edc05376f9a7898dc898";
            const user = yield User_1.User.findOne({ _id: userId });
            if (user) {
                console.log("checkout_post", user);
                res.status(201).json({ checkoutUser: user });
            }
            else {
                res.status(400).json({ message: "User not found" });
            }
        }
    }
    catch (error) {
        res.status(500).json({ error });
    }
});
