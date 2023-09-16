const { Router } = require("express");
const userController = require("../controllers/userController");
const {
  requireAuth,
  checkUser,
  requireUserVerified,
} = require("../middleware/authMiddleware");
import { getScoreTypes } from "../utils/score-utils";

// end user routes
export const user = Router();

// wildcard for all get/post actions
user.get("*", checkUser, requireAuth, requireUserVerified);
user.post("*", checkUser, requireAuth, requireUserVerified);

const signatures = async () => {
  return await getScoreTypes();
};

user.get("/checkouts", userController.checkouts_get);
user.post("/checkouts", userController.checkouts_post);
