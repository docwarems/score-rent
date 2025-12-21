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
exports.user = void 0;
const { Router } = require("express");
const userController = require("../controllers/userController");
const { requireAuth, requireAdmin, checkUser, requireUserVerified, } = require("../middleware/authMiddleware");
const score_utils_1 = require("../utils/score-utils");
// end user routes
exports.user = Router();
// wildcard for all get/post actions
exports.user.get("*", requireAuth, requireUserVerified);
exports.user.post("*", requireAuth, requireUserVerified);
const signatures = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield (0, score_utils_1.getScoreTypes)();
});
exports.user.get("/checkouts", userController.checkouts_get);
exports.user.post("/checkouts", userController.checkouts_post);
exports.user.get("/email-queue-stats", requireAuth, requireAdmin, userController.email_queue_stats_get);
