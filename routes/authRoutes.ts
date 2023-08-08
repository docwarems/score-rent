const { Router } = require("express");
const authController = require("../controllers/authController");
const {
  requireAuth,
  checkUser,
  requireAdmin,
} = require("../middleware/authMiddleware");

export const router = Router();

router.post("*", checkUser);
router.get("/signup", authController.signup_get);
router.post("/signup", authController.signup_post);
router.get("/signup-success", authController.signup_success_get);
router.get("/signup-user", requireAuth, requireAdmin, authController.signup_user_get);
router.post("/signup-user", authController.signup_post);
router.get("/login", authController.login_get);
router.post("/login", authController.login_post);
router.get("/logout", authController.logout_get);
router.get("/verify-email", authController.verify_email_get);

export const score = Router();

// wildcard for all get/post actions
score.get("*", checkUser, requireAuth, requireAdmin);
score.post("*", checkUser, requireAuth, requireAdmin);

score.get("/register", (req: any, res: any) =>
  res.render("register-score", { scoreType: res.locals.scoreType })
);
score.post("/register", authController.register_score_post);

score.get("/checkout", (req: any, res: any) =>
  res.render("checkout", {
    checkoutUser: res.locals.checkoutUser,
    checkoutScore: res.locals.checkoutScore,
    users: undefined,
  })
);
score.post("/checkout", authController.checkout_post);
score.post("/updateCheckout", authController.updateCheckout_post);

score.get("/checkin", (req: any, res: any) =>
  res.render("checkin", {
    checkinScore: res.locals.checkinScore,
  })
);
score.post("/checkin", authController.checkin_post);

// score.get("/checkouts", authController.checkouts_get);

const signatures = [
  { id: "ORFF-COM", name: "Orff De temporum finde comoedia" },
  { id: "BRFS-AD", name: "Braunfels Advent" },
]; // TODO: from db
score.get("/checkouts", (req: any, res: any) =>
  res.render("checkouts", {
    route: "score",
    signatures,
    filter: { signature: "", checkedOut: true },
    checkouts: undefined,
    error: undefined,
  })
);
score.post("/checkouts", authController.checkouts_post);

// end user routes
export const user = Router();

// wildcard for all get/post actions
user.get("*", checkUser, requireAuth);
user.post("*", checkUser, requireAuth);

user.get("/checkouts", (req: any, res: any) =>
  res.render("checkouts", {
    route: "user",
    signatures,
    filter: { signature: "", checkedOut: true, user: res.locals.user },
    checkouts: undefined,
    error: undefined,
  })
);
user.post("/checkouts", authController.checkouts_post);
