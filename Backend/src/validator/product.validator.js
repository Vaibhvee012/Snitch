import { body, validationResult } from "express-validator";

function validateRequest(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: "Validation error",
            errors: errors.array(),
        });
    }

    next();
}

export const createProductValidator = [
    body("title")
        .trim()
        .notEmpty()
        .withMessage("Title is required"),

    body("description")
        .trim()
        .notEmpty()
        .withMessage("Description is required"),

    body("priceAmount")
        .notEmpty()
        .withMessage("Price amount is required")
        .bail()
        .isNumeric()
        .withMessage("Price amount must be a number"),

    body("priceCurrency")
        .trim()
        .notEmpty()
        .withMessage("Price currency is required"),

    validateRequest,
];