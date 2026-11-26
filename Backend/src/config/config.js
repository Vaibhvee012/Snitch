import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const backendEnvPath = fileURLToPath(new URL("../../.env", import.meta.url));
const envResult = dotenv.config({ path: backendEnvPath });

if (envResult.error && envResult.error.code !== "ENOENT") {
    throw envResult.error;
}

if(!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not set");
}

if(!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
}

if(!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is not set");
}

if(!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_SECRET is not set");
}

if(!process.env.IMAGEKIT_PRIVATE_KEY) {
    throw new Error("IMAGEKIT_PRIVATE_KEY is not defined in enviornment variables");
}

if(!process.env.RAZORPAY_KEY_ID) {
    throw new Error("RAZORPAY_KEY_ID is not defined in enviornment variables");
}

if(!process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("RAZORPAY_KEY_SECRET is not defined in enviornment variables");
}



export const config = {
    PORT: process.env.PORT || 3000,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY,
    RAZOR_PAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZOR_PAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET
}