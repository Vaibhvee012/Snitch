import mongoose from "mongoose";
import ProductModel from "./models/product.model.js";
import { uploadFile } from "../services/storage.service.js";

export async function createProduct(req, res) {
    const {
        title,
        description,
        priceAmount,
        priceCurrency,
    } = req.body;

    const seller = req.user;

    const images = await Promise.all(
        req.files.map(async (file) => {
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

    res.status(201).json({
        message: "Product created successfully",
        success: true,
        product,
    });
}

export async function getSellerProducts(req, res){
    const seller = req.user;

    const products = await ProductModel.find({seller: seller._id});

    res.status(200).json({
        message:"Products fetched successfully",
        success: true,
        products
    })
}

export async function getAllProducts(req,res){
    const products = await ProductModel.find();

    return res.status(200).json({
        message: "Products fetched successfully",
        success: true,
        products
    })
}

export async function getProductDetails(req,res){
    const {id} = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            message: "Invalid product ID",
            success: false,
        });
    }

    const product = await ProductModel.findById(id);

    if(!product){
        return res.status(404).json({
            message: "Product not found",
            success: false
        })
    }
    return res.status(200).json({
        message: "Product fetched successfully",
        success: true,
        product
    })
}

export const getProductById = getProductDetails;

export async function addProductVariant(req, res) {
    try {
        const { id } = req.params;
        const { attributes, price, stock, images } = req.body;

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

        const newVariant = {
            attributes: attributes || {},
            price: {
                amount: price?.amount !== undefined ? Number(price.amount) : Number(product.price.amount),
                currency: price?.currency || product.price.currency || "INR",
            },
            stock: stock !== undefined ? Number(stock) : 0,
            images: Array.isArray(images) && images.length > 0 
                ? images 
                : (product.images?.length > 0 ? [{ url: product.images[0].url }] : []),
        };

        product.variants.push(newVariant);
        await product.save();

        const createdVariant = product.variants[product.variants.length - 1];

        return res.status(201).json({
            message: "Variant added successfully",
            success: true,
            variant: createdVariant,
            product,
        });
    } catch (error) {
        console.error("Error adding variant:", error);
        return res.status(500).json({
            message: error.message || "Failed to add variant",
            success: false,
        });
    }
}

export async function updateVariantStock(req, res) {
    try {
        const { id, variantId } = req.params;
        const { stock } = req.body;

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

        const variant = product.variants.id(variantId);
        if (!variant) {
            return res.status(404).json({
                message: "Variant not found",
                success: false,
            });
        }

        variant.stock = Math.max(0, Number(stock));
        await product.save();

        return res.status(200).json({
            message: "Variant stock updated successfully",
            success: true,
            variant,
            product,
        });
    } catch (error) {
        console.error("Error updating variant stock:", error);
        return res.status(500).json({
            message: error.message || "Failed to update variant stock",
            success: false,
        });
    }
}

export async function deleteProductVariant(req, res) {
    try {
        const { id, variantId } = req.params;

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

        product.variants.pull({ _id: variantId });
        await product.save();

        return res.status(200).json({
            message: "Variant removed successfully",
            success: true,
            product,
        });
    } catch (error) {
        console.error("Error deleting variant:", error);
        return res.status(500).json({
            message: error.message || "Failed to delete variant",
            success: false,
        });
    }
}
