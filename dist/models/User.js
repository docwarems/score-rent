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
exports.User = void 0;
const mongoose_1 = require("mongoose");
const { isEmail } = require("validator");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const nodemailer_1 = __importDefault(require("nodemailer"));
require("dotenv").config();
const userSchema = new mongoose_1.Schema({
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
userSchema.static("login", function login(email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield this.findOne({ email });
        if (user) {
            const auth = yield bcrypt_1.default.compare(password, user.password);
            if (auth) {
                return user;
            }
            throw Error("incorrect password");
        }
        throw Error("incorrect email");
    });
});
// fire a function before doc saved to db
userSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        const salt = yield bcrypt_1.default.genSalt();
        // we must ensure that the password will only be hashed if it is not already hashed
        // we doesn't have a safe criteria for this right now
        if (!this.isVerified) {
            this.password = yield bcrypt_1.default.hash(this.password, salt);
        }
        next();
    });
});
// fire a function after doc saved to db
userSchema.post("save", function (doc, next) {
    return __awaiter(this, void 0, void 0, function* () {
        // for new registered users send verification e-mail
        if (this.verificationToken) {
            yield sendVerificationEmail(this);
        }
        next();
    });
});
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
transporter.verify(function (error, success) {
    if (error) {
        console.log(error);
    }
    else {
        console.log("SMTP server is ready to take our messages");
    }
});
// Send verification email to the user
function sendVerificationEmail(user) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.EMAIL_VERIFICATION_SECRET, { expiresIn: "1h" });
        const verificationUrl = `${process.env.CYCLIC_URL}/verify-email?token=${token}`;
        const email = user.email;
        const subject = "Email Verification";
        const html = `Please click on the following link to verify your email address: <a href="${verificationUrl}">${verificationUrl}</a>`;
        const mailOptions = { from: process.env.SMTP_FROM, to: email, subject, html };
        const result = yield transporter.sendMail(mailOptions);
        // const smtpDebug = process.env.SMTP_DEBUG && process.env.SMTP_DEBUG.toLowerCase() == "true",
        if (transporter.logger) {
            console.log("Verification e-mail:", result);
        }
    });
}
exports.User = (0, mongoose_1.model)("User", userSchema);
