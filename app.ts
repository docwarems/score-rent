const express = require("express");
import mongoose from "mongoose";
const authRoutes = require("./routes/authRoutes");
const cookieParser = require("cookie-parser");
const {
  requireAuth,
  checkUser,
  requireAdmin,
} = require("./middleware/authMiddleware");
require("dotenv").config();
import nodemailer from "nodemailer";

const app = express();

// middleware
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());

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
app.get("/register-score", requireAuth, requireAdmin, (req: any, res: any) =>
  res.render("register-score", { scoreType: res.locals.scoreType })
);
app.get("/checkout", requireAuth, requireAdmin, (req: any, res: any) =>
  res.render("checkout", {
    checkoutUser: res.locals.checkoutUser,
    checkoutScore: res.locals.checkoutScore,
  })
);

/**
 * The coexistence of routes defined here, e.g.
 * - app.get("/checkout")
 * and routes defined in router authRoutes 
 * - router.get("/checkout", authController.checkout_get);
 * is currently not clear to me.
 * 
 * It seems that app.get() has precedence, because the handler method from the router gets never called
 * 
 */
app.use(authRoutes);
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
