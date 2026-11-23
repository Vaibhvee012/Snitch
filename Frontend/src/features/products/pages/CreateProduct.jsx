
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

    const [variant, setVariant] = useState({
        color: "Default",
        size: "Free Size",
        priceAmount: "",
        priceCurrency: "INR",
        stock: "",
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

    const handleVariantChange = (e) => {
        const { name, value } = e.target;
        setVariant((prev) => ({ ...prev, [name]: value }));
    };

    const addFiles = (files) => {
        const allowed = MAX_IMAGES - images.length;
        if (allowed <= 0) return;

        const incoming = Array.from(files).slice(0, allowed);

        const newImgs = incoming
            .filter((file) => file.type.startsWith("image/"))
            .map((file) => ({
                file,
                preview: URL.createObjectURL(file),
            }));

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

        if (!formData.priceAmount || Number(formData.priceAmount) <= 0) {
            setErrorMessage("Please enter a valid product price.");
            return;
        }

        if (
            !variant.priceAmount ||
            Number(variant.priceAmount) <= 0
        ) {
            setErrorMessage("Please enter a valid variant price.");
            return;
        }

        if (variant.stock === "" || Number(variant.stock) < 0) {
            setErrorMessage("Please enter valid variant stock.");
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = new FormData();

            payload.append("title", formData.title.trim());
            payload.append("description", formData.description.trim());
            payload.append("priceAmount", formData.priceAmount);
            payload.append("priceCurrency", formData.priceCurrency);

            const variants = [
                {
                    attributes: {
                        color: variant.color,
                        size: variant.size,
                    },
                    price: {
                        amount: Number(variant.priceAmount),
                        currency: variant.priceCurrency,
                    },
                    stock: Number(variant.stock),
                },
            ];

            payload.append("variants", JSON.stringify(variants));

            images.forEach(({ file }) => {
                payload.append("images", file);
            });

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

    const onFocus = (e) => {
        e.target.style.borderBottomColor = "#C9A96E";
    };

    const onBlur = (e) => {
        e.target.style.borderBottomColor = "#d0c5b5";
    };

    return (
        <>
            <link
                href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500;600&display=swap"
                rel="stylesheet"
            />

            <main
                className="min-h-screen selection:bg-[#C9A96E]/30"
                style={{
                    backgroundColor: "#fbf9f6",
                    fontFamily: "'Inter', sans-serif",
                }}
            >
                <header
                    className="sticky top-0 z-20 flex items-center justify-between px-6 sm:px-10 lg:px-16 py-5 border-b"
                    style={{
                        backgroundColor: "#fbf9f6",
                        borderColor: "#ede9e3",
                    }}
                >
                    <span
                        className="text-sm tracking-[0.35em] uppercase"
                        style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            color: "#C9A96E",
                        }}
                    >
                        Snitch.
                    </span>

                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="text-[10px] uppercase tracking-[0.2em]"
                        style={{ color: "#7A6E63" }}
                    >
                        ← Back
                    </button>
                </header>

                <div className="max-w-2xl mx-auto px-6 sm:px-10 py-14 sm:py-20">
                    <header className="mb-14">
                        <p
                            className="text-[10px] uppercase tracking-[0.22em] mb-4 font-medium"
                            style={{ color: "#C9A96E" }}
                        >
                            Seller Dashboard
                        </p>

                        <h1
                            className="text-[2.6rem] sm:text-5xl font-light"
                            style={{
                                fontFamily: "'Cormorant Garamond', serif",
                                color: "#1b1c1a",
                            }}
                        >
                            New <em>Product</em>
                        </h1>

                        <p className="mt-3 text-sm" style={{ color: "#7A6E63" }}>
                            Fill in the product and variant details.
                        </p>
                    </header>

                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-10"
                    >
                        {/* Product Details */}
                        <section className="flex flex-col gap-6">
                            <h2
                                className="text-xs uppercase tracking-[0.2em] font-medium"
                                style={{ color: "#C9A96E" }}
                            >
                                Product Details
                            </h2>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase tracking-[0.18em]">
                                    Title *
                                </label>

                                <input
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

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase tracking-[0.18em]">
                                    Description
                                </label>

                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Describe your product..."
                                    className={`${inputBase} resize-none`}
                                    style={underlineStyle}
                                    onFocus={onFocus}
                                    onBlur={onBlur}
                                />
                            </div>

                            <div className="flex flex-col gap-3">
                                <label className="text-[10px] uppercase tracking-[0.18em]">
                                    Base Price *
                                </label>

                                <div className="flex items-end gap-5">
                                    <select
                                        name="priceCurrency"
                                        value={formData.priceCurrency}
                                        onChange={handleChange}
                                        className={inputBase}
                                        style={underlineStyle}
                                    >
                                        {CURRENCIES.map((currency) => (
                                            <option key={currency} value={currency}>
                                                {currency}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="number"
                                        name="priceAmount"
                                        value={formData.priceAmount}
                                        onChange={handleChange}
                                        required
                                        min="0.01"
                                        step="0.01"
                                        placeholder="Amount"
                                        className={inputBase}
                                        style={underlineStyle}
                                        onFocus={onFocus}
                                        onBlur={onBlur}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Variant Details */}
                        <section className="flex flex-col gap-6">
                            <div>
                                <h2
                                    className="text-xs uppercase tracking-[0.2em] font-medium"
                                    style={{ color: "#C9A96E" }}
                                >
                                    Variant Details
                                </h2>

                                <p className="text-xs mt-2" style={{ color: "#7A6E63" }}>
                                    Default color and free-size options are preselected.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] uppercase tracking-[0.18em]">
                                        Color
                                    </label>

                                    <select
                                        name="color"
                                        value={variant.color}
                                        onChange={handleVariantChange}
                                        className={inputBase}
                                        style={underlineStyle}
                                    >
                                        <option value="Default">Default</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] uppercase tracking-[0.18em]">
                                        Size
                                    </label>

                                    <select
                                        name="size"
                                        value={variant.size}
                                        onChange={handleVariantChange}
                                        className={inputBase}
                                        style={underlineStyle}
                                    >
                                        <option value="Free Size">Free Size</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase tracking-[0.18em]">
                                    Variant Price *
                                </label>

                                <div className="flex items-end gap-5">
                                    <select
                                        name="priceCurrency"
                                        value={variant.priceCurrency}
                                        onChange={handleVariantChange}
                                        className={inputBase}
                                        style={underlineStyle}
                                    >
                                        {CURRENCIES.map((currency) => (
                                            <option key={currency} value={currency}>
                                                {currency}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="number"
                                        name="priceAmount"
                                        value={variant.priceAmount}
                                        onChange={handleVariantChange}
                                        min="0.01"
                                        step="0.01"
                                        required
                                        placeholder="Variant price"
                                        className={inputBase}
                                        style={underlineStyle}
                                        onFocus={onFocus}
                                        onBlur={onBlur}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase tracking-[0.18em]">
                                    Available Stock *
                                </label>

                                <input
                                    type="number"
                                    name="stock"
                                    value={variant.stock}
                                    onChange={handleVariantChange}
                                    min="0"
                                    step="1"
                                    required
                                    placeholder="Enter quantity"
                                    className={inputBase}
                                    style={underlineStyle}
                                    onFocus={onFocus}
                                    onBlur={onBlur}
                                />
                            </div>
                        </section>

                        {/* Images */}
                        <section className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] uppercase tracking-[0.18em] font-medium">
                                    Images
                                </label>

                                <span className="text-[10px]" style={{ color: "#B5ADA3" }}>
                                    {images.length} / {MAX_IMAGES}
                                </span>
                            </div>

                            {images.length < MAX_IMAGES && (
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => fileInputRef.current?.click()}
                                    onKeyDown={(e) =>
                                        e.key === "Enter" &&
                                        fileInputRef.current?.click()
                                    }
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragOver(true);
                                    }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    className="flex flex-col items-center justify-center gap-3 py-10 px-6 border border-dashed cursor-pointer"
                                    style={{
                                        borderColor: dragOver ? "#C9A96E" : "#d0c5b5",
                                        backgroundColor: dragOver ? "#C9A96E0D" : "transparent",
                                    }}
                                >
                                    <p className="text-xs" style={{ color: "#7A6E63" }}>
                                        Drop images here or browse files
                                    </p>

                                    <p className="text-[10px]" style={{ color: "#B5ADA3" }}>
                                        JPEG · PNG · WEBP
                                    </p>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            addFiles(e.target.files);
                                            e.target.value = "";
                                        }}
                                    />
                                </div>
                            )}

                            {images.length > 0 && (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {images.map(({ preview }, index) => (
                                        <div
                                            key={index}
                                            className="relative aspect-square overflow-hidden"
                                        >
                                            <img
                                                src={preview}
                                                alt={`Product ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />

                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-2 right-2 bg-white rounded-full w-7 h-7"
                                            >
                                                ×
                                            </button>

                                            {index === 0 && (
                                                <span className="absolute bottom-2 left-2 text-[8px] px-2 py-1 bg-[#C9A96E] text-white">
                                                    Cover
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {errorMessage && (
                            <p role="alert" className="text-sm text-red-700">
                                {errorMessage}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 text-[11px] uppercase tracking-[0.25em] font-medium disabled:opacity-60"
                            style={{
                                backgroundColor: "#1b1c1a",
                                color: "#fbf9f6",
                            }}
                        >
                            {isSubmitting ? "Publishing..." : "Publish Product"}
                        </button>
                    </form>
                </div>
            </main>
        </>
    );
};

export default CreateProduct;
