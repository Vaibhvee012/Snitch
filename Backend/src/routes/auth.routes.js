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
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", validateRegisterUser, register);

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

export default router;