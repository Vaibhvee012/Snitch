import cartModel from "../models/cart.model.js";
import mongoose from "mongoose";

export async function getCartDetails(userId) {
    const [cart] = await cartModel.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
            },
        },
        { $unwind: { path: "$items" } },
        {
            $lookup: {
                from: "products",
                localField: "items.product",
                foreignField: "_id",
                as: "productDetails",
            },
        },
        {
            $unwind: {
                path: "$productDetails",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $set: {
                "items.product": "$productDetails",
                "items.variantDetails": {
                    $arrayElemAt: [
                        {
                            $filter: {
                                input: { $ifNull: ["$productDetails.variants", []] },
                                as: "variant",
                                cond: { $eq: ["$$variant._id", "$items.variant"] },
                            },
                        },
                        0,
                    ],
                },
            },
        },
        {
            $set: {
                "items.priceAtAddition": {
                    $ifNull: ["$items.priceAtAddition", "$items.price"],
                },
                "items.price": {
                    $ifNull: [
                        "$items.variantDetails.price",
                        "$items.product.price",
                    ],
                },
            },
        },
        {
            $set: {
                "items.variant": {
                    $ifNull: ["$items.variantDetails", "$items.variant"],
                },
                itemTotal: {
                    $multiply: [
                        {
                            $max: [
                                0,
                                {
                                    $convert: {
                                        input: "$items.quantity",
                                        to: "double",
                                        onError: 0,
                                        onNull: 0,
                                    },
                                },
                            ],
                        },
                        {
                            $max: [
                                0,
                                {
                                    $convert: {
                                        input: "$items.price.amount",
                                        to: "double",
                                        onError: 0,
                                        onNull: 0,
                                    },
                                },
                            ],
                        },
                    ],
                },
                itemQuantity: {
                    $convert: {
                        input: "$items.quantity",
                        to: "int",
                        onError: 0,
                        onNull: 0,
                    },
                },
            },
        },
        {
            $group: {
                _id: "$_id",
                totalPrice: { $sum: "$itemTotal" },
                totalQuantity: { $sum: "$itemQuantity" },
                currency: { $first: { $ifNull: ["$items.price.currency", "INR"] } },
                items: { $push: "$items" },
            },
        },
    ]);

    return cart;
}