"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.user = exports.score = exports.router = void 0;
const { Router } = require("express");
const authController = require("../controllers/authController");
const { requireAuth, checkUser, requireAdmin, } = require("../middleware/authMiddleware");
exports.router = Router();
exports.router.post("*", checkUser);
exports.router.get("/signup", authController.signup_get);
exports.router.post("/signup", authController.signup_post);
exports.router.get("/signup-success", authController.signup_success_get);
exports.router.get("/signup-user", requireAuth, requireAdmin, authController.signup_user_get);
exports.router.post("/signup-user", authController.signup_post);
exports.router.get("/login", authController.login_get);
exports.router.post("/login", authController.login_post);
exports.router.get("/logout", authController.logout_get);
exports.router.get("/verify-email", authController.verify_email_get);
exports.score = Router();
// wildcard for all get/post actions
exports.score.get("*", checkUser, requireAuth, requireAdmin);
exports.score.post("*", checkUser, requireAuth, requireAdmin);
exports.score.get("/register", (req, res) => res.render("register-score", { scoreType: res.locals.scoreType }));
exports.score.post("/register", authController.register_score_post);
exports.score.get("/checkout", (req, res) => res.render("checkout", {
    checkoutUser: res.locals.checkoutUser,
    checkoutScore: res.locals.checkoutScore,
    users: undefined,
}));
exports.score.post("/checkout", authController.checkout_post);
exports.score.post("/updateCheckout", authController.updateCheckout_post);
exports.score.get("/checkin", (req, res) => res.render("checkin", {
    checkinScore: res.locals.checkinScore,
}));
exports.score.post("/checkin", authController.checkin_post);
// score.get("/checkouts", authController.checkouts_get);
const signatures = [
    { id: "ORFF-COM", name: "Orff De temporum finde comoedia" },
    { id: "BRFS-AD", name: "Braunfels Advent" },
]; // TODO: from db
exports.score.get("/checkouts", (req, res) => res.render("checkouts", {
    route: "score",
    signatures,
    filter: { signature: "", checkedOut: true },
    checkouts: undefined,
    error: undefined,
}));
exports.score.post("/checkouts", authController.checkouts_post);
// end user routes
exports.user = Router();
// wildcard for all get/post actions
exports.user.get("*", checkUser, requireAuth);
exports.user.post("*", checkUser, requireAuth);
exports.user.get("/checkouts", (req, res) => res.render("checkouts", {
    route: "user",
    signatures,
    filter: { signature: "", checkedOut: true, user: res.locals.user },
    checkouts: undefined,
    error: undefined,
}));
exports.user.post("/checkouts", authController.checkouts_post);
