import express from "express";
import { authenticateSeller } from "../middlewares/auth.middleware.js";
import { createProduct } from "../controllers/product.controller.js";
import multer from "multer";

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
router.post("/",authenticateSeller,createProductValidator,upload.array("images", 7),createProduct);



/**
 * @route GET /api/products/seller
 * @desc Get all products
 * @access Private (Seller only)   
 */
router.get("/seller", authenticateSeller, getSellerProducts);



export default router;