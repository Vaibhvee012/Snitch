import UserModel from "./models/user.model.js";
import jwt from "jsonwebtoken";
import { config } from "../config/config.js";

async function sendTokenResponse(user, res, message) {
    const token = jwt.sign(
        {
            id: user._id,
        },
        config.JWT_SECRET,
        {
            expiresIn: "7d",
        }
    );

    res.cookie("token", token);

    res.status(200).json({
        message,
        success: true,
        user: {
            id: user._id,
            email: user.email,
            contact: user.contact,
            fullname: user.fullname,
            role: user.role,
        },
    });
}

export const register = async (req, res) => {
    const {
        email,
        contact,
        password,
        fullname,
        isSeller,
    } = req.body;

    try {
        const existingUser = await UserModel.findOne({
            $or: [
                { email },
                { contact },
            ],
        });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists",
            });
        }

        const user = await UserModel.create({
            email,
            contact,
            fullname,
            password,
            role: isSeller ? "seller" : "buyer",
        });

        await sendTokenResponse(
            user,
            res,
            "User registration successful"
        );

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            message: "Server error",
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        await sendTokenResponse(user, res, "User login successful");
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

export const googleCallback = async (req, res) => {
    const { id, displayName, emails } = req.user;

    const email = emails[0].value;

    let user = await UserModel.findOne({ email });

    if (!user) {
        user = await UserModel.create({
            email,
            googleId: id,
            fullname: displayName,
        });
    }

    const token = jwt.sign(
        {
            id: user._id,
        },
        config.JWT_SECRET,
        {
            expiresIn: "7d",
        }
    );

    res.cookie("token", token);

    res.redirect("http://localhost:5173/");
};

export const getMe =  async (req,res) => {
    const user = req.user;

    res.status(200).json({
        message: "User profile fetched successfully",
        success: true,
        user: {
            id: user._id,
            email: user.email,
            contact: user.contact,
            fullname: user.fullname,
            role: user.role,
        },
    })
}