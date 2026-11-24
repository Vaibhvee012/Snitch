
import { useCallback } from "react";
import {
    addItem,
    getCart,
    updateCartItemQuantity,
    removeCartItem,
    createCartOrder,
    verifyCartOrder,
} from "../service/cart.api";

import { useDispatch } from "react-redux";

import {
    setItems,
    clearCart,
} from "../state/cart.slice";

export const useCart = () => {
    const dispatch = useDispatch();

    const handleGetCart = useCallback(async () => {
        const data = await getCart();
        const items =
            data?.cart?.items ??
            data?.items ??
            (Array.isArray(data?.cart) ? data.cart : Array.isArray(data) ? data : []);

        dispatch(setItems(items));
        return items;
    }, [dispatch]);

    // Add item to cart
    const handleAddItem = useCallback(async ({ productId, variantId, quantity = 1 }) => {
        const data = await addItem({
            productId,
            variantId,
            quantity,
        });

        // Refresh Redux cart with backend data
        await handleGetCart();

        return data;
    }, [handleGetCart]);

    // Increment cart item quantity
    const handleIncrementCartItem = useCallback(async ({
        itemId,
        productId,
        variantId,
        currentQty = 1,
    }) => {
        if (productId && variantId) {
            await addItem({ productId, variantId, quantity: 1 });
        } else if (itemId) {
            await updateCartItemQuantity({ itemId, quantity: currentQty + 1 });
        } else {
            throw new Error("The cart item could not be identified.");
        }

        await handleGetCart();
    }, [handleGetCart]);

    const handleDecrementCartItem = useCallback(async ({ itemId, currentQty = 1 }) => {
        if (!itemId) {
            throw new Error("The cart item could not be identified.");
        }

        await updateCartItemQuantity({
            itemId,
            quantity: Math.max(1, currentQty - 1),
        });
        await handleGetCart();
    }, [handleGetCart]);

    const handleRemoveCartItem = useCallback(async (itemId) => {
        if (!itemId) {
            throw new Error("The cart item could not be identified.");
        }

        await removeCartItem(itemId);
        await handleGetCart();
    }, [handleGetCart]);

    const handleClearCartState = useCallback(() => {
        dispatch(clearCart());
    }, [dispatch]);

    // Create cart order
    const handleCreateCartOrder = useCallback(async () => {
        const data = await createCartOrder();

        return data.order;
    }, []);

    // Verify cart payment
    const handleVerifyCartOrder = useCallback(async ({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
    }) => {
        const data = await verifyCartOrder({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        });

        return data.success;
    }, []);

    return {
        handleAddItem,
        handleGetCart,
        handleIncrementCartItem,
        handleDecrementCartItem,
        handleRemoveCartItem,
        handleClearCartState,
        handleCreateCartOrder,
        handleVerifyCartOrder,
    };
};
