
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

        let variants = [];
        if (req.body.variants !== undefined) {
            try {
                variants = typeof req.body.variants === "string"
                    ? JSON.parse(req.body.variants)
                    : req.body.variants;
            } catch {
                return res.status(400).json({
                    message: "Variants must be valid JSON",
                    success: false,
                });
            }

            if (!Array.isArray(variants) || variants.length === 0) {
                return res.status(400).json({
                    message: "At least one valid variant is required",
                    success: false,
                });
            }

            const combinations = new Set();
            for (const variant of variants) {
                const attributes = variant?.attributes;
                const price = variant?.price;
                const stock = Number(variant?.stock);

                if (
                    !attributes ||
                    typeof attributes !== "object" ||
                    Array.isArray(attributes) ||
                    Object.keys(attributes).length === 0 ||
                    !Number.isFinite(Number(price?.amount)) ||
                    Number(price.amount) <= 0 ||
                    !Number.isInteger(stock) ||
                    stock < 0
                ) {
                    return res.status(400).json({
                        message: "Each variant must include attributes, a valid price, and non-negative stock",
                        success: false,
                    });
                }

                const normalizedAttributes = Object.entries(attributes)
                    .map(([key, value]) => [key.trim().toLocaleLowerCase(), String(value).trim().toLocaleLowerCase()])
                    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

                if (normalizedAttributes.some(([key, value]) => !key || !value)) {
                    return res.status(400).json({
                        message: "Variant attributes cannot be empty",
                        success: false,
                    });
                }

                const combination = JSON.stringify(normalizedAttributes);
                if (combinations.has(combination)) {
                    return res.status(400).json({
                        message: "Duplicate variant combinations are not allowed",
                        success: false,
                    });
                }

                combinations.add(combination);
            }
        }

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
            variants,
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
