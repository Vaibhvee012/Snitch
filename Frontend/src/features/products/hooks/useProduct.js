import { useCallback } from "react";
import {
  createProduct,
  getSellerProduct,
  getAllProducts,
  getProductById,
  addProductVariant,
  updateProductPrice,
  updateProductVariantStock,
  updateProductVariantPrice,
  updateProductVariant,
  deleteProductVariant,
} from "../service/product.api";
import { useDispatch } from "react-redux";
import { setSellerProducts, setProducts } from "../state/product.slice";

export const useProduct = () => {
  const dispatch = useDispatch();

  const handleCreateProduct = useCallback(async (formData) => {
    const data = await createProduct(formData);
    return data.product;
  }, []);

  const handleGetSellerProduct = useCallback(async () => {
    const data = await getSellerProduct();
    const products = data.products || data.product || (Array.isArray(data) ? data : []);
    dispatch(setSellerProducts(products));
    return products;
  }, [dispatch]);

  const handleGetAllProducts = useCallback(async () => {
    const data = await getAllProducts();
    const products = data.products || (Array.isArray(data) ? data : []);
    dispatch(setProducts(products));
    return products;
  }, [dispatch]);

  const handleGetProductById = useCallback(async (productId) => {
    const data = await getProductById(productId);
    return data?.product || data;
  }, []);

  const handleUpdateProductPrice = useCallback(async (productId, amount) => {
    const data = await updateProductPrice(productId, amount);
    return data.product;
  }, []);

  const handleUpdateProductVariantStock = useCallback(async (productId, variantId, stock) => {
    const data = await updateProductVariantStock(productId, variantId, stock);
    return data.product;
  }, []);

  const handleUpdateProductVariantPrice = useCallback(async (productId, variantId, amount) => {
    const data = await updateProductVariantPrice(productId, variantId, amount);
    return data.product;
  }, []);

  const handleUpdateProductVariant = useCallback(async (productId, variantId, variant) => {
    const data = await updateProductVariant(productId, variantId, variant);
    return data;
  }, []);

  const handleDeleteProductVariant = useCallback(async (productId, variantId) => {
    const data = await deleteProductVariant(productId, variantId);
    return data;
  }, []);

  const handleAddProductVariant = useCallback(async (productId, newProductVariant) => {
    const data = await addProductVariant(productId, newProductVariant);
    return data;
  }, []);

  return {
    handleCreateProduct,
    handleGetSellerProduct,
    handleGetAllProducts,
    handleGetProductById,
    handleUpdateProductPrice,
    handleUpdateProductVariantStock,
    handleUpdateProductVariantPrice,
    handleUpdateProductVariant,
    handleDeleteProductVariant,
    handleAddProductVariant,
    handleAddVariant: handleAddProductVariant,
  };
};