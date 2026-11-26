import axios from "axios";

const cartApiInstance = axios.create({
    baseURL: "/api/cart",
    withCredentials: true,
});

export const addItem = async ({ productId, variantId, quantity = 1 }) => {
    const response = await cartApiInstance.post(
        `/add/${productId}/${variantId}`,
        { quantity }
    );
    return response.data;
};

export const getCart = async () => {
    const response = await cartApiInstance.get("/", { withCredentials: true });
    return response.data;
};

export const updateCartItemQuantity = async ({ itemId, quantity }) => {
    const response = await cartApiInstance.put(`/${itemId}`, { quantity });
    return response.data;
};

export const removeCartItem = async (itemId) => {
    const response = await cartApiInstance.delete(`/${itemId}`);
    return response.data;
};

export const createCartOrder = async () => {
    try {
        const response = await axios.post("/api/order/create", {}, { withCredentials: true });
        return response.data;
    } catch {
        // fallback
        const response = await cartApiInstance.post("/order", {}, { withCredentials: true });
        return response.data;
    }
};

export const verifyCartOrder = async (payload) => {
    try {
        const response = await axios.post("/api/order/verify", payload, { withCredentials: true });
        return response.data;
    } catch {
        const response = await cartApiInstance.post("/verify", payload, { withCredentials: true });
        return response.data;
    }
};

export const incrementCartItem = async ({ productId, variantId }) => {
    const response = await cartApiInstance.post(`/increment/${productId}/${variantId}`)
    return response.data
}

