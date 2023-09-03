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
    route: "score",
    signatures: await getScoreTypes(),
    filter: { signature: "", checkedOut: true },
    checkouts: undefined,
    error: undefined,
  })
);
score.post("/checkouts", scoreController.checkouts_post);

score.post("/userSearch", scoreController.userSearch_post);
