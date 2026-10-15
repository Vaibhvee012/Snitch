import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useProduct } from "../hooks/useProduct";

const Dashboard = () => {
  const navigate = useNavigate();
  const { handleGetSellerProduct } = useProduct();

  const rawSellerProducts = useSelector(
    (state) => state.product.sellerProducts
  );

  const [isLoading, setIsLoading] = useState(!rawSellerProducts);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeModalImageIndex, setActiveModalImageIndex] = useState(0);
  const [copiedId, setCopiedId] = useState(null);

  // Fetch seller products on mount
  useEffect(() => {
    let isMounted = true;
    handleGetSellerProduct()
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to load seller products:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Could not retrieve your catalog. Please try again."
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [handleGetSellerProduct]);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await handleGetSellerProduct();
    } catch (err) {
      console.error("Failed to load seller products:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not retrieve your catalog. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [handleGetSellerProduct]);

  // Robust normalization of sellerProducts state to handle all response structures
  const products = useMemo(() => {
    if (!rawSellerProducts) return [];

    let list = [];
    if (Array.isArray(rawSellerProducts)) {
      list = rawSellerProducts;
    } else if (Array.isArray(rawSellerProducts.products)) {
      list = rawSellerProducts.products;
    } else if (rawSellerProducts.product && typeof rawSellerProducts.product === "object") {
      list = [rawSellerProducts.product];
    } else if (rawSellerProducts._id && rawSellerProducts.title) {
      list = [rawSellerProducts];
    }

    return list;
  }, [rawSellerProducts]);

  // Filter & Sort
  const filteredProducts = useMemo(() => {
    return products
      .filter((item) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const titleMatch = item?.title?.toLowerCase().includes(query);
        const descMatch = item?.description?.toLowerCase().includes(query);
        const idMatch = item?._id?.toLowerCase().includes(query);
        return titleMatch || descMatch || idMatch;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        if (sortBy === "oldest") {
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        }
        if (sortBy === "price-asc") {
          const priceA = Number(a?.price?.amount) || 0;
          const priceB = Number(b?.price?.amount) || 0;
          return priceA - priceB;
        }
        if (sortBy === "price-desc") {
          const priceA = Number(a?.price?.amount) || 0;
          const priceB = Number(b?.price?.amount) || 0;
          return priceB - priceA;
        }
        if (sortBy === "title-asc") {
          return (a.title || "").localeCompare(b.title || "");
        }
        return 0;
      });
  }, [products, searchQuery, sortBy]);

  // Catalog KPIs
  const stats = useMemo(() => {
    const totalCount = products.length;
    const totalCatalogValue = products.reduce((acc, p) => {
      const amt = Number(p?.price?.amount) || 0;
      return acc + amt;
    }, 0);
    const avgPrice = totalCount > 0 ? Math.round(totalCatalogValue / totalCount) : 0;
    const totalImages = products.reduce((acc, p) => acc + (p?.images?.length || 0), 0);

    return { totalCount, totalCatalogValue, avgPrice, totalImages };
  }, [products]);

  // Quick helper to copy ID
  const handleCopyId = (id, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openQuickView = (product) => {
    setSelectedProduct(product);
    setActiveModalImageIndex(0);
  };

  const closeQuickView = () => {
    setSelectedProduct(null);
  };

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <main
        className="min-h-screen selection:bg-[#C9A96E]/30 text-[#1b1c1a]"
        style={{
          backgroundColor: "#fbf9f6",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Navigation Bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 sm:px-10 lg:px-16 py-4 border-b backdrop-blur-md transition-all"
          style={{
            backgroundColor: "rgba(251, 249, 246, 0.92)",
            borderColor: "#ede9e3",
          }}
        >
          <div className="flex items-center gap-6">
            <Link to="/" className="group flex items-center gap-2">
              <span
                className="text-xl sm:text-2xl font-light tracking-[0.3em] uppercase transition-colors"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: "#1b1c1a",
                }}
              >
                Snitch<span style={{ color: "#C9A96E" }}>.</span>
              </span>
            </Link>

            <span className="hidden sm:inline-block h-4 w-[1px] bg-[#d0c5b5]" />

            <div className="hidden sm:flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-medium text-[#7A6E63]">
              <span>Seller Studio</span>
              <span className="text-[#C9A96E]">/</span>
              <span className="text-[#1b1c1a]">Products</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleRefresh}
              title="Refresh Catalog"
              className="p-2.5 rounded-full border border-[#ede9e3] hover:border-[#C9A96E] hover:bg-white text-[#7A6E63] hover:text-[#1b1c1a] transition-all"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? "animate-spin text-[#C9A96E]" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </button>

            <Link
              to="/seller/create-product"
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] font-medium text-white transition-all duration-300 shadow-sm hover:shadow-md hover:brightness-110 active:scale-[0.98]"
              style={{
                backgroundColor: "#1b1c1a",
              }}
            >
              <span className="text-[#C9A96E] font-bold text-sm leading-none">+</span>
              <span>New Product</span>
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-10 sm:py-14">
          {/* Hero Banner / Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-[#ede9e3]">
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.25em] mb-2 font-medium"
                style={{ color: "#C9A96E" }}
              >
                Inventory & Atelier
              </p>
              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-light leading-tight"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: "#1b1c1a",
                }}
              >
                Seller <em>Dashboard</em>
              </h1>
              <p className="mt-2 text-sm text-[#7A6E63] font-light max-w-xl">
                Oversee your curated fashion catalog, monitor live pricing, inspect high-res assets, and publish new collections.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/seller/create-product")}
                className="flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-[0.2em] font-medium border border-[#1b1c1a] bg-transparent text-[#1b1c1a] hover:bg-[#1b1c1a] hover:text-white transition-all duration-300"
              >
                <span>Add To Collection</span>
                <span className="text-[#C9A96E]">→</span>
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 my-10">
            {/* Stat 1 */}
            <div className="p-5 sm:p-6 bg-white border border-[#ede9e3] rounded-sm transition-all duration-300 hover:border-[#d0c5b5] hover:shadow-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#7A6E63] font-medium block mb-2">
                Total Products
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-3xl sm:text-4xl font-light"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {stats.totalCount}
                </span>
                <span className="text-xs text-[#C9A96E] font-medium">Live</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="p-5 sm:p-6 bg-white border border-[#ede9e3] rounded-sm transition-all duration-300 hover:border-[#d0c5b5] hover:shadow-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#7A6E63] font-medium block mb-2">
                Catalog Value
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-[#7A6E63] font-medium">₹</span>
                <span
                  className="text-3xl sm:text-4xl font-light"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {stats.totalCatalogValue.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="p-5 sm:p-6 bg-white border border-[#ede9e3] rounded-sm transition-all duration-300 hover:border-[#d0c5b5] hover:shadow-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#7A6E63] font-medium block mb-2">
                Average Price
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-[#7A6E63] font-medium">₹</span>
                <span
                  className="text-3xl sm:text-4xl font-light"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {stats.avgPrice.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="p-5 sm:p-6 bg-white border border-[#ede9e3] rounded-sm transition-all duration-300 hover:border-[#d0c5b5] hover:shadow-sm">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#7A6E63] font-medium block mb-2">
                Total Assets
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-3xl sm:text-4xl font-light"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {stats.totalImages}
                </span>
                <span className="text-xs text-[#7A6E63]">photos</span>
              </div>
            </div>
          </div>

          {/* Controls Bar: Search, Sort, View Toggle */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 py-5 mb-8 border-y border-[#ede9e3]">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A6E63]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by title, description or ID..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-[#ede9e3] outline-none focus:border-[#C9A96E] placeholder-[#7A6E63]/60 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7A6E63] hover:text-[#1b1c1a]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort & View Mode */}
            <div className="flex items-center gap-3 justify-between sm:justify-end">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.15em] text-[#7A6E63] font-medium hidden sm:inline">
                  Sort:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-[#ede9e3] px-3 py-2 text-xs text-[#1b1c1a] outline-none focus:border-[#C9A96E] cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="title-asc">Title: A – Z</option>
                </select>
              </div>

              {/* View toggle */}
              <div className="flex items-center border border-[#ede9e3] bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                  className={`p-1.5 transition-colors ${
                    viewMode === "grid"
                      ? "bg-[#1b1c1a] text-white"
                      : "text-[#7A6E63] hover:text-[#1b1c1a]"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  title="Table View"
                  className={`p-1.5 transition-colors ${
                    viewMode === "table"
                      ? "bg-[#1b1c1a] text-white"
                      : "text-[#7A6E63] hover:text-[#1b1c1a]"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Error Banner if any */}
          {error && (
            <div className="mb-8 p-4 bg-red-50/70 border border-red-200 text-xs text-red-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>⚠</span>
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className="underline hover:no-underline font-medium uppercase tracking-wider text-[10px]"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading Skeletons */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-white border border-[#ede9e3] p-4 flex flex-col gap-4 animate-pulse"
                >
                  <div className="w-full aspect-[3/4] bg-[#f0ebe3]" />
                  <div className="h-4 bg-[#f0ebe3] w-3/4" />
                  <div className="h-3 bg-[#f0ebe3] w-1/2" />
                  <div className="h-6 bg-[#f0ebe3] w-1/3 mt-2" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            /* Empty State */
            <div className="py-20 px-6 text-center border border-dashed border-[#d0c5b5] bg-white/60">
              <span
                className="text-4xl sm:text-5xl font-light block mb-4"
                style={{ fontFamily: "'Cormorant Garamond', serif", color: "#C9A96E" }}
              >
                Snitch.
              </span>
              <h2
                className="text-2xl font-light text-[#1b1c1a] mb-2"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {searchQuery ? "No matching products found" : "Your atelier is currently empty"}
              </h2>
              <p className="text-xs text-[#7A6E63] max-w-md mx-auto mb-6">
                {searchQuery
                  ? `We couldn't find any products matching "${searchQuery}". Try a different keyword.`
                  : "You haven't added any products to your seller catalog yet. Publish your first item to begin selling."}
              </p>
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="px-5 py-2.5 text-xs uppercase tracking-[0.2em] border border-[#1b1c1a] hover:bg-[#1b1c1a] hover:text-white transition-all"
                >
                  Clear Search
                </button>
              ) : (
                <Link
                  to="/seller/create-product"
                  className="inline-flex items-center gap-2 px-6 py-3 text-xs uppercase tracking-[0.2em] font-medium text-white bg-[#1b1c1a] hover:brightness-125 transition-all shadow-sm"
                >
                  <span className="text-[#C9A96E] font-bold">+</span>
                  <span>Create First Product</span>
                </Link>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((product) => {
                const primaryImage = product.images?.[0]?.url || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80";
                const priceFormatted = Number(product?.price?.amount || 0).toLocaleString("en-IN");
                const currency = product?.price?.currency || "INR";

                return (
                  <article
                    key={product._id || product.title}
                    onClick={() => openQuickView(product)}
                    className="group bg-white border border-[#ede9e3] hover:border-[#d0c5b5] transition-all duration-300 flex flex-col overflow-hidden hover:shadow-lg cursor-pointer"
                  >
                    {/* Image Container */}
                    <div className="relative aspect-[3/4] w-full bg-[#f4f1ea] overflow-hidden">
                      <img
                        src={primaryImage}
                        alt={product.title}
                        className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80";
                        }}
                      />

                      {/* Image count pill */}
                      {product.images?.length > 1 && (
                        <div className="absolute top-3 right-3 px-2.5 py-1 bg-[#1b1c1a]/75 backdrop-blur-sm text-white text-[10px] uppercase tracking-widest font-medium rounded-full">
                          {product.images.length} Photos
                        </div>
                      )}

                      {/* Quick view hover action button */}
                      <div className="absolute inset-0 bg-[#1b1c1a]/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openQuickView(product);
                          }}
                          className="w-full py-2.5 text-center bg-white text-[#1b1c1a] text-[11px] uppercase tracking-[0.2em] font-medium shadow-md hover:bg-[#1b1c1a] hover:text-white transition-colors"
                        >
                          Quick View
                        </button>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Status & Date */}
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[#7A6E63] mb-2 font-medium">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A96E]" />
                            <span>In Catalog</span>
                          </span>
                          <span>
                            {product.createdAt
                              ? new Date(product.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "Recently"}
                          </span>
                        </div>

                        {/* Title */}
                        <h2
                          className="text-lg font-medium text-[#1b1c1a] group-hover:text-[#C9A96E] transition-colors line-clamp-1"
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        >
                          {product.title}
                        </h2>

                        {/* Description */}
                        {product.description && (
                          <p className="mt-1.5 text-xs text-[#7A6E63] line-clamp-2 font-light leading-relaxed">
                            {product.description}
                          </p>
                        )}
                      </div>

                      {/* Card Footer: Price & ID */}
                      <div className="mt-5 pt-4 border-t border-[#ede9e3] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase tracking-[0.18em] text-[#7A6E63] block">
                            Price
                          </span>
                          <span className="text-base font-semibold tracking-tight text-[#1b1c1a]">
                            {currency === "INR" ? "₹" : currency}{" "}
                            {priceFormatted}
                          </span>
                        </div>

                        {product._id && (
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(product._id, e)}
                            title="Copy Product ID"
                            className="text-[10px] font-mono text-[#7A6E63] hover:text-[#1b1c1a] px-2 py-1 bg-[#f7f5f0] border border-[#ede9e3] rounded transition-colors flex items-center gap-1"
                          >
                            <span>#{product._id.slice(-6)}</span>
                            {copiedId === product._id ? (
                              <span className="text-[#C9A96E] font-sans">Copied!</span>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                                />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="bg-white border border-[#ede9e3] overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#ede9e3] bg-[#fbf9f6] text-[10px] uppercase tracking-[0.2em] text-[#7A6E63] font-medium">
                    <th className="py-4 px-6">Product</th>
                    <th className="py-4 px-6">Price</th>
                    <th className="py-4 px-6">Images</th>
                    <th className="py-4 px-6">Created</th>
                    <th className="py-4 px-6">ID</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ede9e3]">
                  {filteredProducts.map((product) => {
                    const primaryImage = product.images?.[0]?.url || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80";
                    const priceFormatted = Number(product?.price?.amount || 0).toLocaleString("en-IN");
                    const currency = product?.price?.currency || "INR";

                    return (
                      <tr
                        key={product._id || product.title}
                        className="hover:bg-[#fbf9f6] transition-colors cursor-pointer group"
                        onClick={() => openQuickView(product)}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <img
                              src={primaryImage}
                              alt={product.title}
                              className="w-12 h-14 object-cover object-top border border-[#ede9e3]"
                              onError={(e) => {
                                e.currentTarget.src =
                                  "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80";
                              }}
                            />
                            <div>
                              <p
                                className="font-medium text-[#1b1c1a] group-hover:text-[#C9A96E] transition-colors"
                                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem" }}
                              >
                                {product.title}
                              </p>
                              {product.description && (
                                <p className="text-[11px] text-[#7A6E63] line-clamp-1 max-w-xs font-light">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 font-semibold text-[#1b1c1a]">
                          {currency === "INR" ? "₹" : currency} {priceFormatted}
                        </td>

                        <td className="py-4 px-6 text-[#7A6E63]">
                          {product.images?.length || 0} files
                        </td>

                        <td className="py-4 px-6 text-[#7A6E63]">
                          {product.createdAt
                            ? new Date(product.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </td>

                        <td className="py-4 px-6 font-mono text-[11px] text-[#7A6E63]">
                          {product._id ? (
                            <button
                              type="button"
                              onClick={(e) => handleCopyId(product._id, e)}
                              className="hover:underline flex items-center gap-1"
                            >
                              <span>#{product._id.slice(-6)}</span>
                              {copiedId === product._id && (
                                <span className="text-[#C9A96E] font-sans">✓</span>
                              )}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openQuickView(product);
                            }}
                            className="px-3 py-1.5 border border-[#ede9e3] hover:border-[#C9A96E] hover:text-[#C9A96E] text-[10px] uppercase tracking-wider transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* QUICK VIEW DETAIL MODAL */}
        {selectedProduct && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={closeQuickView}
          >
            <div
              className="bg-[#fbf9f6] border border-[#ede9e3] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={closeQuickView}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-[#1b1c1a] hover:text-white border border-[#ede9e3] flex items-center justify-center text-sm transition-all"
                title="Close (Esc)"
              >
                ✕
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 sm:p-10">
                {/* Modal Gallery */}
                <div className="flex flex-col gap-4">
                  {/* Main Image */}
                  <div className="aspect-[3/4] w-full bg-[#f4f1ea] border border-[#ede9e3] overflow-hidden relative">
                    <img
                      src={
                        selectedProduct.images?.[activeModalImageIndex]?.url ||
                        selectedProduct.images?.[0]?.url ||
                        "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80"
                      }
                      alt={selectedProduct.title}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>

                  {/* Thumbnail Row */}
                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {selectedProduct.images.map((img, idx) => (
                        <button
                          key={img._id || idx}
                          type="button"
                          onClick={() => setActiveModalImageIndex(idx)}
                          className={`w-16 h-20 flex-shrink-0 border transition-all overflow-hidden ${
                            activeModalImageIndex === idx
                              ? "border-[#C9A96E] ring-1 ring-[#C9A96E]"
                              : "border-[#ede9e3] opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={img.url}
                            alt=""
                            className="w-full h-full object-cover object-top"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Details */}
                <div className="flex flex-col justify-between">
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-[0.25em] font-medium mb-2"
                      style={{ color: "#C9A96E" }}
                    >
                      Product Specification
                    </p>

                    <h2
                      className="text-2xl sm:text-3xl font-light text-[#1b1c1a]"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      {selectedProduct.title}
                    </h2>

                    {/* Price tag */}
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-2xl font-light tracking-tight text-[#1b1c1a]">
                        {selectedProduct.price?.currency === "INR" ? "₹" : selectedProduct.price?.currency}{" "}
                        {Number(selectedProduct.price?.amount || 0).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-[#7A6E63]">
                        {selectedProduct.price?.currency || "INR"}
                      </span>
                    </div>

                    {/* Description */}
                    <div className="mt-6 pt-6 border-t border-[#ede9e3]">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[#7A6E63] font-medium block mb-2">
                        Description
                      </span>
                      <p className="text-sm text-[#1b1c1a] font-light leading-relaxed whitespace-pre-line">
                        {selectedProduct.description || "No description provided for this product."}
                      </p>
                    </div>

                    {/* Metadata specs */}
                    <div className="mt-6 pt-6 border-t border-[#ede9e3] flex flex-col gap-3 text-xs">
                      {selectedProduct._id && (
                        <div className="flex items-center justify-between">
                          <span className="text-[#7A6E63] uppercase tracking-wider text-[10px]">
                            Product ID
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyId(selectedProduct._id)}
                            className="font-mono text-[11px] text-[#1b1c1a] hover:text-[#C9A96E] flex items-center gap-1.5"
                          >
                            <span>{selectedProduct._id}</span>
                            <span className="text-[10px]">
                              {copiedId === selectedProduct._id ? "✓ Copied" : "📋"}
                            </span>
                          </button>
                        </div>
                      )}

                      {selectedProduct.seller && (
                        <div className="flex items-center justify-between">
                          <span className="text-[#7A6E63] uppercase tracking-wider text-[10px]">
                            Seller ID
                          </span>
                          <span className="font-mono text-[11px] text-[#7A6E63]">
                            {selectedProduct.seller}
                          </span>
                        </div>
                      )}

                      {selectedProduct.createdAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-[#7A6E63] uppercase tracking-wider text-[10px]">
                            Published On
                          </span>
                          <span className="text-[#1b1c1a]">
                            {new Date(selectedProduct.createdAt).toLocaleString("en-US", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-[#7A6E63] uppercase tracking-wider text-[10px]">
                          Gallery Assets
                        </span>
                        <span className="text-[#1b1c1a]">
                          {selectedProduct.images?.length || 0} media file(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Modal CTA footer */}
                  <div className="mt-8 pt-6 border-t border-[#ede9e3] flex items-center gap-3">
                    <button
                      type="button"
                      onClick={closeQuickView}
                      className="flex-1 py-3 text-xs uppercase tracking-[0.2em] font-medium border border-[#1b1c1a] hover:bg-[#1b1c1a] hover:text-white transition-colors text-center"
                    >
                      Done
                    </button>
                    <Link
                      to="/seller/create-product"
                      className="flex-1 py-3 text-xs uppercase tracking-[0.2em] font-medium bg-[#1b1c1a] text-white hover:brightness-125 transition-all text-center"
                    >
                      Add Another
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default Dashboard;
