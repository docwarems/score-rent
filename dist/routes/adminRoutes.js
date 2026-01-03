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
exports.admin = void 0;
const { Router } = require("express");
const adminController = require("../controllers/adminController");
const { requireAuth, checkUser, requireUserVerified, requireAdmin, } = require("../middleware/authMiddleware");
const score_utils_1 = require("../utils/score-utils");
exports.admin = Router();
// All routes require authentication and admin privileges
exports.admin.get("*", requireAuth, requireAdmin);
exports.admin.post("*", requireAuth, requireAdmin);
// Score management routes
exports.admin.get("/register", (req, res) => res.render("register-score", { scoreType: res.locals.scoreType }));
exports.admin.post("/register", adminController.register_score_post);
exports.admin.get("/checkout", (req, res) => res.render("checkout", {
    checkoutUser: res.locals.checkoutUser,
    checkoutScore: res.locals.checkoutScore,
    users: undefined,
}));
exports.admin.post("/checkout", adminController.checkout_post);
exports.admin.post("/updateCheckout", adminController.updateCheckout_post);
exports.admin.get("/checkin", (req, res) => res.render("checkin", {
    checkinScore: res.locals.checkinScore,
}));
exports.admin.post("/checkin", adminController.checkin_post);
exports.admin.get("/checkouts", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.render("checkouts", {
        admin: true,
        signatures: yield (0, score_utils_1.getScoreTypes)(),
        filter: { signature: "", checkedOut: true },
        checkouts: undefined,
        error: undefined,
    });
}));
exports.admin.post("/checkouts", adminController.checkouts_post);
// User management routes
exports.admin.post("/userSearch", adminController.userSearch_post);
exports.admin.get("/users", adminController.users_get);
exports.admin.post("/users", adminController.users_post);
exports.admin.post("/updateUser", adminController.updateUser_post);
exports.admin.get("/history", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.render("score-history", {
        id: undefined,
        checkouts: undefined,
        error: undefined,
    });
}));
exports.admin.post("/history", adminController.scoreHistory_post);
exports.admin.get("/vue-test", (req, res) => __awaiter(void 0, void 0, void 0, function* () { return res.render("vue-test"); }));
exports.admin.get("/vue-test.js", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.render("vue-test.vue", {
        age: 66,
    });
}));
exports.admin.get("/checkouts-vue", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.render("checkouts-vue", {
        admin: true,
        signatures: JSON.stringify(yield (0, score_utils_1.getScoreTypes)()),
        filter: JSON.stringify({ signature: "", checkedOut: true }),
        checkouts: undefined,
        error: undefined,
        hasError: false,
    });
}));
exports.admin.post("/checkouts-vue", adminController.checkouts_vue_post);
exports.admin.get("/users-vue", adminController.users_vue_get);
exports.admin.post("/users-vue", adminController.users_vue_post);
exports.admin.get("/register-score-vue", (req, res) => res.render("register-score-vue"));
exports.admin.get("/email-queue-stats", adminController.email_queue_stats_get);
exports.admin.get("/test-email", adminController.send_test_email_get);
