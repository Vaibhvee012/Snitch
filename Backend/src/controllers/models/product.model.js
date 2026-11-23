
import mongoose from "mongoose";
import priceSchema from "./price.schema.js";

const productSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            required: true,
        },

        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },

        price: {
            type: priceSchema,
            required: true,
        },

        images: [
            {
                url: {
                    type: String,
                    required: true,
                },
            },
        ],

        variants: [
            {
                _id: {
                    type: mongoose.Schema.Types.ObjectId,
                    auto: true,
                },

                images: [
                    {
                        url: {
                            type: String,
                            required: true,
                        },
                    },
                ],

                stock: {
                    type: Number,
                    default: 0,
                },

                attributes: {
                    type: Map,
                    of: String,
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

const productModel = mongoose.model("product", productSchema);

export default productModel;
