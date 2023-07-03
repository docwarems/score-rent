"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.score = exports.router = void 0;
const { Router } = require("express");
const authController = require("../controllers/authController");
const { requireAuth, checkUser, requireAdmin, } = require("../middleware/authMiddleware");
exports.router = Router();
exports.router.post("*", checkUser);
exports.router.get("/signup", authController.signup_get);
exports.router.post("/signup", authController.signup_post);
exports.router.get("/signup-success", authController.signup_success_get);
exports.router.get("/login", authController.login_get);
exports.router.post("/login", authController.login_post);
exports.router.get("/logout", authController.logout_get);
exports.router.get("/verify-email", authController.verify_email_get);
// router.get("/register-score", authController.register_score_get);
// router.post("/register-score", authController.register_score_post);
// router.get("/checkout", authController.checkout_get);
// router.post("/checkout", requireAuth, requireAdmin, authController.checkout_post);
exports.score = Router();
exports.score.get("*", checkUser, requireAuth, requireAdmin);
exports.score.post("*", checkUser, requireAuth, requireAdmin);
exports.score.get("/register", (req, res) => res.render("register-score", { scoreType: res.locals.scoreType }));
exports.score.post("/register", authController.register_score_post);
exports.score.get("/checkout", (req, res) => res.render("checkout", {
    checkoutUser: res.locals.checkoutUser,
    checkoutScore: res.locals.checkoutScore,
}));
exports.score.post("/checkout", authController.checkout_post);
exports.score.get("/checkin", (req, res) => res.render("checkin", {
    checkinScore: res.locals.checkinScore,
}));
exports.score.post("/checkin", authController.checkin_post);
// score.get("/checkouts", authController.checkouts_get);
const signatures = [
    { id: "VERD-REQ", name: "Verdi Requiem" },
    { id: "MOZ-REQ", name: "Mozart Requiem" },
]; // TODO: from db
exports.score.get("/checkouts", (req, res) => res.render("checkouts", {
    signatures,
    filter: { signature: "", checkedOut: true },
    checkouts: undefined,
}));
exports.score.post("/checkouts", authController.checkouts_post);
