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
const serverless_http_1 = __importDefault(require("serverless-http"));
const express = require("express");
var ejs = require("ejs");
const mongoose_1 = __importDefault(require("mongoose"));
const { router } = require("./routes/authRoutes");
const { admin } = require("./routes/adminRoutes");
const { user } = require("./routes/userRoutes");
const cookieParser = require("cookie-parser");
const { requireAuth, checkUser, requireAdmin, requireUserVerified, } = require("./middleware/authMiddleware");
require("dotenv").config();
const bodyParser = require("body-parser");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var QRCode = require("qrcode");
const path = require("path");
const i18next_1 = __importDefault(require("i18next"));
var middleware = require("i18next-http-middleware");
const en_json_1 = __importDefault(require("./locales/en.json"));
const de_json_1 = __importDefault(require("./locales/de.json"));
const email_queue_utils_1 = require("./utils/email-queue-utils");
const misc_utils_1 = require("./utils/misc-utils");
i18next_1.default.use(middleware.LanguageDetector).init({
    preload: ["de"],
    // ...otherOptions
});
// we must ensure that no write access to the file system is needed; as we are running on a readonly serverless platform
i18next_1.default.init({
    // lng: "de-DE", // if you're using a language detector, do not define the lng option
    fallbackLng: "en",
    // debug: true,
    resources: {
        en: en_json_1.default,
        // example for swiss flavour, falls back to de for other keys
        "de-CH": {
            translation: {
                "app.name": "HSC Leihnoten (CH)",
            },
        },
        // de falls back to en if key missing
        de: de_json_1.default,
    },
});
if (misc_utils_1.stage === "dev") {
    i18next_1.default.addResource("de", "translation", "app.name", "HSC Leihnoten Verwaltung (TEST)");
    i18next_1.default.addResource("en", "translation", "app.name", "HSC Score Rent (TEST)");
    i18next_1.default.addResource("de", "translation", "login.title", "Login (TEST)");
    i18next_1.default.addResource("en", "translation", "login.title", "Login (TEST)");
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
app.use(middleware.handle(i18next_1.default, {
    ignoreRoutes: ["/foo"],
    removeLngFromUrl: false, // removes the language from the url when language detected in path
}));
// AWS Lambda global scope variable for email queue throttling
let lastEmailQueueCheck = 0;
const EMAIL_QUEUE_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let activeQueueProcessing = null;
app.use((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Process queue in background only if 5+ minutes have passed
    const now = Date.now();
    if (now - lastEmailQueueCheck >= EMAIL_QUEUE_CHECK_INTERVAL_MS) {
        lastEmailQueueCheck = now;
        // Store promise to prevent Lambda exit before completion
        // await would also wait for completion but would block the request until completed.
        activeQueueProcessing = email_queue_utils_1.emailQueueService
            .processQueue()
            .catch((error) => {
            console.error("Error processing email queue:", error);
        })
            .finally(() => {
            activeQueueProcessing = null;
        });
    }
    next();
}));
// view engine
app.set("view engine", "ejs");
app.engine("vue", ejs.renderFile); // render files with ".vue" extension in views folder by EJS too
// database connection
const dbURI = (0, misc_utils_1.getEnvVar)("MONGODB_URL");
mongoose_1.default.set("strictQuery", false);
// AWS Lambda will cache global variables, i.a. also the mongoose connection
// see https://mongoosejs.com/docs/lambda.html
let conn = null;
const connect = function () {
    return __awaiter(this, void 0, void 0, function* () {
        if (conn == null) {
            conn = mongoose_1.default
                .connect(dbURI, {
                serverSelectionTimeoutMS: 5000,
            })
                .then(() => mongoose_1.default);
            // `await`ing connection after assigning to the `conn` variable
            // to avoid multiple function calls creating new connections
            console.log("MongoDB connecting...");
            yield conn;
            console.log("MongoDB connected");
        }
        else {
            // Check if connection is still alive on warm starts
            try {
                yield mongoose_1.default.connection.db.admin().ping();
                console.log("MongoDB connection reused (warm start)");
            }
            catch (error) {
                console.log("MongoDB connection stale, reconnecting...");
                conn = null;
                return connect(); // Recursively reconnect
            }
        }
        return conn;
    });
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
const home_get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = res.locals.user;
    const userToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "5y" });
    const qrCodeDataUrl = yield QRCode.toDataURL(userToken);
    res.render("home", { user, qrCodeDataUrl });
});
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
const originalHandler = (0, serverless_http_1.default)(app, {
    binary: ["image/png", "image/x-icon", "image/jpeg", "image/jpg", "image/gif"],
});
exports.handler = (event, context) => __awaiter(void 0, void 0, void 0, function* () {
    yield connect(); // Check connection on every invocation
    const response = yield originalHandler(event, context);
    // Wait for any background email queue processing to complete
    if (activeQueueProcessing) {
        console.log("Waiting for email queue processing to complete...");
        yield activeQueueProcessing;
    }
    return response;
});
