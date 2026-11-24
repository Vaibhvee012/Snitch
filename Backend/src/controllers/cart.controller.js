import cartModel from "./models/cart.model.js";
import productModel from "./models/product.model.js";
import { stockOfVariant } from "../dao/product.dao.js";

const ensureCart = async userId => {
    try {
        return await cartModel.findOneAndUpdate(
            { user: userId },
            { $setOnInsert: { user: userId, items: [] } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        if (error.code !== 11000) throw error;

        const existingCart = await cartModel.findOne({ user: userId });
        if (!existingCart) throw error;
        return existingCart;
    }
};

const getCartResponse = async cart => {
    await cart.populate({ path: "items.product", model: productModel });

    let cartChanged = false;
    for (const item of cart.items) {
        const product = item.product;
        const variantId = item.variant?._id || item.variant;
        const variant = product?.variants?.find(
            productVariant => productVariant._id.toString() === variantId?.toString()
        );
        const currentPrice = variant?.price || product?.price;

        if (!item.priceAtAddition) {
            item.priceAtAddition = item.price || currentPrice;
            cartChanged = true;
        }

        if (
            currentPrice &&
            (Number(item.price?.amount) !== Number(currentPrice.amount) ||
                item.price?.currency !== currentPrice.currency)
        ) {
            item.price = currentPrice;
            cartChanged = true;
        }
    }

    if (cartChanged) await cart.save();

    const cartData = cart.toObject({ flattenMaps: true });
    cartData.items = cartData.items.map(item => {
        const product = item.product;
        const variantId = item.variant?._id || item.variant;
        const variant = product?.variants?.find(
            productVariant => productVariant._id.toString() === variantId?.toString()
        );

        const priceAtAddition = item.priceAtAddition || item.price || null;
        const currentPrice = variant?.price || product?.price || priceAtAddition;

        return {
            ...item,
            variant: variant || item.variant,
            price: currentPrice,
            priceAtAddition,
        };
    });
    cartData.totalPrice = cartData.items.reduce(
        (total, item) => total + (Number(item.price?.amount) || 0) * item.quantity,
        0
    );
    cartData.totalQuantity = cartData.items.reduce(
        (total, item) => total + item.quantity,
        0
    );

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
    if (quantity > stock) {
        return res.status(400).json({
            message: `Only ${stock} items left in stock`,
            success: false
        })
    }

    const cart = await ensureCart(req.user._id);
    const existingItem = cart.items.find(
        item =>
            item.product.toString() === productId &&
            item.variant?.toString() === variantId
    );

    if (existingItem) {
        if (existingItem.quantity + quantity > stock) {
            return res.status(400).json({
                message: `Only ${Math.max(0, stock - existingItem.quantity)} items left in stock`,
                success: false
            });
        }

        existingItem.quantity += quantity;
        if (!existingItem.priceAtAddition) {
            existingItem.priceAtAddition = existingItem.price || variant.price;
        }
        existingItem.price = variant.price;
    } else {
        cart.items.push({
            product: productId,
            variant: variantId,
            quantity,
            price: variant.price,
            priceAtAddition: variant.price,
        });
    }
    await cart.save()

    return res.status(200).json({
        message: existingItem ? "Cart updated successfully" : "Product added to cart successfully",
        success: true,
        cart: await getCartResponse(cart)
    })
}

export const getCart = async (req, res) => {
    const cart = await ensureCart(req.user._id);

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

    const item = cart.items.find(
        cartItem =>
            cartItem.product.toString() === productId &&
            cartItem.variant?.toString() === variantId
    );
    const itemQuantityInCart = item?.quantity || 0;

    if (itemQuantityInCart + 1 > stock) {
        return res.status(400).json({
            message: `Only ${stock} items left in stock. and you already have ${itemQuantityInCart} items in your cart`,
            success: false
        })
    }

    if (!item) {
        return res.status(404).json({
            message: "Cart item not found",
            success: false
        });
    }
    item.quantity += 1;
    await cart.save();

    return res.status(200).json({
        message: "Cart item quantity incremented successfully",
        success: true,
        cart: await getCartResponse(cart)
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
