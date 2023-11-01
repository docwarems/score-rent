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
const express = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const { router } = require("./routes/authRoutes");
const { score } = require("./routes/scoreRoutes");
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
const app = express();
// middleware
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(middleware.handle(i18next_1.default, {
    ignoreRoutes: ["/foo"],
    removeLngFromUrl: false, // removes the language from the url when language detected in path
}));
// view engine
app.set("view engine", "ejs");
// database connection
const dbURI = process.env.MONGODB_URL;
mongoose_1.default.set("strictQuery", false);
// mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true }) // useCreateIndex not supported
mongoose_1.default
    .connect(dbURI)
    .then((result) => app.listen(3000))
    .catch((err) => console.log(err));
// routes
app.get("*", checkUser);
const home_get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = res.locals.user;
    const userToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "5y" } // TODO: check in "y" valid
    );
    const qrCodeDataUrl = yield QRCode.toDataURL(userToken);
    res.render("home", { user, qrCodeDataUrl });
});
app.get("/", requireAuth, requireUserVerified, home_get);
app.get("/js/vue/app.js", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.render("vue-app", {
        age: 77,
    });
}));
app.use("/score", score);
app.use("/user", user);
app.use(router);
// app.use("/", authRoutes); // this seems to make no difference to app.use(authRoutes)
// User.updateMany({}, { $rename: { singGroup: 'voice' } }, { multi: true }, function(err, blocks) {
//   if(err) { throw err; }
//   console.log('rename field done!');
// });
