import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useProduct } from "../hooks/useProduct";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];
const MAX_IMAGES = 7;

const CreateProduct = () => {
  const { handleCreateProduct } = useProduct();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priceAmount: "",
    priceCurrency: "INR",
  });
  const [images, setImages] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addFiles = (files) => {
    const allowed = MAX_IMAGES - images.length;
    if (allowed <= 0) return;
    const incoming = Array.from(files).slice(0, allowed);
    const newImgs = incoming
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...newImgs]);
  };

  const removeImage = (index) => {
    setImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.title.trim()) {
      setErrorMessage("Product title is required.");
      return;
    }
    if (!formData.priceAmount || isNaN(Number(formData.priceAmount))) {
      setErrorMessage("Please enter a valid price.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("title", formData.title.trim());
      payload.append("description", formData.description.trim());
      payload.append("priceAmount", formData.priceAmount);
      payload.append("priceCurrency", formData.priceCurrency);
      images.forEach(({ file }) => payload.append("images", file));

      await handleCreateProduct(payload);
      navigate("/");
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase =
    "w-full bg-transparent outline-none py-3 text-sm transition-colors duration-300";

  const underlineStyle = {
    color: "#1b1c1a",
    borderBottom: "1px solid #d0c5b5",
    fontFamily: "'Inter', sans-serif",
  };

  const onFocus = (e) => (e.target.style.borderBottomColor = "#C9A96E");
  const onBlur = (e) => (e.target.style.borderBottomColor = "#d0c5b5");

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap"
        rel="stylesheet"
      />

      <main
        className="min-h-screen selection:bg-[#C9A96E]/30"
        style={{ backgroundColor: "#fbf9f6", fontFamily: "'Inter', sans-serif" }}
      >
        {/* Top bar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-6 sm:px-10 lg:px-16 py-5 border-b"
          style={{ backgroundColor: "#fbf9f6", borderColor: "#ede9e3" }}
        >
          <span
            className="text-sm tracking-[0.35em] uppercase"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: "#C9A96E" }}
          >
            Snitch.
          </span>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-[10px] uppercase tracking-[0.2em] transition-colors duration-200"
            style={{ color: "#7A6E63" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#C9A96E")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#7A6E63")}
          >
            ← Back
          </button>
        </header>

        {/* Page content */}
        <div className="max-w-2xl mx-auto px-6 sm:px-10 py-14 sm:py-20">
          {/* Page heading */}
          <header className="mb-14">
            <p
              className="text-[10px] uppercase tracking-[0.22em] mb-4 font-medium"
              style={{ color: "#C9A96E" }}
            >
              Seller Dashboard
            </p>
            <h1
              className="text-[2.6rem] sm:text-5xl font-light leading-[1.08]"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                color: "#1b1c1a",
              }}
            >
              New <em>Product</em>
            </h1>
            <p
              className="mt-3 text-sm font-light leading-relaxed"
              style={{ color: "#7A6E63" }}
            >
              Fill in the details below. Fields marked with * are required.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-col gap-10">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="product-title"
                className="text-[10px] uppercase tracking-[0.18em] font-medium"
                style={{ color: "#7A6E63" }}
              >
                Title *
              </label>
              <input
                id="product-title"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="e.g. Classic Oversized Tee"
                className={inputBase}
                style={underlineStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="product-description"
                className="text-[10px] uppercase tracking-[0.18em] font-medium"
                style={{ color: "#7A6E63" }}
              >
                Description
              </label>
              <textarea
                id="product-description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                placeholder="Describe your product — material, fit, occasion…"
                className={`${inputBase} resize-none`}
                style={underlineStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Price */}
            <div className="flex flex-col gap-3">
              <label
                className="text-[10px] uppercase tracking-[0.18em] font-medium"
                style={{ color: "#7A6E63" }}
              >
                Price *
              </label>
              <div className="flex items-end gap-5">
                {/* Currency */}
                <div className="flex flex-col gap-2 w-28 shrink-0">
                  <label
                    htmlFor="price-currency"
                    className="text-[9px] uppercase tracking-[0.15em]"
                    style={{ color: "#B5ADA3" }}
                  >
                    Currency
                  </label>
                  <select
                    id="price-currency"
                    name="priceCurrency"
                    value={formData.priceCurrency}
                    onChange={handleChange}
                    className={`${inputBase} cursor-pointer`}
                    style={{
                      ...underlineStyle,
                      appearance: "none",
                      WebkitAppearance: "none",
                      backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237A6E63' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.25rem center",
                      paddingRight: "1.25rem",
                    }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div className="flex flex-col gap-2 flex-1">
                  <label
                    htmlFor="price-amount"
                    className="text-[9px] uppercase tracking-[0.15em]"
                    style={{ color: "#B5ADA3" }}
                  >
                    Amount
                  </label>
                  <input
                    id="price-amount"
                    type="number"
                    name="priceAmount"
                    value={formData.priceAmount}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={inputBase}
                    style={underlineStyle}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label
                  className="text-[10px] uppercase tracking-[0.18em] font-medium"
                  style={{ color: "#7A6E63" }}
                >
                  Images
                </label>
                <span
                  className="text-[10px] tracking-wide tabular-nums"
                  style={{ color: "#B5ADA3" }}
                >
                  {images.length} / {MAX_IMAGES}
                </span>
              </div>

              {/* Drop zone */}
              {images.length < MAX_IMAGES && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) =>
                    e.key === "Enter" && fileInputRef.current?.click()
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className="flex flex-col items-center justify-center gap-3 py-10 px-6 border transition-colors duration-300 cursor-pointer"
                  style={{
                    borderColor: dragOver ? "#C9A96E" : "#d0c5b5",
                    borderStyle: "dashed",
                    backgroundColor: dragOver ? "#C9A96E0D" : "transparent",
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={dragOver ? "#C9A96E" : "#B5ADA3"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>

                  <p
                    className="text-xs text-center leading-relaxed"
                    style={{ color: dragOver ? "#C9A96E" : "#B5ADA3" }}
                  >
                    Drop images here or{" "}
                    <span
                      style={{
                        color: "#7A6E63",
                        textDecoration: "underline",
                        textUnderlineOffset: "3px",
                      }}
                    >
                      browse files
                    </span>
                  </p>
                  <p className="text-[10px]" style={{ color: "#d0c5b5" }}>
                    JPEG · PNG · WEBP — up to {MAX_IMAGES} images
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </div>
              )}

              {/* Preview grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-1">
                  {images.map(({ preview }, i) => (
                    <div
                      key={i}
                      className="relative group aspect-square overflow-hidden"
                    >
                      <img
                        src={preview}
                        alt={`preview-${i}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Hover overlay */}
                      <div
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ backgroundColor: "rgba(27,24,20,0.45)" }}
                      >
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="flex items-center justify-center w-7 h-7 rounded-full"
                          style={{ backgroundColor: "#fbf9f6" }}
                          aria-label="Remove image"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="#1b1c1a"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          >
                            <line x1="1" y1="1" x2="11" y2="11" />
                            <line x1="11" y1="1" x2="1" y2="11" />
                          </svg>
                        </button>
                      </div>

                      {/* Cover badge */}
                      {i === 0 && (
                        <span
                          className="absolute bottom-1.5 left-1.5 text-[8px] uppercase tracking-[0.15em] px-1.5 py-0.5"
                          style={{ backgroundColor: "#C9A96E", color: "#fbf9f6" }}
                        >
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {errorMessage && (
              <p role="alert" className="text-sm" style={{ color: "#9b3d32" }}>
                {errorMessage}
              </p>
            )}

            {/* Divider */}
            <div
              className="h-px w-full"
              style={{ backgroundColor: "#ede9e3" }}
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 text-[11px] uppercase tracking-[0.25em] font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                backgroundColor: "#1b1c1a",
                color: "#fbf9f6",
                fontFamily: "'Inter', sans-serif",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = "#C9A96E";
                  e.currentTarget.style.color = "#1b1c1a";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#1b1c1a";
                e.currentTarget.style.color = "#fbf9f6";
              }}
            >
              {isSubmitting ? "Publishing…" : "Publish Product"}
            </button>

            <p
              className="text-center text-[10px]"
              style={{ color: "#B5ADA3" }}
            >
              You can edit or remove this listing from your seller dashboard at
              any time.
            </p>
          </form>
        </div>
      </main>
    </>
  );
};

export default CreateProduct;
