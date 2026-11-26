import productModel from "../models/product.model.js";

export const stockOfVariant = async (productId, variantId) => {
    const product = await productModel.findOne({
        _id: productId,
        "variants._id": variantId
    });

    if (!product) {
        throw new Error("Product or variant not found");
    }

    const variant = product.variants.find(
        variant => variant._id.toString() === variantId
    );

    if (!variant) {
        throw new Error("Variant not found");
    }

    return variant.stock;
};