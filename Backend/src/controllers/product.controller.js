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

    const productId = req.params.productId;

    const product = await productModel.findOne({
        _id: productId,
        seller: req.user._id
    });

    if (!product) {
        return res.status(404).json({
            message: "Product not found",
            success: false
        })
    }

    const files = req.files;
    const images = [];
    if (files || files.length !== 0) {
        (await Promise.all(files.map(async (file) => {
            const image = await uploadFile({
                buffer: file.buffer,
                fileName: file.originalname
            })
            return image
        }))).map(image => images.push(image))
    }

    const price = req.body.priceAmount
    const stock = req.body.stock
    const attributes = JSON.parse(req.body.attributes || "{}")

    console.log(price)

    product.variants.push({
        images,
        price: {
            amount: Number(price) || product.price.amount,
            currency: req.body.priceCurrency || product.price.currency
        },
        stock,
        attributes
    })

    await product.save();

    return res.status(200).json({
        message: "Product variant added successfully",
        success: true,
        product
    })

}
