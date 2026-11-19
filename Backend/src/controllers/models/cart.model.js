import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    items:[
        {
            product:{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            variant: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Variant",
            },
            quantity: {
                type: Number,
                default: 1,
            },
            price: {
                amount: {
                    type: Number,
                    required: true,
                },
                currency:{
                    type: String,
                    enum: ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"], // Add more currencies as needed
                    default: "INR",
                }
            }
        },
    ]
},{ timestamps: true })