import mongoose from "mongoose";
import wishlistModel from "../models/wishlist.model.js";
import productModel from "../models/product.model.js";

const getWishlist = async (userId) => {
    let wishlist = await wishlistModel.findOne({ user: userId });

    if (!wishlist) {
        wishlist = await wishlistModel.create({ user: userId, products: [] });
    }

    await wishlist.populate("products");
    return wishlist;
};

export const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({
                message: "Invalid product ID",
                success: false,
            });
        }

        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).json({
                message: "Product not found or no longer available",
                success: false,
            });
        }

        const wishlist = await getWishlist(req.user._id);
        await wishlistModel.updateOne(
            { _id: wishlist._id },
            { $addToSet: { products: product._id } }
        );
        const updatedWishlist = await wishlistModel.findById(wishlist._id).populate("products");

        return res.status(200).json({
            message: "Product added to wishlist",
            success: true,
            wishlist: updatedWishlist.products.filter(Boolean),
        });
    } catch (error) {
        console.error("Add to wishlist error:", error);
        return res.status(500).json({
            message: error.message,
            success: false,
        });
    }
};

export const getWishlistProducts = async (req, res) => {
    try {
        const wishlist = await getWishlist(req.user._id);

        return res.status(200).json({
            message: "Wishlist fetched successfully",
            success: true,
            products: wishlist.products.filter(Boolean),
        });
    } catch (error) {
        console.error("Get wishlist error:", error);
        return res.status(500).json({
            message: error.message,
            success: false,
        });
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({
                message: "Invalid product ID",
                success: false,
            });
        }

        const wishlist = await getWishlist(req.user._id);
        wishlist.products = wishlist.products.filter(
            (item) => item && item._id.toString() !== productId
        );
        await wishlist.save();

        await wishlist.populate("products");
        return res.status(200).json({
            message: "Product removed from wishlist",
            success: true,
            products: wishlist.products.filter(Boolean),
        });
    } catch (error) {
        console.error("Remove from wishlist error:", error);
        return res.status(500).json({
            message: error.message,
            success: false,
        });
    }
};

export const clearWishlist = async (req, res) => {
    try {
        const wishlist = await getWishlist(req.user._id);
        wishlist.products = [];
        await wishlist.save();

        return res.status(200).json({
            message: "Wishlist cleared",
            success: true,
            products: [],
        });
    } catch (error) {
        console.error("Clear wishlist error:", error);
        return res.status(500).json({
            message: error.message,
            success: false,
        });
    }
};
