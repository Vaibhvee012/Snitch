
import cartModel from "./models/cart.model.js";
import productModel from "./models/product.model.js";
import { stockOfVariant } from "../dao/product.dao.js";

export const addToCart = async (req, res) => {
    try {
        const { productId, variantId } = req.params;
        const { quantity = 1 } = req.body || {};

        const product = await productModel.findOne({
            _id: productId,
            "variants._id": variantId
        });

        if (!product) {
            return res.status(404).json({
                message: "Product or variant not found",
                success: false
            });
        }

        const stock = await stockOfVariant(productId, variantId);

        const cart = await cartModel.findOneAndUpdate(
            { user: req.user._id },
            { $setOnInsert: { user: req.user._id, items: [] } },
            { new: true, upsert: true }
        );

        const existingItem = cart.items.find(
            item =>
                item.product.toString() === productId &&
                item.variant.toString() === variantId
        );

        if (existingItem) {
            if (existingItem.quantity + quantity > stock) {
                return res.status(400).json({
                    message: `Only ${stock - existingItem.quantity} items left in stock`,
                    success: false
                });
            }

            existingItem.quantity += quantity;
        } else {
            if (quantity > stock) {
                return res.status(400).json({
                    message: `Only ${stock} items left in stock`,
                    success: false
                });
            }

            cart.items.push({
                product: productId,
                variant: variantId,
                quantity,
                price: product.price
            });
        }

        await cart.save();

        return res.status(200).json({
            message: "Product added to cart successfully",
            success: true,
            cart
        });

    } catch (error) {
        console.error("Add to cart error:", error);

        return res.status(500).json({
            message: error.message,
            success: false
        });
    }
};

export const getCart = async (req, res) => {
    try {
        let cart = await cartModel.findOne({
            user: req.user._id
        });

        if (!cart) {
            cart = await cartModel.create({
                user: req.user._id,
                items: []
            });
        }

        return res.status(200).json({
            message: "Cart fetched successfully",
            success: true,
            cart
        });

    } catch (error) {
        console.error("Get cart error:", error);

        return res.status(500).json({
            message: error.message,
            success: false
        });
    }
};

console.log("Cart model:", typeof cartModel);
console.log(
    "findOneAndUpdate:",
    typeof cartModel.findOneAndUpdate
);
console.log("Cart model name:", cartModel.modelName);