import serverless from "serverless-http";
const express = require("express");
var ejs = require("ejs");
import mongoose from "mongoose";
const { router } = require("./routes/authRoutes");
const { score } = require("./routes/scoreRoutes");
const { user } = require("./routes/userRoutes");
const cookieParser = require("cookie-parser");
const {
  requireAuth,
  checkUser,
  requireAdmin,
  requireUserVerified,
} = require("./middleware/authMiddleware");
require("dotenv").config();
import nodemailer from "nodemailer";
const bodyParser = require("body-parser");
import jwt from "jsonwebtoken";
var QRCode = require("qrcode");
const path = require("path");

import i18next from "i18next";
var middleware = require("i18next-http-middleware");
import en from "./locales/en.json";
import de from "./locales/de.json";
import { User } from "./models/User";

i18next.use(middleware.LanguageDetector).init({
  preload: ["de"],
  // ...otherOptions
});

// we must ensure that no write access to the file system is needed; as we are running on a readonly serverless platform
i18next.init({
  // lng: "de-DE", // if you're using a language detector, do not define the lng option
  fallbackLng: "en", // general fallback language
  // debug: true,
  resources: {
    en,
    // example for swiss flavour, falls back to de for other keys
    "de-CH": {
      translation: {
        "app.name": "HSC Leihnoten (CH)",
      },
    },
    // de falls back to en if key missing
    de,
  },
});

const app = express();

// middleware
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  middleware.handle(i18next, {
    ignoreRoutes: ["/foo"], // or function(req, res, options, i18next) { /* return true to ignore */ }
    removeLngFromUrl: false, // removes the language from the url when language detected in path
  })
);

// view engine
app.set("view engine", "ejs");
app.engine("vue", ejs.renderFile); // render files with ".vue" extension in views folder by EJS too

// database connection
const dbURI = process.env.MONGODB_URL as string;
mongoose.set("strictQuery", false);

// AWS will cache global variables, i.a. also the mongoose connection
// see https://mongoosejs.com/docs/lambda.html
let conn: any = null;
const connect = async function () {
  if (conn == null) {
    conn = mongoose
      .connect(dbURI, {
        serverSelectionTimeoutMS: 5000,
      })
      .then(() => mongoose);

    // `await`ing connection after assigning to the `conn` variable
    // to avoid multiple function calls creating new connections
    console.log("MongoDB connecting...");
    await conn;
    console.log("MongoDB connected");
  }

  return conn;
};

// Connect on cold start (module initialization)
connect();

// routes
app.get("*", checkUser);

const home_get = async (req: any, res: any) => {
  const user = res.locals.user;
  const userToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "5y" } // TODO: check in "y" valid
  );
  const qrCodeDataUrl = await QRCode.toDataURL(userToken);
  res.render("home", { user, qrCodeDataUrl });
};
app.get("/", requireAuth, requireUserVerified, home_get);

app.use("/score", score);
app.use("/user", user);
app.use(router);
// app.use("/", authRoutes); // this seems to make no difference to app.use(authRoutes)

// User.updateMany({}, { $rename: { singGroup: 'voice' } }, { multi: true }, function(err, blocks) {
//   if(err) { throw err; }
//   console.log('rename field done!');
// });

console.log("app initialized");
exports.handler = serverless(app);
