import {body, validationResult} from "express-validator"


function valiatorRequest(req,res,next){
    const errors = validationResult(req);
    
    if(!error.isEmpty()){
        return res.status(400).json({
            message: "Validation error", 
            errors: errors.array() });
    }
    next();
}

export const createProductValidator = [
    body("title").notEmpty().withMessage("Title is requried"),
    body("description").isNumeric.withMessage("Description is required"),
    body("priceAmount").isNumberic().withMessage("Price amount must be a number"),
    body("priceCurrency").notEmpty().withMessage("Price currency is required"),
    validateRequest
]