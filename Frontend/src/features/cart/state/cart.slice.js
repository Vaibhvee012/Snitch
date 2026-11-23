import { createSlice } from "@reduxjs/toolkit";

const cartSlice = createSlice({
    name: "cart",
    initialState: {
        items: [],
        totalQuantity: 0,
    },
    reducers: {
        setItems: (state, action) => {
            const items = Array.isArray(action.payload) ? action.payload : [];
            state.items = items;
            state.totalQuantity = items.reduce(
                (total, item) => total + (Number(item?.quantity) || 1),
                0
            );
        },
        addItem: (state, action) => {
            const newItem = action.payload;
            const existingIndex = state.items.findIndex(
                (item) =>
                    (item._id && newItem._id && item._id === newItem._id) ||
                    (item.product?._id === (newItem.product?._id || newItem.productId) &&
                        (item.variant?._id || item.variant) ===
                            (newItem.variant?._id || newItem.variantId || newItem.variant))
            );

            if (existingIndex > -1) {
                state.items[existingIndex].quantity =
                    (state.items[existingIndex].quantity || 1) +
                    (newItem.quantity || 1);
            } else {
                state.items.push(newItem);
            }

            state.totalQuantity = state.items.reduce(
                (total, item) => total + (Number(item?.quantity) || 1),
                0
            );
        },
        updateQuantity: (state, action) => {
            const { itemId, quantity } = action.payload;
            const item = state.items.find((i) => i._id === itemId);
            if (item) {
                item.quantity = Math.max(1, Number(quantity) || 1);
            }
            state.totalQuantity = state.items.reduce(
                (total, item) => total + (Number(item?.quantity) || 1),
                0
            );
        },
        removeItem: (state, action) => {
            const itemId = action.payload;
            state.items = state.items.filter((i) => i._id !== itemId);
            state.totalQuantity = state.items.reduce(
                (total, item) => total + (Number(item?.quantity) || 1),
                0
            );
        },
        clearCart: (state) => {
            state.items = [];
            state.totalQuantity = 0;
        },
    },
});

export const { setItems, addItem, updateQuantity, removeItem, clearCart } =
    cartSlice.actions;

export default cartSlice.reducer;
