
import { createSlice } from "@reduxjs/toolkit";

const calculateTotalQuantity = (items) =>
    items.reduce(
        (total, item) => total + (Number(item?.quantity) || 1),
        0
    );

const getProductId = (item) =>
    item.product?._id || item.product || item.productId;

const getVariantId = (item) =>
    item.variant?._id || item.variant || item.variantId;

const cartSlice = createSlice({
    name: "cart",

    initialState: {
        totalPrice: null,
        items: [],
        currency: null,
    },

    reducers: {
        setItems: (state, action) => {
            const payload = action.payload;
            const items = Array.isArray(payload)
                ? payload
                : payload?.items;
            state.items = Array.isArray(items) ? items : [];
            state.totalPrice = Array.isArray(payload) ? null : payload?.totalPrice ?? 0;
            state.currency = Array.isArray(payload) ? null : payload?.currency ?? "INR";
            state.totalQuantity = Array.isArray(payload)
                ? calculateTotalQuantity(state.items)
                : Number(payload?.totalQuantity) || calculateTotalQuantity(state.items);
        },

        addItem: (state, action) => {
            const newItem = action.payload;

            const existingIndex = state.items.findIndex(
                (item) =>
                    getProductId(item) === getProductId(newItem) &&
                    getVariantId(item) === getVariantId(newItem)
            );

            if (existingIndex > -1) {
                state.items[existingIndex].quantity =
                    (Number(state.items[existingIndex].quantity) || 1) +
                    (Number(newItem.quantity) || 1);
            } else {
                state.items.push({
                    ...newItem,
                    quantity: Number(newItem.quantity) || 1,
                });
            }

            state.totalQuantity = calculateTotalQuantity(state.items);
        },

        incrementCartItem: (state, action) => {
            const { productId, variantId } = action.payload;

            const item = state.items.find(
                (item) =>
                    getProductId(item) === productId &&
                    getVariantId(item) === variantId
            );

            if (item) {
                item.quantity = (Number(item.quantity) || 1) + 1;
            }

            state.totalQuantity = calculateTotalQuantity(state.items);
        },

        decrementCartItem: (state, action) => {
            const { productId, variantId } = action.payload;

            const item = state.items.find(
                (item) =>
                    getProductId(item) === productId &&
                    getVariantId(item) === variantId
            );

            if (item) {
                item.quantity = Math.max(
                    1,
                    (Number(item.quantity) || 1) - 1
                );
            }

            state.totalQuantity = calculateTotalQuantity(state.items);
        },

        updateQuantity: (state, action) => {
            const { itemId, quantity } = action.payload;

            const item = state.items.find((i) => i._id === itemId);

            if (item) {
                item.quantity = Math.max(1, Number(quantity) || 1);
            }

            state.totalQuantity = calculateTotalQuantity(state.items);
        },

        removeItem: (state, action) => {
            const itemId = action.payload;

            state.items = state.items.filter(
                (item) => item._id !== itemId
            );

            state.totalQuantity = calculateTotalQuantity(state.items);
        },

        clearCart: (state) => {
            state.items = [];
            state.totalQuantity = 0;
            state.totalPrice = 0;
            state.currency = "INR";
        },
    },
});

export const {
    setItems,
    addItem,
    incrementCartItem,
    decrementCartItem,
    updateQuantity,
    removeItem,
    clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
