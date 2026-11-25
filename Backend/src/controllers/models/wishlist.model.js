
import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        products: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "product",
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Ensure each user has only one wishlist
wishlistSchema.index({ user: 1 }, { unique: true });

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

export default Wishlist;
