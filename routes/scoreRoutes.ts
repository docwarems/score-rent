const { Router } = require("express");
const scoreController = require("../controllers/scoreController");
const {
  requireAuth,
  checkUser,
  requireUserVerified,
  requireAdmin,
} = require("../middleware/authMiddleware");
import { getScoreTypes } from "../utils/score-utils";

export const score = Router();

// wildcard for all get/post actions
score.get("*", checkUser, requireAuth, requireAdmin);
score.post("*", checkUser, requireAuth, requireAdmin);

score.get("/register", (req: any, res: any) =>
  res.render("register-score", { scoreType: res.locals.scoreType })
);
score.post("/register", scoreController.register_score_post);

score.get("/checkout", (req: any, res: any) =>
  res.render("checkout", {
    checkoutUser: res.locals.checkoutUser,
    checkoutScore: res.locals.checkoutScore,
    users: undefined,
  })
);
score.post("/checkout", scoreController.checkout_post);
score.post("/updateCheckout", scoreController.updateCheckout_post);

score.get("/checkin", (req: any, res: any) =>
  res.render("checkin", {
    checkinScore: res.locals.checkinScore,
  })
);
score.post("/checkin", scoreController.checkin_post);

score.get("/checkouts", async (req: any, res: any) =>
  res.render("checkouts", {
    admin: true,
    signatures: await getScoreTypes(),
    filter: { signature: "", checkedOut: true },
    checkouts: undefined,
    error: undefined,
  })
);
score.post("/checkouts", scoreController.checkouts_post);

score.post("/userSearch", scoreController.userSearch_post);

// TODO: passt eigentlich nicht nach "score", wir brauchen aber admin-Prüfung
score.get("/users", scoreController.users_get);
score.post("/users", scoreController.users_post);
score.post("/updateUser", scoreController.updateUser_post);

exports.score.get("/history", async (req: any, res: any) =>
  res.render("score-history", {
    id: undefined,
    checkouts: undefined,
    error: undefined,
  })
);
exports.score.post("/history", scoreController.scoreHistory_post);

exports.score.get("/vue-test", async (req: any, res: any) =>
  res.render("vue-test")
);
exports.score.get("/vue-test.js",  async (req: any, res: any) =>
    res.render("vue-test.vue", {
    age: 66,
  })
);

exports.score.get("/checkouts-vue", async (req: any, res: any) =>
  res.render("checkouts-vue")
);
exports.score.get("/checkouts.js",  async (req: any, res: any) =>
    res.render("checkouts.vue", {
      admin: true,
      signatures: JSON.stringify(await getScoreTypes()),
      filter: JSON.stringify({ signature: "", checkedOut: true }),
      checkouts: undefined,
      error: undefined,
      hasError: false,
    })
);
score.post("/checkouts-vue", scoreController.checkouts_vue_post);

