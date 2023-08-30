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
const fs_1 = __importDefault(require("fs"));
const csv_parse_1 = require("csv-parse");
const User_1 = require("./models/User");
const uuid_1 = require("uuid");
const mongoose_1 = __importDefault(require("mongoose"));
require("dotenv").config();
// Ausführung mit: ts-node user-import.ts [test]
// oder: npx ts-node user-import.ts [test]
// with true only logging of actions
const test = !!process.argv[2] && (process.argv[2] == "test");
console.log("test", test);
// database connection
const dbURI = process.env.MONGODB_URL;
mongoose_1.default.set("strictQuery", false);
// mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true }) // useCreateIndex not supported
mongoose_1.default
    .connect(dbURI)
    .then((result) => importCsv())
    .catch((err) => console.log(err));
function importCsv() {
    return __awaiter(this, void 0, void 0, function* () {
        const headers = [
            "firstName",
            "lastName",
            "email",
            "singGroup",
            "memberState",
        ];
        const parser = (0, csv_parse_1.parse)({ delimiter: ";", columns: headers }, function (err, records) {
            return __awaiter(this, void 0, void 0, function* () {
                // console.log(records);
                // const userMap = new Map<string, User>();
                for (const record of records) {
                    console.log(record);
                    const firstName = record.firstName.trim();
                    const lastName = record.lastName.trim();
                    const userId = User_1.User.generateUserId(firstName, lastName);
                    if (!userId) {
                        console.error(`Could not generate userId from '${firstName}' and '${lastName}'`);
                        continue;
                    }
                    let user = yield User_1.User.findOne({ id: userId });
                    if (user) {
                        log(`User with Id ${userId} found in db. Will update record!`);
                        // it doesn't make sense to update the name because this was the base for the userId
                        user.email = record.email;
                        user.singGroup = record.singGroup;
                        user.memberState = record.memberState;
                    }
                    else {
                        log(`User with Id ${userId} not found in db. Will create record!`);
                        user = yield User_1.User.create({
                            id: userId,
                            firstName: record.firstName,
                            lastName: record.lastName,
                            email: record.email,
                            singGroup: record.singGroup,
                            memberState: record.memberState,
                            password: (0, uuid_1.v4)(),
                            isManuallyRegistered: true,
                        });
                    }
                    if (!test) {
                        yield user.save();
                    }
                }
                process.exit(0);
            });
        });
        fs_1.default.createReadStream(process.env.USER_IMPORT_FILE).pipe(parser);
    });
}
function log(s) {
    if (test) {
        console.log(s);
    }
}
