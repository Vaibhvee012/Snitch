import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import {
    addToWishlist,
    clearWishlist,
    getWishlistProducts,
    removeFromWishlist,
} from "../controllers/wishlist.controller.js";

const router = express.Router();

router.get("/", authenticateUser, getWishlistProducts);
router.post("/:productId", authenticateUser, addToWishlist);
router.delete("/:productId", authenticateUser, removeFromWishlist);
router.delete("/", authenticateUser, clearWishlist);

export default router;
