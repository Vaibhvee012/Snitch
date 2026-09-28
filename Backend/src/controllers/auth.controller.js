import userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";
import {config} from "../config/config.js";

async function sendTokenResponse(user, res) {
    const token = jwt.sign({ 
        id: user._id 
    }, config.JWT_SECRET) 
}


export const register = async (req, res) => {
    const { email, contact, fullname, password } = req.body;

    try {
        const existingUser = await userModel.findOne({
            $or: [
                { email },
                { contact }
            ]
        });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const user  = await userModel.create({
            email,
            contact,
            fullname,
            password
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
}