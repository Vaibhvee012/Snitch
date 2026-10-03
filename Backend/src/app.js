import express from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import productRouter from "./routes/product.routes.js"
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import authRoutes from "./routes/auth.routes.js";
import { config } from "./config/config.js";

const app = express();

app.use(morgan("dev"));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(passport.initialize());

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/api/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

app.get("/", (_req, res) => {
  res.status(200).json({
    message: "API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRouter)

export default app;