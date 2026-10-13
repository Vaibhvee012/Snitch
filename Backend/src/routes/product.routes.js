import express from "express";
import multer from "multer";
import { authenticateSeller } from "../middlewares/auth.middleware.js";
import { createProductValidator } from "../validator/product.validator.js";
import {createProduct, getSellerProducts} from "../controllers/product.controller.js";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
});

/**
 * @route POST /api/products
 * @desc Create a new product
 * @access Private (Seller only)
 */
router.post(
    "/",
    authenticateSeller,
    upload.array("images", 7),
    createProductValidator,
    createProduct
);

/**
 * @route GET /api/products/seller
 * @desc Get all products for the logged-in seller
 * @access Private (Seller only)
 */
router.get(
    "/seller",
    authenticateSeller,
    getSellerProducts
);

export default router;