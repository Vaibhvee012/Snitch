import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import UserModel from "../controllers/models/user.model.js";

export const authenticateUser = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);

        const user = await UserModel.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        req.user = user;
        return next();

    } catch (error) {
        console.error("User authentication error:", error.message);

        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }
};

export const authenticateSeller = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Please log in",
        });
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);

        const user = await UserModel.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        if (user.role !== "seller") {
            return res.status(403).json({
                success: false,
                message: "Seller access required",
            });
        }

        req.user = user;
        return next();

    } catch (error) {
        console.error("Seller authentication error:", error.message);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};
