import { Router } from "express";
import {
  validateRegisterUser,
  validateLoginUser,
} from "../validator/auth.validator.js";

import {
  register,
  login,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", validateRegisterUser, register);

router.post("/login", validateLoginUser, login);

export default router;
