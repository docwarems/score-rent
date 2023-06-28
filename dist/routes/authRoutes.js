"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.score = void 0;
const { Router } = require("express");
const authController = require("../controllers/authController");
const { requireAuth, checkUser, requireAdmin, } = require("../middleware/authMiddleware");
const router = Router();
router.post("*", checkUser);
router.get("/signup", authController.signup_get);
router.post("/signup", authController.signup_post);
router.get("/signup-success", authController.signup_success_get);
router.get("/login", authController.login_get);
router.post("/login", authController.login_post);
router.get("/logout", authController.logout_get);
router.get("/verify-email", authController.verify_email_get);
// router.get("/register-score", authController.register_score_get);
// router.post("/register-score", authController.register_score_post);
// router.get("/checkout", authController.checkout_get);
// router.post("/checkout", requireAuth, requireAdmin, authController.checkout_post);
exports.score = Router();
exports.score.get("*", checkUser, requireAuth, requireAdmin);
exports.score.post("*", checkUser, requireAuth, requireAdmin);
exports.score.get("/register", (req, res) => res.render("register-score", { scoreType: res.locals.scoreType }));
exports.score.post("/register", authController.register_score_post);
exports.score.get("/checkout", requireAuth, requireAdmin, (req, res) => res.render("checkout", {
    checkoutUser: res.locals.checkoutUser,
    checkoutScore: res.locals.checkoutScore,
}));
exports.score.post("/checkout", authController.checkout_post);
// module.exports = router, score;
