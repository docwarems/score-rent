import { IUser, User, USER_UNKNOWN, getVoiceOptions } from "../models/User";
import { Score, ScoreType, IScore } from "../models/Score";
import { Checkout, ICheckout } from "../models/Checkout";
import jwt from "jsonwebtoken";
require("dotenv").config();
import { getEnvVar, mailTransporter } from "../utils/misc-utils";
import { v4 as uuidv4 } from "uuid";
import i18next from "i18next";
import {
  getScoreTypes,
  SIGNATURE_ALL,
  getScoreTypeMap,
} from "../utils/score-utils";
import { emailQueueService } from "../utils/email-queue-utils";

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

const t = (req: any, key: string, options?: any) => {
  const acceptLang = req.headers["accept-language"] || "de";
  const lng = acceptLang.startsWith("en") ? "en" : "de";
  return i18next.t(key, { ...options, lng });
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

  const { isAdmin, isPlaywright } = res.locals.user;

  try {
    if (userId && scoreId) {
      let score = await Score.findOne({ id: scoreId });
      if (score) {
        // check if this user already checked out a copy of this score type
        const scoreTypeId = scoreId.substr(
          0,
          (scoreId as string).lastIndexOf("-")
        );
        const checkedOutScores = await Score.find({
          checkedOutByUserId: userId,
        });
        const checkedOutScoresOfCurrentType = checkedOutScores.find(
          // TODO: can for sure be done in one query
          (score) =>
            score.id.substr(0, score.id.lastIndexOf("-")) === scoreTypeId
        );
        const doubleCheckoutIsAllowed = allowDoubleCheckout === "allow";
        if (
          !checkedOutScoresOfCurrentType ||
          (doubleCheckoutIsAllowed && comment) || // a double checkout requires a reason in comment
          userId == USER_UNKNOWN // checkout by sheet with dummy user
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
            const user = await User.findOne({ id: userId });
            if (user && !isPlaywright) {
              try {
                // sending may fail with "sent limit exceeded" error
                await sendCheckoutConfirmationEmail(
                  user,
                  score,
                  getEnvVar("EMAIL_TEST_RECIPIENT")
                );
              } catch (error) {
                console.error(error);
                score.checkouts.pop();
                checkout.checkoutConfirmationEmailNotSent = true;
                score.checkouts.push(checkout);
                await score.save();
              }
            }
            res.status(201).json({ checkoutScore: score });
          } else {
            res
              .status(400)
              .json({ errors: "Update score with checkout record failed" });
          }
        } else {
          res.status(400).json({
            // errors: `User with Id ${userId} has already checked out score Id ${checkedOutScoresOfCurrentType.id}. To allow another checkout check checkbox and specify reason in comment field.`,
            errors: t(req, "score.checkout.double", {
              scoreId: checkedOutScoresOfCurrentType.id,
            }),
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
      // User selected from user search result
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
  const { isAdmin, isPlaywright } = res.locals.user;

  try {
    if (scoreId && comment != undefined) {
      // checkin request
      let score = await Score.findOne({ id: scoreId });
      if (score) {
        if (score.checkedOutByUserId) {
          // current (open) checkout record should be last element of array
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
                if (!isPlaywright) {
                  try {
                    // sending may fail with "sent limit exceeded" error
                    await sendCheckinConfirmationEmail(
                      user,
                      score,
                      getEnvVar("EMAIL_TEST_RECIPIENT")
                    );
                  } catch (error) {
                    console.error(error);
                    checkout.checkinConfirmationEmailNotSent = true;
                    await score.save();
                  }
                }
                res.status(201).json({ checkinScore: score });
              } else {
                res.status(400).json({
                  errors: "Update score checkout record for checkin failed",
                });
              }
            } else {
              res.status(400).json({
                errors: `Score ${scoreId} checked out by user Id ${checkedOutByUserId}, but no user found with this id`,
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
      // search score and return checkin form
      const score = await Score.findOne({ id: scoreId });

      if (score) {
        const checkedOutByUserId = score.checkedOutByUserId;
        if (checkedOutByUserId) {
          const user = await User.findOne({ id: checkedOutByUserId });
          if (user) {
            res.status(200).json({ checkinScore: score, checkinUser: user });
          } else {
            res.status(400).json({
              errors: `Score ${scoreId} checked out by user Id ${checkedOutByUserId}, but no user found with this id`,
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
  await checkouts(res, signature, checkedOut == "true", admin, userId);
};

/**
 * Fälle
 * - Checkouts ermitteln
 *   - mit/ohne User Einschränkung
 *
 * @param res
 * @param signature
 * @param checkedOut
 * @param admin
 * @param userId
 */
export async function checkouts(
  res: any,
  signature: string,
  checkedOut: boolean,
  admin: boolean,
  userId: string
) {
  let sigFilter =
    signature && signature !== SIGNATURE_ALL.id ? { signature } : {};
  let scoreTypeTotalCount: number | undefined;
  let scoreTypeTotalCheckedOutCount: number | undefined;
  try {
    let error = undefined;
    if (!signature) {
      error = "Bitte Signatur auswählen";
    }

    let checkoutsWithUser: any[] = [];
    if (signature) {
      const scoreType = await ScoreType.findOne({ signature });
      scoreTypeTotalCount = scoreType?.count;

      // const scores = await Score.find(filter, "checkouts") // return only checkouts property
      const scores = await Score.find(sigFilter).populate("checkouts").exec(); // TODO: when exec and when not? // TODO: is populate() correct? See https://mongoosejs.com/docs/subdocs.html
      const checkedOutScoreIdSet = new Set<string>();
      checkoutsWithUser = await getCheckoutsWithUser(
        scores,
        checkedOutScoreIdSet,
        checkedOut,
        userId
      );
      scoreTypeTotalCheckedOutCount = checkedOutScoreIdSet.size;
    }

    res.render("checkouts", {
      admin,
      signatures: await getScoreTypes(),
      signatureMap: await getScoreTypeMap(),
      SIGNATURE_ALL,
      filter: { signature, checkedOut },
      checkouts: checkoutsWithUser,
      scoreTypeTotalCount,
      scoreTypeTotalCheckedOutCount,
      error,
    });
  } catch (error) {
    res.status(500).json({ error });
  }

  async function getCheckoutsWithUser(
    scores: IScore[],
    checkedOutScoreIdSet: Set<string>,
    onlyCheckedOut: boolean,
    onlyForUserId?: string
  ) {
    const userMap = await getUserMap(scores);
    let checkoutsWithUser = [];
    for (const score of scores) {
      for (const checkout of score.checkouts) {
        checkedOutScoreIdSet.add(score.id);
        if (
          (!onlyCheckedOut || !checkout.checkinTimestamp) &&
          (!onlyForUserId || checkout.userId === onlyForUserId)
        ) {
          const user = userMap.get(checkout.userId);
          checkoutsWithUser.push({
            checkout,
            user,
            scoreExtId: score.extId,
            signature: score.signature,
          });
        }
      }
    }
    return checkoutsWithUser;

    async function getUserMap(scores: IScore[]) {
      const userIds = []; // TODO: Set
      for (const score of scores) {
        for (const checkout of score.checkouts) {
          userIds.push(checkout.userId);
        }
      }
      const userMap = (await User.find({ id: { $in: userIds } })).reduce(
        (map, user) => map.set(user.id, user),
        new Map()
      );
      return userMap;
    }
  }
}

module.exports.checkouts_vue_post = async (req: any, res: any) => {
  const { signature, checkedOut, userId, withCheckoutSheet } = req.body;
  const admin = true;
  await checkouts_vue(
    res,
    signature,
    checkedOut,
    admin,
    userId,
    withCheckoutSheet
  );
};

/**
 * Fälle
 * - Checkouts ermitteln
 *   - mit/ohne User Einschränkung
 *
 * @param res
 * @param signature
 * @param checkedOut if true return only open checkouts
 * @param admin
 * @param userId if defined return checkouts only for this user
 */
export async function checkouts_vue(
  res: any,
  signature: string,
  checkedOut: boolean,
  admin: boolean,
  userId: string,
  withCheckoutSheet: boolean = false
) {
  let sigFilter =
    signature && signature !== SIGNATURE_ALL.id ? { signature } : {};
  let scoreTypeTotalCount: number | undefined;
  let scoreTypeTotalCheckedOutCount: number | undefined;
  try {
    let error = undefined;
    if (!signature) {
      error = "Bitte Signatur auswählen";
    }

    let checkoutsWithUser: any[] = [];
    if (signature) {
      const scoreType = await ScoreType.findOne({ signature });
      scoreTypeTotalCount = scoreType?.count;

      // const scores = await Score.find(filter, "checkouts") // return only checkouts property
      const scores = await Score.find(sigFilter).populate("checkouts").exec();
      const checkedOutScoreIdSet = new Set<string>();
      checkoutsWithUser = await getCheckoutsWithUser(
        scores,
        checkedOutScoreIdSet,
        checkedOut,
        userId,
        withCheckoutSheet
      );
      scoreTypeTotalCheckedOutCount = checkedOutScoreIdSet.size;
    }

    res.status(201).json({
      admin,
      signatures: JSON.stringify(await getScoreTypes()),
      signatureMap: JSON.stringify(await getScoreTypeMap()),
      SIGNATURE_ALL,
      filter: JSON.stringify({ signature, checkedOut }),
      checkouts: checkoutsWithUser,
      scoreTypeTotalCount,
      scoreTypeTotalCheckedOutCount,
      error,
    });
  } catch (error) {
    res.status(500).json({ error });
  }

  async function getCheckoutsWithUser(
    scores: IScore[],
    checkedOutScoreIdSet: Set<string>,
    onlyCheckedOut: boolean,
    onlyForUserId?: string,
    onlyCheckoutSheet?: boolean
  ) {
    const userMap = await getUserMap(scores);
    let checkouts = [];
    for (const score of scores) {
      for (const checkout of score.checkouts) {
        checkedOutScoreIdSet.add(score.id);
        if (
          (!onlyCheckedOut || !checkout.checkinTimestamp) &&
          (!onlyForUserId || checkout.userId === onlyForUserId) &&
          (!onlyCheckoutSheet ||
            (typeof checkout._id === "string" && checkout._id.startsWith("C-")))
        ) {
          const user = userMap.get(checkout.userId);
          const userName = user
            ? user.firstName + " " + user.lastName
            : checkout.userId;
          const voice = user?.voice ?? "?";
          const namePlusVoice = `${userName} (${voice})`;
          const email = user?.email ?? "";
          checkouts.push({
            id: checkout._id,
            checkoutTimestamp: checkout.checkoutTimestamp
              ? checkout.checkoutTimestamp.toLocaleDateString("de-DE")
              : "",
            checkoutComment: checkout.checkoutComment,
            checkinTimestamp: checkout.checkinTimestamp
              ? checkout.checkinTimestamp.toLocaleDateString("de-DE")
              : "",
            checkinComment: checkout.checkinComment,
            scoreId: score.id,
            scoreExtId: score.extId,
            signature: score.signature,
            user: { id: checkout.userId, name: userName, namePlusVoice, email },
          });
        }
      }
    }
    return checkouts;

    async function getUserMap(scores: IScore[]) {
      const userIds = []; // TODO: Set
      for (const score of scores) {
        for (const checkout of score.checkouts) {
          userIds.push(checkout.userId);
        }
      }
      const userMap = (await User.find({ id: { $in: userIds } })).reduce(
        (map, user) => map.set(user.id, user),
        new Map()
      );
      return userMap;
    }
  }
}

const sendCheckoutConfirmationEmail = async (
  user: any,
  score: IScore,
  testRecipient?: string
) => {
  const subject = "Hans-Sachs-Chor Noten ausgeliehen";

  const extIdText = score.extId ? ` (externe Nummer: ${score.extId})` : "";
  const html = `
    Liebe(r) ${user.firstName} ${user.lastName},
    <p>
    Du hast Noten "${(await getScoreTypeMap()).get(
      score.signature
    )}" mit HSC-Nummer ${
    score.id
  } ${extIdText} vom Hans-Sachs-Chor ausgeliehen.<br>
    Bitte behandle die Noten pfleglich und nehme Eintragungen nur mit Bleistift vor.<br>
    Nach dem Konzert gebe die Noten bitte zeitnah an den Chor zurück.<br>
    Vorher radiere bitte deine Eintragungen aus.<br>    
    <p>
    Wenn du das Konzert nicht mitsingen kannst, gib die Noten bitte so schnell wie möglich zurück, damit sie anderen zur Verfügung stehen.<br>
    <p>
    Und nun viel Spaß beim Proben und viel Erfolg beim Konzert!
    <p>
    Dein Hans-Sachs-Chor Notenwart
    <p>
    P.S.: Diese E-Mail wurde automatisch versendet
  `;

  await sendConfirmationEmail(user, subject, html, testRecipient);
};

const sendCheckinConfirmationEmail = async (
  user: any,
  score: IScore,
  testRecipient?: string
) => {
  const subject = "Hans-Sachs-Chor Noten Rückgabe erfolgt";

  const extIdText = score.extId ? ` (externe Nummer: ${score.extId})` : "";
  const html = `
  Liebe(r) ${user.firstName} ${user.lastName},
  <p>
  Du hast die Noten "${(await getScoreTypeMap()).get(
    score.signature
  )}" mit HSC-Nummer ${score.id}${extIdText} zurückgegeben. Vielen Dank!
  <p>
  Dein Hans-Sachs-Chor Notenwart
  <p>
  p.s.: Diese E-Mail wurde automatisch versendet
`;

  await sendConfirmationEmail(user, subject, html, testRecipient);
};

const sendConfirmationEmail = async (
  user: any,
  subject: string,
  html: string,
  testRecipient?: string
) => {
  const email = testRecipient ? testRecipient : user.email;
  if (email) {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject,
      html,
    };

    const result = await emailQueueService.queueEmail(mailOptions); // we use queue because delayed sending is no problem

    if (mailTransporter.logger) {
      console.log("Queued confirmation e-mail:", result);
    }
  } else {
    console.log(
      `No confirmation sent because no e-mail for user ${user.id} defined.`
    );
  }
};

module.exports.updateCheckout_post = async (req: any, res: any) => {
  const { scoreId, checkoutId, checkoutComment, checkinComment, userId } =
    req.body;

  let score = await Score.findOne({ id: scoreId });
  // const score = await Score.findOne({ "checkouts._id" : checkoutId });  // interesting to find a score just by the _id of one of it's checkouts
  if (score) {
    // console.log("score found");

    // TODO: works, but question is if we can do a query which just returns the checkout without returning the whole score first
    const checkout = score.checkouts.find(
      (checkout: any) => checkout._id == checkoutId
    );
    if (checkout) {
      // console.log("checkout found");
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
  const { id, email, active, voice } = req.body;

  let user = await User.findOne({ id });
  if (user) {
    // console.log("user found");
    user.email = email;
    user.active = !!active;
    user.voice = voice;
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

// Code similar to checkouts_post
module.exports.scoreHistory_post = async (req: any, res: any) => {
  let { id } = req.body;

  id = id.trim();
  let checkoutsWithUser = [];
  let error: string | undefined;
  const score = await Score.findOne({ id });
  if (score) {
    // get map of users who checked out this score
    const userIds = []; // TODO: Set
    for (const checkout of score.checkouts) {
      userIds.push(checkout.userId);
    }
    const userMap = await (
      await User.find({ id: { $in: userIds } })
    ).reduce((map, user) => map.set(user.id, user), new Map());

    // assign user objects to checkouts and collect total number of checked out scores
    const checkedOutScoresSet = new Set();
    for (const checkout of score.checkouts) {
      checkedOutScoresSet.add(score.id);
      const user = userMap.get(checkout.userId);
      checkoutsWithUser.push({
        checkout,
        user,
        scoreExtId: score.extId,
        signature: score.signature,
      });
    }
  } else {
    error = `Score with Id ${id} not found!`;
  }
  res.render("score-history", {
    id,
    signatureMap: await getScoreTypeMap(),
    checkouts: checkoutsWithUser,
    error,
  });
};

module.exports.users_vue_get = async (req: any, res: any) => {
  res.render("users-vue", {
    filter: JSON.stringify({ active: true }),
    users: [],
    voiceOptions: JSON.stringify(getVoiceOptions()),
  });
};

module.exports.users_vue_post = async (req: any, res: any) => {
  const { active } = req.body;
  const users = await User.find({ $or: [{ active }, { active: null }] }).sort(
    "lastName"
  );
  res.status(201).json({
    voiceOptions: getVoiceOptions(),
    users: users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      voice: u.voice,
      memberState: u.memberState,
      active: u.active ?? true,
    })),
  });
};

module.exports.email_queue_stats_get = async (req: any, res: any) => {
  try {
    const verbose = req.query.verbose === "1";
    const stats = await emailQueueService.getQueueStats(verbose);
    const canSend = await emailQueueService.canSendEmail();

    res.json({
      ...stats,
      canSendMore: canSend,
    });
  } catch (error) {
    res.status(500).json({ error });
  }
};

module.exports.send_test_email_get = async (req: any, res: any) => {
  if (!getEnvVar("EMAIL_TEST_RECIPIENT")) {
    res.status(500).json({
      error: new Error(`no EMAIL_TEST_RECIPIENT defined in env`).message,
    });
  }

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: getEnvVar("EMAIL_TEST_RECIPIENT"),
    subject: "test",
    html: "<h3>a test message</h3>",
  };

  const result = await emailQueueService.queueEmail(mailOptions);

  if (mailTransporter.logger) {
    console.log("Queued confirmation e-mail:", result);
  }

  res.redirect("/admin/email-queue-stats");
};
