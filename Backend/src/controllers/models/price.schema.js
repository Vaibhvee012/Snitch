import mongoose from "mongoose";

const priceSchema = new mongoose.Schema(
    {
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            enum: ["INR", "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "AED", "SGD"],
            default: "INR",
        },
    },
    {
        _id: false,
        __v: false,
    }
);

export default priceSchema;