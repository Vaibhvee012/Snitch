import mongoose from "mongoose";
import  priceSchema from "./price.schema.js";

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "product",
                    required: true,
                },
                variant: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                },
                quantity: {
                    type: Number,
                    default: 1,
                    min: 1,
                },
                price: {
                    type: priceSchema,
                    required: true,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

cartSchema.index({ user: 1 }, { unique: true });

const cartModel = mongoose.model("Cart", cartSchema);

export default cartModel;