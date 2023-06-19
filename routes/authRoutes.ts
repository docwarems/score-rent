const { Router } = require("express");
const authController = require("../controllers/authController");

const router = Router();

router.get("/signup", authController.signup_get);
router.post("/signup", authController.signup_post);
router.get("/signup-success", authController.signup_success_get);
router.get("/login", authController.login_get);
router.post("/login", authController.login_post);
router.get("/logout", authController.logout_get);
router.get("/verify-email", authController.verify_email_get);
router.get("/register-score", authController.register_score_get);
router.post("/register-score", authController.register_score_post);
router.get("/checkout", authController.checkout_get);
router.post("/checkout", authController.checkout_post);

module.exports = router;
