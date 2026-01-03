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
exports.User = exports.incrementUserIdSuffix = exports.MemberState = exports.getVoiceOptions = exports.voiceLabels = exports.Voice = exports.USER_UNKNOWN = void 0;
const mongoose_1 = require("mongoose");
const { isEmail } = require("validator");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const misc_utils_1 = require("../utils/misc-utils");
const email_queue_utils_1 = require("../utils/email-queue-utils");
require("dotenv").config();
// the adding of a static User Method from the JS code had to be rewritten according to
// https://mongoosejs.com/docs/typescript/statics-and-methods.html
exports.USER_UNKNOWN = "un.known";
// export enum SingGroup {
//   SOPRANO = "S",
//   ALTO = "A",
//   TENOR = "T",
//   BASS = "B",
// }
var Voice;
(function (Voice) {
    Voice["SOPRANO"] = "S";
    Voice["ALTO"] = "A";
    Voice["TENOR"] = "T";
    Voice["BASS"] = "B";
})(Voice = exports.Voice || (exports.Voice = {}));
exports.voiceLabels = {
    [Voice.SOPRANO]: "Sopran",
    [Voice.ALTO]: "Alt",
    [Voice.TENOR]: "Tenor",
    [Voice.BASS]: "Bass",
};
function getVoiceOptions() {
    return Object.entries(exports.voiceLabels).map(([value, label]) => ({
        value,
        label,
    }));
}
exports.getVoiceOptions = getVoiceOptions;
var MemberState;
(function (MemberState) {
    MemberState["MEMBER"] = "M";
    MemberState["STUDENT"] = "S";
    MemberState["GUEST"] = "G";
})(MemberState = exports.MemberState || (exports.MemberState = {}));
const userSchema = new mongoose_1.Schema({
    id: {
        // vv.nnnnnn z.B. mi.suedka; wird als Referenz zu anderen Objekten verwendet, damit diese sprechend ist
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    email: {
        type: String,
        // required: [true, "Bitte E-Mail angeben"],  // normally yes, but not all users must have one; not mandatory for manual signup by admin
        unique: true,
        sparse: true,
        lowercase: true,
        // validate: [isEmail, "Bitte eine gültige E-Mail-Adresse angeben"],  TODO: Validierung nur wenn nicht leer
    },
    password: {
        type: String,
        required: [true, "Bitte Kennwort angeben"],
        minlength: [6, "Die minimale Kennwort Länge sind 6 Zeichen"],
    },
    firstName: {
        type: String,
        required: [true, "Bitte Vornamen angeben"], // damit vv.nnnnnn User Id gebildet werden kann.
    },
    lastName: {
        type: String,
        required: [true, "Bitte Nachnamen angeben"],
    },
    // singGroup: {
    //   type: String,
    //   enum: Object.values(SingGroup),
    // },
    voice: {
        type: String,
        enum: Object.values(Voice),
    },
    memberState: {
        type: String,
        enum: Object.values(MemberState),
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    verificationToken: String,
    isAdmin: {
        type: Boolean,
        default: false,
    },
    isManuallyRegistered: {
        type: Boolean,
        default: false,
    },
    isPasswordHashed: {
        type: Boolean,
        default: false,
    },
    isPlaywright: {
        type: Boolean,
        default: false,
    },
    active: {
        type: Boolean,
        default: true,
    },
});
userSchema.method("fullName", function fullName() {
    return this.firstName + " " + this.lastName;
});
userSchema.static("login", function login(email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield this.findOne({ email });
        if (user) {
            const auth = yield bcrypt_1.default.compare(password, user.password);
            if (auth) {
                return user;
            }
            throw Error("incorrect password");
        }
        throw Error("incorrect email");
    });
});
userSchema.static("generateUserId", function generateUserId(firstName, lastName) {
    firstName = convertToGermanCharacterRules(firstName);
    lastName = convertToGermanCharacterRules(lastName).replace(" ", "");
    let userId = firstName.substring(0, 2) + "." + lastName.substring(0, 6);
    const regexp = new RegExp("^[a-z]{2}.[a-z]{2,6}$");
    if (!userId.match(regexp)) {
        console.error("User Id does not match regexp: ", userId);
        userId = "";
    }
    return userId;
});
/**
 * Adds or increments a numeric suffix to a userId
 * Examples:
 *   mi.suedka -> mi.suedka01
 *   mi.suedka01 -> mi.suedka02
 *   mi.suedka99 -> mi.suedka100
 */
function incrementUserIdSuffix(userId) {
    // Check if userId already has a numeric suffix
    const match = userId.match(/^(.+?)(\d+)$/);
    if (match) {
        // Has numeric suffix - increment it
        const base = match[1];
        const currentNumber = parseInt(match[2], 10);
        const nextNumber = currentNumber + 1;
        // Pad with leading zeros to match original length (minimum 2 digits)
        const paddedNumber = nextNumber
            .toString()
            .padStart(Math.max(2, match[2].length), "0");
        return base + paddedNumber;
    }
    else {
        // No suffix - add 01
        return userId + "01";
    }
}
exports.incrementUserIdSuffix = incrementUserIdSuffix;
// fire a function before doc saved to db
userSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO: we must ensure that e-mail doesn't exist because we have no longer a unique constraint on email field because we need to be able to manually register users without email
        if (!this.isPasswordHashed) {
            const salt = yield bcrypt_1.default.genSalt();
            this.password = yield bcrypt_1.default.hash(this.password, salt);
            this.isPasswordHashed = true;
        }
        next();
    });
});
// fire a function after doc saved to db
userSchema.post("save", function (doc, next) {
    return __awaiter(this, void 0, void 0, function* () {
        // for new registered users send verification e-mail
        if (this.verificationToken) {
            yield sendVerificationEmail(this);
        }
        next();
    });
});
// Send verification email to the user
function sendVerificationEmail(user) {
    return __awaiter(this, void 0, void 0, function* () {
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.EMAIL_VERIFICATION_SECRET, { expiresIn: ((0, misc_utils_1.getEnvVar)("EMAIL_JWT_EXPIRY") || "24h") });
        const verificationUrl = `${process.env.CYCLIC_URL}/verify-email?token=${token}`;
        const email = user.email;
        const subject = "Email Überprüfung";
        const html = `
  Du hast diese Mail erhalten weil du dich bei der Notenverwaltung des Hans-Sachs-Chor registriert hast.<br>
  Bitte klicke auf den folgenden Link um die E-Mail Adresse zu bestätigen: <a href="${verificationUrl}">${verificationUrl}</a>
  `;
        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: email,
            subject,
            html,
            priority: true,
        };
        const result = yield email_queue_utils_1.emailQueueService.queueEmail(mailOptions);
        if (misc_utils_1.mailTransporter.logger) {
            console.log("Verification e-mail:", result);
        }
    });
}
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
function enum2array(e) {
    return Object.entries(e).map(([key, value]) => ({ key, value }));
}
exports.User = (0, mongoose_1.model)("User", userSchema);
