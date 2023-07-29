import fs from "fs";
import { parse } from "csv-parse";
import { User } from "./models/User";
import { Score } from "./models/Score";
import { Checkout, checkoutSchema } from "./models/Checkout";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
require("dotenv").config();

// Ausfühhrung mit: ts-node checkouts-import.ts

// database connection
const dbURI = process.env.MONGODB_URL as string;
mongoose.set("strictQuery", false);
// mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true }) // useCreateIndex not supported
mongoose
  .connect(dbURI!)
  .then((result: any) => importCsv())
  .catch((err: any) => console.log(err));

async function importCsv() {
  type CheckoutRecord = {
    firstName: string;
    lastName: string;
    singGroup: string;
    email: string;
    scoreId: string;
    comment: string;
  };

  type User = {
    firstName: string;
    lastName: string;
    singGroup: string;
    email: string;
  };

  const headers = [
    "lastName",
    "firstName",
    "singGroup",
    "email",
    "scoreId",
    "comment",
  ];
  const parser = parse(
    { delimiter: ";", columns: headers },
    async function (err, records: CheckoutRecord[]) {
      // console.log(records);

      const userMap = new Map<string, User>();
      for (const record of records) {
        console.log(record);
        let user = userMap.get(record.lastName);

        userMap.set(record.lastName, {
          firstName: record.firstName,
          lastName: record.lastName,
          singGroup: record.singGroup,
          email: record.email,
        });

        const email = record.email ? record.email : undefined;
        try {
          let user = record.email
            ? await User.findOne({ email: record.email })
            : await User.findOne({ lastName: record.lastName });
          if (user) {
            console.log("Duplet: ", user.lastName);
          } else {
            user = await User.create({
              email,
              firstName: record.firstName,
              lastName: record.lastName,
              password: uuidv4(),
              isManuallyRegistered: true,
            });
          }

          const signature = "ORFF-COM";
          const scoreId = signature + "-" + uuidv4();

          const checkout = new Checkout({
            userId: user.id.toString(),
            scoreId,
            checkoutTimestamp: new Date("2020-01-01"),
            checkoutComment: record.comment,
          });
          const checkouts = [];
          checkouts.push(checkout);

          const score = await Score.create({
            signature,
            id: scoreId,
            extId: record.scoreId,
            checkedOutByUserId: user._id.toString(),
            checkouts,
          });
          console.log(score._id);
        } catch (e) {
          console.error(e);
        }
      }

      process.exit(0);
    }
  );

  fs.createReadStream(process.env.CHECKOUTS_IMPORT_FILE!).pipe(parser);
}
