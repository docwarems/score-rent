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
const User_1 = require("../models/User");
const Score_1 = require("../models/Score");
const Checkout_1 = require("../models/Checkout");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
require("dotenv").config();
const nodemailer_1 = __importDefault(require("nodemailer"));
var QRCode = require("qrcode");
const uuid_1 = require("uuid");
// handle errors
const handleSaveErrors = (err, type) => {
    console.log(err.message, err.code);
    let errors = {
        userId: "",
        email: "",
        password: "",
        passwordRepeat: "",
        lastName: "",
        signature: "",
    };
    // incorrect email
    if (err.message === "incorrect email") {
        errors.email = "Die E-Mail Adresse ist unbekannt";
    }
    // incorrect password
    if (err.message === "incorrect password") {
        errors.password = "Das Passwort ist nicht korrekt";
    }
    if (err.message === "repeated password wrong") {
        errors.password =
            "Passwort und Passwort Wiederholung stimmen nicht überein";
    }
    if (err.code === 11000) {
        if (!type) {
        }
        else if (type == "email") {
            errors.email = "Diese E-Mail Adresse ist bereits in Verwendung";
        }
        else if (type == "signature") {
            errors.signature = "Diese Notensignatur ist bereits in Verwendung";
        }
        else if (type == "userId") {
            errors.userId = "Die aus Vor- und Nachnamen gebildete User Id ist bereits in Verwendung. Bitte HSC kontaktieren!";
        }
        return errors;
    }
    // validation errors
    if (err.message.includes("User validation failed")) {
        // console.log(err);
        Object.values(err.errors).forEach(({ properties }) => {
            errors[properties.path] = properties.message;
        });
    }
    return errors;
};
// create json web token
const maxAge = 60 * 60;
const createToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: maxAge,
    });
};
// controller actions
module.exports.signup_get = (req, res) => {
    res.render("signup", {
        admin: false,
    });
};
module.exports.signup_user_get = (req, res) => {
    res.render("signup", {
        admin: true,
    });
};
module.exports.signup_success_get = (req, res) => {
    res.render("signup-success");
};
module.exports.login_get = (req, res) => {
    res.render("login");
};
var EmailVerificationStatus;
(function (EmailVerificationStatus) {
    EmailVerificationStatus[EmailVerificationStatus["OK"] = 0] = "OK";
    EmailVerificationStatus[EmailVerificationStatus["NOT_REGISTERED"] = 1] = "NOT_REGISTERED";
    EmailVerificationStatus[EmailVerificationStatus["ALREADY_VERFIED"] = 2] = "ALREADY_VERFIED";
})(EmailVerificationStatus || (EmailVerificationStatus = {}));
// Create a nodemailer transporter TODO: dupliziert von app.ts
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    greetingTimeout: 1000 * 10,
    logger: !!process.env.SMTP_DEBUG && process.env.SMTP_DEBUG.toLowerCase() == "true",
});
/**
 * Create a espass (electronic smart pass) file to be opened with PassAndroid (and obviously only with this app)
 * - main.json (this constant); the message will converted to a QR Code
 * - icon.png with logo (HSC logo in resources folder)
 * - create a ZIP
 * - rename zip extension to espass
 *
 * see:
 * - https://datatypes.net/open-espass-files
 * - https://espass.it/
 * - Apple Passbook file reference: https://developer.apple.com/library/archive/documentation/UserExperience/Reference/PassKit_Bundle/Chapters/Introduction.html#//apple_ref/doc/uid/TP40012026-CH0-SW1
 */
function createEspassFile(token) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            var fs = require("fs");
            var JSZip = require("jszip");
            const id = (0, uuid_1.v4)();
            var zip = new JSZip();
            zip.file("main.json", `{"accentColor":"#ff0000ff","app":"passandroid","barCode":{"format":"QR_CODE","message":"${token}"},"description":"HSC Benutzer","fields":[],"id":"${id}","locations":[],"type":"EVENT","validTimespans":[]}`);
            // const imageData = fs.readFileSync(
            //   __dirname + "/../resources/hsc-logo-black.png"  // TODO: geht nicht auch cyclic
            // );
            // zip.file("logo.png", imageData);
            // ... and other manipulations
            zip
                .generateNodeStream({ type: "nodebuffer", streamFiles: true })
                .pipe(fs.createWriteStream("/tmp/hsc-noten.espass"))
                .on("finish", function () {
                return __awaiter(this, void 0, void 0, function* () {
                    // JSZip generates a readable stream with a "end" event,
                    // but is piped here in a writable stream which emits a "finish" event.
                    console.log("espassfile written.");
                    resolve();
                });
            });
        });
    });
}
// Send email to the user after successful registration and verification
const sendVerificationSuccessfulEmail = (user) => __awaiter(void 0, void 0, void 0, function* () {
    // we encode the user data into a JWT in order to prohibit manual QRCode creation outside the app
    const token = jsonwebtoken_1.default.sign({ userId: user._id, email: user.email }, // TODO: using id rather _id will not shorten the QRCode because a JWT always has the same lenght; use anothe way of signature
    process.env.EMAIL_VERIFICATION_SECRET, { expiresIn: "5y" } // TODO: check in "y" valid
    );
    // das sparen wir uns vorerst mal
    // await createEspassFile(token); // TODO: in Memory statt speichern
    try {
        // const text = "userId=" + user._id + "&email=" + user.email;
        const url = yield QRCode.toDataURL(token);
        const email = user.email;
        const subject = "Registrierung erfolgreich";
        const html = `
    Bitte speichern Sie den folgenden QRCode. Er wird für das Ausleihen von Noten benötigt.
    <p></p>
    E-Mail: ${user.email}<br>
    Name: ${user.firstName}&nbsp;${user.lastName}
    <p></p>      
    QR Code: <img src="${url}"/>    
  `;
        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: email,
            subject,
            html,
            // attachments: [{ path: url }, { path: "/tmp/hsc-noten.espass" }],
            attachments: [{ path: url }],
        };
        const result = yield transporter.sendMail(mailOptions);
        if (transporter.logger) {
            console.log("Registration successful e-mail:", result);
        }
    }
    catch (err) {
        console.error(err);
    }
});
module.exports.verify_email_get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.query.token;
    const decodedToken = jsonwebtoken_1.default.verify(token, process.env.EMAIL_VERIFICATION_SECRET);
    let verificationResult;
    const user = yield User_1.User.findById(decodedToken.userId);
    if (!user) {
        verificationResult = {
            status: EmailVerificationStatus.NOT_REGISTERED,
            message: "Benutzer nicht gefunden",
        };
    }
    else if (user.isVerified) {
        verificationResult = {
            status: EmailVerificationStatus.ALREADY_VERFIED,
            message: "Die E-Mail Adresse wurde bereits verifiziert",
        };
    }
    else {
        user.isVerified = true;
        user.verificationToken = undefined;
        try {
            yield user.save();
            yield sendVerificationSuccessfulEmail(user);
            verificationResult = {
                status: EmailVerificationStatus.OK,
                message: "Die E-Mail Adresse wurde erfolgreich verifiziert",
            };
        }
        catch (error) {
            console.error("Error verifying email", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }
    res.render("verify-email", {
        EmailVerificationStatus: EmailVerificationStatus,
        verificationResult: verificationResult,
    });
});
module.exports.signup_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { email, password, passwordRepeat, firstName, // TODO: Mindestlänge 2 wg. User Id
    lastName, } = req.body;
    try {
        const byAdmin = !password;
        let isManuallyRegistered;
        if (byAdmin) {
            password = "jdj849kddwerß02340wasdölad";
            isManuallyRegistered = true;
        }
        else {
            if (password !== passwordRepeat) {
                throw new Error("repeated password wrong");
            }
            isManuallyRegistered = false;
        }
        const userId = generateUserId(firstName, lastName);
        const regexp = new RegExp("^[a-z]{2}.[a-z]{2,6}$");
        if (!userId.match(regexp)) {
            console.error("User Id does not match regexp: ", userId);
            res
                .status(400)
                .json({
                status: "Interner Fehler bei Bildung der User id. Bitte den HSC kontaktieren!",
            });
        }
        const verificationToken = byAdmin ? undefined : Math.random().toString(36).substring(2);
        const user = yield User_1.User.create({
            id: userId,
            email,
            password,
            firstName,
            lastName,
            verificationToken,
            isManuallyRegistered,
        });
        res.status(201).json({ user: user._id });
    }
    catch (err) {
        let type = undefined;
        if (err.keyValue.id) {
            type = "userId";
        }
        else if (err.keyValue.email) {
            type = "email";
        }
        // let key = 'id';
        // if (key in err.keyvalue) {
        //   type = "userId";
        // } 
        // key = 'email';
        // if (key in err.keyvalue) {
        //   type = "email";
        // }
        const errors = handleSaveErrors(err, type);
        res.status(400).json({ errors });
    }
});
function convertToGermanCharacterRules(name) {
    // Replace umlauts and special characters with their German equivalents
    const germanRulesMap = {
        ä: "ae",
        ö: "oe",
        ü: "ue",
        ß: "ss",
    };
    return name
        .toLowerCase()
        .replace(/[äöüß]/g, (match) => germanRulesMap[match] || "");
}
function generateUserId(firstName, lastName) {
    firstName = convertToGermanCharacterRules(firstName);
    lastName = convertToGermanCharacterRules(lastName).replace(" ", "");
    return firstName.substring(0, 2) + "." + lastName.substring(0, 6);
}
module.exports.login_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield User_1.User.login(email, password);
        const token = createToken(user._id);
        res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
        res.status(200).json({ user: user._id });
    }
    catch (err) {
        const errors = handleSaveErrors(err, "email");
        res.status(400).json({ errors });
    }
});
module.exports.logout_get = (req, res) => {
    res.cookie("jwt", "", { maxAge: 1 });
    res.redirect("/");
};
module.exports.register_score_get = (req, res) => {
    res.redirect("/register-score");
};
module.exports.register_score_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { composer, work, signature, count } = req.body;
    try {
        const scoreType = yield Score_1.ScoreType.create({
            composer,
            work,
            signature,
            count,
        });
        // Nun die einzelnen Exemplare speichern
        for (let i = 1; i <= count; i++) {
            try {
                const score = yield Score_1.Score.create({
                    signature,
                    id: signature + "-" + i,
                });
            }
            catch (error) {
                console.error("Error creating score", error);
                res.status(500).json({ message: "Internal server error" });
            }
        }
        res.status(201).json({ scoreType: scoreType._id });
    }
    catch (err) {
        const errors = handleSaveErrors(err, "signature");
        res.status(400).json({ errors });
    }
});
module.exports.checkout_get = (req, res) => {
    res.redirect("/checkout");
};
module.exports.checkout_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, userLastName, scoreId, scoreExtId, state, date, comment, allowDoubleCheckout } = req.body;
    try {
        if (userId && scoreId) {
            let score = yield Score_1.Score.findOne({ id: scoreId });
            if (score) {
                // check if this user already checked out a copy of this score type
                const scoreTypeId = scoreId.substr(0, scoreId.lastIndexOf("-"));
                const existingScores = yield Score_1.Score.find({ checkedOutByUserId: userId });
                const existingScoreOfCurrentType = existingScores.find((score) => score.id.substr(0, score.id.lastIndexOf("-")) === scoreTypeId);
                const doubleCheckoutIsAllowed = allowDoubleCheckout === "allow";
                if (!existingScoreOfCurrentType ||
                    (doubleCheckoutIsAllowed && comment)) {
                    const checkout = new Checkout_1.Checkout({
                        userId,
                        scoreId,
                        checkoutComment: comment,
                        checkoutTimestamp: date ? date : new Date(),
                    });
                    score.checkedOutByUserId = userId;
                    score.extId = scoreExtId; // this is primilarly useful for the post-checkout from rental receipt usecase
                    score.state = state;
                    score.checkouts.push(checkout);
                    score = yield score.save();
                    if (score) {
                        res.status(201).json({ checkoutScore: score });
                    }
                    else {
                        res
                            .status(400)
                            .json({ errors: "Update score with checkout record failed" });
                    }
                }
                else {
                    res.status(400).json({
                        errors: `User with Id ${userId} has already checked out score Id ${existingScoreOfCurrentType.id}. To allow another checkout check checkbox and specify reason in comment field.`,
                    });
                }
            }
        }
        else if (scoreId) {
            const score = yield Score_1.Score.findOne({ id: scoreId });
            if (score) {
                const checkedOutByUserId = score.checkedOutByUserId;
                if (checkedOutByUserId) {
                    // res.status(400).json({ message: `Score ${scoreId} already checked out by user Id ${checkedOutByUserId}` });
                    res.status(400).json({
                        errors: `Score ${scoreId} already checked out by user Id ${checkedOutByUserId}`,
                    });
                }
                else {
                    res.status(201).json({ checkoutScore: score });
                }
            }
            else {
                res.status(400).json({ errors: `Score with Id ${scoreId} not found` });
            }
        }
        else if (userId) {
            const user = yield User_1.User.findOne({ id: userId });
            if (user) {
                res.status(201).json({ checkoutUser: user });
            }
            else {
                res.status(400).json({ errors: `User with Id ${userId} not found` });
            }
        }
        else if (userLastName) {
            // case-insensitive search at beginning
            const users = yield User_1.User.find({ lastName: { $regex: `^${userLastName}`, $options: 'i' } });
            // console.log(users);
            res.render("checkout", {
                users,
            });
        }
    }
    catch (error) {
        res.status(500).json({ error });
    }
});
module.exports.checkin_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { scoreId, comment } = req.body;
    try {
        if (scoreId && comment != undefined) {
            let score = yield Score_1.Score.findOne({ id: scoreId });
            if (score) {
                if (score.checkedOutByUserId) {
                    // current checkout record should last element of array
                    const checkout = score.checkouts[score.checkouts.length - 1];
                    if (checkout.checkinTimestamp) {
                        // that's an error because last checkout record is not an open checkout
                        res.status(400).json({
                            errors: `Checkout record not found for score with Id ${scoreId}`,
                        });
                    }
                    else {
                        // we have a true checkout record
                        const checkedOutByUserId = score.checkedOutByUserId;
                        const user = yield User_1.User.findOne({ id: checkedOutByUserId });
                        if (user) {
                            // res.status(200).json({ checkinScore: score, checkinUser: user });
                            score.checkedOutByUserId = ""; // mark this score as "not checked out"
                            checkout.checkinTimestamp = new Date();
                            checkout.checkinComment = comment;
                            score = yield score.save();
                            if (score) {
                                yield sendCheckinConfirmationEmail(user, score, process.env.EMAIL_TEST_RECIPIENT);
                                res.status(201).json({ checkinScore: score });
                            }
                            else {
                                res
                                    .status(400)
                                    .json({ errors: "Update score with checkout record failed" });
                            }
                        }
                        else {
                            res.status(400).json({
                                errors: `Score ${scoreId} checked out by user Id ${checkedOutByUserId}, but no user found this id`,
                            });
                        }
                    }
                }
            }
            else {
                res.status(400).json({
                    errors: `Found score with Id ${scoreId} but it's not checked out`,
                });
            }
        }
        else if (scoreId) {
            const score = yield Score_1.Score.findOne({ id: scoreId });
            if (score) {
                const checkedOutByUserId = score.checkedOutByUserId;
                if (checkedOutByUserId) {
                    const user = yield User_1.User.findOne({ _id: checkedOutByUserId });
                    if (user) {
                        res.status(200).json({ checkinScore: score, checkinUser: user });
                    }
                    else {
                        res.status(400).json({
                            errors: `Score ${scoreId} checked out by user Id ${checkedOutByUserId}, but no user found this id`,
                        });
                    }
                }
                else {
                    res
                        .status(400)
                        .json({ errors: `Score with Id ${scoreId} is not checked out` });
                }
            }
            else {
                res.status(400).json({ errors: `Score with Id ${scoreId} not found` });
            }
        }
    }
    catch (error) {
        res.status(500).json({ error });
    }
});
module.exports.checkouts_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { signature, checkedOut } = req.body;
    let filter = signature && signature !== "ALL" ? { signature } : {};
    try {
        let error = undefined;
        if (!signature) {
            error = "Bitte Signatur auswählen";
        }
        let checkoutsWithUser = [];
        if (signature) {
            // const scores = await Score.find(filter, "checkouts") // return only checkouts property
            const scores = yield Score_1.Score.find(filter).populate("checkouts").exec(); // TODO: when exec and when not? // TODO: is populate() correct? See https://mongoosejs.com/docs/subdocs.html
            const userIds = []; // TODO: Set
            for (const score of scores) {
                for (const checkout of score.checkouts) {
                    userIds.push(checkout.userId);
                }
            }
            const userMap = yield (yield User_1.User.find({ id: { $in: userIds } })).reduce((map, user) => map.set(user.id, user), new Map());
            for (const score of scores) {
                for (const checkout of score.checkouts) {
                    const user = userMap.get(checkout.userId);
                    checkoutsWithUser.push({ checkout, user, scoreExtId: score.extId });
                }
            }
        }
        const onlyCheckedOut = checkedOut == "true";
        if (onlyCheckedOut) {
            checkoutsWithUser = checkoutsWithUser.filter((checkoutWithUser) => {
                return !checkoutWithUser.checkout.checkinTimestamp;
            });
        }
        const signatures = [
            { id: "ALL", name: "Alle" },
            { id: "ORFF-COM", name: "Orff De temporum finde comoedia" },
            { id: "BRFS-AD", name: "Braunfels Advent" },
        ]; // TODO: from db
        res.render("checkouts", {
            signatures,
            filter: { signature, checkedOut: onlyCheckedOut },
            checkouts: checkoutsWithUser,
            error,
        });
    }
    catch (error) {
        res.status(500).json({ error });
    }
});
const sendCheckinConfirmationEmail = (user, score, testRecipient) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = testRecipient ? testRecipient : user.email;
        const subject = "Hans-Sachs-Chor Noten Rückgabe erfolgreich";
        // TODO: not sure if we should send this info to users as it may be internal
        // checkinComment = checkinComment
        //   ? `<br>Kommentar zur Rückgabe: '${checkinComment}'`
        //   : "";
        // const html =
        //   `Die Noten mit Nummer ${extScoreId} wurden erfolgreich zurückgegeben. Vielen Dank!` +
        //   checkinComment;
        // TODO: clear text rather than signature
        const html = `Die Noten ${score.signature} mit Nummer ${score.extId} wurden erfolgreich zurückgegeben. Vielen Dank!<br>
    Diese E-Mail wurde automatisch versendet!`;
        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: email,
            subject,
            html,
        };
        const result = yield transporter.sendMail(mailOptions);
        if (transporter.logger) {
            console.log("Score checkin confirmation e-mail:", result);
        }
    }
    catch (err) {
        console.error(err);
    }
});
module.exports.updateCheckout_post = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { scoreId, checkoutId, checkoutComment, checkinComment } = req.body;
    // console.log(scoreId, checkoutId, checkoutComment, checkinComment);
    let score = yield Score_1.Score.findOne({ id: scoreId });
    // const score = await Score.findOne({ "checkouts._id" : checkoutId });  // interesting to find a score just by the _id of one of it's checkouts
    if (score) {
        console.log("score found");
        // TODO: works, but question is if we can do a query which just returns the checkout without returning the whole score first
        const checkout = score.checkouts.find((checkout) => checkout._id == checkoutId);
        if (checkout) {
            console.log("checkout found");
            checkout.checkoutComment = checkoutComment;
            checkout.checkinComment = checkinComment;
            score = yield score.save();
            if (score) {
                res.status(201).json({ updateScore: score });
            }
        }
        else {
            return res.status(500).json({
                message: `checkout Id ${checkoutId} not found for score with Id ${scoreId}`,
            }); // TODO: 4xx error
        }
    }
    else {
        return res
            .status(500)
            .json({ message: `score not found with Id ${scoreId}` }); // TODO: 4xx error
    }
});
