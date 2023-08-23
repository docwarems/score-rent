"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.score = void 0;
const { Router } = require("express");
const scoreController = require("../controllers/scoreController");
const { requireAuth, checkUser, requireUserVerified, requireAdmin, } = require("../middleware/authMiddleware");
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
exports.score.post("/checkouts", scoreController.checkouts_post);
