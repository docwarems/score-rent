import fs from "fs";
import { parse } from "csv-parse";
import { User } from "./models/User";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
require("dotenv").config();

// Ausführung mit: ts-node user-import.ts [test]
// oder: npx ts-node user-import.ts [test]

// with true only logging of actions
const test: boolean = !!process.argv[2] && (process.argv[2] == "test");
console.log("test", test);

// database connection
const dbURI = process.env.MONGODB_URL as string;
mongoose.set("strictQuery", false);
// mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true }) // useCreateIndex not supported
mongoose
  .connect(dbURI!)
  .then((result: any) => importCsv())
  .catch((err: any) => console.log(err));

async function importCsv() {
  type UserRecord = {
    firstName: string;
    lastName: string;
    email: string;
    voice: string;
    memberState: string;
  };

  const headers = [
    "firstName",
    "lastName",
    "email",
    "voice",
    "memberState",
  ];
  const parser = parse(
    { delimiter: ";", columns: headers },
    async function (err, records: UserRecord[]) {
      // console.log(records);

      // const userMap = new Map<string, User>();
      for (const record of records) {
        console.log(record);
        const firstName = record.firstName.trim();
        const lastName = record.lastName.trim();
        const userId = User.generateUserId(firstName, lastName);
        if (!userId) {
          console.error(
            `Could not generate userId from '${firstName}' and '${lastName}'`
          );
          continue;
        }
        let user = await User.findOne({ id: userId });
        if (user) {
          log(
            `User with Id ${userId} found in db. Will update record!`
          );
          // it doesn't make sense to update the name because this was the base for the userId
          user.email = record.email;
          user.voice = record.voice;
          user.memberState = record.memberState;
        } else {
          log(
            `User with Id ${userId} not found in db. Will create record!`
          );
          user = await User.create({
            id: userId,
            firstName: record.firstName,
            lastName: record.lastName,
            email: record.email,
            voice: record.voice,
            memberState: record.memberState,
            password: uuidv4(),
            isManuallyRegistered: true,
          });
        }
        if (!test) {
          await user.save();
        }
      }

      process.exit(0);
    }
  );

  fs.createReadStream(process.env.USER_IMPORT_FILE!).pipe(parser);
}

function log(s: string) {
  if (test) {
    console.log(s);
  }
}