import axios from "axios";

const productApiInstance = axios.create({
    baseURL: "/api/products",
    withCredentials: true,
});

export async function createProduct(formData){
    const response = await productApiInstance.post("/", formData) 

    return response.data;
}

export async function getSellerProduct(){
    const response = await productApiInstance.get("/seller")

    return response.data;
}

export async function getAllProducts(){
    const response = await productApiInstance.get("/")
    return response.data;
}

export async function getProductById(productId){
    const response = await productApiInstance.get(`/details/${productId}`)
    return response.data
}

export async function addProductVariant(productId, variantData) {
    const response = await productApiInstance.post(`/${productId}/variants`, variantData);
    return response.data;
}

export async function updateVariantStock(productId, variantId, stock) {
    const response = await productApiInstance.patch(`/${productId}/variants/${variantId}/stock`, { stock });
    return response.data;
}

export async function deleteProductVariant(productId, variantId) {
    const response = await productApiInstance.delete(`/${productId}/variants/${variantId}`);
    return response.data;
}