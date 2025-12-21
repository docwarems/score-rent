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
const email_queue_utils_1 = require("../utils/email-queue-utils");
require("dotenv").config();
var QRCode = require("qrcode");
const handleSaveErrors = (err, type) => {
    console.error(err.message, err.code);
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
            errors.email =
                "Diese E-Mail Adresse ist bereits in Verwendung. Bitte nutze die Passwort-Vergessen-Funktion auf der Login-Seite.";
        }
        else if (type == "userId") {
            // should not occur anymore since we now add a suffix in this case
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
// age in min of auth JWT and cookie
const maxAgeMin = 60 * 60;
const createToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: maxAgeMin,
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
    var _a;
    const isAdmin = ((_a = res.locals.user) === null || _a === void 0 ? void 0 : _a.isAdmin) || false;
    res.render("signup-success", {
        admin: isAdmin,
    });
};
module.exports.login_get = (req, res) => {
    res.render("login");
};
var EmailVerificationStatus;
(function (EmailVerificationStatus) {
    EmailVerificationStatus[EmailVerificationStatus["UNKNOWN"] = 0] = "UNKNOWN";
    EmailVerificationStatus[EmailVerificationStatus["OK"] = 1] = "OK";
    EmailVerificationStatus[EmailVerificationStatus["NOT_REGISTERED"] = 2] = "NOT_REGISTERED";
    EmailVerificationStatus[EmailVerificationStatus["ALREADY_VERFIED"] = 3] = "ALREADY_VERFIED";
    EmailVerificationStatus[EmailVerificationStatus["TOKEN_EXPIRED"] = 4] = "TOKEN_EXPIRED";
    EmailVerificationStatus[EmailVerificationStatus["INVALID_SIGNATURE"] = 5] = "INVALID_SIGNATURE";
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
    const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "5y" });
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
            priority: true,
        };
        const result = yield email_queue_utils_1.emailQueueService.queueEmail(mailOptions);
        if (misc_utils_1.mailTransporter.logger) {
            console.log("Registration successful e-mail:", result);
        }
    }
    catch (err) {
        console.error(err);
    }
});
module.exports.verify_email_get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let verificationResult = {
        status: EmailVerificationStatus.UNKNOWN,
        message: "unknown error",
    };
    try {
        const token = req.query.token;
        const decodedToken = jsonwebtoken_1.default.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
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
    }
    catch (e) {
        console.error(`e=${e}`);
        if (e.name && e.name === "TokenExpiredError") {
            verificationResult = {
                status: EmailVerificationStatus.TOKEN_EXPIRED,
                message: "Die Gültigkeit des Link ist abgelaufen",
            };
        }
        else if (e.name && e.name === "JsonWebTokenError") {
            verificationResult = {
                status: EmailVerificationStatus.INVALID_SIGNATURE,
                message: "Der Link ist ungültig",
            };
        }
    }
    finally {
        res.render("verify-email", {
            EmailVerificationStatus: EmailVerificationStatus,
            verificationResult,
        });
    }
});
/**
 * User signup (optionally by admin)
 * Signup by admin will not trigger e-mail verification
 *
 * TODO: jeder kann hier die Clientseitigen Prüfungen umgehen
 */
module.exports.signup_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield signup(req, res);
});
module.exports.signup_user_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield signup(req, res, true);
});
/**
 * Check if a user is trying to re-register with the same email and name
 * Returns true if both email and userId exist and belong to the same user
 */
function checkDuplicateUserRegistration(email, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!email)
            return false;
        const existingUserByEmail = yield User_1.User.findOne({ email });
        const existingUserById = yield User_1.User.findOne({ id: userId });
        return (!!existingUserByEmail &&
            !!existingUserById &&
            existingUserByEmail.id === existingUserById.id);
    });
}
/**
 * Check if a manually registered user (no email) exists and can be updated
 * Returns the user if found and eligible for update, null otherwise
 */
function findManualUserForUpdate(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const existingUser = yield User_1.User.findOne({ id: userId });
        if (existingUser &&
            existingUser.isManuallyRegistered &&
            !existingUser.email) {
            return existingUser;
        }
        return null;
    });
}
/**
 * Update a manually registered user with new registration data
 */
function updateManualUser(existingUser, userData) {
    return __awaiter(this, void 0, void 0, function* () {
        existingUser.email = userData.email;
        existingUser.password = userData.password;
        existingUser.firstName = userData.firstName;
        existingUser.lastName = userData.lastName;
        existingUser.voice = userData.voice;
        existingUser.verificationToken = userData.verificationToken;
        existingUser.isManuallyRegistered = userData.isManuallyRegistered;
        existingUser.isPasswordHashed = false; // Will trigger re-hashing
        yield existingUser.save();
        return existingUser;
    });
}
/**
 * Attempt to create a new user with automatic userId suffix handling
 * Returns the created/updated user or throws an error
 */
function createUserWithRetry(userData, baseUserId, maxAttempts = 5) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let userId = baseUserId;
        let attempts = 0;
        while (attempts < maxAttempts) {
            attempts++;
            try {
                const user = yield User_1.User.create(Object.assign({ id: userId }, userData));
                return user;
            }
            catch (createError) {
                // Check if it's a duplicate userId error
                if (createError.code === 11000 && ((_a = createError.keyValue) === null || _a === void 0 ? void 0 : _a.id)) {
                    // Check if we can update an existing manual user
                    const manualUser = yield findManualUserForUpdate(userId);
                    if (manualUser) {
                        return yield updateManualUser(manualUser, userData);
                    }
                    // Otherwise, increment suffix and try again
                    userId = (0, User_1.incrementUserIdSuffix)(userId);
                }
                else {
                    // Other errors - throw immediately
                    throw createError;
                }
            }
        }
        throw new Error(`Failed to create user after ${maxAttempts} attempts. Please contact support.`);
    });
}
const signup = (req, res, byAdmin = false) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let { email, password, passwordRepeat, firstName, lastName, voice } = req.body;
    try {
        // Admin authorization check
        if (byAdmin && (!res.locals.user || !res.locals.user.isAdmin)) {
            return res.status(403).json({ errors: "Admin access required" });
        }
        // Handle admin vs user registration differences
        const isManuallyRegistered = byAdmin;
        if (byAdmin) {
            password = `${process.env.MANUAL_REGISTRATION_PASSWORD}`;
            if (email === "") {
                email = undefined; // Avoid duplicate key error
            }
        }
        else {
            if (password !== passwordRepeat) {
                throw new Error("repeated password wrong");
            }
        }
        // Generate userId
        firstName = firstName.trim();
        lastName = lastName.trim();
        const userId = User_1.User.generateUserId(firstName, lastName);
        if (!userId) {
            return res.status(400).json({
                status: `Interner Fehler bei Bildung der User id. Bitte den HSC kontaktieren unter ${process.env.SMTP_FROM}!`,
            });
        }
        // Generate verification token for non-admin signups
        const verificationToken = byAdmin
            ? undefined
            : Math.random().toString(36).substring(2);
        // Check if user is trying to re-register (same email + name)
        if (yield checkDuplicateUserRegistration(email, userId)) {
            return res.status(400).json({
                errors: {
                    email: "Ein Konto mit dieser E-Mail und diesem Namen existiert bereits. Bitte nutze die Passwort-Vergessen-Funktion auf der Login-Seite.",
                    userId: "",
                },
            });
        }
        // Create user with automatic userId suffix handling
        const user = yield createUserWithRetry({
            email,
            password,
            firstName,
            lastName,
            voice,
            verificationToken,
            isManuallyRegistered,
        }, userId);
        res.status(201).json({ user: user._id });
    }
    catch (err) {
        // Determine error type for appropriate error message
        let type = undefined;
        if ((_a = err.keyValue) === null || _a === void 0 ? void 0 : _a.id) {
            type = "userId";
        }
        else if ((_b = err.keyValue) === null || _b === void 0 ? void 0 : _b.email) {
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
        res.cookie("jwt", token, { httpOnly: true, maxAge: maxAgeMin * 1000 });
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
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.EMAIL_VERIFICATION_SECRET, { expiresIn: ((0, misc_utils_1.getEnvVar)("EMAIL_JWT_EXPIRY") || "24h") });
        const resetPasswordUrl = `${process.env.CYCLIC_URL}/verify-password-reset-email?token=${token}`;
        const email = user.email;
        const subject = "Passwort Zurücksetzen";
        const html = `
  Du hast diese Mail erhalten weil du bei der Notenverwaltung des Hans-Sachs-Chor ein Zurücksetzen des Passwort angefordert hast.<br>
  Bitte klicke auf den folgenden Link um dein Passwort zurückzusetzen: <a href="${resetPasswordUrl}">${resetPasswordUrl}</a>
  `;
        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: email,
            subject,
            html,
            priority: true,
        };
        try {
            const result = yield email_queue_utils_1.emailQueueService.queueEmail(mailOptions);
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
    let verificationResult = {
        status: EmailVerificationStatus.UNKNOWN,
        message: "unknown error",
    };
    const token = req.query.token;
    try {
        const decodedToken = jsonwebtoken_1.default.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
        const user = yield User_1.User.findById(decodedToken.userId);
        if (user) {
            verificationResult = {
                status: EmailVerificationStatus.OK,
                message: "Die E-Mail Adresse wurde erfolgreich verifiziert",
            };
        }
        else {
            verificationResult = {
                status: EmailVerificationStatus.NOT_REGISTERED,
                message: "Benutzer nicht gefunden",
            };
        }
    }
    catch (e) {
        console.error(`verify_password_reset_email_get error: ${e}`);
        if (e.name && e.name === "TokenExpiredError") {
            verificationResult = {
                status: EmailVerificationStatus.TOKEN_EXPIRED,
                message: "Die Gültigkeit des Link ist abgelaufen",
            };
        }
        else if (e.name && e.name === "JsonWebTokenError") {
            verificationResult = {
                status: EmailVerificationStatus.INVALID_SIGNATURE,
                message: "Der Link ist ungültig",
            };
        }
    }
    finally {
        res.render("password-reset", {
            EmailVerificationStatus: EmailVerificationStatus,
            verificationResult,
            token,
        });
    }
});
module.exports.password_reset_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { token, password, passwordRepeat } = req.body;
    try {
        const decodedToken = jsonwebtoken_1.default.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
        if (password !== passwordRepeat) {
            throw new Error("repeated password wrong");
        }
        // const user = await User.findOne({ id: decodedToken.userId });
        const user = yield User_1.User.findById(decodedToken.userId);
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
            res
                .status(400)
                .json({ errors: `User with Id ${decodedToken.userId} not found` });
        }
    }
    catch (e) {
        if (e.name && e.name === "TokenExpiredError") {
            res.status(400).json({ errors: `Password reset request expired` });
        }
        else if (e.name && e.name === "JsonWebTokenError") {
            res.status(400).json({ errors: `Password reset request invalid` });
        }
        // other errors TODO: fragwürdig ob das hier passt
        let type = undefined;
        const errors = handleSaveErrors(e, type);
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
