import React, { useCallback } from "react";
import {
  createProduct,
  getSellerProduct,
  getAllProducts,
  getProductById,
  addProductVariant,
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

  const handleAddProductVariant = useCallback(async (productId, newProductVariant) => {
    const data = await addProductVariant(productId, newProductVariant);
    return data;
  }, []);

  return {
    handleCreateProduct,
    handleGetSellerProduct,
    handleGetAllProducts,
    handleGetProductById,
    handleAddProductVariant,
    handleAddVariant: handleAddProductVariant,
  };
};