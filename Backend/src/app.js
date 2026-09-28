import express from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.status(200).json({ message: "API is running" });
});

//routes
app.use("/api/auth", authRoutes);


export default app;