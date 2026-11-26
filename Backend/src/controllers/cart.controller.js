import cartModel from "../models/cart.model.js";
import productModel from "../models/product.model.js";
import { stockOfVariant } from "../dao/product.dao.js";
import mongoose from "mongoose";
import { createOrder } from "../services/payment.service.js";
import { getCartDetails } from "../dao/cart.dao.js";
import paymentModel from "../models/payment.model.js";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils.js";
import { config } from "../config/config.js";

const getCartResponse = async userId =>
    await getCartDetails(userId) || {
        items: [],
        totalPrice: 0,
        totalQuantity: 0,
        currency: "INR",
    };

export const addToCart = async (req, res) => {

    const { productId, variantId } = req.params
    const { quantity = 1 } = req.body

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

    const stock = await stockOfVariant(productId, variantId)

    const cart = (await cartModel.findOne({ user: req.user._id })) ||
        (await cartModel.create({ user: req.user._id }))

    const isProductAlreadyInCart = cart.items.some(item => item.product.toString() === productId && item.variant?.toString() === variantId)

    if (isProductAlreadyInCart) {
        const quantityInCart = cart.items.find(item => item.product.toString() === productId && item.variant?.toString() === variantId).quantity
        if (quantityInCart + quantity > stock) {
            return res.status(400).json({
                message: `Only ${stock} items left in stock. and you already have ${quantityInCart} items in your cart`,
                success: false
            })
        }

        await cartModel.findOneAndUpdate(
            { user: req.user._id, "items.product": productId, "items.variant": variantId },
            { $inc: { "items.$.quantity": quantity } },
            { new: true }
        )

        return res.status(200).json({
            message: "Cart updated successfully",
            success: true,
            cart: await getCartResponse(req.user._id),
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
        price: product.variants.id(variantId).price,
        priceAtAddition: product.variants.id(variantId).price,
    })

    await cart.save()

    return res.status(200).json({
        message: "Product added to cart successfully",
        success: true,
        cart: await getCartResponse(req.user._id),
    })
}

export const getCart = async (req, res) => {
    const user = req.user

    return res.status(200).json({
        message: "Cart fetched successfully",
        success: true,
        cart: await getCartResponse(user._id),
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
    const product = await productModel.findOne({
        _id: item.product,
        "variants._id": item.variant
    });
    if (!product) {
        return res.status(404).json({
            message: "Product or variant no longer exists",
            success: false
        });
    }

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
        cart: await getCartResponse(req.user._id)
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
        cart: await getCartResponse(req.user._id)
    });
};

export const createOrderController = async (req, res) => {


    const cart = await getCartDetails(req.user._id)

    if (!cart) {
        return res.status(400).json({
            message: "Cart is empty",
            success: false
        })
    }

    if (!cart.items.length || !Number.isFinite(cart.totalPrice) || cart.totalPrice <= 0) {
        return res.status(400).json({
            message: "Cart contains no purchasable items",
            success: false
        })
    }

    const invalidItem = cart.items.find(item =>
        !item.product ||
        !item.variant ||
        typeof item.variant !== "object" ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) < 1 ||
        Number(item.quantity) > Number(item.variant.stock) ||
        !Number.isFinite(Number(item.price?.amount)) ||
        Number(item.price.amount) <= 0
    );
    if (invalidItem) {
        return res.status(409).json({
            message: "A cart item is unavailable or has insufficient stock. Refresh your cart before checkout.",
            success: false
        })
    }

    const order = await createOrder({ amount: cart.totalPrice, currency: cart.currency })

    const payment = await paymentModel.create({
        user: req.user._id,
        razorpay: {
            orderId: order.id,
        },
        price: {
            amount: cart.totalPrice,
            currency: cart.currency
        },
        orderItems: cart.items.map(item => ({
            title: item.product.title,
            productId: item.product._id,
            variantId: item.variant?._id || item.variant,
            quantity: item.quantity,
            images: item.variant?.images?.length ? item.variant.images : item.product.images,
            description: item.product.description,
            price: {
                amount: item.price.amount,
                currency: item.price.currency
            }
        }))
    })

    return res.status(200).json({
        message: "Order created successfully",
        success: true,
        order
    })
}

export const verifyOrderController = async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    } = req.body

    const payment = await paymentModel.findOne({
        "razorpay.orderId": razorpay_order_id,
        status: "pending"
    })

    if (!payment) {
        return res.status(400).json({
            message: "Payment not found",
            success: false
        })
    }

    const isPaymentValid = validatePaymentVerification({
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
    }, razorpay_signature, config.RAZORPAY_KEY_SECRET)

    if (!isPaymentValid) {
        payment.status = "failed"
        await payment.save()

        return res.status(400).json({
            message: "Payment verification failed",
            success: false
        })
    }

    payment.status = "paid"

    payment.razorpay.paymentId = razorpay_payment_id
    payment.razorpay.signature = razorpay_signature

    await payment.save()

    return res.status(200).json({
        message: "Payment verified successfully",
        success: true
    })
}