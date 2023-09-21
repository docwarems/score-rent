const express = require("express");
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
const { I18n } = require("i18n");
const path = require("path");

// we must ensure that no write access to the file system is needed; as we are running on a readonly serverless platform
const i18n = new I18n({
  locales: ["en", "de"],  // other locales will fallback to en silently
  fallbacks: { "de-*": "de" }, // fallback from any localized German (de-at, de-li etc.) to German
  retryInDefaultLocale: true, // will return translation from defaultLocale in case current locale doesn't provide it
  updateFiles: false, // whether to write new locale information to disk - defaults to true (I hope to avoid write access to the file system)
  queryParameter: 'lang', // query parameter to switch locale (ie. /home?lang=ch)
  directory: path.join(__dirname, "locales"),
});

const app = express();

// middleware
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(i18n.init); // default: using 'accept-language' header to guess language settings

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
// app.use("/foo", authRoutes); // for http://localhost:3000/foo/checkout the route handler method gets called
// app.use("/", authRoutes); // this seems to make no difference to app.use(authRoutes)
