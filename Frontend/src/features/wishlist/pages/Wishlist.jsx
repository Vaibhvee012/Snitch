import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useWishlist } from "../hooks/useWishlist";
import { useCart } from "../../cart/hooks/useCart";

const Wishlist = () => {
    const { items, loading, error } = useSelector((state) => state.wishlist);
    const {
        handleGetWishlist,
        handleRemoveFromWishlist,
        handleClearWishlist,
    } = useWishlist();
    const { handleAddItem } = useCart();
    const [selectedVariants, setSelectedVariants] = useState({});
    const [pendingId, setPendingId] = useState(null);
    const [notice, setNotice] = useState("");

    useEffect(() => {
        handleGetWishlist().catch(() => {});
    }, [handleGetWishlist]);

    const normalizeAttributes = (attributes) => {
        if (!attributes) return {};
        if (typeof attributes.toObject === "function") return attributes.toObject();
        if (typeof attributes === "object" && !Array.isArray(attributes)) {
            return Object.fromEntries(Object.entries(attributes));
        }
        return {};
    };

    const getVariantId = (product) =>
        selectedVariants[product._id] ||
        (product.variants?.length === 1 ? product.variants[0]._id : "");

    const getDisplayVariant = (product) => {
        const variantId = getVariantId(product);
        return product.variants?.find((variant) => variant._id === variantId);
    };

    const getPrice = (product) => {
        const variant = getDisplayVariant(product);
        const price = variant?.price || product.price;
        return price;
    };

    const removeItem = async (productId) => {
        setPendingId(productId);
        try {
            await handleRemoveFromWishlist(productId);
            setNotice("Product removed from wishlist");
        } catch (requestError) {
            setNotice(requestError.response?.data?.message || "Could not remove product");
        } finally {
            setPendingId(null);
            setTimeout(() => setNotice(""), 2500);
        }
    };

    const moveToCart = async (product) => {
        const productId = product._id || product.id;
        const variantId = getVariantId(product);

        if (!product.variants?.length) {
            setNotice("This product has no available variant");
            setTimeout(() => setNotice(""), 2500);
            return;
        }

        if (product.variants?.length > 0 && !variantId) {
            setNotice("Please select an available variant");
            setTimeout(() => setNotice(""), 2500);
            return;
        }

        setPendingId(productId);
        try {
            await handleAddItem({
                productId,
                variantId,
                quantity: 1,
            });
            setNotice("Added to cart");
        } catch (requestError) {
            setNotice(requestError.response?.data?.message || "Could not add product to cart");
        } finally {
            setPendingId(null);
            setTimeout(() => setNotice(""), 2500);
        }
    };

    const clearAll = async () => {
        setPendingId("clear");
        try {
            await handleClearWishlist();
            setNotice("Wishlist cleared");
        } catch (requestError) {
            setNotice(requestError.response?.data?.message || "Could not clear wishlist");
        } finally {
            setPendingId(null);
            setTimeout(() => setNotice(""), 2500);
        }
    };

    const availableCount = useMemo(
        () => items.filter((product) => {
            if (!product.variants?.length) return true;
            return product.variants.some((variant) => Number(variant.stock) > 0);
        }).length,
        [items]
    );

    if (loading) {
        return (
            <div className="min-h-[70vh] max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-16">
                <div className="h-10 w-64 mb-10 animate-pulse" style={{ backgroundColor: "#edeae4" }} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map((key) => (
                        <div key={key} className="animate-pulse">
                            <div className="aspect-[4/5] mb-5" style={{ backgroundColor: "#edeae4" }} />
                            <div className="h-5 w-2/3 mb-3" style={{ backgroundColor: "#edeae4" }} />
                            <div className="h-4 w-1/3" style={{ backgroundColor: "#edeae4" }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-5 px-6 text-center">
                <p className="text-sm" style={{ color: "#8a2c1f" }}>{error}</p>
                <button
                    type="button"
                    onClick={() => handleGetWishlist().catch(() => {})}
                    className="px-8 py-3 text-[10px] uppercase tracking-[0.2em] text-white"
                    style={{ backgroundColor: "#1b1c1a" }}
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!items.length) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
                <div
                    className="w-16 h-16 rounded-full border flex items-center justify-center mb-6"
                    style={{ borderColor: "#e4e2df", color: "#C9A96E" }}
                >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                </div>
                <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#745a27" }}>
                    Your Wishlist
                </p>
                <h1 className="text-4xl md:text-5xl font-light mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    Save Pieces You Love
                </h1>
                <p className="text-sm max-w-md mb-8" style={{ color: "#7A6E63" }}>
                    Your saved collection is empty. Explore the archive and keep your favourite pieces close.
                </p>
                <Link
                    to="/"
                    className="px-10 py-4 text-[11px] uppercase tracking-[0.25em] text-white"
                    style={{ backgroundColor: "#1b1c1a" }}
                >
                    Continue Shopping
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-[70vh] max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-12 md:py-16">
            {notice && (
                <div
                    role="status"
                    className="fixed top-20 right-6 z-50 px-5 py-3 border text-xs uppercase tracking-[0.12em] shadow-md"
                    style={{ backgroundColor: "#fbf9f6", borderColor: "#C9A96E", color: "#1b1c1a" }}
                >
                    {notice}
                </div>
            )}

            <div className="flex items-end justify-between gap-4 pb-6 mb-8 border-b" style={{ borderColor: "#e4e2df" }}>
                <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] mb-2" style={{ color: "#745a27" }}>
                        {availableCount} available
                    </p>
                    <h1 className="text-4xl md:text-5xl font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        Your Wishlist
                    </h1>
                </div>
                <button
                    type="button"
                    onClick={clearAll}
                    disabled={pendingId === "clear"}
                    className="text-[10px] uppercase tracking-[0.18em] underline underline-offset-4 disabled:opacity-50"
                    style={{ color: "#7A6E63" }}
                >
                    Clear all
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                {items.map((product) => {
                    const productId = product._id || product.id;
                    const variant = getDisplayVariant(product);
                    const price = getPrice(product);
                    const inStock = !product.variants?.length ||
                        product.variants.some((item) => Number(item.stock) > 0);
                    const imageUrl =
                        variant?.images?.[0]?.url ||
                        product.images?.[0]?.url ||
                        null;
                    const attributes = normalizeAttributes(variant?.attributes);

                    return (
                        <article key={productId} className="group">
                            <Link
                                to={`/products/${productId}`}
                                className="block aspect-[4/5] overflow-hidden mb-5 relative"
                                style={{ backgroundColor: "#f5f3f0" }}
                            >
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt={product.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-5xl" style={{ color: "#C9A96E" }}>
                                        {product.title?.charAt(0) || "S"}
                                    </div>
                                )}
                            </Link>

                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2
                                        className="text-xl leading-snug mb-1"
                                        style={{ fontFamily: "'Cormorant Garamond', serif", color: "#1b1c1a" }}
                                    >
                                        {product.title}
                                    </h2>
                                    <p className="text-[11px] mb-3" style={{ color: "#7A6E63" }}>
                                        {price?.currency || "INR"} {Number(price?.amount || 0).toLocaleString("en-IN")}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeItem(productId)}
                                    disabled={pendingId === productId}
                                    className="text-[9px] uppercase tracking-[0.15em] underline underline-offset-4 disabled:opacity-50"
                                    style={{ color: "#7A6E63" }}
                                >
                                    Remove
                                </button>
                            </div>

                            {product.variants?.length > 0 && (
                                <div className="mb-4">
                                    <label className="block text-[9px] uppercase tracking-[0.15em] mb-2" style={{ color: "#7A6E63" }}>
                                        Select variant
                                    </label>
                                    <select
                                        value={getVariantId(product)}
                                        onChange={(event) =>
                                            setSelectedVariants((current) => ({
                                                ...current,
                                                [productId]: event.target.value,
                                            }))
                                        }
                                        className="w-full px-3 py-2.5 text-xs border bg-transparent"
                                        style={{ borderColor: "#e4e2df", color: "#1b1c1a" }}
                                    >
                                        <option value="">Choose variant</option>
                                        {product.variants.map((item) => (
                                            <option
                                                key={item._id}
                                                value={item._id}
                                                disabled={Number(item.stock) <= 0}
                                            >
                                                {Object.entries(normalizeAttributes(item.attributes))
                                                    .map(([key, value]) => `${key}: ${value}`)
                                                    .join(", ") || `Edition ${item._id.slice(-6)}`}
                                                {Number(item.stock) <= 0 ? " - Out of stock" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {Object.keys(attributes).length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {Object.entries(attributes).map(([key, value]) => (
                                        <span
                                            key={key}
                                            className="px-2 py-1 text-[9px] uppercase border"
                                            style={{ borderColor: "#e4e2df", color: "#7A6E63" }}
                                        >
                                            {key}: {value}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-3">
                                <span
                                    className="text-[9px] uppercase tracking-[0.15em]"
                                    style={{ color: inStock ? "#2e7d32" : "#8a2c1f" }}
                                >
                                    {inStock ? "In Stock" : "Out of Stock"}
                                </span>
                                <div className="flex gap-2">
                                    <Link
                                        to={`/products/${productId}`}
                                        className="px-4 py-3 text-[9px] uppercase tracking-[0.15em] border"
                                        style={{ borderColor: "#e4e2df", color: "#1b1c1a" }}
                                    >
                                        View
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => moveToCart(product)}
                                        disabled={!inStock || pendingId === productId}
                                        className="px-4 py-3 text-[9px] uppercase tracking-[0.15em] text-white disabled:opacity-50"
                                        style={{ backgroundColor: "#1b1c1a" }}
                                    >
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
};

export default Wishlist;
