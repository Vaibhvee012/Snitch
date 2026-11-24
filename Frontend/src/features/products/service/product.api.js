
import axios from "axios";

const productApiInstance = axios.create({
    baseURL: "/api/products",
    withCredentials: true,
});

// Create a product
export async function createProduct(formData) {
    const response = await productApiInstance.post("/", formData);
    return response.data;
}

// Get products created by the logged-in seller
export async function getSellerProduct() {
    const response = await productApiInstance.get("/seller");
    return response.data;
}

// Get all products for buyers
export async function getAllProducts() {
    const response = await productApiInstance.get("/");
    return response.data;
}

// Get a single product with its variants
export async function getProductById(productId) {
    const response = await productApiInstance.get(`/details/${productId}`);
    return response.data;
}

export async function updateProductPrice(productId, amount) {
    const response = await productApiInstance.patch(`/${productId}/price`, { amount });
    return response.data;
}

// Add a variant to an existing product
export async function addProductVariant(productId, newProductVariant) {
    const formData = new FormData();

    // Append variant images
    if (Array.isArray(newProductVariant.images)) {
        newProductVariant.images.forEach((image) => {
            if (image?.file instanceof File) {
                formData.append("images", image.file);
            } else if (image instanceof File) {
                formData.append("images", image);
            }
        });
    }

    // Append stock
    if (newProductVariant.stock !== undefined) {
        formData.append("stock", String(newProductVariant.stock));
    }

    // Append price
    const price =
        newProductVariant.price?.amount ??
        newProductVariant.price;

    if (price !== undefined && price !== "") {
        formData.append("priceAmount", String(price));
    }

    // Append currency
    const currency =
        newProductVariant.price?.currency ??
        newProductVariant.priceCurrency;

    if (currency) {
        formData.append("priceCurrency", currency);
    }

    // Append attributes
    if (newProductVariant.attributes) {
        formData.append(
            "attributes",
            typeof newProductVariant.attributes === "string"
                ? newProductVariant.attributes
                : JSON.stringify(newProductVariant.attributes)
        );
    }

    const response = await productApiInstance.post(
        `/${productId}/variants`,
        formData
    );

    return response.data;
}
