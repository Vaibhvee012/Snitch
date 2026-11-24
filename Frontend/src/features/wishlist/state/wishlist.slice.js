import { createSlice } from "@reduxjs/toolkit";

const getProductId = (product) =>
    product?._id || product?.id || product?.productId;

const wishlistSlice = createSlice({
    name: "wishlist",
    initialState: {
        items: [],
        loading: false,
        error: null,
    },
    reducers: {
        setWishlist: (state, action) => {
            state.items = Array.isArray(action.payload) ? action.payload : [];
            state.error = null;
        },
        setWishlistLoading: (state, action) => {
            state.loading = action.payload;
        },
        setWishlistError: (state, action) => {
            state.error = action.payload;
        },
        addWishlistItem: (state, action) => {
            const id = getProductId(action.payload);
            if (!state.items.some((item) => getProductId(item) === id)) {
                state.items.push(action.payload);
            }
            state.error = null;
        },
        removeWishlistItem: (state, action) => {
            const id = action.payload;
            state.items = state.items.filter(
                (item) => getProductId(item)?.toString() !== id?.toString()
            );
            state.error = null;
        },
        clearWishlistItems: (state) => {
            state.items = [];
            state.loading = false;
            state.error = null;
        },
    },
});

export const {
    setWishlist,
    setWishlistLoading,
    setWishlistError,
    addWishlistItem,
    removeWishlistItem,
    clearWishlistItems,
} = wishlistSlice.actions;

export default wishlistSlice.reducer;
