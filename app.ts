import serverless from "serverless-http";
const express = require("express");
var ejs = require("ejs");
import mongoose from "mongoose";
const { router } = require("./routes/authRoutes");
const { admin } = require("./routes/adminRoutes");
const { user } = require("./routes/userRoutes");
const cookieParser = require("cookie-parser");
const {
  requireAuth,
  checkUser,
  requireAdmin,
  requireUserVerified,
} = require("./middleware/authMiddleware");
require("dotenv").config();
const bodyParser = require("body-parser");
import jwt from "jsonwebtoken";
var QRCode = require("qrcode");
const path = require("path");

import i18next from "i18next";
var middleware = require("i18next-http-middleware");
import en from "./locales/en.json";
import de from "./locales/de.json";
import { User } from "./models/User";
import { emailQueueService } from "./utils/email-queue-utils";
import { stage, getEnvVar } from "./utils/misc-utils";

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

if (stage === "dev") {
  i18next.addResource(
    "de",
    "translation",
    "app.name",
    "HSC Leihnoten Verwaltung (TEST)"
  );
  i18next.addResource("en", "translation", "app.name", "HSC Score Rent (TEST)");

  i18next.addResource("de", "translation", "login.title", "Login (TEST)");
  i18next.addResource("en", "translation", "login.title", "Login (TEST)");
}

const app = express();

/**
 * About routes
 * (line numbers from time of writing)
 *
 * Request arrives
 *     ↓
 * Express static files (line 91)
 *    ↓
 * JSON/Cookie parsers (line 93)
 *    ↓
 * i18n middleware (line 95ff)
 *    ↓
 * View engine setup (line 102ff)
 *    ↓
 * checkUser (line 153)
 *    ↓
 * Route-specific handlers
 *     ↓
 * Response sent
 */

// Serve static files from dist/public (copied by TypeScript compilation)
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json({ limit: "10mb" }));

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  middleware.handle(i18next, {
    ignoreRoutes: ["/foo"], // or function(req, res, options, i18next) { /* return true to ignore */ }
    removeLngFromUrl: false, // removes the language from the url when language detected in path
  })
);

// AWS Lambda global scope variable for email queue throttling
let lastEmailQueueCheck = 0;
const EMAIL_QUEUE_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let activeQueueProcessing: Promise<any> | null = null;

app.use(async (req: any, res: any, next: any) => {
  // Process queue in background only if 5+ minutes have passed
  const now = Date.now();
  if (now - lastEmailQueueCheck >= EMAIL_QUEUE_CHECK_INTERVAL_MS) {
    lastEmailQueueCheck = now;
    // Store promise to prevent Lambda exit before completion
    // await would also wait for completion but would block the request until completed.
    activeQueueProcessing = emailQueueService
      .processQueue()
      .catch((error) => {
        console.error("Error processing email queue:", error);
      })
      .finally(() => {
        activeQueueProcessing = null;
      });
  }
  next();
});

// view engine
app.set("view engine", "ejs");
app.engine("vue", ejs.renderFile); // render files with ".vue" extension in views folder by EJS too

// database connection
const dbURI = getEnvVar("MONGODB_URL");
mongoose.set("strictQuery", false);

// AWS Lambda will cache global variables, i.a. also the mongoose connection
// see https://mongoosejs.com/docs/lambda.html
let conn: any = null;
const connect = async function (): Promise<typeof mongoose> {
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
  } else {
    // Check if connection is still alive on warm starts
    try {
      await mongoose.connection.db.admin().ping();
      console.log("MongoDB connection reused (warm start)");
    } catch (error) {
      console.log("MongoDB connection stale, reconnecting...");
      conn = null;
      return connect(); // Recursively reconnect
    }
  }

  return conn;
};

// Connect on cold start (module initialization)
connect();

// For local development, also listen
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(3000, () => {
    console.log("Server listening on http://localhost:3000");
  });
}

// routes
app.use("*", checkUser);

const home_get = async (req: any, res: any) => {
  const user = res.locals.user;
  const userToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "5y" }
  );
  const qrCodeDataUrl = await QRCode.toDataURL(userToken);
  res.render("home", { user, qrCodeDataUrl });
};
app.get("/", requireAuth, requireUserVerified, home_get);

app.use("/admin", admin);
app.use("/user", user);
app.use(router);
// app.use("/", authRoutes); // this seems to make no difference to app.use(authRoutes)

// User.updateMany({}, { $rename: { singGroup: 'voice' } }, { multi: true }, function(err, blocks) {
//   if(err) { throw err; }
//   console.log('rename field done!');
// });

console.log("app initialized");

// Wrap handler to ensure connection on every invocation
// without favicon files get currupted
// Copilot says: The issue was API Gateway converting binary image files to text/base64, corrupting them.
const originalHandler = serverless(app, {
  binary: ["image/png", "image/x-icon", "image/jpeg", "image/jpg", "image/gif"],
});
exports.handler = async (event: any, context: any) => {
  await connect(); // Check connection on every invocation
  const response = await originalHandler(event, context);

  // Wait for any background email queue processing to complete
  if (activeQueueProcessing) {
    console.log("Waiting for email queue processing to complete...");
    await activeQueueProcessing;
  }

  return response;
};
