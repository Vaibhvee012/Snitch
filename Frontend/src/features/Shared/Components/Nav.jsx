import { useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useCart } from "../../cart/hooks/useCart";
import { useWishlist } from "../../wishlist/hooks/useWishlist";

// Lucide ShoppingCart icon component
const ShoppingCart = ({
    size = 20,
    className = "",
    strokeWidth = 1.75,
    ...props
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
);

const Nav = () => {
    const user = useSelector((state) => state.auth?.user);
    const cartItems = useSelector((state) => state.cart?.items || []);
    const totalQuantity = useSelector((state) => state.cart?.totalQuantity);
    const wishlistItems = useSelector((state) => state.wishlist?.items || []);
    const { handleGetCart, handleClearCartState } = useCart();
    const { handleGetWishlist, handleClearWishlistState } = useWishlist();

    // Fetch buyer's cart on mount if logged in
    useEffect(() => {
        handleClearCartState();
        handleClearWishlistState();
        if (user && user.role !== "seller") {
            handleGetCart().catch((error) => {
                console.error("Could not load cart in navigation:", error);
            });
            handleGetWishlist().catch((error) => {
                console.error("Could not load wishlist in navigation:", error);
            });
        }
    }, [
        user,
        handleGetCart,
        handleClearCartState,
        handleGetWishlist,
        handleClearWishlistState,
    ]);

    // Compute total quantity badge
    const itemCount = useMemo(() => {
        if (typeof totalQuantity === "number" && totalQuantity > 0) {
            return totalQuantity;
        }
        return cartItems.reduce(
            (acc, item) => acc + (Number(item?.quantity) || 1),
            0
        );
    }, [totalQuantity, cartItems]);

    // Only show cart icon when user is logged in AND is not a seller (i.e. buyer only)
    const isSeller = user?.role === "seller";
    const showCartIcon = Boolean(user && !isSeller);

    return (
        <header
            className="sticky top-0 z-40 backdrop-blur-md transition-all duration-300"
            style={{
                backgroundColor: "rgba(251, 249, 246, 0.94)",
                borderBottom: "1px solid #e4e2df",
            }}
        >
            <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 xl:px-24 py-4 sm:py-5 flex items-center justify-between">
                {/* Brand Logo */}
                <Link
                    to="/"
                    className="text-lg sm:text-xl font-light tracking-[0.35em] uppercase hover:opacity-80 transition-opacity"
                    style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        color: "#1b1c1a",
                    }}
                >
                    Snitch<span style={{ color: "#C9A96E" }}>.</span>
                </Link>

                {/* Navigation Links & Actions */}
                <div
                    className="flex items-center gap-4 sm:gap-6 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-medium"
                    style={{ color: "#7A6E63" }}
                >
                    {user ? (
                        <>
                            <span
                                className="hidden sm:inline"
                                style={{ color: "#1b1c1a" }}
                            >
                                {user.fullname || user.email}
                            </span>

                            {isSeller && (
                                <Link
                                    to="/seller/dashboard"
                                    className="px-3 py-1.5 border border-[#ede9e3] hover:border-[#C9A96E] hover:text-[#C9A96E] transition-colors text-[9px] sm:text-[10px]"
                                    style={{ color: "#1b1c1a" }}
                                >
                                    Seller Studio
                                </Link>
                            )}
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="transition-colors hover:text-[#C9A96E]"
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/register"
                                className="transition-colors hover:text-[#C9A96E] hidden sm:inline"
                            >
                                Sign Up
                            </Link>
                        </>
                    )}

                    {/* Cart Icon: Visible strictly for buyers & non-sellers */}
                    {showCartIcon && (
                        <>
                            <Link
                                to="/wishlist"
                                className="relative p-1.5 flex items-center justify-center transition-colors hover:text-[#C9A96E]"
                                style={{ color: "#1b1c1a" }}
                                aria-label="Wishlist"
                                title="View Wishlist"
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.75"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                                {wishlistItems.length > 0 && (
                                    <span
                                        className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-white shadow-sm"
                                        style={{
                                            backgroundColor: "#C9A96E",
                                            minWidth: "16px",
                                            height: "16px",
                                            padding: "0 4px",
                                            fontSize: "9px",
                                            fontWeight: 600,
                                            lineHeight: 1,
                                        }}
                                    >
                                        {wishlistItems.length > 99 ? "99+" : wishlistItems.length}
                                    </span>
                                )}
                            </Link>
                            <Link
                                to="/cart"
                                className="relative p-1.5 flex items-center justify-center transition-colors hover:text-[#C9A96E]"
                                style={{ color: "#1b1c1a" }}
                                aria-label="Shopping Cart"
                                title="View Shopping Cart"
                            >
                                <ShoppingCart size={20} strokeWidth={1.75} />
                                {itemCount > 0 && (
                                    <span
                                        className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-white shadow-sm"
                                        style={{
                                            backgroundColor: "#C9A96E",
                                            minWidth: "16px",
                                            height: "16px",
                                            padding: "0 4px",
                                            fontSize: "9px",
                                            fontFamily: "'Inter', sans-serif",
                                            fontWeight: 600,
                                            lineHeight: 1,
                                        }}
                                    >
                                        {itemCount > 99 ? "99+" : itemCount}
                                    </span>
                                )}
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Nav;
