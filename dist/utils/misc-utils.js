"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailTransporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
require("dotenv").config();
exports.mailTransporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    greetingTimeout: 1000 * 10,
    logger: !!process.env.SMTP_DEBUG && process.env.SMTP_DEBUG.toLowerCase() == "true",
});
exports.mailTransporter.verify(function (error, success) {
    if (error) {
        console.log(error);
    }
    else {
        console.log("SMTP server is ready to take our messages");
    }
});
