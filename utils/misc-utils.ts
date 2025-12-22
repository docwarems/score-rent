import nodemailer from "nodemailer";
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

export const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT!),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  greetingTimeout: 1000 * 10, // 10 seconds
  connectionTimeout: 1000 * 10, // 10 seconds to establish connection
  socketTimeout: 1000 * 15, // 15 seconds for socket inactivity
  logger:
    !!process.env.SMTP_DEBUG && process.env.SMTP_DEBUG.toLowerCase() == "true",
});

mailTransporter.verify(function (error, success) {
  if (error) {
    console.log(error);
  } else {
    console.log("SMTP server is ready to take our messages");
  }
});

export const stage = process.env.STAGE || "dev";

/**
 * Get stage specific env var
 *
 * @param envName e.g. MONGODB_URL
 * @param stage  e.g. dev
 * @returns
 */
export function getEnvVar(envName: string) {
  return (process.env[`${envName}`] || // Lambda (deployed)
    process.env[`${envName}_${stage}`]) as string; // Local dev
}
