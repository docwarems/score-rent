const express = require("express");
import mongoose from "mongoose";
const { router, user } = require("./routes/authRoutes");
const { score } = require("./routes/scoreRoutes");
const cookieParser = require("cookie-parser");
const {
  requireAuth,
  checkUser,
  requireAdmin,
} = require("./middleware/authMiddleware");
require("dotenv").config();
import nodemailer from "nodemailer";
const bodyParser = require("body-parser");

const app = express();

// middleware
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// view engine
app.set("view engine", "ejs");

// database connection
const dbURI = process.env.MONGODB_URL as string;
mongoose.set("strictQuery", false);
// mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true }) // useCreateIndex not supported
mongoose
  .connect(dbURI!)
  .then((result: any) => app.listen(3000))
  .catch((err: any) => console.log(err));

// routes
app.get("*", checkUser);
app.get("/", requireAuth, (req: any, res: any) =>
  res.render("home", { user: res.locals.user })
);

app.use("/score", score);
app.use("/user", user);
app.use(router);
// app.use("/foo", authRoutes); // for http://localhost:3000/foo/checkout the route handler method gets called
// app.use("/", authRoutes); // this seems to make no difference to app.use(authRoutes)

// Create a nodemailer transporter
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: parseInt(process.env.SMTP_PORT!),
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
//   greetingTimeout: 1000 * 10,
//   logger:
//     !!process.env.SMTP_DEBUG && process.env.SMTP_DEBUG.toLowerCase() == "true",
// });
// transporter.verify(function (error, success) {
//   if (error) {
//     console.log(error);
//   } else {
//     console.log("SMTP server is ready to take our messages");
//   }
// });
