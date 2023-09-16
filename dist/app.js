"use strict";
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
const app = express();
// middleware
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
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
app.get("/", requireAuth, requireUserVerified, (req, res) => res.render("home", { user: res.locals.user }));
app.use("/score", score);
app.use("/user", user);
app.use(router);
// app.use("/foo", authRoutes); // for http://localhost:3000/foo/checkout the route handler method gets called
// app.use("/", authRoutes); // this seems to make no difference to app.use(authRoutes)
