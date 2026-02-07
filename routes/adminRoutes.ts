const { Router } = require("express");
const adminController = require("../controllers/adminController");
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
admin.post("/uploadCheckoutPhoto", adminController.uploadCheckoutPhoto_post);

// Score management routes
admin.get("/register", (req: any, res: any) =>
  res.render("register-score", { scoreType: res.locals.scoreType })
);
admin.post("/register", adminController.register_score_post);
admin.get("/checkout", (req: any, res: any) =>
  res.render("checkout", {
    checkoutUser: res.locals.checkoutUser,
    checkoutScore: res.locals.checkoutScore,
    users: undefined,
  })
);
admin.post("/checkout", adminController.checkout_post);
admin.post("/updateCheckout", adminController.updateCheckout_post);
admin.get("/checkin", (req: any, res: any) =>
  res.render("checkin", {
    checkinScore: res.locals.checkinScore,
  })
);
admin.post("/checkin", adminController.checkin_post);
admin.get("/checkouts", async (req: any, res: any) =>
  res.render("checkouts", {
    admin: true,
    signatures: await getScoreTypes(),
    filter: { signature: "", checkedOut: true },
    checkouts: undefined,
    error: undefined,
  })
);
admin.post("/checkouts", adminController.checkouts_post);

// User management routes
admin.post("/userSearch", adminController.userSearch_post);
admin.get("/users", adminController.users_get);
admin.post("/users", adminController.users_post);
admin.post("/updateUser", adminController.updateUser_post);

exports.admin.get("/history", async (req: any, res: any) =>
  res.render("score-history", {
    id: undefined,
    checkouts: undefined,
    error: undefined,
  })
);
exports.admin.post("/history", adminController.scoreHistory_post);

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
admin.post("/checkouts-vue", adminController.checkouts_vue_post);

admin.get("/users-vue", adminController.users_vue_get);
admin.post("/users-vue", adminController.users_vue_post);

admin.get("/register-score-vue", (req: any, res: any) =>
  res.render("register-score-vue")
);

admin.get("/email-queue-stats", adminController.email_queue_stats_get);
admin.get("/test-email", adminController.send_test_email_get);
