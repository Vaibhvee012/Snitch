import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import UserModel from "../models/user.model.js";

export const authenticateSeller = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized: Please log in",
        });
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);

        const user = await UserModel.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                message: "Unauthorized: User not found",
            });
        }

        if (user.role !== "seller") {
            return res.status(403).json({
                message: "Forbidden: Seller access required",
            });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error("Seller authentication error:", err.message);

        return res.status(401).json({
            message: "Unauthorized: Invalid or expired token",
        });
    }
};
