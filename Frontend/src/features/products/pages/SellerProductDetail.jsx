import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useProduct } from "../hooks/useProduct";

const MAX_VARIANT_IMAGES = 7;
const POPULAR_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36"];
const POPULAR_COLORS = [
  { name: "Vintage Blue", hex: "#4A6B82" },
  { name: "Deep Indigo", hex: "#1D2D44" },
  { name: "Washed Black", hex: "#2C2C2C" },
  { name: "Raw Denim", hex: "#0E1B2A" },
  { name: "Ecru White", hex: "#F3EFE6" },
  { name: "Light Wash", hex: "#8DA9C4" },
];

// LocalStorage helpers
const getLocalVariantsKey = (productId) => `snitch_variants_${productId}`;

const loadLocalVariants = (productId) => {
  try {
    const raw = localStorage.getItem(getLocalVariantsKey(productId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Failed to load local variants from localStorage:", err);
  }
  return null;
};

const persistLocalVariants = (productId, variants) => {
  try {
    localStorage.setItem(getLocalVariantsKey(productId), JSON.stringify(variants));
  } catch (err) {
    console.warn("Failed to persist variants to localStorage:", err);
  }
};

const SellerProductDetails = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const {
    handleGetProductById,
    handleAddVariant,
    handleUpdateVariantStock,
    handleDeleteVariant,
  } = useProduct();

  // State
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMainImg, setSelectedMainImg] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text: string }

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  const [sortBy, setSortBy] = useState("default");

  // Create Variant Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingVariant, setIsSubmittingVariant] = useState(false);
  const [variantPrice, setVariantPrice] = useState(""); // OPTIONAL
  const [variantStock, setVariantStock] = useState("10");
  const [variantImages, setVariantImages] = useState([]); // Array of strings (data URLs or URLs) - OPTIONAL (max 7)
  const [isDragOver, setIsDragOver] = useState(false);
  const [modalValidationErr, setModalValidationErr] = useState("");
  const fileInputRef = useRef(null);

  // Variant Attributes state (At least one attribute is REQUIRED)
  const [attributes, setAttributes] = useState([
    { key: "Size", value: "30" },
    { key: "Color", value: "Vintage Blue" },
  ]);

  // Image Gallery Viewer Modal for variant with multiple images
  const [viewingVariantImages, setViewingVariantImages] = useState(null);

  // Quick Inline Stock State Tracking (for instant responsiveness)
  const [updatingStockIds, setUpdatingStockIds] = useState(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  // Show Toast helper
  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Synchronize variants state and save to local storage
  const updateAndPersistVariants = useCallback(
    (newVariants) => {
      setProduct((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, variants: newVariants };
        persistLocalVariants(productId, newVariants);
        return updated;
      });
    },
    [productId]
  );

  // Fetch product data & merge with local storage
  const loadProduct = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      setErrorMsg("");
      try {
        const data = await handleGetProductById(productId);
        const resolvedProduct = data?.product || data;
        if (resolvedProduct) {
          // Check if we have local stored variants for this product
          const localVariants = loadLocalVariants(productId);

          const finalVariants = localVariants !== null
            ? localVariants
            : (resolvedProduct.variants || []);

          setProduct({
            ...resolvedProduct,
            variants: finalVariants,
          });

          // Save to local storage if not already saved
          if (localVariants === null && finalVariants.length > 0) {
            persistLocalVariants(productId, finalVariants);
          }
        } else {
          setErrorMsg("Product could not be retrieved.");
        }
      } catch (err) {
        console.error("Failed to load product details", err);
        // Fallback to local storage if API fails completely
        const localVariants = loadLocalVariants(productId);
        if (localVariants) {
          setProduct((prev) => ({
            _id: productId,
            title: "Product (Local Mode)",
            description: "Showing cached inventory data from local state.",
            price: { amount: "1499", currency: "INR" },
            images: [],
            variants: localVariants,
            ...prev,
          }));
        } else {
          setErrorMsg(
            err.response?.data?.message ||
              err.message ||
              "Unable to connect to server. Please try again."
          );
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [handleGetProductById, productId]
  );

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Statistics calculation
  const stats = useMemo(() => {
    const variants = product?.variants || [];
    const totalVariants = variants.length;
    const totalStock = variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);
    const lowStockCount = variants.filter(
      (v) => (Number(v.stock) || 0) > 0 && (Number(v.stock) || 0) <= 10
    ).length;
    const outOfStockCount = variants.filter(
      (v) => (Number(v.stock) || 0) <= 0
    ).length;
    const inStockCount = totalVariants - outOfStockCount;

    // Approximate inventory valuation
    const totalValue = variants.reduce((acc, v) => {
      const p = Number(v.price?.amount || product?.price?.amount || 0);
      return acc + p * (Number(v.stock) || 0);
    }, 0);

    return {
      totalVariants,
      totalStock,
      lowStockCount,
      outOfStockCount,
      inStockCount,
      totalValue,
    };
  }, [product]);

  // Filtered & Sorted variants
  const filteredVariants = useMemo(() => {
    if (!product?.variants) return [];
    return product.variants
      .filter((variant) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const attrMatch = Object.entries(variant.attributes || {}).some(
            ([k, v]) =>
              k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)
          );
          const priceMatch = String(variant.price?.amount || "").includes(q);
          const idMatch = String(variant._id || "").toLowerCase().includes(q);
          if (!attrMatch && !priceMatch && !idMatch) return false;
        }

        // Stock status filter
        const stock = Number(variant.stock) || 0;
        if (stockFilter === "in_stock" && stock <= 0) return false;
        if (stockFilter === "low_stock" && (stock <= 0 || stock > 10)) return false;
        if (stockFilter === "out_of_stock" && stock > 0) return false;

        return true;
      })
      .sort((a, b) => {
        const stockA = Number(a.stock) || 0;
        const stockB = Number(b.stock) || 0;
        const priceA = Number(a.price?.amount || product.price?.amount || 0);
        const priceB = Number(b.price?.amount || product.price?.amount || 0);

        if (sortBy === "stock-desc") return stockB - stockA;
        if (sortBy === "stock-asc") return stockA - stockB;
        if (sortBy === "price-desc") return priceB - priceA;
        if (sortBy === "price-asc") return priceA - priceB;
        return 0;
      });
  }, [product, searchQuery, stockFilter, sortBy]);

  // Handle Single Stock Change (Saves locally & syncs)
  const handleStockUpdate = async (variantId, newStock) => {
    const sanitizedStock = Math.max(0, parseInt(newStock, 10) || 0);

    // Update in React state & LocalStorage
    const currentVariants = product?.variants || [];
    const updatedVariants = currentVariants.map((v) =>
      v._id === variantId ? { ...v, stock: sanitizedStock } : v
    );
    updateAndPersistVariants(updatedVariants);

    setUpdatingStockIds((prev) => new Set(prev).add(variantId));

    try {
      await handleUpdateVariantStock(productId, variantId, sanitizedStock);
      showToast("Stock quantity updated and saved locally");
    } catch (err) {
      // Local storage already has it, notify user
      showToast("Stock updated locally", "success");
    } finally {
      setUpdatingStockIds((prev) => {
        const next = new Set(prev);
        next.delete(variantId);
        return next;
      });
    }
  };

  // Convert File to Base64 Data URL so it can be stored in LocalStorage
  const readFileAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // File drop / upload handling for variant images (up to 7 images)
  const handleAddFiles = async (files) => {
    setModalValidationErr("");
    const fileList = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileList.length === 0) return;

    const remainingSlots = MAX_VARIANT_IMAGES - variantImages.length;
    if (remainingSlots <= 0) {
      setModalValidationErr(`Maximum of ${MAX_VARIANT_IMAGES} images reached for this variant.`);
      return;
    }

    const filesToProcess = fileList.slice(0, remainingSlots);

    try {
      const dataUrls = await Promise.all(filesToProcess.map(readFileAsDataUrl));
      setVariantImages((prev) => [...prev, ...dataUrls]);
    } catch (err) {
      console.error("Error reading file", err);
      setModalValidationErr("Failed to process one or more images.");
    }
  };

  const handleRemoveVariantImage = (index) => {
    setVariantImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleProductImageSelection = (imgUrl) => {
    setVariantImages((prev) => {
      if (prev.includes(imgUrl)) {
        return prev.filter((u) => u !== imgUrl);
      }
      if (prev.length >= MAX_VARIANT_IMAGES) {
        setModalValidationErr(`Cannot exceed ${MAX_VARIANT_IMAGES} images.`);
        return prev;
      }
      setModalValidationErr("");
      return [...prev, imgUrl];
    });
  };

  // Handle Add Variant Submit
  const handleCreateVariant = async (e) => {
    e.preventDefault();
    setModalValidationErr("");
    setIsSubmittingVariant(true);

    try {
      // 1. Validate: At least one attribute is REQUIRED
      const validAttributes = {};
      attributes.forEach((attr) => {
        const key = attr.key.trim();
        const value = attr.value.trim();
        if (key && value) {
          validAttributes[key] = value;
        }
      });

      if (Object.keys(validAttributes).length === 0) {
        setModalValidationErr("At least one attribute is required (e.g. Size or Color).");
        setIsSubmittingVariant(false);
        return;
      }

      // Check for duplicate attributes combination
      const isDuplicate = product?.variants?.some((v) => {
        const vAttrs = v.attributes || {};
        const vKeys = Object.keys(vAttrs);
        const newKeys = Object.keys(validAttributes);
        if (vKeys.length !== newKeys.length) return false;
        return newKeys.every((k) => vAttrs[k] === validAttributes[k]);
      });

      if (isDuplicate) {
        setModalValidationErr("A variant with this exact combination of attributes already exists.");
        setIsSubmittingVariant(false);
        return;
      }

      // 2. Price is OPTIONAL:
      // If provided, use variantPrice; otherwise fall back to product base price or leave undefined
      let resolvedPrice;
      if (variantPrice && !isNaN(Number(variantPrice)) && Number(variantPrice) >= 0) {
        resolvedPrice = {
          amount: Number(variantPrice),
          currency: product?.price?.currency || "INR",
        };
      } else if (product?.price) {
        resolvedPrice = {
          amount: Number(product.price.amount) || 0,
          currency: product.price.currency || "INR",
        };
      } else {
        resolvedPrice = { amount: 0, currency: "INR" };
      }

      // 3. Images are OPTIONAL (up to 7 images)
      // Formatted as array of { url: string }
      const resolvedImages = variantImages.map((url) => ({ url }));

      const newVariant = {
        _id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        attributes: validAttributes,
        price: resolvedPrice,
        stock: Math.max(0, parseInt(variantStock, 10) || 0),
        images: resolvedImages,
        createdAt: new Date().toISOString(),
      };

      // 4. Store State Locally
      const currentList = product?.variants || [];
      const updatedList = [...currentList, newVariant];
      updateAndPersistVariants(updatedList);

      showToast("Variant created and saved to local state");

      // Optional background sync with API
      try {
        await handleAddVariant(productId, {
          attributes: newVariant.attributes,
          price: newVariant.price,
          stock: newVariant.stock,
          images: newVariant.images,
        });
      } catch (apiErr) {
        console.info("Variant saved in local state (API sync optional):", apiErr.message);
      }

      // Reset modal state
      setIsAddModalOpen(false);
      setVariantPrice("");
      setVariantStock("10");
      setVariantImages([]);
      setAttributes([
        { key: "Size", value: "32" },
        { key: "Color", value: "Vintage Blue" },
      ]);
    } catch (err) {
      console.error("Failed to create variant:", err);
      setModalValidationErr(err.message || "Failed to create variant.");
    } finally {
      setIsSubmittingVariant(false);
    }
  };

  // Handle Delete Variant (Saves locally & syncs)
  const handleDeleteVariantAction = async (variantId) => {
    try {
      const currentList = product?.variants || [];
      const updatedList = currentList.filter((v) => v._id !== variantId);
      updateAndPersistVariants(updatedList);
      setDeleteConfirmId(null);
      showToast("Variant removed from local catalog");

      // Optional backend sync
      await handleDeleteVariant(productId, variantId).catch(() => {});
    } catch (err) {
      console.warn("Delete action caught:", err);
    }
  };

  // Quick Batch Size Matrix Generator (Helper for Sellers)
  const handleGenerateStandardSizes = async () => {
    const defaultColor = "Default";
    const standardSizes = ["S", "M", "L", "XL"];
    const existingSizes = new Set(
      (product?.variants || []).map((v) => v.attributes?.Size)
    );

    const sizesToAdd = standardSizes.filter((s) => !existingSizes.has(s));

    if (sizesToAdd.length === 0) {
      showToast("Standard sizes (S, M, L, XL) are already present.", "error");
      return;
    }

    const newVariants = sizesToAdd.map((size) => ({
      _id: `var_quick_${size}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      attributes: { Size: size, Color: defaultColor },
      price: {
        amount: Number(product?.price?.amount || 0),
        currency: product?.price?.currency || "INR",
      },
      stock: 15,
      images: product?.images?.length > 0 ? [{ url: product.images[0].url }] : [],
      createdAt: new Date().toISOString(),
    }));

    const currentList = product?.variants || [];
    const updatedList = [...currentList, ...newVariants];
    updateAndPersistVariants(updatedList);

    showToast(`Generated ${sizesToAdd.length} size variants and stored locally`);

    // Async sync in background
    for (const v of newVariants) {
      try {
        await handleAddVariant(productId, {
          attributes: v.attributes,
          price: v.price,
          stock: v.stock,
          images: v.images,
        });
      } catch (e) {
        // silently handled
      }
    }
  };

  // Clear all local variants helper
  const handleResetToBackend = () => {
    if (window.confirm("Reset all variants to default server state? This will clear local changes.")) {
      localStorage.removeItem(getLocalVariantsKey(productId));
      loadProduct(true);
      showToast("Reset to server state");
    }
  };

  // Attributes builder helper
  const handleAddAttributeRow = () => {
    setAttributes((prev) => [...prev, { key: "", value: "" }]);
  };

  const handleRemoveAttributeRow = (idx) => {
    setAttributes((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAttributeChange = (idx, field, val) => {
    setAttributes((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  // Copy Product ID
  const handleCopyId = () => {
    if (!product?._id) return;
    navigator.clipboard.writeText(product._id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center selection:bg-[#C9A96E]/30"
        style={{ backgroundColor: "#fbf9f6", fontFamily: "'Inter', sans-serif" }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <div className="w-12 h-12 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin mb-4" />
        <p
          className="text-xs uppercase tracking-[0.25em] text-[#7A6E63] font-medium animate-pulse"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Loading Product Studio...
        </p>
      </div>
    );
  }

  // Error Screen
  if (errorMsg && !product) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ backgroundColor: "#fbf9f6", fontFamily: "'Inter', sans-serif" }}
      >
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-2xl font-light mb-4 border border-red-200">
          !
        </div>
        <h2
          className="text-3xl font-light text-[#1b1c1a] mb-2"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Product Not Found
        </h2>
        <p className="text-sm text-[#7A6E63] max-w-md mb-6">{errorMsg}</p>
        <div className="flex gap-4">
          <button
            onClick={() => loadProduct(true)}
            className="px-6 py-3 bg-[#1b1c1a] text-[#fbf9f6] text-[11px] uppercase tracking-[0.2em] font-medium hover:bg-[#C9A96E] hover:text-[#1b1c1a] transition-all"
          >
            Retry Fetch
          </button>
          <Link
            to="/seller/dashboard"
            className="px-6 py-3 border border-[#ede9e3] text-[#1b1c1a] text-[11px] uppercase tracking-[0.2em] font-medium hover:border-[#1b1c1a] transition-all"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const imagesList = product?.images?.length
    ? product.images
    : [{ url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=800" }];

  return (
    <>
      {/* Typography Imports */}
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div
        className="min-h-screen text-[#1b1c1a] pb-24 selection:bg-[#C9A96E]/30"
        style={{ backgroundColor: "#fbf9f6", fontFamily: "'Inter', sans-serif" }}
      >
        {/* Floating Toast Notification */}
        {toast && (
          <div
            className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-5 py-3 shadow-xl border text-xs tracking-wider uppercase font-medium transition-all duration-300 transform translate-y-0 ${
              toast.type === "error"
                ? "bg-red-950 text-red-200 border-red-800"
                : "bg-[#1b1c1a] text-[#fbf9f6] border-[#C9A96E]"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                toast.type === "error" ? "bg-red-500" : "bg-[#C9A96E]"
              }`}
            />
            <span>{toast.text}</span>
          </div>
        )}

        {/* ── TOP LUXURY NAVIGATION BAR ── */}
        <header className="sticky top-0 z-30 bg-[#fbf9f6]/95 backdrop-blur-md border-b border-[#ede9e3]">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
            {/* Left: Breadcrumbs & Back */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/seller/dashboard")}
                className="w-9 h-9 flex items-center justify-center border border-[#ede9e3] bg-white text-[#1b1c1a] hover:border-[#1b1c1a] hover:bg-[#1b1c1a] hover:text-[#fbf9f6] transition-all duration-200"
                title="Back to Seller Dashboard"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#7A6E63]">
                  <Link to="/seller/dashboard" className="hover:text-[#1b1c1a] transition-colors">
                    Dashboard
                  </Link>
                  <span>/</span>
                  <span className="text-[#C9A96E]">Variant Studio</span>
                  <span className="hidden sm:inline-flex items-center gap-1 ml-2 text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Local Storage Active
                  </span>
                </div>
                <h2
                  className="text-lg md:text-xl font-normal text-[#1b1c1a] truncate max-w-sm md:max-w-md lg:max-w-xl"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {product.title}
                </h2>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRefreshing(true);
                  loadProduct(false);
                }}
                disabled={isRefreshing}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-[0.18em] font-medium border border-[#ede9e3] bg-white text-[#7A6E63] hover:text-[#1b1c1a] hover:border-[#1b1c1a] transition-all"
                title="Refresh product data"
              >
                <svg
                  className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Sync</span>
              </button>

              <button
                type="button"
                onClick={handleResetToBackend}
                className="hidden lg:flex items-center px-3 py-2 text-[10px] uppercase tracking-[0.18em] font-medium border border-[#ede9e3] bg-white text-[#7A6E63] hover:text-red-700 hover:border-red-300 transition-all"
                title="Clear local overrides and load from server"
              >
                Reset State
              </button>

              {/* View Customer Page */}
              <Link
                to={`/products/${product._id}`}
                target="_blank"
                rel="noreferrer"
                className="hidden md:flex items-center gap-2 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] font-medium border border-[#ede9e3] bg-white text-[#1b1c1a] hover:border-[#C9A96E] hover:text-[#C9A96E] transition-all"
              >
                <span>Live View</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>

              {/* Add Variant CTA */}
              <button
                type="button"
                onClick={() => {
                  setModalValidationErr("");
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1b1c1a] text-[#fbf9f6] text-[11px] uppercase tracking-[0.2em] font-medium hover:bg-[#C9A96E] hover:text-[#1b1c1a] transition-all duration-300 shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>New Variant</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT AREA ── */}
        <main className="max-w-7xl mx-auto px-6 lg:px-12 pt-8">
          {/* PRODUCT HERO SUMMARY CARD */}
          <section className="bg-white border border-[#ede9e3] p-6 lg:p-8 mb-8 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Product Gallery Mini Thumbnail Preview */}
              <div className="w-full lg:w-72 flex-shrink-0">
                <div className="relative aspect-3/4 overflow-hidden bg-[#f5f3f0] border border-[#ede9e3] group">
                  <img
                    src={imagesList[selectedMainImg]?.url || imagesList[0]?.url}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 bg-[#1b1c1a]/85 backdrop-blur-sm text-[#fbf9f6] text-[9px] uppercase tracking-[0.2em] px-2 py-1 font-medium">
                    {imagesList.length} Image{imagesList.length > 1 ? "s" : ""}
                  </div>
                </div>

                {/* Thumbnails row */}
                {imagesList.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                    {imagesList.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedMainImg(idx)}
                        className={`w-14 h-18 flex-shrink-0 overflow-hidden border transition-all ${
                          selectedMainImg === idx
                            ? "border-[#C9A96E] ring-1 ring-[#C9A96E]"
                            : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Meta & Information */}
              <div className="flex-1 flex flex-col justify-between self-stretch">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <span className="text-[10px] uppercase tracking-[0.24em] font-semibold text-[#C9A96E]">
                      Master Product Record
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="text-[10px] font-mono text-[#7A6E63] hover:text-[#1b1c1a] bg-[#fbf9f6] border border-[#ede9e3] px-2.5 py-1 flex items-center gap-1.5 transition-colors"
                      title="Copy MongoDB Product ID"
                    >
                      <span>ID: {product._id?.slice(-8) || "N/A"}</span>
                      <svg className="w-3 h-3 text-[#B5ADA3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      {copiedId && <span className="text-green-600 font-sans">Copied!</span>}
                    </button>
                  </div>

                  <h1
                    className="text-3xl md:text-4xl lg:text-5xl font-light text-[#1b1c1a] leading-tight mb-4"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {product.title}
                  </h1>

                  <p className="text-sm text-[#7A6E63] leading-relaxed max-w-3xl mb-6">
                    {product.description}
                  </p>
                </div>

                {/* Base Pricing & Date Footer */}
                <div className="pt-6 border-t border-[#ede9e3] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="block text-[9px] uppercase tracking-[0.2em] text-[#B5ADA3] font-medium">
                        Standard Base Price
                      </span>
                      <span className="text-xl font-light tracking-wide text-[#1b1c1a]">
                        {product.price?.currency || "INR"}{" "}
                        {Number(product.price?.amount || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="h-8 w-px bg-[#ede9e3]" />

                    <div>
                      <span className="block text-[9px] uppercase tracking-[0.2em] text-[#B5ADA3] font-medium">
                        Catalog Status
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-medium uppercase tracking-wider text-[#1b1c1a]">
                          Published
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-[#7A6E63] uppercase tracking-[0.15em]">
                    Created:{" "}
                    {new Date(product.createdAt || Date.now()).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── KPI STATS STRIP ── */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-[#ede9e3] p-5 shadow-xs transition-hover hover:border-[#C9A96E]">
              <span className="text-[9px] uppercase tracking-[0.24em] text-[#7A6E63] font-medium">
                Variant Count
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl lg:text-3xl font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {stats.totalVariants}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#B5ADA3]">
                  SKU Options
                </span>
              </div>
            </div>

            <div className="bg-white border border-[#ede9e3] p-5 shadow-xs transition-hover hover:border-[#C9A96E]">
              <span className="text-[9px] uppercase tracking-[0.24em] text-[#7A6E63] font-medium">
                Total Units In Stock
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl lg:text-3xl font-light text-[#1b1c1a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {stats.totalStock.toLocaleString()}
                </span>
                <span className={`text-[10px] uppercase tracking-wider font-medium ${stats.totalStock > 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {stats.totalStock > 0 ? "Available" : "Depleted"}
                </span>
              </div>
            </div>

            <div className="bg-white border border-[#ede9e3] p-5 shadow-xs transition-hover hover:border-[#C9A96E]">
              <span className="text-[9px] uppercase tracking-[0.24em] text-[#7A6E63] font-medium">
                Stock Health
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl lg:text-3xl font-light" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {stats.inStockCount}/{stats.totalVariants}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-amber-700">
                  {stats.lowStockCount > 0 ? `${stats.lowStockCount} Low Stock` : "All Healthy"}
                </span>
              </div>
            </div>

            <div className="bg-white border border-[#ede9e3] p-5 shadow-xs transition-hover hover:border-[#C9A96E]">
              <span className="text-[9px] uppercase tracking-[0.24em] text-[#7A6E63] font-medium">
                Inventory Valuation
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl lg:text-3xl font-light text-[#1b1c1a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  ₹{stats.totalValue.toLocaleString()}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-[#C9A96E]">
                  Gross Value
                </span>
              </div>
            </div>
          </section>

          {/* ── VARIANTS & STOCK MANAGER SECTION ── */}
          <section className="bg-white border border-[#ede9e3] shadow-sm">
            {/* Header / Filter Toolbar */}
            <div className="p-6 border-b border-[#ede9e3] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3
                  className="text-2xl font-light text-[#1b1c1a]"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Product Variants & Stock Inventory
                </h3>
                <p className="text-xs text-[#7A6E63] mt-0.5">
                  Manage individual SKU variations, customize pricing (optional), add up to 7 images (optional), and adjust live warehouse stock quantities. Stored locally.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-3">
                {product?.variants?.length === 0 && (
                  <button
                    type="button"
                    onClick={handleGenerateStandardSizes}
                    className="px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] font-medium border border-[#C9A96E] text-[#1b1c1a] bg-[#C9A96E]/10 hover:bg-[#C9A96E] hover:text-[#1b1c1a] transition-all"
                  >
                    + Generate Standard Sizes (S, M, L, XL)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setModalValidationErr("");
                    setIsAddModalOpen(true);
                  }}
                  className="px-4 py-2 bg-[#1b1c1a] text-[#fbf9f6] text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-[#C9A96E] hover:text-[#1b1c1a] transition-all"
                >
                  + Add Variant
                </button>
              </div>
            </div>

            {/* Filter / Search Bar */}
            <div className="p-4 bg-[#fcfbfa] border-b border-[#ede9e3] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search size, color, attribute..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#ede9e3] focus:border-[#1b1c1a] focus:outline-none placeholder-[#B5ADA3] transition-colors"
                />
                <svg
                  className="w-4 h-4 absolute left-3 top-2.5 text-[#B5ADA3]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2.5 text-xs text-[#B5ADA3] hover:text-[#1b1c1a]"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Status Filters & Sort */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                <div className="flex items-center border border-[#ede9e3] bg-white p-0.5 text-[10px] uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => setStockFilter("all")}
                    className={`px-3 py-1.5 transition-colors ${
                      stockFilter === "all"
                        ? "bg-[#1b1c1a] text-[#fbf9f6] font-medium"
                        : "text-[#7A6E63] hover:text-[#1b1c1a]"
                    }`}
                  >
                    All ({product.variants.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockFilter("in_stock")}
                    className={`px-3 py-1.5 transition-colors ${
                      stockFilter === "in_stock"
                        ? "bg-[#1b1c1a] text-[#fbf9f6] font-medium"
                        : "text-[#7A6E63] hover:text-[#1b1c1a]"
                    }`}
                  >
                    In Stock ({stats.inStockCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockFilter("low_stock")}
                    className={`px-3 py-1.5 transition-colors ${
                      stockFilter === "low_stock"
                        ? "bg-[#1b1c1a] text-[#fbf9f6] font-medium"
                        : "text-[#7A6E63] hover:text-[#1b1c1a]"
                    }`}
                  >
                    Low ({stats.lowStockCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockFilter("out_of_stock")}
                    className={`px-3 py-1.5 transition-colors ${
                      stockFilter === "out_of_stock"
                        ? "bg-[#1b1c1a] text-[#fbf9f6] font-medium"
                        : "text-[#7A6E63] hover:text-[#1b1c1a]"
                    }`}
                  >
                    Out ({stats.outOfStockCount})
                  </button>
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-[#ede9e3] text-[#1b1c1a] focus:border-[#1b1c1a] focus:outline-none cursor-pointer"
                >
                  <option value="default">Sort: Default</option>
                  <option value="stock-desc">Stock: High to Low</option>
                  <option value="stock-asc">Stock: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="price-asc">Price: Low to High</option>
                </select>
              </div>
            </div>

            {/* ── VARIANTS TABLE / EMPTY STATE ── */}
            {filteredVariants.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-dashed border-[#C9A96E] flex items-center justify-center text-[#C9A96E]">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h4
                  className="text-2xl font-light text-[#1b1c1a] mb-2"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {searchQuery || stockFilter !== "all"
                    ? "No Variants Match Your Criteria"
                    : "No Variants Created Yet"}
                </h4>
                <p className="text-xs text-[#7A6E63] max-w-md mx-auto mb-6">
                  {searchQuery || stockFilter !== "all"
                    ? "Try adjusting your filter settings or search terms."
                    : "Product variants allow you to configure sizes, colors, and stock quantities for this piece. Stored securely in your browser session & locally."}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setModalValidationErr("");
                      setIsAddModalOpen(true);
                    }}
                    className="px-6 py-3 bg-[#1b1c1a] text-[#fbf9f6] text-[11px] uppercase tracking-[0.2em] font-medium hover:bg-[#C9A96E] hover:text-[#1b1c1a] transition-all"
                  >
                    + Create First Variant
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateStandardSizes}
                    className="px-6 py-3 border border-[#ede9e3] text-[#1b1c1a] text-[11px] uppercase tracking-[0.2em] font-medium hover:border-[#1b1c1a] transition-all"
                  >
                    Quick Size Matrix (S, M, L, XL)
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#ede9e3] bg-[#fbf9f6] text-[10px] uppercase tracking-[0.22em] text-[#7A6E63] font-medium">
                      <th className="py-4 px-6">Images (Up to 7)</th>
                      <th className="py-4 px-6">Attributes (Required)</th>
                      <th className="py-4 px-6">Price</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6">Stock Level & Quick Adjust</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede9e3] text-sm">
                    {filteredVariants.map((variant) => {
                      const stockNum = Number(variant.stock) || 0;
                      const isUpdating = updatingStockIds.has(variant._id);
                      const varImgs = Array.isArray(variant.images) ? variant.images : [];
                      const primaryImg = varImgs[0]?.url || product.images?.[0]?.url || "";

                      return (
                        <tr
                          key={variant._id}
                          className="hover:bg-[#fcfbfa] transition-colors group"
                        >
                          {/* Images column: Preview + count badge */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div
                                onClick={() => varImgs.length > 0 && setViewingVariantImages(varImgs)}
                                className={`w-14 h-18 bg-[#f5f3f0] border border-[#ede9e3] overflow-hidden flex-shrink-0 relative ${
                                  varImgs.length > 0 ? "cursor-pointer hover:border-[#C9A96E]" : ""
                                }`}
                                title={varImgs.length > 0 ? "Click to view gallery" : "No specific images"}
                              >
                                {primaryImg ? (
                                  <img
                                    src={primaryImg}
                                    alt="Variant"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[9px] uppercase text-[#B5ADA3] text-center p-1">
                                    No Img
                                  </div>
                                )}
                                {varImgs.length > 1 && (
                                  <div className="absolute bottom-0 right-0 bg-[#1b1c1a]/90 text-white text-[8px] font-mono px-1 py-0.5">
                                    +{varImgs.length - 1}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col">
                                <span className="text-[10px] text-[#7A6E63] font-mono">
                                  {varImgs.length > 0 ? `${varImgs.length}/7 uploaded` : "Using master"}
                                </span>
                                {varImgs.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setViewingVariantImages(varImgs)}
                                    className="text-[9px] text-[#C9A96E] hover:underline uppercase tracking-wider text-left mt-0.5"
                                  >
                                    View ({varImgs.length})
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Attributes badges */}
                          <td className="py-4 px-6">
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {variant.attributes &&
                              Object.keys(variant.attributes).length > 0 ? (
                                Object.entries(variant.attributes).map(
                                  ([k, v]) => (
                                    <span
                                      key={k}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f5f3f0] border border-[#ede9e3] text-[10px] uppercase tracking-wider text-[#1b1c1a]"
                                    >
                                      <span className="text-[#7A6E63] font-normal">
                                        {k}:
                                      </span>
                                      <span className="font-semibold">{v}</span>
                                    </span>
                                  )
                                )
                              ) : (
                                <span className="text-xs text-[#B5ADA3] italic">
                                  Standard Base Variant
                                </span>
                              )}
                            </div>
                            <span className="block mt-1 font-mono text-[9px] text-[#B5ADA3]">
                              ID: {variant._id?.slice(-8) || "custom"}
                            </span>
                          </td>

                          {/* Price: Shows variant price or fallback to master */}
                          <td className="py-4 px-6">
                            <div className="font-medium text-xs tracking-wider uppercase text-[#1b1c1a]">
                              {variant.price?.currency || product.price?.currency || "INR"}{" "}
                              {Number(
                                variant.price?.amount !== undefined
                                  ? variant.price.amount
                                  : product.price?.amount
                              ).toLocaleString()}
                            </div>
                            <span className="text-[9px] text-[#7A6E63]">
                              {variant.price?.amount !== undefined ? "Custom Variant Price" : "Base Product Price"}
                            </span>
                          </td>

                          {/* Stock Status Badge */}
                          <td className="py-4 px-6 text-center">
                            {stockNum > 10 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] uppercase tracking-wider font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                In Stock
                              </span>
                            ) : stockNum > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] uppercase tracking-wider font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Low Stock ({stockNum})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-800 border border-red-200 text-[10px] uppercase tracking-wider font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                Out of Stock
                              </span>
                            )}
                          </td>

                          {/* Interactive Stock Controls */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              {/* Decrement */}
                              <button
                                type="button"
                                disabled={stockNum <= 0 || isUpdating}
                                onClick={() =>
                                  handleStockUpdate(variant._id, stockNum - 1)
                                }
                                className="w-7 h-7 flex items-center justify-center border border-[#ede9e3] bg-white text-[#1b1c1a] hover:border-[#1b1c1a] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="Decrease by 1"
                              >
                                -
                              </button>

                              {/* Number Input */}
                              <input
                                type="number"
                                min="0"
                                value={stockNum}
                                onChange={(e) =>
                                  handleStockUpdate(variant._id, e.target.value)
                                }
                                className="w-16 py-1 text-center font-mono text-xs border border-[#ede9e3] bg-white focus:border-[#1b1c1a] focus:outline-none"
                              />

                              {/* Increment */}
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() =>
                                  handleStockUpdate(variant._id, stockNum + 1)
                                }
                                className="w-7 h-7 flex items-center justify-center border border-[#ede9e3] bg-white text-[#1b1c1a] hover:border-[#1b1c1a] transition-colors"
                                title="Increase by 1"
                              >
                                +
                              </button>

                              {/* Quick Adjustment Shortcuts */}
                              <div className="hidden lg:flex items-center gap-1 ml-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStockUpdate(variant._id, stockNum + 5)
                                  }
                                  className="px-1.5 py-1 text-[9px] uppercase tracking-wider text-[#7A6E63] border border-[#ede9e3] hover:text-[#1b1c1a] hover:border-[#1b1c1a] transition-colors"
                                  title="Add 5 units"
                                >
                                  +5
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStockUpdate(variant._id, stockNum + 20)
                                  }
                                  className="px-1.5 py-1 text-[9px] uppercase tracking-wider text-[#7A6E63] border border-[#ede9e3] hover:text-[#1b1c1a] hover:border-[#1b1c1a] transition-colors"
                                  title="Add 20 units"
                                >
                                  +20
                                </button>
                                {stockNum > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStockUpdate(variant._id, 0)
                                    }
                                    className="px-1.5 py-1 text-[9px] uppercase tracking-wider text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                                    title="Mark Out of Stock"
                                  >
                                    Zero
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right">
                            {deleteConfirmId === variant._id ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteVariantAction(variant._id)
                                  }
                                  className="px-2.5 py-1 text-[9px] uppercase tracking-wider bg-red-700 text-white font-medium hover:bg-red-800 transition-colors"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-1 text-[9px] uppercase tracking-wider border border-[#ede9e3] text-[#7A6E63] hover:text-[#1b1c1a]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(variant._id)}
                                className="p-1.5 text-[#B5ADA3] hover:text-red-700 hover:bg-red-50 transition-colors"
                                title="Remove Variant"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.6"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>

        {/* ── CREATE VARIANT MODAL / DRAWER ── */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-[#fbf9f6] border border-[#ede9e3] max-w-2xl w-full p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-6 right-6 text-[#7A6E63] hover:text-[#1b1c1a] text-2xl font-light"
              >
                ×
              </button>

              <div className="mb-6">
                <span className="text-[10px] uppercase tracking-[0.24em] font-semibold text-[#C9A96E]">
                  Inventory Expansion
                </span>
                <h3
                  className="text-3xl font-light text-[#1b1c1a]"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Create Product Variant
                </h3>
                <p className="text-xs text-[#7A6E63] mt-1">
                  At least <strong>one attribute is required</strong>. Image and price are <strong>optional</strong>. You can upload up to <strong>7 images</strong> per variant, stored locally.
                </p>
              </div>

              {/* Validation Error Banner */}
              {modalValidationErr && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <span>⚠</span>
                  <span>{modalValidationErr}</span>
                </div>
              )}

              <form onSubmit={handleCreateVariant} className="space-y-6">
                {/* 1. REQUIRED ATTRIBUTES BUILDER */}
                <div className="bg-white border border-[#ede9e3] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#1b1c1a] flex items-center gap-1.5">
                      <span>Variant Attributes</span>
                      <span className="text-red-600 font-bold">* (At least 1 required)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddAttributeRow}
                      className="text-[10px] uppercase tracking-wider text-[#C9A96E] hover:underline font-medium"
                    >
                      + Add Attribute Row
                    </button>
                  </div>

                  {/* Attribute Rows */}
                  <div className="space-y-3">
                    {attributes.map((attr, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input
                          type="text"
                          placeholder="e.g. Size, Color, Fit"
                          value={attr.key}
                          onChange={(e) =>
                            handleAttributeChange(idx, "key", e.target.value)
                          }
                          className="w-1/3 px-3 py-2 text-xs bg-[#fbf9f6] border border-[#ede9e3] focus:border-[#1b1c1a] focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="e.g. 30, Medium, Vintage Blue"
                          value={attr.value}
                          onChange={(e) =>
                            handleAttributeChange(idx, "value", e.target.value)
                          }
                          className="flex-1 px-3 py-2 text-xs bg-[#fbf9f6] border border-[#ede9e3] focus:border-[#1b1c1a] focus:outline-none"
                        />
                        {attributes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAttributeRow(idx)}
                            className="text-[#B5ADA3] hover:text-red-700 px-1 text-lg"
                            title="Remove row"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Quick Preset Buttons for Size */}
                  <div className="mt-4 pt-3 border-t border-[#ede9e3]">
                    <span className="block text-[9px] uppercase tracking-wider text-[#7A6E63] mb-2 font-medium">
                      Quick Size Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_SIZES.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            const sizeIdx = attributes.findIndex(
                              (a) => a.key.toLowerCase() === "size"
                            );
                            if (sizeIdx !== -1) {
                              handleAttributeChange(sizeIdx, "value", sz);
                            } else {
                              setAttributes((prev) => [
                                ...prev,
                                { key: "Size", value: sz },
                              ]);
                            }
                          }}
                          className="px-2 py-1 text-[10px] uppercase tracking-wider border border-[#ede9e3] bg-[#fbf9f6] hover:border-[#1b1c1a] hover:bg-white text-[#1b1c1a] transition-all"
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Preset Colors */}
                  <div className="mt-3">
                    <span className="block text-[9px] uppercase tracking-wider text-[#7A6E63] mb-2 font-medium">
                      Quick Color Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_COLORS.map((col) => (
                        <button
                          key={col.name}
                          type="button"
                          onClick={() => {
                            const colIdx = attributes.findIndex(
                              (a) => a.key.toLowerCase() === "color"
                            );
                            if (colIdx !== -1) {
                              handleAttributeChange(colIdx, "value", col.name);
                            } else {
                              setAttributes((prev) => [
                                ...prev,
                                { key: "Color", value: col.name },
                              ]);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider border border-[#ede9e3] bg-[#fbf9f6] hover:border-[#1b1c1a] text-[#1b1c1a] transition-all"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/10"
                            style={{ backgroundColor: col.hex }}
                          />
                          <span>{col.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. OPTIONAL PRICE & INITIAL STOCK */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-[#ede9e3] p-5">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#1b1c1a]">
                        Variant Price ({product?.price?.currency || "INR"})
                      </label>
                      <span className="text-[9px] uppercase text-[#7A6E63] bg-[#f5f3f0] px-1.5 py-0.5">
                        Optional
                      </span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={variantPrice}
                      onChange={(e) => setVariantPrice(e.target.value)}
                      placeholder={`Default: ₹${product?.price?.amount || 1499}`}
                      className="w-full px-3 py-2 text-sm bg-[#fbf9f6] border border-[#ede9e3] focus:border-[#1b1c1a] focus:outline-none"
                    />
                    <span className="block text-[9px] text-[#B5ADA3] mt-1">
                      Leave empty to automatically inherit master base price (₹{product?.price?.amount || 1499}).
                    </span>
                  </div>

                  <div className="bg-white border border-[#ede9e3] p-5">
                    <label className="block text-[10px] uppercase tracking-[0.2em] font-medium text-[#1b1c1a] mb-2">
                      Initial Warehouse Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={variantStock}
                      onChange={(e) => setVariantStock(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full px-3 py-2 text-sm bg-[#fbf9f6] border border-[#ede9e3] focus:border-[#1b1c1a] focus:outline-none"
                      required
                    />
                    <span className="block text-[9px] text-[#B5ADA3] mt-1">
                      Adjustable anytime via real-time stepper.
                    </span>
                  </div>
                </div>

                {/* 3. OPTIONAL UP TO 7 IMAGES UPLOAD & PICKER */}
                <div className="bg-white border border-[#ede9e3] p-5">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#1b1c1a]">
                      Variant Images
                    </label>
                    <span className="text-[9px] uppercase text-[#7A6E63] bg-[#f5f3f0] px-1.5 py-0.5">
                      Optional ({variantImages.length}/{MAX_VARIANT_IMAGES})
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A6E63] mb-3">
                    Upload new photos from your device or select from product's existing images (up to 7 photos):
                  </p>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleAddFiles(e.target.files);
                        e.target.value = "";
                      }
                    }}
                  />

                  {/* Drag and Drop Zone */}
                  {variantImages.length < MAX_VARIANT_IMAGES && (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        if (e.dataTransfer.files) {
                          handleAddFiles(e.dataTransfer.files);
                        }
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed p-4 text-center cursor-pointer transition-colors mb-4 ${
                        isDragOver
                          ? "border-[#1b1c1a] bg-[#f5f3f0]"
                          : "border-[#ede9e3] bg-[#fcfbfa] hover:border-[#C9A96E]"
                      }`}
                    >
                      <svg className="w-6 h-6 mx-auto mb-1 text-[#C9A96E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-xs font-medium text-[#1b1c1a]">
                        Click or drag images to upload
                      </p>
                      <p className="text-[9px] text-[#7A6E63] mt-0.5">
                        PNG, JPG, WebP up to 7 images. Stored locally.
                      </p>
                    </div>
                  )}

                  {/* Currently Staged Images Thumbnails */}
                  {variantImages.length > 0 && (
                    <div className="mb-4">
                      <span className="block text-[9px] uppercase tracking-wider text-[#7A6E63] mb-2 font-medium">
                        Staged Variant Images ({variantImages.length}/{MAX_VARIANT_IMAGES}):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {variantImages.map((imgUrl, i) => (
                          <div
                            key={i}
                            className="w-16 h-20 border border-[#ede9e3] relative overflow-hidden group/thumb bg-[#f5f3f0]"
                          >
                            <img
                              src={imgUrl}
                              alt={`Variant ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveVariantImage(i)}
                              className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] leading-none opacity-90 hover:opacity-100"
                              title="Remove image"
                            >
                              ×
                            </button>
                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white text-center py-0.5">
                              #{i + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pick from Master Product Images */}
                  {imagesList.length > 0 && (
                    <div>
                      <span className="block text-[9px] uppercase tracking-wider text-[#7A6E63] mb-2 font-medium">
                        Or select from master catalog images:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {imagesList.map((img, idx) => {
                          const isSelected = variantImages.includes(img.url);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleToggleProductImageSelection(img.url)}
                              className={`w-14 h-18 border overflow-hidden relative transition-all ${
                                isSelected
                                  ? "border-[#C9A96E] ring-2 ring-[#C9A96E]"
                                  : "border-[#ede9e3] opacity-60 hover:opacity-100"
                              }`}
                              title={isSelected ? "Click to deselect" : "Click to select"}
                            >
                              <img
                                src={img.url}
                                alt="Master"
                                className="w-full h-full object-cover"
                              />
                              {isSelected && (
                                <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#C9A96E] text-white flex items-center justify-center text-[8px] rounded-full">
                                  ✓
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-[#ede9e3]">
                  <span className="text-[10px] text-[#7A6E63] italic">
                    All variants will be saved to your browser local state.
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-6 py-3 border border-[#ede9e3] text-[#1b1c1a] text-[11px] uppercase tracking-[0.2em] font-medium hover:border-[#1b1c1a] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingVariant}
                      className="px-8 py-3 bg-[#1b1c1a] text-[#fbf9f6] text-[11px] uppercase tracking-[0.2em] font-medium hover:bg-[#C9A96E] hover:text-[#1b1c1a] disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      {isSubmittingVariant && (
                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      )}
                      <span>Save Variant Locally</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── VARIANT IMAGE GALLERY MODAL ── */}
        {viewingVariantImages && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div className="bg-[#fbf9f6] border border-[#ede9e3] max-w-xl w-full p-6 shadow-2xl relative">
              <button
                type="button"
                onClick={() => setViewingVariantImages(null)}
                className="absolute top-4 right-4 text-2xl font-light text-[#7A6E63] hover:text-[#1b1c1a]"
              >
                ×
              </button>
              <h4
                className="text-2xl font-light text-[#1b1c1a] mb-4"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Variant Photos ({viewingVariantImages.length})
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-1">
                {viewingVariantImages.map((img, i) => (
                  <div key={i} className="aspect-3/4 border border-[#ede9e3] overflow-hidden bg-white">
                    <img
                      src={img.url}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SellerProductDetails;
