import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { validateAddToCart } from "../validator/cart.validator.js";
import { addToCart, getCart } from "../controllers/cart.controller.js";

const router = express.Router();
/**
 * @route POST /api/cart/:productId/:variantId
 * @desc Add an item to the cart
 * @access Private
 * @argument productId - The ID of the product to add to the cart
 * @argument variantId - The ID of the product variant to add to the cart
 * @argument quantity - The quantity of the product to add to the cart (default is 1)
*/
router.post("/add/:productId/:variantId", authenticateUser, validateAddToCart, addToCart);


/**
 * @route GET /api/cart
 * @desc Get user's cart
 * @access Private
 *
*/
router.get("/", authenticateUser, getCart)
export default router;

