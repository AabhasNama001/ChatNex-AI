const express = require("express");
const authControllers = require("../controllers/auth.controller");
// The authMiddleware is required to protect the new route
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", authControllers.registerUser);
router.post("/login", authControllers.loginUser);

// ✨ NEW: Route to get the current user's profile.
// It's protected by the authUser middleware to ensure only logged-in users can access it.
router.get("/me", authMiddleware.authUser, authControllers.getMe);

module.exports = router;
