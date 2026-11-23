import mongoose from "mongoose";
import  priceSchema from "./price.schema.js";

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
                ref: "product.variant",
            },
            quantity: {
                type: Number,
                default: 1,
            },
            price: {
                type: priceSchema,
                required: true,
            }
        },
    ]
})

const cartModel = mongoose.model("Cart", cartSchema);

export default cartModel;