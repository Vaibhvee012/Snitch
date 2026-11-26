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
import { setItems, clearCart } from "../state/cart.slice";

export const useCart = () => {
    const dispatch = useDispatch();

    const handleAddItem = useCallback(async ({ productId, variantId, quantity = 1 }) => {
        const data = await addItem({ productId, variantId, quantity });
        if (data.cart) dispatch(setItems(data.cart));
        return data;
    }, [dispatch]);

    const handleGetCart = useCallback(async () => {
        const data = await getCart();
        dispatch(setItems(data.cart));
        return data;
    }, [dispatch]);

    const handleIncrementCartItem = useCallback(async ({ itemId, currentQty }) => {
        const data = await updateCartItemQuantity({
            itemId,
            quantity: Number(currentQty) + 1,
        });
        dispatch(setItems(data.cart));
        return data;
    }, [dispatch]);

    const handleDecrementCartItem = useCallback(async ({ itemId, currentQty }) => {
        const data = await updateCartItemQuantity({
            itemId,
            quantity: Math.max(1, Number(currentQty) - 1),
        });
        dispatch(setItems(data.cart));
        return data;
    }, [dispatch]);

    const handleRemoveCartItem = useCallback(async (itemId) => {
        const data = await removeCartItem(itemId);
        dispatch(setItems(data.cart));
        return data;
    }, [dispatch]);

    const handleClearCartState = useCallback(() => {
        dispatch(clearCart());
    }, [dispatch]);

    const handleCreateCartOrder = useCallback(async () => {
        const data = await createCartOrder();
        return data.order;
    }, []);

    const handleVerifyCartOrder = useCallback(async (payload) => {
        const data = await verifyCartOrder(payload);
        return data.success
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
