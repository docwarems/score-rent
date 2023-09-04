"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.user = exports.router = void 0;
const { Router } = require("express");
const authController = require("../controllers/authController");
const scoreController = require("../controllers/scoreController");
const { requireAuth, checkUser, requireUserVerified, requireAdmin, } = require("../middleware/authMiddleware");
const score_utils_1 = require("../utils/score-utils");
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
exports.router.post("/not-verified", authController.not_verified_post);
// end user routes
exports.user = Router();
// wildcard for all get/post actions
exports.user.get("*", checkUser, requireAuth, requireUserVerified);
exports.user.post("*", checkUser, requireAuth, requireUserVerified);
const signatures = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield (0, score_utils_1.getScoreTypes)();
});
exports.user.get("/checkouts", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.render("checkouts", {
        route: "user",
        signatures: [{ id: "ALL", name: "Alle" }],
        filter: { signature: "ALL", checkedOut: true },
        checkouts: undefined,
        error: undefined,
    });
}));
exports.user.post("/checkouts", scoreController.checkouts_post);
