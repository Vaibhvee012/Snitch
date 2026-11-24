import { useCallback } from "react";
import { useDispatch } from "react-redux";
import {
    addToWishlist,
    clearWishlist,
    getWishlist,
    removeFromWishlist,
} from "../service/wishlist.api";
import {
    addWishlistItem,
    clearWishlistItems,
    removeWishlistItem,
    setWishlist,
    setWishlistError,
    setWishlistLoading,
} from "../state/wishlist.slice";

const normalizeWishlistProducts = (data) => {
    const products =
        data?.products ??
        data?.wishlist?.products ??
        data?.wishlist ??
        [];

    if (!Array.isArray(products)) return [];

    return products
        .map((item) => item?.product && typeof item.product === "object" ? item.product : item)
        .filter((product) => product && typeof product === "object");
};

export const useWishlist = () => {
    const dispatch = useDispatch();

    const handleGetWishlist = useCallback(async () => {
        dispatch(setWishlistLoading(true));
        dispatch(setWishlistError(null));
        try {
            const data = await getWishlist();
            const products = normalizeWishlistProducts(data);
            dispatch(setWishlist(products));
            return products;
        } catch (error) {
            dispatch(
                setWishlistError(
                    error.response?.data?.message ||
                    error.message ||
                    "Could not load your wishlist."
                )
            );
            throw error;
        } finally {
            dispatch(setWishlistLoading(false));
        }
    }, [dispatch]);

    const handleAddToWishlist = useCallback(async (product) => {
        const productId = product?._id || product?.id;
        if (!productId) throw new Error("Product information is unavailable.");

        const data = await addToWishlist(productId);
        if (Array.isArray(data?.wishlist) || Array.isArray(data?.products)) {
            dispatch(setWishlist(normalizeWishlistProducts(data)));
        } else {
            dispatch(addWishlistItem(product));
        }
        return data;
    }, [dispatch]);

    const handleRemoveFromWishlist = useCallback(async (productId) => {
        const data = await removeFromWishlist(productId);
        dispatch(removeWishlistItem(productId));
        if (Array.isArray(data?.products)) {
            dispatch(setWishlist(normalizeWishlistProducts(data)));
        }
        return data;
    }, [dispatch]);

    const handleClearWishlist = useCallback(async () => {
        const data = await clearWishlist();
        dispatch(clearWishlistItems());
        return data;
    }, [dispatch]);

    const handleClearWishlistState = useCallback(() => {
        dispatch(clearWishlistItems());
    }, [dispatch]);

    return {
        handleGetWishlist,
        handleAddToWishlist,
        handleRemoveFromWishlist,
        handleClearWishlist,
        handleClearWishlistState,
    };
};
