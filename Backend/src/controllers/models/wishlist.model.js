import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
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

wishlistSchema.index({ user: 1 }, { unique: true });

const wishlistModel = mongoose.model("Wishlist", wishlistSchema);

export default wishlistModel;
