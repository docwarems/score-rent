const { Router } = require("express");
const scoreController = require("../controllers/scoreController");
const {
  requireAuth,
  checkUser,
  requireUserVerified,
  requireAdmin,
} = require("../middleware/authMiddleware");
import { getScoreTypes } from "../utils/score-utils";

export const admin = Router();

// All routes require authentication and admin privileges
admin.get("*", requireAuth, requireAdmin);
admin.post("*", requireAuth, requireAdmin);

// Score management routes
admin.get("/register", (req: any, res: any) =>
  res.render("register-score", { scoreType: res.locals.scoreType })
);
admin.post("/register", scoreController.register_score_post);
admin.get("/checkout", (req: any, res: any) =>
  res.render("checkout", {
    checkoutUser: res.locals.checkoutUser,
    checkoutScore: res.locals.checkoutScore,
    users: undefined,
  })
);
admin.post("/checkout", scoreController.checkout_post);
admin.post("/updateCheckout", scoreController.updateCheckout_post);
admin.get("/checkin", (req: any, res: any) =>
  res.render("checkin", {
    checkinScore: res.locals.checkinScore,
  })
);
admin.post("/checkin", scoreController.checkin_post);
admin.get("/checkouts", async (req: any, res: any) =>
  res.render("checkouts", {
    admin: true,
    signatures: await getScoreTypes(),
    filter: { signature: "", checkedOut: true },
    checkouts: undefined,
    error: undefined,
  })
);
admin.post("/checkouts", scoreController.checkouts_post);

// User management routes
admin.post("/userSearch", scoreController.userSearch_post);
admin.get("/users", scoreController.users_get);
admin.post("/users", scoreController.users_post);
admin.post("/updateUser", scoreController.updateUser_post);

exports.admin.get("/history", async (req: any, res: any) =>
  res.render("score-history", {
    id: undefined,
    checkouts: undefined,
    error: undefined,
  })
);
exports.admin.post("/history", scoreController.scoreHistory_post);

exports.admin.get("/vue-test", async (req: any, res: any) =>
  res.render("vue-test")
);
exports.admin.get("/vue-test.js", async (req: any, res: any) =>
  res.render("vue-test.vue", {
    age: 66,
  })
);

exports.admin.get("/checkouts-vue", async (req: any, res: any) =>
  res.render("checkouts-vue", {
    admin: true,
    signatures: JSON.stringify(await getScoreTypes()),
    filter: JSON.stringify({ signature: "", checkedOut: true }),
    checkouts: undefined,
    error: undefined,
    hasError: false,
  })
);
admin.post("/checkouts-vue", scoreController.checkouts_vue_post);

admin.get("/users-vue", scoreController.users_vue_get);
admin.post("/users-vue", scoreController.users_vue_post);

admin.get("/register-score-vue", (req: any, res: any) =>
  res.render("register-score-vue")
);

admin.get("/email-queue-stats", scoreController.email_queue_stats_get);
