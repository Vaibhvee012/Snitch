
import express from "express";
import multer from "multer";

import { authenticateSeller } from "../middlewares/auth.middleware.js";
import { createProductValidator } from "../validator/product.validator.js";

import {
    createProduct,
    getSellerProducts,
    getAllProducts,
    getProductById,
    addProductVariant,
    updateProductPrice,
    updateProductVariantStock,
    updateProductVariantPrice,
    updateProductVariant,
    deleteProductVariant,
} from "../controllers/product.controller.js";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
});

// Create a product
router.post(
    "/",
    authenticateSeller,
    upload.array("images", 7),
    createProductValidator,
    createProduct
);

// Get seller products
router.get(
    "/seller",
    authenticateSeller,
    getSellerProducts
);

// Get all products for buyers
router.get("/", getAllProducts);

// Get product details
router.get("/details/:id", getProductById);

router.patch("/:productId/price", authenticateSeller, updateProductPrice);

router.patch(
    "/:productId/variants/:variantId/stock",
    authenticateSeller,
    updateProductVariantStock
);
router.patch(
    "/:productId/variants/:variantId/price",
    authenticateSeller,
    updateProductVariantPrice
);
router.patch(
    "/:productId/variants/:variantId",
    authenticateSeller,
    upload.array("images", 7),
    updateProductVariant
);
router.delete(
    "/:productId/variants/:variantId",
    authenticateSeller,
    deleteProductVariant
);

// Add a product variant
router.post(
    "/:productId/variants",
    authenticateSeller,
    upload.array("images", 7),
    addProductVariant
);

export default router;
