import { User, USER_UNKNOWN } from "../models/User";
import { Score, ScoreType, IScore } from "../models/Score";
import { Checkout } from "../models/Checkout";
import jwt from "jsonwebtoken";
require("dotenv").config();
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import { getScoreTypes } from "../utils/score-utils";

// Create a nodemailer transporter TODO: dupliziert von app.ts
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT!),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  greetingTimeout: 1000 * 10,
  logger:
    !!process.env.SMTP_DEBUG && process.env.SMTP_DEBUG.toLowerCase() == "true",
});

const handleSaveErrors = (err: any, type: string | undefined) => {
  console.log(err.message, err.code);
  let errors = {
    signature: "",
  };

  if (err.code === 11000) {
    if (!type) {
    } else if (type == "signature") {
      errors.signature = "Diese Notensignatur ist bereits in Verwendung";
    }
    return errors;
  }

  return errors;
};

module.exports.register_score_get = (req: any, res: any) => {
  res.redirect("/register-score");
};

module.exports.register_score_post = async (req: any, res: any) => {
  const { composer, work, signature, count } = req.body;

  try {
    const scoreType = await ScoreType.create({
      composer,
      work,
      signature,
      count,
    });

    // Nun die einzelnen Exemplare speichern
    for (let i = 1; i <= count; i++) {
      try {
        const score = await Score.create({
          signature,
          id: signature + "-" + i,
        });
      } catch (error) {
        console.error("Error creating score", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }

    res.status(201).json({ scoreType: scoreType._id });
  } catch (err) {
    const errors = handleSaveErrors(err, "signature");
    res.status(400).json({ errors });
  }
};

module.exports.checkout_get = (req: any, res: any) => {
  res.redirect("/checkout");
};

module.exports.checkout_post = async (req: any, res: any) => {
  const {
    userJwtOrCheckoutId,
    userId,
    userLastName,
    scoreId,
    scoreExtId,
    state,
    date,
    comment,
    allowDoubleCheckout,
    checkoutId,
  } = req.body;

  try {
    if (userId && scoreId) {
      let score = await Score.findOne({ id: scoreId });
      if (score) {
        // check if this user already checked out a copy of this score type
        const scoreTypeId = scoreId.substr(
          0,
          (scoreId as string).lastIndexOf("-")
        );
        const existingScores = await Score.find({ checkedOutByUserId: userId });
        const existingScoreOfCurrentType = existingScores.find(
          (score) =>
            score.id.substr(0, score.id.lastIndexOf("-")) === scoreTypeId
        );
        const doubleCheckoutIsAllowed = allowDoubleCheckout === "allow";
        if (
          !existingScoreOfCurrentType ||
          (doubleCheckoutIsAllowed && comment) ||
          userId == USER_UNKNOWN
        ) {
          const checkout = new Checkout({
            _id: checkoutId || uuidv4(),
            userId,
            scoreId,
            checkoutComment: comment,
            checkoutTimestamp: date ? date : new Date(),
          });
          score.checkedOutByUserId = userId;
          score.extId = scoreExtId; // this is primilarly useful for the post-checkout from rental receipt usecase
          score.state = state;
          score.checkouts.push(checkout);
          score = await score.save();
          if (score) {
            res.status(201).json({ checkoutScore: score });
          } else {
            res
              .status(400)
              .json({ errors: "Update score with checkout record failed" });
          }
        } else {
          res.status(400).json({
            errors: `User with Id ${userId} has already checked out score Id ${existingScoreOfCurrentType.id}. To allow another checkout check checkbox and specify reason in comment field.`,
          });
        }
      }
    } else if (scoreId) {
      const score = await Score.findOne({ id: scoreId });

      if (score) {
        const checkedOutByUserId = score.checkedOutByUserId;
        if (checkedOutByUserId) {
          // res.status(400).json({ message: `Score ${scoreId} already checked out by user Id ${checkedOutByUserId}` });
          res.status(400).json({
            errors: `Score ${scoreId} already checked out by user Id ${checkedOutByUserId}`,
          });
        } else {
          res.status(201).json({ checkoutScore: score });
        }
      } else {
        res.status(400).json({ errors: `Score with Id ${scoreId} not found` });
      }
    } else if (userJwtOrCheckoutId) {
      // decode JWT and look up user
      // if JWT invalid we check if the text could be a choutout receipt id
      let jwtInvalid = false;
      jwt.verify(
        userJwtOrCheckoutId,
        process.env.JWT_SECRET!,
        async (err: any, decodedToken: any) => {
          let userId, checkoutId;
          if (err) {
            jwtInvalid = true;
            const text = userJwtOrCheckoutId as string;
            if (text.startsWith("C-")) {
              // looks like a checkout Id; we continue with the "un.known" user.
              checkoutId = text;
              userId = USER_UNKNOWN;
            } else {
              res.status(400).json({
                errors: `Kein gültiger User oder Leihzettel QR Code!`,
              });
              return;
            }
          } else {
            userId = decodedToken.id;
            checkoutId = "";
          }
          let checkoutUser = await User.findOne({ id: userId });
          if (checkoutUser) {
            res
              .status(201)
              .json({ checkoutUser, checkoutId, USER_UNKNOWN: USER_UNKNOWN });
          } else {
            res
              .status(400)
              .json({ errors: `User with Id ${userId} not found` });
          }
        }
      );
    } else if (userId) {
      // TODO: Pfad noch unterstützt?
      const user = await User.findOne({ id: userId });
      if (user) {
        res.status(201).json({ checkoutUser: user, checkoutId: "" });
      } else {
        res.status(400).json({ errors: `User with Id ${userId} not found` });
      }
    } else if (userLastName) {
      // case-insensitive search at beginning
      const users = await User.find({
        lastName: { $regex: `^${userLastName}`, $options: "i" },
      });
      // console.log(users);
      res.render("checkout", {
        users,
      });
    }
  } catch (error) {
    res.status(500).json({ error });
  }
};

module.exports.checkin_post = async (req: any, res: any) => {
  const { scoreId, comment } = req.body;

  try {
    if (scoreId && comment != undefined) {
      let score = await Score.findOne({ id: scoreId });
      if (score) {
        if (score.checkedOutByUserId) {
          // current checkout record should last element of array
          const checkout = score.checkouts[score.checkouts.length - 1];
          if (checkout.checkinTimestamp) {
            // that's an error because last checkout record is not an open checkout
            res.status(400).json({
              errors: `Checkout record not found for score with Id ${scoreId}`,
            });
          } else {
            // we have a true checkout record
            const checkedOutByUserId = score.checkedOutByUserId;
            const user = await User.findOne({ id: checkedOutByUserId });
            if (user) {
              // res.status(200).json({ checkinScore: score, checkinUser: user });
              score.checkedOutByUserId = ""; // mark this score as "not checked out"
              checkout.checkinTimestamp = new Date();
              checkout.checkinComment = comment;

              score = await score.save();
              if (score) {
                await sendCheckinConfirmationEmail(
                  user,
                  score,
                  process.env.EMAIL_TEST_RECIPIENT
                );
                res.status(201).json({ checkinScore: score });
              } else {
                res
                  .status(400)
                  .json({ errors: "Update score with checkout record failed" });
              }
            } else {
              res.status(400).json({
                errors: `Score ${scoreId} checked out by user Id ${checkedOutByUserId}, but no user found this id`,
              });
            }
          }
        }
      } else {
        res.status(400).json({
          errors: `Found score with Id ${scoreId} but it's not checked out`,
        });
      }
    } else if (scoreId) {
      const score = await Score.findOne({ id: scoreId });

      if (score) {
        const checkedOutByUserId = score.checkedOutByUserId;
        if (checkedOutByUserId) {
          const user = await User.findOne({ _id: checkedOutByUserId });
          if (user) {
            res.status(200).json({ checkinScore: score, checkinUser: user });
          } else {
            res.status(400).json({
              errors: `Score ${scoreId} checked out by user Id ${checkedOutByUserId}, but no user found this id`,
            });
          }
        } else {
          res
            .status(400)
            .json({ errors: `Score with Id ${scoreId} is not checked out` });
        }
      } else {
        res.status(400).json({ errors: `Score with Id ${scoreId} not found` });
      }
    }
  } catch (error) {
    res.status(500).json({ error });
  }
};

module.exports.checkouts_post = async (req: any, res: any) => {
  const { signature, checkedOut, userId } = req.body;
  const admin = true;
  await checkouts(res, signature, checkedOut, true, userId);
};

export async function checkouts(
  res: any,
  signature: string,
  checkedOut: string,
  admin: boolean,
  userId: string
) {
  let filter = signature && signature !== "ALL" ? { signature } : {};
  try {
    let error = undefined;
    if (!signature) {
      error = "Bitte Signatur auswählen";
    }

    let checkoutsWithUser = [];
    if (signature) {
      // const scores = await Score.find(filter, "checkouts") // return only checkouts property
      const scores = await Score.find(filter).populate("checkouts").exec(); // TODO: when exec and when not? // TODO: is populate() correct? See https://mongoosejs.com/docs/subdocs.html

      if (userId) {
        // show only checkouts of this user
        for (const score of scores) {
          for (const checkout of score.checkouts) {
            if (checkout.userId == userId) {
              const user = await User.findOne({ id: userId });
              checkoutsWithUser.push({
                checkout,
                user,
                scoreExtId: score.extId,
              });
            }
          }
        }
      } else {
        const userIds = []; // TODO: Set
        for (const score of scores) {
          for (const checkout of score.checkouts) {
            userIds.push(checkout.userId);
          }
        }

        const userMap = await (
          await User.find({ id: { $in: userIds } })
        ).reduce((map, user) => map.set(user.id, user), new Map());

        for (const score of scores) {
          for (const checkout of score.checkouts) {
            const user = userMap.get(checkout.userId);
            checkoutsWithUser.push({ checkout, user, scoreExtId: score.extId });
          }
        }
      }
    }

    const onlyCheckedOut = checkedOut == "true";
    if (onlyCheckedOut) {
      checkoutsWithUser = checkoutsWithUser.filter((checkoutWithUser: any) => {
        return !checkoutWithUser.checkout.checkinTimestamp;
      });
    }

    res.render("checkouts", {
      admin,
      signatures: await getScoreTypes(),
      filter: { signature, checkedOut: onlyCheckedOut },
      checkouts: checkoutsWithUser,
      error,
    });
  } catch (error) {
    res.status(500).json({ error });
  }
}

const sendCheckinConfirmationEmail = async (
  user: any,
  score: IScore,
  testRecipient?: string
) => {
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

    const result = await transporter.sendMail(mailOptions);
    if (transporter.logger) {
      console.log("Score checkin confirmation e-mail:", result);
    }
  } catch (err) {
    console.error(err);
  }
};

module.exports.updateCheckout_post = async (req: any, res: any) => {
  const { scoreId, checkoutId, checkoutComment, checkinComment, userId } =
    req.body;

  let score = await Score.findOne({ id: scoreId });
  // const score = await Score.findOne({ "checkouts._id" : checkoutId });  // interesting to find a score just by the _id of one of it's checkouts
  if (score) {
    console.log("score found");

    // TODO: works, but question is if we can do a query which just returns the checkout without returning the whole score first
    const checkout = score.checkouts.find(
      (checkout: any) => checkout._id == checkoutId
    );
    if (checkout) {
      console.log("checkout found");
      checkout.checkoutComment = checkoutComment;
      checkout.checkinComment = checkinComment;
      if (userId) {
        checkout.userId = userId;
        score.checkedOutByUserId = userId;
      }
      score = await score.save();
      if (score) {
        res.status(201).json({ updateScore: score });
      }
    } else {
      return res.status(500).json({
        message: `checkout Id ${checkoutId} not found for score with Id ${scoreId}`,
      }); // TODO: 4xx error
    }
  } else {
    return res
      .status(500)
      .json({ message: `score not found with Id ${scoreId}` }); // TODO: 4xx error
  }
};

module.exports.userSearch_post = async (req: any, res: any) => {
  const { lastName } = req.body;

  let users: any[] = []; // empty string should return empty users array
  if (lastName) {
    // case-insensitive search at beginning
    users = await User.find({
      lastName: { $regex: `^${lastName}`, $options: "i" },
    });
  }
  res.status(201).json({ users });
};

module.exports.users_get = async (req: any, res: any) => {
  const active = true;
  const users = await User.find({ $or: [{ active }, { active: null }] }).sort(
    "lastName"
  ); // active field was added later with default true
  res.render("users", {
    users,
    filter: { active },
    error: undefined,
  });
};

module.exports.users_post = async (req: any, res: any) => {
  const { cbActive } = req.body;
  const active = !!cbActive;
  const users = await User.find({ $or: [{ active }, { active: null }] }).sort(
    "lastName"
  ); // active field was added later with default true
  res.render("users", {
    users,
    filter: { active },
    error: undefined,
  });
};

module.exports.updateUser_post = async (req: any, res: any) => {
  const { id, email, active } = req.body;

  let user = await User.findOne({ id });
  if (user) {
    // console.log("user found");
    user.email = email;
    user.active = !!active;
    user = await user.save();
    if (user) {
      res.status(201).json({ updateUser: user });
    } else {
      return res
        .status(500)
        .json({ message: `error saving user with Id ${id}` });
    }
  } else {
    return res.status(500).json({ message: `user not found with Id ${id}` }); // TODO: 4xx error
  }
};
