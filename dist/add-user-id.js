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
const User_1 = require("./models/User");
const Score_1 = require("./models/Score");
const mongoose_1 = __importDefault(require("mongoose"));
require("dotenv").config();
// Ausfühhrung mit: ts-node add-user-id.ts
// database connection
const dbURI = process.env.MONGODB_URL;
mongoose_1.default.set("strictQuery", false);
// mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true }) // useCreateIndex not supported
mongoose_1.default
    .connect(dbURI)
    .then((result) => addUserId())
    .catch((err) => console.log(err));
function addUserId() {
    return __awaiter(this, void 0, void 0, function* () {
        // Alle User einlesen
        //   const users = await User.find();
        //   for (const user of users) {
        //     // console.log(`"${user.firstName} ${user.lastName}"`);
        //     // if ((user.firstName.length < 2) && (user.lastName.length < 6)) {
        //     //   console.error(`User mit Id ${user._id} has invalid name: ${user.firstName} ${user.lastName}`);
        //     //   break;
        //     // }
        //     const id = generateUserId(user.firstName, user.lastName);
        //     console.log(id);
        //     const regexp = new RegExp('^[a-z]{2}\.[a-z]{2,6}$');
        //     if (!id.match(regexp)) {
        //       console.error(`Id ${id} not valid`);
        //       break;
        //     }
        //     user.id = id;
        //     await user.save();
        //     // Checkouts der User UUID suchen und UserId ändern nach neue ID
        //   }
        // }
        const scores = yield Score_1.Score.find();
        for (const score of scores) {
            console.log("Checked out: ", score.checkedOutByUserId ? "true" : "false");
            const checkouts = score.checkouts;
            for (let i = 0; i < checkouts.length; i++) {
                // console.log(checkout);
                const checkout = checkouts[i];
                const user = yield User_1.User.findById(checkout.userId);
                if (user) {
                    console.log({ scoreId: checkout.scoreId, userId: user.id });
                }
                else {
                    console.error("User not found", checkout.userId);
                    break;
                }
                if (i == checkouts.length - 1) {
                    if (!checkout.checkinTimestamp) {
                        score.checkedOutByUserId = user.id;
                    }
                }
                checkout.userId = user.id;
            }
            yield score.save(); // will also save nested checkouts
        }
        process.exit(0);
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
function generateUserId(firstName, lastName) {
    firstName = convertToGermanCharacterRules(firstName);
    lastName = convertToGermanCharacterRules(lastName).replace(" ", "");
    return firstName.substring(0, 2) + "." + lastName.substring(0, 6);
}
