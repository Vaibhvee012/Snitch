import axios from "axios";

const wishlistApiInstance = axios.create({
    baseURL: "/api/wishlist",
    withCredentials: true,
});

export const getWishlist = async () => {
    const response = await wishlistApiInstance.get("/");
    return response.data;
};

export const addToWishlist = async (productId) => {
    const response = await wishlistApiInstance.post(`/${productId}`);
    return response.data;
};

export const removeFromWishlist = async (productId) => {
    const response = await wishlistApiInstance.delete(`/${productId}`);
    return response.data;
};

export const clearWishlist = async () => {
    const response = await wishlistApiInstance.delete("/");
    return response.data;
};
