import { param, body } from "express-validator";
import { validationResult } from "express-validator";
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}

export const validateAddToCart = [
    param("productId").isMongoId().withMessage("Invalid product ID"),
    param("variantId").isMongoId().withMessage("Invalid variant ID"),
    body("quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be a positive integer"),
    validateRequest
]

export const validateUpdateCartItemQuantity = [
    param("itemId").isMongoId().withMessage("Invalid cart item ID"),
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be a positive integer"),
    validateRequest
]

export const validateRemoveCartItem = [
    param("itemId").isMongoId().withMessage("Invalid cart item ID"),
    validateRequest
]