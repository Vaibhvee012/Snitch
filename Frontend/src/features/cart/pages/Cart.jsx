import { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useRazorpay } from "react-razorpay";
import { useCart } from "../hooks/useCart";

const tokens = {
    surface: "#fbf9f6",
    surfaceLow: "#f5f3f0",
    surfaceLowest: "#ffffff",
    surfaceHigh: "#eae8e5",
    surfaceHighest: "#e4e2df",
    onSurface: "#1b1c1a",
    onSurfaceVariant: "#4d463a",
    secondary: "#7A6E63",
    muted: "#B5ADA3",
    primary: "#C9A96E",
    primaryDark: "#745a27",
    primaryLight: "#f4ede2",
    outlineVariant: "#e2ded7",
    outline: "#7f7668",
    success: "#2e7d32",
    successBg: "#f0f6f0",
};

const Cart = () => {
    const cart = useSelector((state) => state.cart);
    const user = useSelector((state) => state.auth?.user || state.user);

    const {
        handleGetCart,
        handleIncrementCartItem,
        handleDecrementCartItem,
        handleRemoveCartItem,
        handleCreateCartOrder,
        handleVerifyCartOrder,
    } = useCart();

    const navigate = useNavigate();
    const { Razorpay } = useRazorpay();

    const [isLoading, setIsLoading] = useState(true);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [promoCode, setPromoCode] = useState("");
    const [appliedPromo, setAppliedPromo] = useState(null);
    const [promoError, setPromoError] = useState("");
    const [itemActionNotice, setItemActionNotice] = useState("");
    const [cartError, setCartError] = useState("");
    const [pendingItemIds, setPendingItemIds] = useState([]);

    useEffect(() => {
        let isMounted = true;
        handleGetCart()
            .catch((error) => {
                if (isMounted) {
                    setCartError(
                        error.response?.data?.message ||
                        error.message ||
                        "Could not load your cart. Please try again."
                    );
                }
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, [handleGetCart]);

    const formatCurrency = (amount, currency = "INR") => {
        const num = Number(amount || 0);
        return `${currency === "INR" ? "₹" : currency + " "}${num.toLocaleString("en-IN")}`;
    };

    // Calculate subtotal and shipping
    const items = cart?.items || [];

    const getItemVariant = (item) => {
        if (item?.variant && typeof item.variant === "object") {
            return item.variant;
        }

        const variantId = item?.variant;
        return item?.product?.variants?.find(
            (variant) => variant._id?.toString() === variantId?.toString()
        );
    };

    const getItemUnitPrice = (item) => {
        const variant = getItemVariant(item);
        if (variant?.price?.amount != null) {
            return Number(variant.price.amount);
        }
        if (item?.price?.amount != null) {
            return Number(item.price.amount);
        }
        if (typeof item?.price === "number") {
            return item.price;
        }
        if (item?.product?.price?.amount != null) {
            return Number(item.product.price.amount);
        }
        return 0;
    };

    const getItemCurrency = (item) => {
        return getItemVariant(item)?.price?.currency || item?.price?.currency || item?.product?.price?.currency || "INR";
    };

    const totalQuantity = items.reduce(
        (total, item) => total + (Number(item?.quantity) || 1),
        0
    );

    const subtotal = items.reduce((total, item) => {
        const price = getItemUnitPrice(item);
        const qty = Number(item?.quantity) || 1;
        return total + price * qty;
    }, 0);

    const freeShippingThreshold = 2000;
    const isFreeShipping = subtotal >= freeShippingThreshold || subtotal === 0;
    const shippingFee = isFreeShipping ? 0 : 150;

    const discountAmount = useMemo(() => {
        if (!appliedPromo) return 0;
        if (appliedPromo.type === "percent") {
            return Math.round((subtotal * appliedPromo.value) / 100);
        }
        return appliedPromo.value || 0;
    }, [appliedPromo, subtotal]);

    const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

    const handleApplyPromo = (e) => {
        e.preventDefault();
        setPromoError("");
        const code = promoCode.trim().toUpperCase();
        if (!code) return;

        if (code === "SNITCH10" || code === "ATELIER" || code === "FIRST10") {
            setAppliedPromo({
                code,
                value: 10,
                type: "percent",
                label: "10% Atelier Privilege Discount",
            });
            setPromoCode("");
        } else {
            setPromoError("Invalid privilege code. Try SNITCH10 for 10% off.");
        }
    };

    const handleRemovePromo = () => {
        setAppliedPromo(null);
        setPromoError("");
    };

    const handleCheckout = async () => {
        try {
            setIsCheckingOut(true);
            const order = await handleCreateCartOrder();

            if (!order || !order.id) {
                // If backend order creation isn't available, show informational notice
                alert("Order initiation completed. Proceeding to atelier fulfillment.");
                setIsCheckingOut(false);
                return;
            }

            const options = {
                key: "rzp_test_ShNSkpxt3emQVJ",
                amount: order.amount || finalTotal * 100,
                currency: order.currency || "INR",
                name: "Snitch Atelier",
                description: "Luxury Garment Acquisition",
                order_id: order.id,
                handler: async (response) => {
                    const isValid = await handleVerifyCartOrder(response);
                    if (isValid) {
                        navigate(`/order-success?order_id=${response.razorpay_order_id}`);
                    }
                },
                prefill: {
                    name: user?.fullname || user?.name || "Client",
                    email: user?.email || "",
                    contact: user?.contact || user?.phone || "",
                },
                theme: {
                    color: tokens.primary,
                },
            };

            const razorpayInstance = new Razorpay(options);
            razorpayInstance.open();
        } catch (error) {
            console.error("Checkout failed:", error);
            alert("Checkout could not be initialized. Please try again or contact Atelier Support.");
        } finally {
            setIsCheckingOut(false);
        }
    };

    const handleRemoveWithNotice = (itemId, title) => {
        runItemAction(itemId, async () => {
            await handleRemoveCartItem(itemId);
            setItemActionNotice(`Removed "${title || "Piece"}" from your selection.`);
            setTimeout(() => setItemActionNotice(""), 3500);
        });
    };

    const runItemAction = async (itemId, action) => {
        if (pendingItemIds.includes(itemId)) return;
        setPendingItemIds((current) => [...current, itemId]);
        setCartError("");
        try {
            await action();
        } catch (error) {
            setCartError(
                error.response?.data?.message ||
                error.message ||
                "Could not update your cart. Please try again."
            );
        } finally {
            setPendingItemIds((current) => current.filter((id) => id !== itemId));
        }
    };

    const handleRetryCart = () => {
        setIsLoading(true);
        setCartError("");
        handleGetCart()
            .catch((error) => {
                setCartError(
                    error.response?.data?.message ||
                    error.message ||
                    "Could not load your cart. Please try again."
                );
            })
            .finally(() => setIsLoading(false));
    };

    // Editorial Fallback Placeholder for items without images
    const renderFallbackImage = (title) => {
        const initial = title ? title.trim().charAt(0).toUpperCase() : "S";
        return (
            <div
                className="w-full h-full flex flex-col items-center justify-center p-3 select-none text-center relative overflow-hidden"
                style={{
                    backgroundColor: tokens.surfaceLow,
                    border: `1px solid ${tokens.outlineVariant}`,
                }}
            >
                <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(${tokens.onSurface} 1px, transparent 1px)`,
                        backgroundSize: "12px 12px",
                    }}
                />
                <div
                    className="w-12 h-12 rounded-full border flex items-center justify-center mb-2"
                    style={{
                        borderColor: tokens.primary,
                        color: tokens.primaryDark,
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "1.4rem",
                    }}
                >
                    {initial}
                </div>
                <span
                    className="text-[9px] tracking-[0.25em] uppercase font-medium"
                    style={{ color: tokens.secondary, fontFamily: "'Inter', sans-serif" }}
                >
                    Snitch.
                </span>
                <span
                    className="text-[7px] tracking-[0.2em] uppercase mt-0.5"
                    style={{ color: tokens.muted }}
                >
                    Atelier Piece
                </span>
            </div>
        );
    };

    if (isLoading && !items.length) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: tokens.surface, color: tokens.secondary }}
                role="status"
            >
                <p className="text-[11px] uppercase tracking-[0.25em] animate-pulse">
                    Retrieving your selection...
                </p>
            </div>
        );
    }

    if (cartError && !items.length) {
        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center"
                style={{ backgroundColor: tokens.surface, color: tokens.onSurface }}
                role="alert"
            >
                <p className="text-sm">{cartError}</p>
                <button
                    type="button"
                    onClick={handleRetryCart}
                    className="px-8 py-3 text-[10px] uppercase tracking-[0.2em]"
                    style={{ backgroundColor: tokens.onSurface, color: tokens.surface }}
                >
                    Retry
                </button>
                <Link to="/" className="text-[10px] uppercase tracking-[0.2em]" style={{ color: tokens.secondary }}>
                    Continue Shopping
                </Link>
            </div>
        );
    }

    // Empty Cart Presentation
    if (!items.length && !isLoading) {
        return (
            <>
                <link
                    href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap"
                    rel="stylesheet"
                />

                <div
                    className="min-h-screen flex flex-col selection:bg-[#C9A96E]/20"
                    style={{
                        backgroundColor: tokens.surface,
                        fontFamily: "'Inter', sans-serif",
                    }}
                >
                    {/* Header */}
                    <nav
                        className="px-6 md:px-16 lg:px-24 py-8 flex items-center justify-between"
                        style={{ borderBottom: `1px solid ${tokens.surfaceHighest}` }}
                    >
                        <Link
                            to="/"
                            className="text-lg font-light tracking-[0.35em] uppercase transition-opacity hover:opacity-80"
                            style={{
                                fontFamily: "'Cormorant Garamond', serif",
                                color: tokens.onSurface,
                            }}
                        >
                            Snitch<span style={{ color: tokens.primary }}>.</span>
                        </Link>

                        <Link
                            to="/"
                            className="text-[10px] uppercase tracking-[0.22em] font-medium transition-colors hover:text-[#1b1c1a]"
                            style={{ color: tokens.secondary }}
                        >
                            ← Return to Collection
                        </Link>
                    </nav>

                    {/* Empty Body */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-xl mx-auto">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                            style={{
                                backgroundColor: tokens.surfaceLow,
                                border: `1px solid ${tokens.outlineVariant}`,
                            }}
                        >
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={tokens.primary}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <path d="M16 10a4 4 0 0 1-8 0" />
                            </svg>
                        </div>

                        <p
                            className="text-[11px] uppercase tracking-[0.3em] font-medium mb-3"
                            style={{ color: tokens.primaryDark }}
                        >
                            Your Selection Is Empty
                        </p>

                        <h1
                            className="text-4xl md:text-5xl font-light leading-tight mb-4"
                            style={{
                                fontFamily: "'Cormorant Garamond', serif",
                                color: tokens.onSurface,
                            }}
                        >
                            Curate Your Wardrobe
                        </h1>

                        <p
                            className="text-xs md:text-sm font-light leading-relaxed mb-8 max-w-md"
                            style={{ color: tokens.secondary }}
                        >
                            Discover contemporary silhouettes crafted with refined materials, timeless tailoring, and understated luxury.
                        </p>

                        <Link
                            to="/"
                            className="px-10 py-4 text-[11px] uppercase tracking-[0.28em] font-medium transition-all duration-300 hover:shadow-lg"
                            style={{
                                backgroundColor: tokens.onSurface,
                                color: tokens.surface,
                            }}
                        >
                            Explore the Archive
                        </Link>

                        {/* Curated Links */}
                        <div className="mt-16 pt-8 w-full border-t flex flex-wrap items-center justify-center gap-6 text-[10px] uppercase tracking-[0.2em]"
                            style={{ borderColor: tokens.surfaceHighest, color: tokens.secondary }}>
                            <Link to="/products?category=denim" className="hover:text-black transition-colors">
                                Straight-Fit Denim
                            </Link>
                            <span>·</span>
                            <Link to="/products?category=shirts" className="hover:text-black transition-colors">
                                Atelier Shirts
                            </Link>
                            <span>·</span>
                            <Link to="/products?category=trousers" className="hover:text-black transition-colors">
                                Tailored Trousers
                            </Link>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <link
                href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap"
                rel="stylesheet"
            />

            <div
                className="min-h-screen selection:bg-[#C9A96E]/20"
                style={{
                    backgroundColor: tokens.surface,
                    fontFamily: "'Inter', sans-serif",
                }}
            >
                {/* Header Navigation */}
                <header
                    className="sticky top-0 z-30 px-6 md:px-16 lg:px-24 py-5 flex items-center justify-between backdrop-blur-md transition-all duration-300"
                    style={{
                        backgroundColor: "rgba(251, 249, 246, 0.92)",
                        borderBottom: `1px solid ${tokens.surfaceHighest}`,
                    }}
                >
                    <div className="flex items-center gap-6">
                        <Link
                            to="/"
                            className="text-xl font-light tracking-[0.35em] uppercase transition-opacity hover:opacity-80"
                            style={{
                                fontFamily: "'Cormorant Garamond', serif",
                                color: tokens.onSurface,
                            }}
                        >
                            Snitch<span style={{ color: tokens.primary }}>.</span>
                        </Link>

                        <div className="hidden sm:flex items-center gap-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: tokens.muted }}>
                            <span style={{ color: tokens.onSurface, fontWeight: 600 }}>01 Cart</span>
                            <span>→</span>
                            <span>02 Atelier Shipping</span>
                            <span>→</span>
                            <span>03 Payment</span>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate("/")}
                        className="text-[10px] uppercase tracking-[0.22em] font-medium transition-colors hover:text-[#1b1c1a]"
                        style={{ color: tokens.secondary }}
                    >
                        ← Return to Archive
                    </button>
                </header>

                {/* Notification toast */}
                {itemActionNotice && (
                    <div
                        className="fixed top-20 right-6 z-50 px-5 py-3 shadow-lg border text-xs tracking-wider uppercase font-medium transition-all"
                        style={{
                            backgroundColor: tokens.surfaceLowest,
                            borderColor: tokens.primary,
                            color: tokens.onSurface,
                        }}
                    >
                        {itemActionNotice}
                    </div>
                )}
                {cartError && (
                    <div
                        role="alert"
                        className="mx-6 mt-5 border px-4 py-3 text-xs sm:mx-12 lg:mx-16"
                        style={{
                            backgroundColor: "#fff7f5",
                            borderColor: "#e7b6ac",
                            color: "#8a2c1f",
                        }}
                    >
                        {cartError}
                    </div>
                )}

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-10 lg:py-16">
                    {/* Free shipping banner */}
                    <div
                        className="mb-10 p-4 border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
                        style={{
                            backgroundColor: isFreeShipping ? tokens.successBg : tokens.primaryLight,
                            borderColor: isFreeShipping ? "#c7dec7" : tokens.outlineVariant,
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <span
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                style={{ backgroundColor: isFreeShipping ? tokens.success : tokens.primaryDark }}
                            >
                                {isFreeShipping ? "✓" : "✦"}
                            </span>
                            <span
                                className="font-medium tracking-[0.06em]"
                                style={{ color: isFreeShipping ? tokens.success : tokens.primaryDark }}
                            >
                                {isFreeShipping
                                    ? "Complimentary Atelier Express Shipping unlocked for your order."
                                    : `Add ${formatCurrency(freeShippingThreshold - subtotal)} more to qualify for complimentary express shipping.`}
                            </span>
                        </div>

                        {!isFreeShipping && (
                            <div className="w-full sm:w-48 bg-white/70 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="h-full transition-all duration-500"
                                    style={{
                                        width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%`,
                                        backgroundColor: tokens.primaryDark,
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
                        {/* Cart Items List */}
                        <div className="w-full lg:w-[65%]">
                            <div className="flex items-baseline justify-between mb-8 pb-4 border-b" style={{ borderColor: tokens.surfaceHighest }}>
                                <div>
                                    <h1
                                        className="font-light leading-none mb-2"
                                        style={{
                                            fontFamily: "'Cormorant Garamond', serif",
                                            fontSize: "clamp(2rem, 4vw, 2.8rem)",
                                            color: tokens.onSurface,
                                        }}
                                    >
                                        Your Selection
                                    </h1>
                                    <p
                                        className="text-[10px] uppercase tracking-[0.25em] font-medium"
                                        style={{ color: tokens.secondary }}
                                    >
                                        {totalQuantity} {totalQuantity === 1 ? "Curated Piece" : "Curated Pieces"}
                                    </p>
                                </div>

                                <span
                                    className="text-[10px] uppercase tracking-[0.18em]"
                                    style={{ color: tokens.muted }}
                                >
                                    Prices in INR (GST Included)
                                </span>
                            </div>

                            {/* Item cards */}
                            <div className="flex flex-col gap-6">
                                {items.map((item, index) => {
                                    const itemId = item._id || `item-${index}`;
                                    const product = item.product || {};
                                    const variant = item.variant;
                                    const qty = Number(item.quantity) || 1;
                                    const unitPrice = getItemUnitPrice(item);
                                    const currency = getItemCurrency(item);
                                    const lineTotal = unitPrice * qty;

                                    // Extract variant details if available
                                    const variantId = typeof variant === "string" ? variant : variant?._id;
                                    const variantObj = getItemVariant(item);

                                    // Attributes dictionary
                                    const variantAttributes = variantObj?.attributes || {};
                                    const attributes =
                                        variantAttributes instanceof Map
                                            ? Object.fromEntries(variantAttributes)
                                            : typeof variantAttributes.toObject === "function"
                                                ? variantAttributes.toObject()
                                                : variantAttributes;
                                    const hasAttributes = Object.keys(attributes).length > 0;
                                    const stockStatus = variantObj?.stock === undefined || variantObj?.stock === null
                                        ? null
                                        : Number(variantObj.stock) > 0
                                            ? "In Stock"
                                            : "Out of Stock";

                                    // Product / variant image
                                    const imageUrl =
                                        variantObj?.images?.[0]?.url ||
                                        product?.images?.[0]?.url ||
                                        null;

                                    return (
                                        <article
                                            key={itemId}
                                            className="group p-6 sm:p-7 transition-all duration-300 relative border"
                                            style={{
                                                backgroundColor: tokens.surfaceLowest,
                                                borderColor: tokens.outlineVariant,
                                            }}
                                        >
                                            <div className="flex flex-col sm:flex-row gap-6">
                                                {/* Product Image */}
                                                <div
                                                    className="flex-shrink-0 overflow-hidden relative"
                                                    style={{
                                                        width: "clamp(110px, 20vw, 150px)",
                                                        aspectRatio: "3/4",
                                                        backgroundColor: tokens.surfaceLow,
                                                    }}
                                                >
                                                    {imageUrl ? (
                                                        <img
                                                            src={imageUrl}
                                                            alt={product.title || "Snitch Atelier Piece"}
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                            loading="lazy"
                                                            onError={(e) => {
                                                                e.target.style.display = "none";
                                                                if (e.target.nextSibling) {
                                                                    e.target.nextSibling.style.display = "flex";
                                                                }
                                                            }}
                                                        />
                                                    ) : null}

                                                    <div
                                                        style={{
                                                            display: imageUrl ? "none" : "flex",
                                                            width: "100%",
                                                            height: "100%",
                                                        }}
                                                    >
                                                        {renderFallbackImage(product.title)}
                                                    </div>
                                                </div>

                                                {/* Product Info & Actions */}
                                                <div className="flex-1 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div>
                                                                <h2
                                                                    className="font-light text-2xl mb-1 leading-snug transition-colors group-hover:text-[#C9A96E]"
                                                                    style={{
                                                                        fontFamily: "'Cormorant Garamond', serif",
                                                                        color: tokens.onSurface,
                                                                    }}
                                                                >
                                                                    {product.title || "Product unavailable"}
                                                                </h2>

                                                                <p
                                                                    className="text-[10px] uppercase tracking-[0.2em] font-medium mb-3"
                                                                    style={{ color: tokens.secondary }}
                                                                >
                                                                    Snitch Atelier Archive
                                                                </p>
                                                            </div>

                                                            {/* Line Total */}
                                                            <div className="text-right">
                                                                <p
                                                                    className="text-base font-medium tracking-[0.06em]"
                                                                    style={{ color: tokens.onSurface }}
                                                                >
                                                                    {formatCurrency(lineTotal, currency)}
                                                                </p>
                                                                <p
                                                                    className="text-[10px] tracking-wider"
                                                                    style={{ color: tokens.muted }}
                                                                >
                                                                    {formatCurrency(unitPrice, currency)} each
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Attributes / Variant Chips */}
                                                        <div className="flex flex-wrap items-center gap-2 mb-4">
                                                            {hasAttributes ? (
                                                                Object.entries(attributes).map(([attrKey, attrVal]) => (
                                                                    <span
                                                                        key={attrKey}
                                                                        className="px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] font-medium border"
                                                                        style={{
                                                                            borderColor: tokens.outlineVariant,
                                                                            backgroundColor: tokens.surfaceLow,
                                                                            color: tokens.onSurfaceVariant,
                                                                        }}
                                                                    >
                                                                        <span style={{ color: tokens.muted }}>{attrKey}: </span>
                                                                        {attrVal}
                                                                    </span>
                                                                ))
                                                            ) : variantId ? (
                                                                <span
                                                                    className="px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] font-medium border"
                                                                    style={{
                                                                        borderColor: tokens.outlineVariant,
                                                                        backgroundColor: tokens.surfaceLow,
                                                                        color: tokens.secondary,
                                                                    }}
                                                                >
                                                                    Edition: #{variantId.slice(-6).toUpperCase()}
                                                                </span>
                                                            ) : null}

                                                            {stockStatus && (
                                                                <span
                                                                    className="text-[9px] uppercase tracking-[0.18em] px-2 py-0.5"
                                                                    style={{
                                                                        color: stockStatus === "In Stock" ? tokens.success : "#8a2c1f",
                                                                        backgroundColor: stockStatus === "In Stock" ? tokens.successBg : "#fff0ed",
                                                                    }}
                                                                >
                                                                    {stockStatus}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Controls Bar: Quantity & Actions */}
                                                    <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-4" style={{ borderColor: tokens.surfaceHighest }}>
                                                        {/* Quantity pill */}
                                                        <div className="flex items-center">
                                                            <span className="text-[10px] uppercase tracking-[0.2em] mr-3 font-medium hidden sm:inline" style={{ color: tokens.secondary }}>
                                                                Quantity:
                                                            </span>
                                                            <div
                                                                className="flex items-center border"
                                                                style={{ borderColor: tokens.outlineVariant }}
                                                            >
                                                                <button
                                                                    onClick={() => runItemAction(item._id, () =>
                                                                        handleDecrementCartItem({
                                                                            itemId: item._id,
                                                                            currentQty: qty,
                                                                        })
                                                                    )}
                                                                    disabled={qty <= 1 || pendingItemIds.includes(item._id)}
                                                                    className="w-8 h-8 flex items-center justify-center text-sm font-light transition-colors hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                    style={{
                                                                        color: tokens.onSurface,
                                                                        borderRight: `1px solid ${tokens.outlineVariant}`,
                                                                    }}
                                                                    aria-label="Decrease quantity"
                                                                >
                                                                    −
                                                                </button>

                                                                <span
                                                                    className="w-10 text-center text-xs tracking-wider font-medium"
                                                                    style={{ color: tokens.onSurface }}
                                                                >
                                                                    {qty}
                                                                </span>

                                                                <button
                                                                    onClick={() => runItemAction(item._id, () =>
                                                                        handleIncrementCartItem({
                                                                            itemId: item._id,
                                                                            productId: product?._id,
                                                                            variantId,
                                                                            currentQty: qty,
                                                                        })
                                                                    )}
                                                                    disabled={pendingItemIds.includes(item._id)}
                                                                    className="w-8 h-8 flex items-center justify-center text-sm font-light transition-colors hover:bg-neutral-100"
                                                                    style={{
                                                                        color: tokens.onSurface,
                                                                        borderLeft: `1px solid ${tokens.outlineVariant}`,
                                                                    }}
                                                                    aria-label="Increase quantity"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Remove & Wishlist */}
                                                        <div className="flex items-center gap-5 text-[10px] uppercase tracking-[0.22em] font-medium">
                                                            <button
                                                                onClick={() => handleRemoveWithNotice(item._id, product.title)}
                                                                disabled={pendingItemIds.includes(item._id)}
                                                                className="transition-colors hover:text-black underline underline-offset-4"
                                                                style={{ color: tokens.secondary }}
                                                            >
                                                                Remove
                                                            </button>
            </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>

                            {/* Policies & Assurance Strip */}
                            <div
                                className="mt-12 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-left border"
                                style={{
                                    backgroundColor: tokens.surfaceLow,
                                    borderColor: tokens.outlineVariant,
                                }}
                            >
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.22em] font-medium mb-1" style={{ color: tokens.onSurface }}>
                                        ✦ Express Courier
                                    </p>
                                    <p className="text-xs leading-relaxed" style={{ color: tokens.secondary }}>
                                        Complimentary over INR 2,000. Dispatched within 24–48 hours in luxury protective packaging.
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.22em] font-medium mb-1" style={{ color: tokens.onSurface }}>
                                        ✦ 14-Day Atelier Returns
                                    </p>
                                    <p className="text-xs leading-relaxed" style={{ color: tokens.secondary }}>
                                        Complimentary doorstep pickup for size exchanges and returns on unworn items.
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.22em] font-medium mb-1" style={{ color: tokens.onSurface }}>
                                        ✦ Guaranteed Authenticity
                                    </p>
                                    <p className="text-xs leading-relaxed" style={{ color: tokens.secondary }}>
                                        Handcrafted from premium yarns and precision tailoring, verified before delivery.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Order Summary (Sticky) */}
                        <aside className="w-full lg:w-[35%] lg:sticky lg:top-24">
                            <div
                                className="p-8 border shadow-sm"
                                style={{
                                    backgroundColor: tokens.surfaceLowest,
                                    borderColor: tokens.outlineVariant,
                                }}
                            >
                                <h2
                                    className="font-light text-2xl pb-4 border-b mb-6"
                                    style={{
                                        fontFamily: "'Cormorant Garamond', serif",
                                        color: tokens.onSurface,
                                        borderColor: tokens.surfaceHighest,
                                    }}
                                >
                                    Order Summary
                                </h2>

                                {/* Breakdown Rows */}
                                <div className="flex flex-col gap-3.5 mb-6 text-xs">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: tokens.secondary }}>
                                            Subtotal ({totalQuantity} {totalQuantity === 1 ? "piece" : "pieces"})
                                        </span>
                                        <span className="font-medium tracking-wide" style={{ color: tokens.onSurface }}>
                                            {formatCurrency(subtotal)}
                                        </span>
                                    </div>

                                    {appliedPromo && (
                                        <div className="flex justify-between items-baseline text-green-700">
                                            <span className="text-[10px] uppercase tracking-[0.18em] flex items-center gap-1.5">
                                                <span>Privilege ({appliedPromo.code})</span>
                                                <button
                                                    onClick={handleRemovePromo}
                                                    className="text-[9px] underline text-red-500 hover:text-red-700"
                                                >
                                                    Remove
                                                </button>
                                            </span>
                                            <span className="font-medium tracking-wide">
                                                − {formatCurrency(discountAmount)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: tokens.secondary }}>
                                            Atelier Shipping
                                        </span>
                                        <span
                                            className="text-[10px] uppercase tracking-[0.12em] font-medium"
                                            style={{ color: isFreeShipping ? tokens.success : tokens.onSurface }}
                                        >
                                            {isFreeShipping ? "Complimentary" : formatCurrency(shippingFee)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: tokens.secondary }}>
                                            Taxes & GST (12%)
                                        </span>
                                        <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: tokens.muted }}>
                                            Included
                                        </span>
                                    </div>
                                </div>

                                {/* Promo Code Accordion / Input */}
                                <div className="mb-6 pt-5 border-t" style={{ borderColor: tokens.surfaceHighest }}>
                                    <form onSubmit={handleApplyPromo} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="PRIVILEGE CODE (e.g. SNITCH10)"
                                            value={promoCode}
                                            onChange={(e) => setPromoCode(e.target.value)}
                                            className="flex-1 px-3 py-2.5 text-[10px] uppercase tracking-[0.16em] border bg-transparent focus:outline-none focus:border-[#C9A96E]"
                                            style={{ borderColor: tokens.outlineVariant }}
                                        />
                                        <button
                                            type="submit"
                                            className="px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] font-medium transition-colors border"
                                            style={{
                                                backgroundColor: tokens.surfaceLow,
                                                borderColor: tokens.outlineVariant,
                                                color: tokens.onSurface,
                                            }}
                                        >
                                            Apply
                                        </button>
                                    </form>
                                    {promoError && (
                                        <p className="text-[10px] text-red-600 mt-2 tracking-wide">{promoError}</p>
                                    )}
                                </div>

                                {/* Final Total */}
                                <div
                                    className="py-5 border-t border-b mb-6 flex justify-between items-baseline"
                                    style={{ borderColor: tokens.surfaceHighest }}
                                >
                                    <div>
                                        <span className="text-[11px] uppercase tracking-[0.25em] font-medium block" style={{ color: tokens.onSurface }}>
                                            Estimated Total
                                        </span>
                                        <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color: tokens.muted }}>
                                            All taxes included
                                        </span>
                                    </div>

                                    <span
                                        className="text-2xl font-light tracking-[0.05em]"
                                        style={{
                                            fontFamily: "'Cormorant Garamond', serif",
                                            color: tokens.onSurface,
                                        }}
                                    >
                                        {formatCurrency(finalTotal)}
                                    </span>
                                </div>

                                {/* Checkout Buttons */}
                                <button
                                    id="proceed-checkout"
                                    onClick={handleCheckout}
                                    disabled={isCheckingOut || items.length === 0}
                                    className="w-full py-4 mb-3 text-[11px] uppercase tracking-[0.28em] font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90"
                                    style={{
                                        backgroundColor: tokens.onSurface,
                                        color: tokens.surface,
                                    }}
                                >
                                    {isCheckingOut ? (
                                        <span>Initialising Atelier Checkout...</span>
                                    ) : (
                                        <span>Proceed to Checkout</span>
                                    )}
                                </button>

                                <button
                                    id="continue-shopping"
                                    onClick={() => navigate("/")}
                                    className="w-full py-3.5 text-[10px] uppercase tracking-[0.25em] font-medium transition-all duration-300 border hover:bg-neutral-50"
                                    style={{
                                        borderColor: tokens.outlineVariant,
                                        color: tokens.secondary,
                                    }}
                                >
                                    Continue Shopping
                                </button>

                                {/* Payment Trust Badge */}
                                <div className="mt-6 pt-6 border-t text-center" style={{ borderColor: tokens.surfaceHighest }}>
                                    <div className="flex items-center justify-center gap-3 text-[9px] uppercase tracking-[0.2em] mb-2" style={{ color: tokens.muted }}>
                                        <span>UPI</span>
                                        <span>·</span>
                                        <span>Credit / Debit Cards</span>
                                        <span>·</span>
                                        <span>NetBanking</span>
                                    </div>
                                    <p className="text-[8px] uppercase tracking-[0.16em] flex items-center justify-center gap-1.5" style={{ color: tokens.muted }}>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                        256-Bit Encrypted Atelier Transaction
                                    </p>
                                </div>
                            </div>
                        </aside>
                    </div>
                </main>
c            </div>
        </>
    );
};

export default Cart;
