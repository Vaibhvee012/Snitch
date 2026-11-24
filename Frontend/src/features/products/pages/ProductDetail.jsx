
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProduct } from "../hooks/useProduct";
import { useCart } from "../../cart/hooks/useCart";
import WishlistHeart from "../../wishlist/components/WishlistHeart";

const ProductDetail = () => {
    const { productId } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [selectedImage, setSelectedImage] = useState(0);
    const [selectedAttributes, setSelectedAttributes] = useState({});
    const [loading, setLoading] = useState(true);
    const [addingToCart, setAddingToCart] = useState(false);

    const { handleGetProductById } = useProduct();
    const { handleAddItem } = useCart();

    // Normalize Mongoose Map or plain object
    const normalizeAttributes = (attributes) => {
        if (!attributes) return {};

        if (attributes instanceof Map) {
            return Object.fromEntries(attributes);
        }

        if (typeof attributes.toObject === "function") {
            return attributes.toObject();
        }

        return attributes;
    };

    // Fetch product details
    useEffect(() => {
        let isMounted = true;

        const fetchProductDetails = async () => {
            try {
                setLoading(true);

                const data = await handleGetProductById(productId);
                const fetchedProduct = data?.product || data;

                console.log("Buyer Product:", fetchedProduct);
                console.log("Buyer Variants:", fetchedProduct?.variants);

                if (isMounted) {
                    setProduct(fetchedProduct || null);
                }
            } catch (error) {
                console.error("Failed to fetch product details:", error);

                if (isMounted) {
                    setProduct(null);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (productId) {
            fetchProductDetails();
        } else {
            setProduct(null);
            setLoading(false);
        }

        return () => {
            isMounted = false;
        };
    }, [productId, handleGetProductById]);

    // Automatically select the first variant
    useEffect(() => {
        if (product?.variants?.length > 0) {
            const firstVariant = product.variants[0];

            setSelectedAttributes(
                normalizeAttributes(firstVariant.attributes)
            );
        } else {
            setSelectedAttributes({});
        }

        setSelectedImage(0);
    }, [product]);

    // Find selected variant
    const activeVariant = useMemo(() => {
        if (!product?.variants?.length) return null;

        return product.variants.find((variant) => {
            const attributes = normalizeAttributes(variant.attributes);

            const variantKeys = Object.keys(attributes);
            const selectedKeys = Object.keys(selectedAttributes);

            return (
                variantKeys.length === selectedKeys.length &&
                variantKeys.every(
                    (key) =>
                        String(attributes[key]) ===
                        String(selectedAttributes[key])
                )
            );
        }) || null;
    }, [product, selectedAttributes]);

    // Get all available attribute values
    const availableAttributes = useMemo(() => {
        if (!product?.variants?.length) return {};

        const attrs = {};

        product.variants.forEach((variant) => {
            const attributes = normalizeAttributes(variant.attributes);

            Object.entries(attributes).forEach(([key, value]) => {
                if (value === undefined || value === null || value === "") {
                    return;
                }

                if (!attrs[key]) {
                    attrs[key] = new Set();
                }

                attrs[key].add(String(value));
            });
        });

        const result = {};

        Object.keys(attrs).forEach((key) => {
            result[key] = Array.from(attrs[key]);
        });

        return result;
    }, [product]);

    // Change selected attribute
    const handleAttributeChange = (attrName, value) => {
        if (!product?.variants?.length) return;

        const newAttributes = {
            ...selectedAttributes,
            [attrName]: value,
        };

        // First check for an exact variant match
        const exactMatch = product.variants.find((variant) => {
            const attributes = normalizeAttributes(variant.attributes);

            const variantKeys = Object.keys(attributes);
            const selectedKeys = Object.keys(newAttributes);

            return (
                variantKeys.length === selectedKeys.length &&
                variantKeys.every(
                    (key) =>
                        String(attributes[key]) ===
                        String(newAttributes[key])
                )
            );
        });

        if (exactMatch) {
            setSelectedAttributes(
                normalizeAttributes(exactMatch.attributes)
            );
            return;
        }

        // Otherwise find a valid variant with the selected attribute
        const fallbackVariant = product.variants.find((variant) => {
            const attributes = normalizeAttributes(variant.attributes);

            return String(attributes[attrName]) === String(value);
        });

        if (fallbackVariant) {
            setSelectedAttributes(
                normalizeAttributes(fallbackVariant.attributes)
            );
        }
    };

    // Reset image when variant changes
    useEffect(() => {
        setSelectedImage(0);
    }, [activeVariant]);

    // Loading state
    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundColor: "#fbf9f6" }}
            >
                <p
                    className="text-[10px] uppercase tracking-[0.2em] font-medium animate-pulse"
                    style={{
                        fontFamily: "'Inter', sans-serif",
                        color: "#B5ADA3",
                    }}
                >
                    Retrieving piece...
                </p>
            </div>
        );
    }

    // Product not found
    if (!product) {
        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center gap-4"
                style={{ backgroundColor: "#fbf9f6" }}
            >
                <p className="text-sm text-gray-600">
                    Product not found.
                </p>

                <button
                    onClick={() => navigate("/")}
                    className="px-6 py-3 text-xs uppercase tracking-widest bg-black text-white"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    // Product images
    const displayImages =
        activeVariant?.images?.length > 0
            ? activeVariant.images
            : product.images?.length > 0
                ? product.images
                : [{ url: "/snitch_editorial_warm.png" }];

    // Product price
    const displayPrice =
        activeVariant?.price?.amount !== undefined
            ? activeVariant.price
            : product.price;

    // Add product to cart
    const handleAddToCart = async () => {
        if (addingToCart) return;

        const currentProductId = product?._id || product?.id;
        const currentVariantId = activeVariant?._id || activeVariant?.id;

        if (!currentProductId) {
            alert("Product information is unavailable.");
            return;
        }

        if (!activeVariant || !currentVariantId) {
            alert("Please select a valid product variant.");
            return;
        }

        if (Number(activeVariant.stock) <= 0) {
            alert("This variant is currently out of stock.");
            return;
        }

        try {
            setAddingToCart(true);

            const response = await handleAddItem({
                productId: currentProductId,
                variantId: currentVariantId,
            });

            console.log("Item added to cart:", response);

            alert("Product added to cart successfully!");
        } catch (error) {
            console.error(
                "Add to cart failed:",
                error.response?.data || error.message
            );

            alert(
                error.response?.data?.message ||
                error.message ||
                "Failed to add product to cart."
            );
        } finally {
            setAddingToCart(false);
        }
    };

    return (
        <>
            <link
                href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap"
                rel="stylesheet"
            />

            <div
                className="min-h-screen selection:bg-[#C9A96E]/30 pb-24"
                style={{
                    backgroundColor: "#fbf9f6",
                    fontFamily: "'Inter', sans-serif",
                }}
            >
                <div className="max-w-7xl mx-auto px-8 lg:px-16 xl:px-24 pt-12 lg:pt-20">
                    <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">

                        {/* LEFT: Image Gallery */}
                        <div className="w-full lg:w-[70%] flex flex-col-reverse md:flex-row gap-4 lg:gap-6">

                            {displayImages.length > 1 && (
                                <div className="flex flex-row md:flex-col gap-4 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 scrollbar-hide w-full md:w-20 lg:w-24 flex-shrink-0 md:max-h-[calc(100vh-200px)]">
                                    {displayImages.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedImage(idx)}
                                            className={`flex-shrink-0 w-20 md:w-full aspect-[4/5] overflow-hidden transition-all duration-300 ${
                                                selectedImage === idx
                                                    ? "opacity-100 ring-1 ring-[#C9A96E] ring-offset-2"
                                                    : "opacity-50 hover:opacity-100"
                                            }`}
                                            style={{
                                                backgroundColor: "#f5f3f0",
                                                "--tw-ring-offset-color": "#fbf9f6",
                                            }}
                                        >
                                            <img
                                                src={img.url}
                                                alt={`View ${idx + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Main Image */}
                            <div
                                className="relative w-full aspect-[4/5] overflow-hidden group"
                                style={{ backgroundColor: "#f5f3f0" }}
                            >
                                <div className="absolute top-4 right-4 z-20 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                                    <WishlistHeart
                                        product={product}
                                        size="lg"
                                    />
                                </div>
                                <img
                                    src={
                                        displayImages[selectedImage]?.url ||
                                        displayImages[0].url
                                    }
                                    alt={product.title}
                                    className="w-full h-full object-cover transition-opacity duration-500"
                                />

                                {displayImages.length > 1 && (
                                    <>
                                        <button
                                            onClick={() =>
                                                setSelectedImage((prev) =>
                                                    prev === 0
                                                        ? displayImages.length - 1
                                                        : prev - 1
                                                )
                                            }
                                            className="absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 border"
                                            style={{
                                                backgroundColor: "rgba(251,249,246,0.8)",
                                                borderColor: "#e4e2df",
                                                color: "#1b1c1a",
                                            }}
                                            aria-label="Previous image"
                                        >
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="1.2"
                                                    d="M15 19l-7-7 7-7"
                                                />
                                            </svg>
                                        </button>

                                        <button
                                            onClick={() =>
                                                setSelectedImage((prev) =>
                                                    prev === displayImages.length - 1
                                                        ? 0
                                                        : prev + 1
                                                )
                                            }
                                            className="absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 border"
                                            style={{
                                                backgroundColor: "rgba(251,249,246,0.8)",
                                                borderColor: "#e4e2df",
                                                color: "#1b1c1a",
                                            }}
                                            aria-label="Next image"
                                        >
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="1.2"
                                                    d="M9 5l7 7-7 7"
                                                />
                                            </svg>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Product Details */}
                        <div className="w-full lg:w-[30%] lg:sticky lg:top-24 flex flex-col pt-4">

                            <h1
                                className="text-4xl md:text-5xl lg:text-6xl font-light leading-[1.05] mb-6"
                                style={{
                                    fontFamily: "'Cormorant Garamond', serif",
                                    color: "#1b1c1a",
                                }}
                            >
                                {product.title}
                            </h1>

                            {/* Price */}
                            <div className="mb-8">
                                <span
                                    className="text-sm uppercase tracking-[0.2em] font-medium"
                                    style={{ color: "#1b1c1a" }}
                                >
                                    {displayPrice?.currency}{" "}
                                    {Number(displayPrice?.amount || 0).toLocaleString("en-IN")}
                                </span>
                            </div>

                            <div
                                className="h-px w-full mb-8"
                                style={{ backgroundColor: "#e4e2df" }}
                            />

                            {/* Options / Variants */}
                            {Object.entries(availableAttributes).map(
                                ([attrName, values]) => (
                                    <div key={attrName} className="mb-6">
                                        <h3
                                            className="text-[10px] uppercase tracking-[0.24em] font-medium mb-3"
                                            style={{ color: "#C9A96E" }}
                                        >
                                            {attrName}
                                        </h3>

                                        <div className="flex flex-wrap gap-2">
                                            {values.map((val) => {
                                                const isSelected =
                                                    String(selectedAttributes[attrName]) === val;

                                                return (
                                                    <button
                                                        key={val}
                                                        onClick={() =>
                                                            handleAttributeChange(attrName, val)
                                                        }
                                                        className={`px-4 py-2 text-[11px] uppercase tracking-[0.15em] font-medium transition-all duration-300 border ${
                                                            isSelected
                                                                ? "border-[#1b1c1a] bg-[#1b1c1a] text-[#fbf9f6]"
                                                                : "border-[#d0c5b5] text-[#1b1c1a] hover:border-[#1b1c1a]"
                                                        }`}
                                                        style={
                                                            isSelected
                                                                ? {}
                                                                : { backgroundColor: "transparent" }
                                                        }
                                                    >
                                                        {val}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            )}

                            {/* No variants */}
                            {product.variants?.length === 0 && (
                                <p className="mb-6 text-xs text-gray-500">
                                    No variants are currently available.
                                </p>
                            )}

                            {/* Stock Information */}
                            {activeVariant && (
                                <div className="mb-6">
                                    <span
                                        className={`text-[10px] uppercase tracking-[0.2em] font-medium ${
                                            Number(activeVariant.stock) > 0
                                                ? "text-green-700"
                                                : "text-red-700"
                                        }`}
                                    >
                                        {Number(activeVariant.stock) > 0
                                            ? `${activeVariant.stock} in stock`
                                            : "Out of stock"}
                                    </span>
                                </div>
                            )}

                            {/* Description */}
                            <div className="mb-12">
                                <h3
                                    className="text-[10px] uppercase tracking-[0.24em] font-medium mb-4"
                                    style={{ color: "#C9A96E" }}
                                >
                                    The Details
                                </h3>

                                <p
                                    className="text-sm leading-relaxed"
                                    style={{ color: "#7A6E63" }}
                                >
                                    {product.description}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-4 mt-auto">
                                <button
                                    className="w-full py-4 text-[11px] uppercase tracking-[0.25em] font-medium transition-all duration-300 disabled:opacity-50"
                                    style={{
                                        backgroundColor: "#1b1c1a",
                                        color: "#fbf9f6",
                                        fontFamily: "'Inter', sans-serif",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!addingToCart) {
                                            e.currentTarget.style.backgroundColor = "#C9A96E";
                                            e.currentTarget.style.color = "#1b1c1a";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#1b1c1a";
                                        e.currentTarget.style.color = "#fbf9f6";
                                    }}
                                    onClick={handleAddToCart}
                                    disabled={addingToCart || !activeVariant || Number(activeVariant.stock) <= 0}
                                >
                                    {addingToCart
                                        ? "Adding..."
                                        : !activeVariant
                                            ? "Select a Variant"
                                            : Number(activeVariant.stock) <= 0
                                                ? "Out of Stock"
                                                : "Add to Cart"}
                                </button>

                                <button
                                    className="w-full py-4 text-[11px] uppercase tracking-[0.25em] font-medium transition-all duration-300 border"
                                    style={{
                                        backgroundColor: "transparent",
                                        borderColor: "#d0c5b5",
                                        color: "#1b1c1a",
                                        fontFamily: "'Inter', sans-serif",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "#C9A96E";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "#d0c5b5";
                                    }}
                                >
                                    Buy Now
                                </button>
                            </div>

                            {/* Extra Details */}
                            <div
                                className="mt-14 space-y-4 text-[10px] uppercase tracking-[0.1em]"
                                style={{ color: "#B5ADA3" }}
                            >
                                <div
                                    className="flex justify-between border-b pb-3"
                                    style={{ borderColor: "#e4e2df" }}
                                >
                                    <span>Shipping</span>
                                    <span>Complimentary over INR 15,000</span>
                                </div>

                                <div
                                    className="flex justify-between border-b pb-3"
                                    style={{ borderColor: "#e4e2df" }}
                                >
                                    <span>Returns</span>
                                    <span>Within 14 days of delivery</span>
                                </div>

                                <div
                                    className="flex justify-between border-b pb-3"
                                    style={{ borderColor: "#e4e2df" }}
                                >
                                    <span>Authenticity</span>
                                    <span>100% Guaranteed</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProductDetail;
