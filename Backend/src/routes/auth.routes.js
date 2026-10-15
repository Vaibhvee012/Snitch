import { Router } from "express";
import passport from "passport";

import {
  validateRegisterUser,
  validateLoginUser,
} from "../validator/auth.validator.js";

import {
  register,
  login,
  googleCallback,
  getMe,
} from "../controllers/auth.controller.js";

import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = Router();

// Register
router.post("/register", validateRegisterUser, register);

// Login
router.post("/login", validateLoginUser, login);

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "http://localhost:5173/login",
  }),
  googleCallback
);

// Get current authenticated user
router.get("/me", authenticateUser, getMe);

export default router;
