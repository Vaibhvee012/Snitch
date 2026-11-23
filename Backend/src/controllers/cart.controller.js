import cartModel from "./models/cart.model.js";
import productModel from "./models/product.model.js";
import { stockOfVariant } from "../dao/product.dao.js";

const getCartResponse = async cart => {
    await cart.populate({ path: "items.product", model: productModel });

    const cartData = cart.toObject({ flattenMaps: true });
    cartData.items = cartData.items.map(item => {
        const product = item.product;
        const variantId = item.variant?._id || item.variant;
        const variant = product?.variants?.find(
            productVariant => productVariant._id.toString() === variantId?.toString()
        );

        return {
            ...item,
            variant: variant || item.variant,
            price: variant?.price || item.price
        };
    });

    return cartData;
};

export const addToCart = async (req, res) => {

    const { productId, variantId } = req.params
    const quantity = Number(req.body?.quantity || 1)

    const product = await productModel.findOne({
        _id: productId,
        "variants._id": variantId
    })

    if (!product) {
        return res.status(404).json({
            message: "Product or variant not found",
            success: false
        })
    }

    const variant = product.variants.find(
        productVariant => productVariant._id.toString() === variantId
    )
    const stock = await stockOfVariant(productId, variantId)

    const cart = (await cartModel.findOne({ user: req.user._id })) ||
        (await cartModel.create({ user: req.user._id }))

    const isProductAlreadyInCart = cart.items.some(item => item.product.toString() === productId && item.variant?.toString() === variantId)

    if (isProductAlreadyInCart) {
        const existingItem = cart.items.find(item => item.product.toString() === productId && item.variant?.toString() === variantId)
        const quantityInCart = existingItem.quantity
        if (quantityInCart + quantity > stock) {
            return res.status(400).json({
                message: `Only ${stock} items left in stock. and you already have ${quantityInCart} items in your cart`,
                success: false
            })
        }

        await cartModel.findOneAndUpdate(
            { user: req.user._id, "items.product": productId, "items.variant": variantId },
            { $inc: { "items.$.quantity": quantity }, $set: { "items.$.price": variant.price } },
            { new: true }
        )

        return res.status(200).json({
            message: "Cart updated successfully",
            success: true
        })
    }

    if (quantity > stock) {
        return res.status(400).json({
            message: `Only ${stock} items left in stock`,
            success: false
        })
    }

    cart.items.push({
        product: productId,
        variant: variantId,
        quantity,
        price: variant.price
    })

    await cart.save()

    return res.status(200).json({
        message: "Product added to cart successfully",
        success: true,
        cart: await getCartResponse(cart)
    })
}

export const getCart = async (req, res) => {
    const user = req.user;
    let cart = await cartModel.findOne({ user: user._id });

    if (!cart) {
        cart = await cartModel.create({ user: user._id, items: [] });
    }

    return res.status(200).json({
        message: "Cart fetched successfully",
        success: true,
        cart: await getCartResponse(cart)
    })
}

export const incrementCartItemQuantity = async (req, res) => {
    const { productId, variantId } = req.params

    const product = await productModel.findOne({
        _id: productId,
        "variants._id": variantId
    })

    if (!product) {
        return res.status(404).json({
            message: "Product or variant not found",
            success: false
        })
    }

    const cart = await cartModel.findOne({ user: req.user._id })

    if (!cart) {
        return res.status(404).json({
            message: "Cart not found",
            success: false
        })
    }

    const stock = await stockOfVariant(productId, variantId)

    const itemQuantityInCart = cart.items.find(item => item.product.toString() === productId && item.variant?.toString() === variantId)?.quantity || 0

    if (itemQuantityInCart + 1 > stock) {
        return res.status(400).json({
            message: `Only ${stock} items left in stock. and you already have ${itemQuantityInCart} items in your cart`,
            success: false
        })
    }

    await cartModel.findOneAndUpdate(
        { user: req.user._id, "items.product": productId, "items.variant": variantId },
        { $inc: { "items.$.quantity": 1 } },
        { new: true }
    )

    return res.status(200).json({
        message: "Cart item quantity incremented successfully",
        success: true
    })
}

export const updateCartItemQuantity = async (req, res) => {
    const cart = await cartModel.findOne({ user: req.user._id });
    const item = cart?.items.id(req.params.itemId);

    if (!item) {
        return res.status(404).json({
            message: "Cart item not found",
            success: false
        });
    }

    const quantity = Number(req.body.quantity);
    const stock = await stockOfVariant(item.product.toString(), item.variant.toString());
    if (quantity > stock) {
        return res.status(400).json({
            message: `Only ${stock} items left in stock`,
            success: false
        });
    }

    item.quantity = quantity;
    await cart.save();

    return res.status(200).json({
        message: "Cart item quantity updated successfully",
        success: true,
        cart: await getCartResponse(cart)
    });
};

export const removeCartItem = async (req, res) => {
    const cart = await cartModel.findOne({ user: req.user._id });
    const item = cart?.items.id(req.params.itemId);

    if (!item) {
        return res.status(404).json({
            message: "Cart item not found",
            success: false
        });
    }

    cart.items.pull(req.params.itemId);
    await cart.save();

    return res.status(200).json({
        message: "Cart item removed successfully",
        success: true,
        cart: await getCartResponse(cart)
    });
};
