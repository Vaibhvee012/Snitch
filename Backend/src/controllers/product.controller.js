
import mongoose from "mongoose";
import ProductModel from "./models/product.model.js";
import { uploadFile } from "../services/storage.service.js";

const isNumericInput = value =>
    (typeof value === "number" ||
        (typeof value === "string" && value.trim() !== "")) &&
    Number.isFinite(Number(value));

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
                    !isNumericInput(price?.amount) ||
                    Number(price.amount) <= 0 ||
                    !isNumericInput(variant?.stock) ||
                    !Number.isInteger(stock) ||
                    stock < 0
                ) {
                    return res.status(400).json({
                        message: "Each variant must include attributes, a valid price, and non-negative stock",
                        success: false,
                    });
                }

                if (
                    Object.entries(attributes).some(([key, value]) =>
                        !key.trim() ||
                        (typeof value !== "string" && typeof value !== "number") ||
                        !String(value).trim()
                    )
                ) {
                    return res.status(400).json({
                        message: "Variant attribute names and values cannot be empty",
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

export async function updateProductPrice(req, res) {
    try {
        const { productId } = req.params;
        const amount = Number(req.body?.amount);

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product ID",
                success: false,
            });
        }

        if (
            req.body?.amount === undefined ||
            !isNumericInput(req.body.amount) ||
            amount <= 0
        ) {
            return res.status(400).json({
                message: "Please provide a valid positive price",
                success: false,
            });
        }

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

        if (product.variants.length > 0) {
            return res.status(400).json({
                message: "Products with variants must update the price on a specific variant",
                success: false,
            });
        }

        product.price = {
            amount,
            currency: product.price.currency,
        };
        await product.save();

        return res.status(200).json({
            message: "Product price updated successfully",
            success: true,
            product,
        });
    } catch (error) {
        console.error("Update product price error:", error);

        return res.status(500).json({
            message: error.message,
            success: false,
        });
    }
}

export async function updateProductVariantStock(req, res) {
    try {
        const { productId, variantId } = req.params;
        const rawStock = req.body?.stock;
        const stock = Number(rawStock);

        if (
            !mongoose.Types.ObjectId.isValid(productId) ||
            !mongoose.Types.ObjectId.isValid(variantId)
        ) {
            return res.status(400).json({
                message: "Invalid product or variant ID",
                success: false,
            });
        }

        if (
            rawStock === undefined ||
            rawStock === null ||
            !isNumericInput(rawStock) ||
            !Number.isInteger(stock) ||
            stock < 0
        ) {
            return res.status(400).json({
                message: "Stock must be a non-negative whole number",
                success: false,
            });
        }

        const updatedProduct = await ProductModel.findOneAndUpdate(
            {
                _id: productId,
                seller: req.user._id,
                "variants._id": variantId,
            },
            { $set: { "variants.$.stock": stock } },
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            const ownedProduct = await ProductModel.exists({
                _id: productId,
                seller: req.user._id,
            });
            return res.status(404).json({
                message: ownedProduct ? "Variant not found" : "Product not found",
                success: false,
            });
        }

        const variant = updatedProduct.variants.id(variantId);
        return res.status(200).json({
            message: "Variant stock updated successfully",
            success: true,
            product: updatedProduct,
            variant,
        });
    } catch (error) {
        console.error("Update variant stock error:", error);
        return res.status(500).json({
            message: "Unable to update variant stock",
            success: false,
        });
    }
}

export async function updateProductVariantPrice(req, res) {
    try {
        const { productId, variantId } = req.params;
        const amount = Number(req.body?.amount);

        if (
            !mongoose.Types.ObjectId.isValid(productId) ||
            !mongoose.Types.ObjectId.isValid(variantId)
        ) {
            return res.status(400).json({
                message: "Invalid product or variant ID",
                success: false,
            });
        }

        if (
            req.body?.amount === undefined ||
            !isNumericInput(req.body.amount) ||
            amount <= 0
        ) {
            return res.status(400).json({
                message: "Variant price must be a positive number",
                success: false,
            });
        }

        const product = await ProductModel.findOne({
            _id: productId,
            seller: req.user._id,
            "variants._id": variantId,
        });
        if (!product) {
            const ownedProduct = await ProductModel.exists({
                _id: productId,
                seller: req.user._id,
            });
            return res.status(404).json({
                message: ownedProduct ? "Variant not found" : "Product not found",
                success: false,
            });
        }

        const variant = product.variants.id(variantId);
        const updatedProduct = await ProductModel.findOneAndUpdate(
            {
                _id: productId,
                seller: req.user._id,
                "variants._id": variantId,
            },
            {
                $set: {
                    "variants.$.price": {
                        amount,
                        currency: variant.price?.currency || product.price.currency,
                    },
                },
            },
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(409).json({
                message: "Product changed while the price was being updated. Refresh and retry.",
                success: false,
            });
        }

        return res.status(200).json({
            message: "Variant price updated successfully",
            success: true,
            product: updatedProduct,
            variant: updatedProduct.variants.id(variantId),
        });
    } catch (error) {
        console.error("Update variant price error:", error);
        return res.status(500).json({
            message: "Unable to update variant price",
            success: false,
        });
    }
}


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

        // Validate variant price and stock
        const price = Number(req.body.priceAmount);
        const stock = Number(req.body.stock);

        if (
            req.body.priceAmount === undefined ||
            !isNumericInput(req.body.priceAmount) ||
            price <= 0
        ) {
            return res.status(400).json({
                message: "Please provide a valid variant price",
                success: false,
            });
        }

        if (
            req.body.stock === undefined ||
            !isNumericInput(req.body.stock) ||
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
            Array.isArray(attributes) ||
            Object.keys(attributes).length === 0
        ) {
            return res.status(400).json({
                message: "Variant attributes must be a non-empty object",
                success: false,
            });
        }

        const normalizedAttributes = Object.entries(attributes)
            .map(([key, value]) => [
                String(key).trim().toLocaleLowerCase(),
                String(value).trim().toLocaleLowerCase(),
            ])
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

        if (
            Object.entries(attributes).some(([key, value]) =>
                !key.trim() ||
                (typeof value !== "string" && typeof value !== "number") ||
                !String(value).trim()
            ) ||
            normalizedAttributes.some(([key, value]) => !key || !value)
        ) {
            return res.status(400).json({
                message: "Variant attribute names and values cannot be empty",
                success: false,
            });
        }

        const variantKey = JSON.stringify(normalizedAttributes);
        const duplicate = product.variants.some(variant => {
            const existingKey = JSON.stringify(
                (variant.attributes instanceof Map
                    ? Array.from(variant.attributes)
                    : Object.entries(variant.attributes || {}))
                    .map(([key, value]) => [
                        key.trim().toLocaleLowerCase(),
                        String(value).trim().toLocaleLowerCase(),
                    ])
                    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
            );
            return existingKey === variantKey;
        });
        if (duplicate) {
            return res.status(409).json({
                message: "A variant with these attributes already exists",
                success: false,
            });
        }

        let imageUrls = [];
        if (req.body.imageUrls !== undefined) {
            try {
                imageUrls = JSON.parse(req.body.imageUrls);
            } catch {
                return res.status(400).json({
                    message: "Variant image URLs must be valid JSON",
                    success: false,
                });
            }
        }
        if (
            !Array.isArray(imageUrls) ||
            imageUrls.some(url => {
                if (typeof url !== "string") return true;
                try {
                    return !["http:", "https:"].includes(new URL(url).protocol);
                } catch {
                    return true;
                }
            })
        ) {
            return res.status(400).json({
                message: "Variant image URLs must be valid HTTP or HTTPS URLs",
                success: false,
            });
        }

        const files = req.files || [];
        if (imageUrls.length + files.length > 7) {
            return res.status(400).json({
                message: "A variant can have at most 7 images",
                success: false,
            });
        }
        const uploadedImages = await Promise.all(
            files.map(file => uploadFile({
                buffer: file.buffer,
                fileName: file.originalname,
            }))
        );
        const images = [
            ...uploadedImages,
            ...imageUrls.map(url => ({ url })),
        ];

        const newVariant = {
            images,
            price: {
                amount: price,
                currency: req.body.priceCurrency || product.price.currency,
            },
            stock,
            attributes,
        };

        const versionFilter = product.__v === undefined
            ? { __v: { $exists: false } }
            : { __v: product.__v };
        const updateResult = await ProductModel.updateOne(
            {
                _id: productId,
                seller: req.user._id,
                ...versionFilter,
            },
            {
                $push: { variants: newVariant },
                $inc: { __v: 1 },
            },
            { runValidators: true }
        );

        if (updateResult.modifiedCount !== 1) {
            return res.status(409).json({
                message: "Product changed while the variant was being added. Refresh and retry.",
                success: false,
            });
        }

        const updatedProduct = await ProductModel.findOne({
            _id: productId,
            seller: req.user._id,
        });

        return res.status(201).json({
            message: "Product variant added successfully",
            success: true,
            product: updatedProduct,
        });

    } catch (error) {
        console.error("Add product variant error:", error);

        return res.status(500).json({
            message: error.message,
            success: false,
        });
    }
}
