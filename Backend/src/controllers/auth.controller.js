
import UserModel from "./models/user.model.js";
import jwt from "jsonwebtoken";
import { config } from "../config/config.js";

const authCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

function logAuthError(context, error) {
    console.error(`${context}:`, {
        name: error.name,
        code: error.code,
        message: error.message,
        stack: error.stack,
    });
}

function normalizeEmail(email) {
    return typeof email === "string"
        ? email.trim().toLowerCase()
        : "";
}

function normalizeContact(contact) {
    return typeof contact === "string"
        ? contact.trim()
        : "";
}

async function sendTokenResponse(user, res, message) {
    const token = jwt.sign(
        { id: user._id },
        config.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie("token", token, authCookieOptions);

    return res.status(200).json({
        success: true,
        message,
        user: {
            id: user._id,
            email: user.email,
            contact: user.contact,
            fullname: user.fullname,
            role: user.role,
        },
    });
}

// REGISTER
export const register = async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const contact = normalizeContact(req.body?.contact);
        const password = req.body?.password;
        const fullname =
            typeof req.body?.fullname === "string"
                ? req.body.fullname.trim()
                : "";
        const isSeller = req.body?.isSeller;

        if (
            !email ||
            !contact ||
            !password ||
            !fullname ||
            typeof isSeller !== "boolean"
        ) {
            return res.status(400).json({
                success: false,
                message: "All registration fields are required",
            });
        }

        // Check email and contact separately.
        const [emailMatch, contactMatch] = await Promise.all([
            UserModel.findOne({ email })
                .select("_id")
                .lean(),

            UserModel.findOne({
                $expr: {
                    $eq: [
                        {
                            $trim: {
                                input: {
                                    $ifNull: ["$contact", ""],
                                },
                            },
                        },
                        contact,
                    ],
                },
            })
                .select("_id email contact fullname")
                .lean(),
        ]);

        if (emailMatch || contactMatch) {
            const duplicateField =
                emailMatch && contactMatch
                    ? "email and contact"
                    : emailMatch
                        ? "email"
                        : "contact";

            return res.status(409).json({
                success: false,
                message: `An account with this ${duplicateField} already exists`,
            });
        }

        const user = await UserModel.create({
            email,
            contact,
            password,
            fullname,
            role: isSeller ? "seller" : "buyer",
        });

        return await sendTokenResponse(
            user,
            res,
            "User registration successful"
        );

    } catch (error) {
        logAuthError("Registration error", error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "An account with this email or contact already exists",
            });
        }

        if (
            error.name === "ValidationError" ||
            error.name === "CastError"
        ) {
            return res.status(400).json({
                success: false,
                message: "Registration details are invalid",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
c};

// LOGIN
export const login = async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const password = req.body?.password;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        // Fetch user and password from MongoDB.
        const user = await UserModel.findOne({ email }).select("+password");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Google-only users cannot log in using a password.
        if (!user.password) {
            return res.status(400).json({
                success: false,
                message: "Please sign in using Google",
            });
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        return await sendTokenResponse(
            user,
            res,
            "User login successful"
        );

    } catch (error) {
        logAuthError("Login error", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// GOOGLE CALLBACK
export const googleCallback = async (req, res) => {
    try {
        const { id, displayName, emails } = req.user;

        const email = normalizeEmail(emails?.[0]?.value);

        if (!email || !id) {
            return res.status(400).json({
                success: false,
                message: "Google account details are incomplete",
            });
        }

        let user = await UserModel.findOne({ email });

        if (!user) {
            user = await UserModel.create({
                email,
                googleId: id,
                fullname: displayName,
            });
        }

        const token = jwt.sign(
            { id: user._id },
            config.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, authCookieOptions);

        return res.redirect("http://localhost:5173/");

    } catch (error) {
        logAuthError("Google authentication error", error);

        return res.redirect("http://localhost:5173/login");
    }
};

// GET CURRENT USER
export const getMe = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User profile fetched successfully",
            user: {
                id: user._id,
                email: user.email,
                contact: user.contact,
                fullname: user.fullname,
                role: user.role,
            },
        });

    } catch (error) {
        logAuthError("Get current user error", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};
