import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from "react-router-dom";
import { useProduct } from '../hooks/useProduct';

// Helper to normalize attributes to a plain object
const normalizeAttributes = (attr) => {
    if (!attr) return {};
    if (typeof attr === "object" && !Array.isArray(attr)) {
        return attr;
    }
    if (Array.isArray(attr)) {
        const obj = {};
        attr.forEach((item) => {
            if (item && typeof item === "object") {
                if ("key" in item && "value" in item) {
                    if (item.key) obj[item.key] = item.value;
                } else {
                    Object.assign(obj, item);
                }
            }
        });
        return obj;
    }
    return {};
};

// Check local storage for variants in case seller added them locally
const loadLocalVariants = (id) => {
    try {
        const raw = localStorage.getItem(`snitch_variants_${id}`);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map(v => ({
                    ...v,
                    attributes: normalizeAttributes(v.attributes)
                }));
            }
        }
    } catch (e) {
        // ignore
    }
    return null;
};

const ProductDetail = () => {
    const { productId } = useParams();
    const navigate = useNavigate();
    const { handleGetProductById } = useProduct();

    const [ product, setProduct ] = useState(null);
    const [ isLoading, setIsLoading ] = useState(true);
    const [ error, setError ] = useState("");
    const [ selectedImage, setSelectedImage ] = useState(0);
    const [ selectedAttributes, setSelectedAttributes ] = useState({});
    const [ addedToast, setAddedToast ] = useState(false);

    async function fetchProductDetails() {
        if (!productId) {
            setError("No product ID specified in URL.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const data = await handleGetProductById(productId);
            const resolved = data?.product || data;
            if (resolved && (resolved._id || resolved.title)) {
                const localVars = loadLocalVariants(productId);
                const rawVariants = (resolved.variants && resolved.variants.length > 0)
                    ? resolved.variants
                    : (localVars || []);

                const normalizedVariants = rawVariants.map(v => ({
                    ...v,
                    attributes: normalizeAttributes(v.attributes)
                }));

                setProduct({
                    ...resolved,
                    variants: normalizedVariants
                });
            } else {
                setError("Product could not be found.");
            }
        } catch (err) {
            console.error("Failed to fetch product details:", err);
            const localVars = loadLocalVariants(productId);
            if (localVars) {
                setProduct({
                    _id: productId,
                    title: "Product Showcase",
                    description: "",
                    price: { amount: "1499", currency: "INR" },
                    images: [],
                    variants: localVars
                });
            } else {
                setError(err.response?.data?.message || err.message || "Failed to load product details.");
            }
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        fetchProductDetails();
    }, [ productId ]);

    // When product or variants load, initialize selectedAttributes with the first variant
    useEffect(() => {
        if (product?.variants && product.variants.length > 0) {
            const firstVariantAttrs = normalizeAttributes(product.variants[0].attributes);
            setSelectedAttributes(firstVariantAttrs);
        } else {
            setSelectedAttributes({});
        }
    }, [ product ]);

    // Find the currently active variant that matches the selected attributes combination
    const activeVariant = useMemo(() => {
        if (!product?.variants || product.variants.length === 0) return null;
        const sKeys = Object.keys(selectedAttributes);
        if (sKeys.length === 0) return product.variants[0];

        // Find exact match
        const exactMatch = product.variants.find(v => {
            const vAttrs = normalizeAttributes(v.attributes);
            const vKeys = Object.keys(vAttrs);
            if (vKeys.length !== sKeys.length) return false;
            return sKeys.every(k => String(vAttrs[k]) === String(selectedAttributes[k]));
        });

        if (exactMatch) return exactMatch;

        // Partial / best match fallback
        return product.variants.find(v => {
            const vAttrs = normalizeAttributes(v.attributes);
            return sKeys.some(k => String(vAttrs[k]) === String(selectedAttributes[k]));
        }) || product.variants[0];
    }, [ product, selectedAttributes ]);

    // Compute all available attributes and their possible values across all variants
    const availableAttributes = useMemo(() => {
        if (!product?.variants || product.variants.length === 0) return {};
        const attrs = {};
        product.variants.forEach(variant => {
            const vAttrs = normalizeAttributes(variant.attributes);
            Object.entries(vAttrs).forEach(([ key, value ]) => {
                if (key && value !== undefined && value !== null && value !== "") {
                    if (!attrs[ key ]) attrs[ key ] = new Set();
                    attrs[ key ].add(String(value));
                }
            });
        });

        const result = {};
        Object.keys(attrs).forEach(key => {
            result[ key ] = Array.from(attrs[ key ]);
        });
        return result;
    }, [ product ]);

    // Fallback: If value is not available in variant, use the main product value instead
    // 1. Images: variant images -> product images -> placeholder
    const displayImages = useMemo(() => {
        if (activeVariant?.images && Array.isArray(activeVariant.images) && activeVariant.images.length > 0) {
            return activeVariant.images;
        }
        if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
            return product.images;
        }
        return [ { url: '/snitch_editorial_warm.png' } ];
    }, [ activeVariant, product ]);

    // 2. Price: variant price -> product price
    const displayPrice = useMemo(() => {
        const vPrice = activeVariant?.price;
        const vAmount = (vPrice?.amount !== undefined && vPrice?.amount !== null && vPrice?.amount !== "")
            ? vPrice.amount
            : null;

        if (vAmount !== null) {
            return {
                amount: Number(vAmount),
                currency: vPrice?.currency || product?.price?.currency || "INR",
            };
        }
        return {
            amount: Number(product?.price?.amount || 0),
            currency: product?.price?.currency || "INR",
        };
    }, [ activeVariant, product ]);

    // 3. Title & Description
    const displayTitle = activeVariant?.title || product?.title || "";
    const displayDescription = activeVariant?.description || product?.description || "";

    // 4. Stock determination
    const isOutOfStock = useMemo(() => {
        if (!product) return false;
        if (product.variants && product.variants.length > 0) {
            if (!activeVariant) return true;
            if (activeVariant.stock !== undefined && activeVariant.stock !== null) {
                return Number(activeVariant.stock) <= 0;
            }
        }
        return false;
    }, [ product, activeVariant ]);

    // Reset main image preview when active variant changes
    useEffect(() => {
        setSelectedImage(0);
    }, [ activeVariant ]);

    // Handle user clicking an attribute value (e.g. Size 32 or Color Blue)
    const handleAttributeChange = (attrName, value) => {
        const nextAttrs = { ...selectedAttributes, [ attrName ]: value };

        if (!product?.variants || product.variants.length === 0) {
            setSelectedAttributes(nextAttrs);
            return;
        }

        // 1. Try to find an exact matching variant with this updated combination
        const exactMatch = product.variants.find(v => {
            const vAttrs = normalizeAttributes(v.attributes);
            const vKeys = Object.keys(vAttrs);
            const nextKeys = Object.keys(nextAttrs);
            return nextKeys.every(k => String(vAttrs[k]) === String(nextAttrs[k])) &&
                   vKeys.every(k => String(nextAttrs[k]) === String(vAttrs[k]));
        });

        if (exactMatch) {
            setSelectedAttributes(normalizeAttributes(exactMatch.attributes));
            return;
        }

        // 2. If no exact combination, find candidate variants that have this selected attribute
        // and pick the one with the highest attribute overlap
        const candidates = product.variants.filter(v => {
            const vAttrs = normalizeAttributes(v.attributes);
            return String(vAttrs[attrName]) === String(value);
        });

        if (candidates.length > 0) {
            let bestCandidate = candidates[0];
            let maxOverlap = -1;

            candidates.forEach(cand => {
                const candAttrs = normalizeAttributes(cand.attributes);
                let overlap = 0;
                Object.entries(nextAttrs).forEach(([k, val]) => {
                    if (candAttrs[k] !== undefined && String(candAttrs[k]) === String(val)) {
                        overlap++;
                    }
                });
                if (overlap > maxOverlap) {
                    maxOverlap = overlap;
                    bestCandidate = cand;
                }
            });

            setSelectedAttributes(normalizeAttributes(bestCandidate.attributes));
            return;
        }

        // Fallback
        setSelectedAttributes(nextAttrs);
    };

    const handleAddToCart = () => {
        if (isOutOfStock) return;
        setAddedToast(true);
        setTimeout(() => setAddedToast(false), 3000);
        console.log("Selected product:", product._id);
        console.log("Selected variant:", activeVariant?._id || "main");
        console.log("Attributes:", activeVariant ? normalizeAttributes(activeVariant.attributes) : selectedAttributes);
        console.log("Price:", displayPrice);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center selection:bg-[#C9A96E]/30" style={{ backgroundColor: '#fbf9f6' }}>
                <p style={{ fontFamily: "'Inter', sans-serif", color: '#B5ADA3' }} className="text-[10px] uppercase tracking-[0.2em] font-medium animate-pulse">
                    Retrieving piece...
                </p>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: '#fbf9f6', fontFamily: "'Inter', sans-serif" }}>
                <h2 className="text-3xl font-light text-[#1b1c1a] mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    Piece Unavailable
                </h2>
                <p className="text-sm text-[#7A6E63] max-w-md mb-6">{error || "Product not found."}</p>
                <div className="flex gap-4">
                    <button
                        onClick={fetchProductDetails}
                        className="px-6 py-3 bg-[#1b1c1a] text-[#fbf9f6] text-[11px] uppercase tracking-[0.2em] font-medium hover:bg-[#C9A96E] hover:text-[#1b1c1a] transition-all"
                    >
                        Retry
                    </button>
                    <Link
                        to="/"
                        className="px-6 py-3 border border-[#ede9e3] text-[#1b1c1a] text-[11px] uppercase tracking-[0.2em] font-medium hover:border-[#1b1c1a] transition-all"
                    >
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Google Fonts */}
            <link
                href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap"
                rel="stylesheet"
            />

            <div
                className="min-h-screen selection:bg-[#C9A96E]/30 pb-24"
                style={{ backgroundColor: '#fbf9f6', fontFamily: "'Inter', sans-serif" }}
            >
                {/* Floating Feedback Toast */}
                {addedToast && (
                    <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-5 py-3 shadow-xl bg-[#1b1c1a] text-[#fbf9f6] border border-[#C9A96E] text-xs tracking-wider uppercase font-medium animate-in fade-in slide-in-from-bottom-2">
                        <span className="w-2 h-2 rounded-full bg-[#C9A96E]" />
                        <span>Added to your bag</span>
                    </div>
                )}

                <div className="max-w-7xl mx-auto px-8 lg:px-16 xl:px-24 pt-12 lg:pt-20">
                    <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-start">

                        {/* ── LEFT: Image Gallery (Uses variant images or falls back to main product images) ── */}
                        <div className="w-full lg:w-[70%] flex flex-col-reverse md:flex-row gap-4 lg:gap-6">

                            {/* Thumbnails */}
                            {displayImages.length > 1 && (
                                <div className="flex flex-row md:flex-col gap-4 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 scrollbar-hide w-full md:w-20 lg:w-24 flex-shrink-0 md:max-h-[calc(100vh-200px)]">
                                    {displayImages.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedImage(idx)}
                                            className={`flex-shrink-0 w-20 md:w-full aspect-[4/5] overflow-hidden transition-all duration-300 ${selectedImage === idx ? 'opacity-100 ring-1 ring-[#C9A96E] ring-offset-2' : 'opacity-50 hover:opacity-100'}`}
                                            style={{ backgroundColor: '#f5f3f0', '--tw-ring-offset-color': '#fbf9f6' }}
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
                            <div className="relative w-full aspect-4/5 overflow-hidden group" style={{ backgroundColor: '#f5f3f0' }}>
                                <img
                                    src={displayImages[ selectedImage ]?.url || displayImages[ 0 ].url}
                                    alt={displayTitle}
                                    className="w-full h-full object-cover transition-opacity duration-500"
                                />
                                {displayImages.length > 1 && (
                                    <>
                                        <button
                                            onClick={() => setSelectedImage(prev => prev === 0 ? displayImages.length - 1 : prev - 1)}
                                            className="absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 border cursor-pointer"
                                            style={{ backgroundColor: 'rgba(251,249,246,0.8)', borderColor: '#e4e2df', color: '#1b1c1a' }}
                                            aria-label="Previous image"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M15 19l-7-7 7-7" /></svg>
                                        </button>
                                        <button
                                            onClick={() => setSelectedImage(prev => prev === displayImages.length - 1 ? 0 : prev + 1)}
                                            className="absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 border cursor-pointer"
                                            style={{ backgroundColor: 'rgba(251,249,246,0.8)', borderColor: '#e4e2df', color: '#1b1c1a' }}
                                            aria-label="Next image"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ── RIGHT: Product Details ── */}
                        <div className="w-full lg:w-[30%] lg:sticky lg:top-24 flex flex-col pt-4">

                            {/* Title (Falls back to main product title) */}
                            <h1
                                className="text-4xl md:text-5xl lg:text-6xl font-light leading-[1.05] mb-6"
                                style={{ fontFamily: "'Cormorant Garamond', serif", color: '#1b1c1a' }}
                            >
                                {displayTitle}
                            </h1>

                            {/* Price (Uses variant price or falls back to main product price) */}
                            <div className="mb-8 flex items-baseline gap-3">
                                <span
                                    className="text-base uppercase tracking-[0.2em] font-medium text-[#1b1c1a]"
                                >
                                    {displayPrice?.currency} {Number(displayPrice?.amount || 0).toLocaleString()}
                                </span>
                                {activeVariant?.price?.amount && Number(activeVariant.price.amount) !== Number(product?.price?.amount) && (
                                    <span className="text-[10px] uppercase tracking-wider text-[#7A6E63]">
                                        (Variant Price)
                                    </span>
                                )}
                            </div>

                            <div className="h-px w-full mb-8" style={{ backgroundColor: '#e4e2df' }} />

                            {/* Options/Variants: Multiple attributes for single variants */}
                            {Object.entries(availableAttributes).map(([ attrName, values ]) => (
                                <div key={attrName} className="mb-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-[10px] uppercase tracking-[0.24em] font-medium" style={{ color: '#C9A96E' }}>
                                            {attrName}
                                        </h3>
                                        {selectedAttributes[ attrName ] && (
                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#1b1c1a]">
                                                {selectedAttributes[ attrName ]}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {values.map(val => {
                                            const isSelected = String(selectedAttributes[ attrName ]) === String(val);
                                            return (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => handleAttributeChange(attrName, val)}
                                                    className={`px-4 py-2 text-[11px] uppercase tracking-[0.15em] font-medium transition-all duration-300 border cursor-pointer ${
                                                        isSelected
                                                            ? 'border-[#1b1c1a] bg-[#1b1c1a] text-[#fbf9f6]'
                                                            : 'border-[#d0c5b5] text-[#1b1c1a] hover:border-[#1b1c1a] bg-transparent'
                                                    }`}
                                                >
                                                    {val}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* Stock Information: Shows stock for active variant */}
                            {product?.variants && product.variants.length > 0 && (
                                <div className="mb-6">
                                    {activeVariant ? (
                                        activeVariant.stock !== undefined ? (
                                            Number(activeVariant.stock) > 10 ? (
                                                <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-emerald-700 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    In Stock ({activeVariant.stock} units)
                                                </span>
                                            ) : Number(activeVariant.stock) > 0 ? (
                                                <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-amber-700 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                    Only {activeVariant.stock} left in stock
                                                </span>
                                            ) : (
                                                <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-red-600 flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                    Out of stock
                                                </span>
                                            )
                                        ) : (
                                            <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-emerald-700 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                Available
                                            </span>
                                        )
                                    ) : (
                                        <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-red-600 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                            Option combination currently unavailable
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Description (Falls back to main product description) */}
                            <div className="mb-12">
                                <h3 className="text-[10px] uppercase tracking-[0.24em] font-medium mb-4" style={{ color: '#C9A96E' }}>
                                    The Details
                                </h3>
                                <p className="text-sm leading-relaxed" style={{ color: '#7A6E63' }}>
                                    {displayDescription}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-4 mt-auto">
                                <button
                                    type="button"
                                    disabled={isOutOfStock}
                                    onClick={handleAddToCart}
                                    className={`w-full py-4 text-[11px] uppercase tracking-[0.25em] font-medium transition-all duration-300 ${
                                        isOutOfStock
                                            ? 'bg-[#e4e2df] text-[#7A6E63] cursor-not-allowed'
                                            : 'bg-[#1b1c1a] text-[#fbf9f6] hover:bg-[#C9A96E] hover:text-[#1b1c1a] cursor-pointer'
                                    }`}
                                    style={{ fontFamily: "'Inter', sans-serif" }}
                                >
                                    {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                                </button>

                                <button
                                    type="button"
                                    disabled={isOutOfStock}
                                    onClick={handleAddToCart}
                                    className={`w-full py-4 text-[11px] uppercase tracking-[0.25em] font-medium transition-all duration-300 border ${
                                        isOutOfStock
                                            ? 'border-[#e4e2df] text-[#B5ADA3] cursor-not-allowed bg-transparent'
                                            : 'border-[#d0c5b5] text-[#1b1c1a] hover:border-[#C9A96E] bg-transparent cursor-pointer'
                                    }`}
                                    style={{ fontFamily: "'Inter', sans-serif" }}
                                >
                                    {isOutOfStock ? 'Unavailable' : 'Buy Now'}
                                </button>
                            </div>

                            {/* Extra details */}
                            <div className="mt-14 space-y-4 text-[10px] uppercase tracking-[0.1em]" style={{ color: '#B5ADA3' }}>
                                <div className="flex justify-between border-b pb-3" style={{ borderColor: '#e4e2df' }}>
                                    <span>Shipping</span>
                                    <span>Complimentary over INR 15,000</span>
                                </div>
                                <div className="flex justify-between border-b pb-3" style={{ borderColor: '#e4e2df' }}>
                                    <span>Returns</span>
                                    <span>Within 14 days of delivery</span>
                                </div>
                                <div className="flex justify-between border-b pb-3" style={{ borderColor: '#e4e2df' }}>
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
