
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

export async function updateProductVariantStock(productId, variantId, stock) {
    const response = await productApiInstance.patch(
        `/${productId}/variants/${variantId}/stock`,
        { stock }
    );
    return response.data;
}

export async function updateProductVariantPrice(productId, variantId, amount) {
    const response = await productApiInstance.patch(
        `/${productId}/variants/${variantId}/price`,
        { amount }
    );
    return response.data;
}

export async function updateProductVariant(productId, variantId, variant) {
    const formData = new FormData();
    formData.append("attributes", JSON.stringify(variant.attributes));
    formData.append("priceAmount", String(variant.price.amount));
    formData.append("priceCurrency", variant.price.currency);
    formData.append("stock", String(variant.stock));

    const imageUrls = [];
    (variant.images || []).forEach(image => {
        if (image?.file instanceof File) {
            formData.append("images", image.file);
        } else if (typeof image?.url === "string" && image.url) {
            imageUrls.push(image.url);
        }
    });
    formData.append("imageUrls", JSON.stringify(imageUrls));

    const response = await productApiInstance.patch(
        `/${productId}/variants/${variantId}`,
        formData
    );
    return response.data;
}

export async function deleteProductVariant(productId, variantId) {
    const response = await productApiInstance.delete(
        `/${productId}/variants/${variantId}`
    );
    return response.data;
}

// Add a variant to an existing product
export async function addProductVariant(productId, newProductVariant) {
    const formData = new FormData();

    // Append variant images
    if (Array.isArray(newProductVariant.images)) {
        const imageUrls = [];
        newProductVariant.images.forEach((image) => {
            if (image?.file instanceof File) {
                formData.append("images", image.file);
            } else if (image instanceof File) {
                formData.append("images", image);
            } else if (typeof image?.url === "string" && image.url) {
                imageUrls.push(image.url);
            }
        });
        formData.append("imageUrls", JSON.stringify(imageUrls));
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
