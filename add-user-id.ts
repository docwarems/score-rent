import fs from "fs";
import { parse } from "csv-parse";
import { User, IUser } from "./models/User";
import { Score } from "./models/Score";
import { Checkout, checkoutSchema } from "./models/Checkout";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
require("dotenv").config();

// Ausfühhrung mit: ts-node add-user-id.ts

// database connection
const dbURI = process.env.MONGODB_URL as string;
mongoose.set("strictQuery", false);
// mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex:true }) // useCreateIndex not supported
mongoose
  .connect(dbURI!)
  .then((result: any) => addUserId())
  .catch((err: any) => console.log(err));

async function addUserId() {
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

  const scores = await Score.find();
  for (const score of scores) {
    console.log("Checked out: ", score.checkedOutByUserId ? "true" : "false");

    const checkouts = score.checkouts;
    for (let i = 0; i < checkouts.length; i++) {
      // console.log(checkout);
      const checkout = checkouts[i];
      const user = await User.findById(checkout.userId);
      if (user) {
        console.log({ scoreId: checkout.scoreId, userId: user.id });
      } else {
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

    await score.save(); // will also save nested checkouts
  }
  process.exit(0);
}

function convertToGermanCharacterRules(name: string): string {
  // Replace umlauts and special characters with their German equivalents
  const germanRulesMap: { [key: string]: string } = {
    ä: "ae",
    ö: "oe",
    ü: "ue",
    ß: "ss",
  };

  return name
    .toLowerCase()
    .replace(/[äöüß]/g, (match) => germanRulesMap[match] || "");
}

// TODO check required lengths
function generateUserId(firstName: string, lastName: string): string {
  firstName = convertToGermanCharacterRules(firstName);
  lastName = convertToGermanCharacterRules(lastName).replace(" ", "");
  return firstName.substring(0, 2) + "." + lastName.substring(0, 6);
}
