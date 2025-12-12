"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const { Router } = require("express");
const authController = require("../controllers/authController");
const { requireAuth, checkUser, requireUserVerified, requireAdmin, } = require("../middleware/authMiddleware");
exports.router = Router();
exports.router.get("/signup", authController.signup_get);
exports.router.post("/signup", authController.signup_post);
exports.router.get("/signup-success", authController.signup_success_get);
exports.router.get("/signup-user", requireAuth, requireAdmin, authController.signup_user_get);
exports.router.post("/signup-user", requireAuth, requireAdmin, authController.signup_user_post);
exports.router.get("/login", authController.login_get);
exports.router.post("/login", authController.login_post);
exports.router.get("/logout", requireAuth, authController.logout_get);
exports.router.get("/verify-email", authController.verify_email_get);
exports.router.get("/password-forgotten", (req, res) => {
    res.render("password-forgotten", {});
});
exports.router.post("/password-forgotten", authController.password_forgotten_post);
exports.router.get("/password-forgotten-success", authController.password_forgotten_success_get);
exports.router.get("/verify-password-reset-email", authController.verify_password_reset_email_get);
exports.router.post("/password-reset", authController.password_reset_post);
exports.router.get("/password-reset-success", authController.password_reset_success_get);
exports.router.get("/not-verified", (req, res) => {
    res.render("not-verified", {});
});
exports.router.post("/not-verified", requireAuth, authController.not_verified_post);
