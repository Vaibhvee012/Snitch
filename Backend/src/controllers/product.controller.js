
import mongoose from "mongoose";
import ProductModel from "./models/product.model.js";
import { uploadFile } from "../services/storage.service.js";

// Create a new product
export async function createProduct(req, res) {
    try {
        const {
            title,
            description,
            priceAmount,
            priceCurrency,
        } = req.body;

        const seller = req.user;

        const files = req.files || [];

        const images = await Promise.all(
            files.map(async (file) => {
                return await uploadFile({
                    buffer: file.buffer,
                    fileName: file.originalname,
                });
            })
        );

        const product = await ProductModel.create({
            title,
            description,
            price: {
                amount: priceAmount,
                currency: priceCurrency || "INR",
            },
            images,
            seller: seller._id,
        });

        return res.status(201).json({
            message: "Product created successfully",
            success: true,
            product,
        });

    } catch (error) {
        console.error("Create product error:", error);

        return res.status(500).json({
            message: error.message,
            success: false,
        });
    }
}


// Get products created by the logged-in seller
export async function getSellerProducts(req, res) {
    try {
        const seller = req.user;

        const products = await ProductModel.find({
            seller: seller._id,
        });

        return res.status(200).json({
            message: "Products fetched successfully",
            success: true,
            products,
        });

    } catch (error) {
        console.error("Get seller products error:", error);

        return res.status(500).json({
            message: error.message,
            success: false,
        });
    }
}


// Get all products for buyers
export async function getAllProducts(req, res) {
    try {
        const products = await ProductModel.find();

        return res.status(200).json({
            message: "Products fetched successfully",
            success: true,
            products,
        });

    } catch (error) {
        console.error("Get all products error:", error);

        return res.status(500).json({
            message: error.message,
            success: false,
        });
    }
}


// Get product details by ID
export async function getProductDetails(req, res) {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid product ID",
                success: false,
            });
        }

        const product = await ProductModel.findById(id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found",
                success: false,
            });
        }

        return res.status(200).json({
            message: "Product fetched successfully",
            success: true,
            product,
        });

    } catch (error) {
        console.error("Get product details error:", error);

        return res.status(500).json({
            message: error.message,
            success: false,
        });
    }
}


// Alias for getProductDetails
export const getProductById = getProductDetails;


// Add a new variant to an existing product
export async function addProductVariant(req, res) {
    try {
        const { productId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product ID",
                success: false,
            });
        }

        // Find product belonging to the logged-in seller
        const product = await ProductModel.findOne({
            _id: productId,
            seller: req.user._id,
        });

        if (!product) {
            return res.status(404).json({
                message: "Product not found",
                success: false,
            });
        }

        // Handle variant images
        const files = req.files || [];

        const images = await Promise.all(
            files.map(async (file) => {
                return await uploadFile({
                    buffer: file.buffer,
                    fileName: file.originalname,
                });
            })
        );

        // Validate variant price and stock
        const price = Number(req.body.priceAmount);
        const stock = Number(req.body.stock);

        if (
            req.body.priceAmount === undefined ||
            !Number.isFinite(price) ||
            price <= 0
        ) {
            return res.status(400).json({
                message: "Please provide a valid variant price",
                success: false,
            });
        }

        if (
            req.body.stock === undefined ||
            !Number.isInteger(stock) ||
            stock < 0
        ) {
            return res.status(400).json({
                message: "Please provide a valid stock quantity",
                success: false,
            });
        }

        // Parse variant attributes
        let attributes;

        try {
            attributes = JSON.parse(req.body.attributes || "{}");
        } catch {
            return res.status(400).json({
                message: "Invalid variant attributes JSON",
                success: false,
            });
        }

        if (
            !attributes ||
            typeof attributes !== "object" ||
            Array.isArray(attributes)
        ) {
            return res.status(400).json({
                message: "Variant attributes must be an object",
                success: false,
            });
        }

        // Save variant
        product.variants.push({
            images,
            price: {
                amount: price,
                currency: req.body.priceCurrency || product.price.currency,
            },
            stock,
            attributes,
        });

        await product.save();

        return res.status(201).json({
            message: "Product variant added successfully",
            success: true,
            product,
        });

    } catch (error) {
        console.error("Add product variant error:", error);

        return res.status(500).json({
            message: error.message,
            success: false,
        });
    }
}
