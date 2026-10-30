
import express from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import productRouter from "./routes/product.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { config } from "./config/config.js";

const app = express();

console.log("Loaded Snitch Backend/src/app.js");

// CORS configuration
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// General middleware
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: `http://localhost:${config.PORT}/api/auth/google/callback`,
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

// Temporary diagnostic route
app.get("/debug-check", (_req, res) => {
  res.status(200).send("Correct app.js is running");
});

// Root endpoint
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "API is running",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRouter);

export default app;
