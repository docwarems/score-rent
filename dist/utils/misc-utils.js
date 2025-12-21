"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvVar = exports.stage = exports.mailTransporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const { SESClient, SendRawEmailCommand } = require("@aws-sdk/client-ses");
const { defaultProvider } = require("@aws-sdk/credential-provider-node");
require("dotenv").config();
// const ses = new SESClient({
//   region: "eu-central-1",
//   credentialDefaultProvider: defaultProvider(),
// });
// SES currently sandbox only
// export const mailTransporter = nodemailer.createTransport({
//   SES: { ses, aws: { SendRawEmailCommand } },
// });
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
exports.stage = process.env.STAGE || "dev";
/**
 * Get stage specific env var
 *
 * @param envName e.g. MONGODB_URL
 * @param stage  e.g. dev
 * @returns
 */
function getEnvVar(envName) {
    return (process.env[`${envName}`] || // Lambda (deployed)
        process.env[`${envName}_${exports.stage}`]); // Local dev
}
exports.getEnvVar = getEnvVar;
