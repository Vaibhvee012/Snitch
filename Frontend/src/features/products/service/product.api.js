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

export async function addProductVariant(productId, newProductVariant) {
    console.log(newProductVariant);

    const formData = new FormData();

    if (newProductVariant.images && Array.isArray(newProductVariant.images)) {
        newProductVariant.images.forEach((image) => {
            if (image?.file) {
                formData.append("images", image.file);
            } else if (image instanceof File) {
                formData.append("images", image);
            }
        });
    }

    if (newProductVariant.stock !== undefined) {
        formData.append("stock", newProductVariant.stock);
    }

    const price = newProductVariant.price?.amount ?? newProductVariant.price;
    if (price !== undefined && price !== "") {
        formData.append("priceAmount", price);
    }

    if (newProductVariant.attributes) {
        formData.append(
            "attributes",
            typeof newProductVariant.attributes === "string"
                ? newProductVariant.attributes
                : JSON.stringify(newProductVariant.attributes)
        );
    }

    const response = await productApiInstance.post(`/${productId}/variants`, formData);

    return response.data;
}
