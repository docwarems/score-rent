const { Router } = require("express");
const userController = require("../controllers/userController");
const {
  requireAuth,
  requireAdmin,
  checkUser,
  requireUserVerified,
} = require("../middleware/authMiddleware");
import { getScoreTypes } from "../utils/score-utils";

// end user routes
export const user = Router();

// wildcard for all get/post actions
user.get("*", requireAuth, requireUserVerified);
user.post("*", requireAuth, requireUserVerified);

const signatures = async () => {
  return await getScoreTypes();
};

user.get("/checkouts", userController.checkouts_get);
user.post("/checkouts", userController.checkouts_post);

user.get(
  "/email-queue-stats",
  requireAuth,
  requireAdmin,
  userController.email_queue_stats_get
);
