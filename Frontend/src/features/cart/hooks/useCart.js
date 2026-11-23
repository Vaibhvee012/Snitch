import { useCallback } from "react";
import { useDispatch } from "react-redux";
import {
    addItem as addItemApi,
    getCart as getCartApi,
    updateCartItemQuantity,
    removeCartItem,
    createCartOrder,
    verifyCartOrder,
} from "../service/cart.api.js";
import {
    setItems,
    addItem as addItemAction,
    updateQuantity as updateQuantityAction,
    removeItem as removeItemAction,
    clearCart as clearCartAction,
} from "../state/cart.slice";

export const useCart = () => {
    const dispatch = useDispatch();

    const handleAddItem = useCallback(
        async (item) => {
            const productId = item?.productId;
            const variantId = item?.variantId;

            if (!productId || !variantId) {
                throw new Error(
                    "A product ID and variant ID are required to add an item to the cart."
                );
            }

            const res = await addItemApi({
                productId,
                variantId,
                quantity: item.quantity || 1,
            });
            dispatch(addItemAction(item));
            return res;
        },
        [dispatch]
    );

    const handleGetCart = useCallback(async () => {
        try {
            const data = await getCartApi();
            const items =
                data?.cart?.items ||
                data?.items ||
                (Array.isArray(data) ? data : []);
            dispatch(setItems(items));
            return data;
        } catch (error) {
            console.warn("Could not fetch cart from server:", error.message);
            return null;
        }
    }, [dispatch]);

    const handleIncrementCartItem = useCallback(
        async ({ itemId, productId, variantId, currentQty = 1 }) => {
            const newQty = currentQty + 1;
            if (itemId) {
                dispatch(updateQuantityAction({ itemId, quantity: newQty }));
            }
            try {
                if (productId && variantId) {
                    await addItemApi({ productId, variantId, quantity: 1 });
                } else if (itemId) {
                    await updateCartItemQuantity({ itemId, quantity: newQty });
                }
            } catch (err) {
                console.warn("Error incrementing cart item:", err.message);
            }
        },
        [dispatch]
    );

    const handleDecrementCartItem = useCallback(
        async ({ itemId, currentQty = 1 }) => {
            const newQty = Math.max(1, currentQty - 1);
            if (itemId) {
                dispatch(updateQuantityAction({ itemId, quantity: newQty }));
                try {
                    await updateCartItemQuantity({ itemId, quantity: newQty });
                } catch (err) {
                    console.warn("Error decrementing cart item:", err.message);
                }
            }
        },
        [dispatch]
    );

    const handleRemoveCartItem = useCallback(
        async (itemId) => {
            if (!itemId) return;
            dispatch(removeItemAction(itemId));
            try {
                await removeCartItem(itemId);
            } catch (err) {
                console.warn("Error removing cart item:", err.message);
            }
        },
        [dispatch]
    );

    const handleCreateCartOrder = useCallback(async () => {
        return await createCartOrder();
    }, []);

    const handleVerifyCartOrder = useCallback(async (payload) => {
        return await verifyCartOrder(payload);
    }, []);

    return {
        handleAddItem,
        handleGetCart,
        handleIncrementCartItem,
        handleDecrementCartItem,
        handleRemoveCartItem,
        handleCreateCartOrder,
        handleVerifyCartOrder,
    };
};
