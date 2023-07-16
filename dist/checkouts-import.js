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
            "lastName",
            "firstName",
            "singGroup",
            "email",
            "scoreId",
            "comment",
        ];
        const parser = (0, csv_parse_1.parse)({ delimiter: ";", columns: headers }, function (err, records) {
            return __awaiter(this, void 0, void 0, function* () {
                //   console.log(records);
                const userMap = new Map();
                for (const record of records) {
                    console.log(record);
                    let user = userMap.get(record.lastName);
                    if (user) {
                        console.log("Duplet: ", record);
                    }
                    else {
                        userMap.set(record.lastName, {
                            firstName: record.firstName,
                            lastName: record.lastName,
                            singGroup: record.singGroup,
                            email: record.email,
                        });
                        const email = record.email
                            ? record.email
                            : process.env.FALLBACK_EMAIL;
                        try {
                            const user = yield User_1.User.create({
                                email,
                                firstName: record.firstName,
                                lastName: record.lastName,
                                password: (0, uuid_1.v4)(),
                                isManuallyRegistered: true,
                            });
                        }
                        catch (e) {
                            console.error(e);
                        }
                    }
                }
            });
        });
        fs_1.default.createReadStream("orff-noten.csv").pipe(parser);
    });
}
