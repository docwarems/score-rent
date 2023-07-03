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
router.get("/login", authController.login_get);
router.post("/login", authController.login_post);
router.get("/logout", authController.logout_get);
router.get("/verify-email", authController.verify_email_get);
// router.get("/register-score", authController.register_score_get);
// router.post("/register-score", authController.register_score_post);
// router.get("/checkout", authController.checkout_get);
// router.post("/checkout", requireAuth, requireAdmin, authController.checkout_post);

export const score = Router();

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
  })
);
score.post("/checkout", authController.checkout_post);

score.get("/checkin", (req: any, res: any) =>
  res.render("checkin", {
    checkinScore: res.locals.checkinScore,
  })
);
score.post("/checkin", authController.checkin_post);

// score.get("/checkouts", authController.checkouts_get);

const signatures = [
  { id: "VERD-REQ", name: "Verdi Requiem" },
  { id: "MOZ-REQ", name: "Mozart Requiem" },
]; // TODO: from db
score.get("/checkouts", (req: any, res: any) =>
  res.render("checkouts", {
    signatures,
    filter: { signature: "", checkedOut: true },
    checkouts: undefined,
  })
);
score.post("/checkouts", authController.checkouts_post);
