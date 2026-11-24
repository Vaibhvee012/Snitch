import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useWishlist } from "../hooks/useWishlist";

const HeartIcon = ({ filled = false, size = 20 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? "#C9A96E" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
);

const WishlistHeart = ({ product, className = "", size = "md" }) => {
    const navigate = useNavigate();
    const user = useSelector((state) => state.auth?.user);
    const wishlistItems = useSelector((state) => state.wishlist?.items || []);
    const { handleAddToWishlist, handleRemoveFromWishlist } = useWishlist();
    const [pending, setPending] = useState(false);
    const [notice, setNotice] = useState("");

    const productId = product?._id || product?.id;
    const isWishlisted = wishlistItems.some(
        (item) => (item?._id || item?.id)?.toString() === productId?.toString()
    );

    const handleToggle = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!user) {
            navigate("/login");
            return;
        }

        if (!productId || pending) return;

        setPending(true);
        try {
            if (isWishlisted) {
                await handleRemoveFromWishlist(productId);
                setNotice("Removed from wishlist");
            } else {
                await handleAddToWishlist(product);
                setNotice("Saved to wishlist");
            }
        } catch (error) {
            setNotice(error.response?.data?.message || "Could not update wishlist");
        } finally {
            setPending(false);
            setTimeout(() => setNotice(""), 2500);
        }
    };

    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                onClick={handleToggle}
                disabled={pending}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                className={`flex items-center justify-center transition-all duration-200 disabled:opacity-60 ${
                    size === "inline"
                        ? "w-9 h-9 hover:scale-110"
                        : `${size === "lg" ? "w-12 h-12" : "w-10 h-10"} rounded-full border shadow-sm hover:scale-105`
                }`}
                style={{
                    backgroundColor: size === "inline" ? "transparent" : "#ffffff",
                    borderColor: isWishlisted ? "#C9A96E" : "#e4e2df",
                    color: isWishlisted ? "#C9A96E" : "#1b1c1a",
                }}
            >
                <HeartIcon filled={isWishlisted} size={size === "inline" ? 22 : 20} />
            </button>
            {notice && (
                <span
                    role="status"
                    className="absolute right-0 top-full mt-2 whitespace-nowrap px-3 py-2 text-[9px] uppercase tracking-[0.12em] border shadow-md"
                    style={{
                        backgroundColor: "#fbf9f6",
                        borderColor: "#e4e2df",
                        color: "#1b1c1a",
                        zIndex: 20,
                    }}
                >
                    {notice}
                </span>
            )}
        </div>
    );
};

export default WishlistHeart;
