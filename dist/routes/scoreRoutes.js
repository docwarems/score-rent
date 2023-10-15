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
exports.score = void 0;
const { Router } = require("express");
const scoreController = require("../controllers/scoreController");
const { requireAuth, checkUser, requireUserVerified, requireAdmin, } = require("../middleware/authMiddleware");
const score_utils_1 = require("../utils/score-utils");
exports.score = Router();
// wildcard for all get/post actions
exports.score.get("*", checkUser, requireAuth, requireAdmin);
exports.score.post("*", checkUser, requireAuth, requireAdmin);
exports.score.get("/register", (req, res) => res.render("register-score", { scoreType: res.locals.scoreType }));
exports.score.post("/register", scoreController.register_score_post);
exports.score.get("/checkout", (req, res) => res.render("checkout", {
    checkoutUser: res.locals.checkoutUser,
    checkoutScore: res.locals.checkoutScore,
    users: undefined,
}));
exports.score.post("/checkout", scoreController.checkout_post);
exports.score.post("/updateCheckout", scoreController.updateCheckout_post);
exports.score.get("/checkin", (req, res) => res.render("checkin", {
    checkinScore: res.locals.checkinScore,
}));
exports.score.post("/checkin", scoreController.checkin_post);
exports.score.get("/checkouts", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.render("checkouts", {
        admin: true,
        signatures: yield (0, score_utils_1.getScoreTypes)(),
        filter: { signature: "", checkedOut: true },
        checkouts: undefined,
        error: undefined,
    });
}));
exports.score.post("/checkouts", scoreController.checkouts_post);
exports.score.post("/userSearch", scoreController.userSearch_post);
// TODO: passt eigentlich nicht nach "score", wir brauchen aber admin-Prüfung
exports.score.get("/users", scoreController.users_get);
exports.score.post("/users", scoreController.users_post);
exports.score.post("/updateUser", scoreController.updateUser_post);
exports.score.get("/history", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.render("score-history", {
        checkouts: undefined,
    });
}));
exports.score.post("/history", scoreController.scoreHistory_post);
