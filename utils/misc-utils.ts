import nodemailer from "nodemailer";

require("dotenv").config();

export const mailTransporter = nodemailer.createTransport({
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
  mailTransporter.verify(function (error, success) {
    if (error) {
      console.log(error);
    } else {
      console.log("SMTP server is ready to take our messages");
    }
  });
  