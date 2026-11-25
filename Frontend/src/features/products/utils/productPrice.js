export const getProductPriceRange = (product) => {
    const variantPrices = (product?.variants || [])
        .map((variant) => Number(variant?.price?.amount))
        .filter((amount) => Number.isFinite(amount) && amount > 0);
    const amounts = variantPrices.length
        ? variantPrices
        : [Number(product?.price?.amount) || 0];

    return {
        currency: product?.price?.currency || "INR",
        min: Math.min(...amounts),
        max: Math.max(...amounts),
    };
};

export const formatProductPriceRange = (product) => {
    const { currency, min, max } = getProductPriceRange(product);
    const formattedMin = min.toLocaleString("en-IN");
    const formattedMax = max.toLocaleString("en-IN");

    return `${currency} ${formattedMin}${min === max ? "" : ` - ${formattedMax}`}`;
};
