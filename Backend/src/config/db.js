
import mongoose from "mongoose";
import { config } from "./config.js";
import UserModel from "../controllers/models/user.model.js";

async function connectDB() {
    await mongoose.connect(config.MONGO_URI);

    console.info("[MONGODB CONNECTION DETAILS]", {
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        database: mongoose.connection.name,
        userCollection: UserModel.collection.name,
        readyState: mongoose.connection.readyState,
    });
}

export default connectDB;
