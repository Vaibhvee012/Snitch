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
  updateVariantStock,
  deleteProductVariant,
} from "../controllers/product.controller.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
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

/**
 * @route GET /api/products
 * @desc Get all products
 * @access Public
 */
router.get("/", getAllProducts);

/**
 * @route GET /api/products/details/:id
 * @desc Get product details by ID
 * @access Public
 */
router.get("/details/:id", getProductById);

/**
 * @route POST /api/products/:id/variants
 * @desc Add a new variant to a product
 * @access Private (Seller only)
 */
router.post("/:id/variants", authenticateSeller, addProductVariant);

/**
 * @route PATCH /api/products/:id/variants/:variantId/stock
 * @desc Update stock of a specific variant
 * @access Private (Seller only)
 */
router.patch("/:id/variants/:variantId/stock", authenticateSeller, updateVariantStock);

/**
 * @route DELETE /api/products/:id/variants/:variantId
 * @desc Remove a variant from a product
 * @access Private (Seller only)
 */
router.delete("/:id/variants/:variantId", authenticateSeller, deleteProductVariant);

export default router;
