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
const uuid_1 = require("uuid");
const misc_utils_1 = require("../utils/misc-utils");
require("dotenv").config();
var QRCode = require("qrcode");
const handleSaveErrors = (err, type) => {
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
        }
        else if (type == "email") {
            errors.email = "Diese E-Mail Adresse ist bereits in Verwendung";
        }
        else if (type == "userId") {
            errors.userId =
                "Die aus Vor- und Nachnamen gebildete User Id ist bereits in Verwendung. Bitte HSC kontaktieren!";
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
    res.render("signup", {
        admin: false,
        voices: Object.values(User_1.Voice),
        voiceMap: User_1.voiceMap,
    });
};
module.exports.signup_user_get = (req, res) => {
    res.render("signup", {
        admin: true,
        voices: Object.values(User_1.Voice),
        voiceMap: User_1.voiceMap,
    });
};
module.exports.signup_success_get = (req, res) => {
    const { admin } = req.query;
    res.render("signup-success", {
        admin: admin == "true",
    });
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
            // const imageData = fs.readFileSync(
            //   __dirname + "/../resources/hsc-logo-black.png"  // TODO: geht nicht auch cyclic
            // );
            // zip.file("logo.png", imageData);
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
    const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "5y" } // TODO: check in "y" valid
    );
    // das sparen wir uns vorerst mal
    // await createEspassFile(token); // TODO: in Memory statt speichern
    try {
        // const text = "userId=" + user._id + "&email=" + user.email;
        const url = yield QRCode.toDataURL(token);
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
        const result = yield misc_utils_1.mailTransporter.sendMail(mailOptions);
        if (misc_utils_1.mailTransporter.logger) {
            console.log("Registration successful e-mail:", result);
        }
    }
    catch (err) {
        console.error(err);
    }
});
module.exports.verify_email_get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.query.token;
    const decodedToken = jsonwebtoken_1.default.verify(
    // TODO: handle Exception if JWT expired
    token, process.env.EMAIL_VERIFICATION_SECRET);
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
/**
 * User signup (optionally by admin)
 * Signup by admin will not trigger e-mail verification
 */
module.exports.signup_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    let { email, password, passwordRepeat, firstName, // TODO: Mindestlänge 2 wg. User Id
    lastName, voice, } = req.body;
    try {
        const byAdmin = !password;
        let isManuallyRegistered;
        if (byAdmin) {
            password = `${process.env.MANUAL_REGISTRATION_PASSWORD}`; // not critical because e-mail verification required to activate account
            isManuallyRegistered = true;
            if (email == "") {
                email = undefined; // will avoid duplicate key error
            }
        }
        else {
            if (password !== passwordRepeat) {
                throw new Error("repeated password wrong");
            }
            isManuallyRegistered = false;
        }
        firstName = firstName.trim();
        lastName = lastName.trim();
        const userId = User_1.User.generateUserId(firstName, lastName);
        if (!userId) {
            res.status(400).json({
                status: `Interner Fehler bei Bildung der User id. Bitte den HSC kontaktieren unter ${process.env.SMTP_FROM}!`,
            });
        }
        const verificationToken = byAdmin
            ? undefined
            : Math.random().toString(36).substring(2);
        try {
            const user = yield User_1.User.create({
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
        }
        catch (createError) {
            // Check if it's a duplicate key error for userId
            if (createError.code === 11000 && ((_a = createError.keyValue) === null || _a === void 0 ? void 0 : _a.id)) {
                // Find the existing user with this userId
                const existingUser = yield User_1.User.findOne({ id: userId });
                // Check if it's a manually registered user with empty email
                if (existingUser &&
                    existingUser.isManuallyRegistered &&
                    !existingUser.email) {
                    // Update the existing user with new data
                    existingUser.email = email;
                    existingUser.password = password;
                    existingUser.firstName = firstName;
                    existingUser.lastName = lastName;
                    existingUser.voice = voice;
                    existingUser.verificationToken = verificationToken;
                    existingUser.isManuallyRegistered = isManuallyRegistered;
                    existingUser.isPasswordHashed = false; // Will trigger re-hashing
                    yield existingUser.save();
                    res.status(201).json({ user: existingUser._id });
                }
                else {
                    // It's a real duplicate - throw the error to be handled below
                    throw createError;
                }
            }
            else {
                // Other errors - throw to be handled below
                throw createError;
            }
        }
    }
    catch (err) {
        let type = undefined;
        if ((_b = err.keyValue) === null || _b === void 0 ? void 0 : _b.id) {
            type = "userId";
        }
        else if ((_c = err.keyValue) === null || _c === void 0 ? void 0 : _c.email) {
            type = "email";
        }
        const errors = handleSaveErrors(err, type);
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
        const errors = handleSaveErrors(err, "email");
        res.status(400).json({ errors });
    }
});
module.exports.logout_get = (req, res) => {
    res.cookie("jwt", "", { maxAge: 1 });
    res.redirect("/");
};
module.exports.password_forgotten_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    try {
        const user = yield User_1.User.findOne({ email });
        if (user) {
            // E-Mail senden
            yield sendPasswordResetEmail(user);
            console.log("password reset successfully requested for: ", email);
        }
        else {
            console.log("password reset requested for unknown e-mail address: ", email);
        }
        res.status(201).json({});
    }
    catch (err) { }
});
function sendPasswordResetEmail(user) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.EMAIL_VERIFICATION_SECRET, { expiresIn: "1h" });
        const resetPasswordUrl = `${process.env.CYCLIC_URL}/verify-password-reset-email?token=${token}`;
        const email = user.email;
        const subject = "Passwort Zurücksetzen";
        const html = `
  Du hast diese Mail erhalten weil du bei der Notenverwaltung des Hans-Sachs-Chor ein Zurücksetzen des Passwort angefordert hast.<br>
  Bitte klicke auf den folgenden Link um dein Passwort zurückzusetzen: <a href="${resetPasswordUrl}">${resetPasswordUrl}</a>
  `;
        const mailOptions = { from: process.env.SMTP_FROM, to: email, subject, html };
        try {
            const result = yield misc_utils_1.mailTransporter.sendMail(mailOptions);
            if (misc_utils_1.mailTransporter.logger) {
                console.log("Password reset e-mail:", result);
            }
        }
        catch (e) {
            console.error(e);
            throw e;
        }
    });
}
module.exports.password_forgotten_success_get = (req, res) => {
    res.render("password-forgotten-success");
};
module.exports.verify_password_reset_email_get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.query.token;
    const decodedToken = jsonwebtoken_1.default.verify(
    // TODO: handle Exception if JWT expired
    token, process.env.EMAIL_VERIFICATION_SECRET);
    let verificationResult;
    const user = yield User_1.User.findById(decodedToken.userId);
    if (user) {
        verificationResult = {
            userId: user.id,
            status: EmailVerificationStatus.OK,
            message: "Die E-Mail Adresse wurde erfolgreich verifiziert",
        };
    }
    else {
        verificationResult = {
            userId: undefined,
            status: EmailVerificationStatus.NOT_REGISTERED,
            message: "Benutzer nicht gefunden",
        };
    }
    res.render("password-reset", {
        EmailVerificationStatus: EmailVerificationStatus,
        verificationResult: verificationResult,
    });
});
module.exports.password_reset_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { userId, password, passwordRepeat } = req.body;
    try {
        if (password !== passwordRepeat) {
            throw new Error("repeated password wrong");
        }
        const user = yield User_1.User.findOne({ id: userId });
        if (user) {
            user.password = password;
            user.isPasswordHashed = false;
            // if user not verified yet, set as verified because password reset proves e-mail ok
            if (!user.isVerified) {
                user.isVerified = true;
                user.isManuallyRegistered = false;
                yield sendVerificationSuccessfulEmail(user);
            }
            yield user.save();
            res.status(201).json({ user: user.id });
        }
        else {
            res.status(400).json({ errors: `User with Id ${userId} not found` });
        }
    }
    catch (err) {
        let type = undefined;
        const errors = handleSaveErrors(err, type);
        res.status(400).json({ errors });
    }
});
module.exports.password_reset_success_get = (req, res) => {
    res.render("password-reset-success");
};
module.exports.not_verified_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = res.locals.user;
    if (user) {
        if (!user.isVerified) {
            const verificationToken = Math.random().toString(36).substring(2);
            user.verificationToken = verificationToken;
            yield user.save(); // will send verification e-mail
            res.status(201).json({ user: user._id });
        }
        else {
            res.status(400).json({ errors: `User ${user.id} already verified` });
        }
    }
    else {
        res.status(400).json({ errors: `User not found in response` });
    }
});
