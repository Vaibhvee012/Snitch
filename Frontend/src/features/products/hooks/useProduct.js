
import React, { useCallback } from "react";
import {
  createProduct,
  getSellerProduct,
  getAllProducts,
  getProductById,
  addProductVariant,
  updateVariantStock,
  deleteProductVariant,
} from "../service/product.api";

import { useDispatch } from "react-redux";
import {
  setSellerProducts,
  setProducts,
} from "../state/product.slice";

export const useProduct = () => {
  const dispatch = useDispatch();

  const handleCreateProduct = useCallback(async (formData) => {
    const data = await createProduct(formData);
    return data.product;
  }, []);

  const handleGetSellerProduct = useCallback(async () => {
    const data = await getSellerProduct();

    const products =
      data.products ||
      (data.product
        ? [data.product]
        : Array.isArray(data)
          ? data
          : []);

    dispatch(setSellerProducts(products));

    return products;
  }, [dispatch]);

  const handleGetAllProducts = useCallback(async () => {
    const data = await getAllProducts();

    const products =
      data.products ||
      (Array.isArray(data)
        ? data
        : data.data ||
          (data.product
            ? [data.product]
            : data._id
              ? [data]
              : []));

    dispatch(setProducts(products));

    return products;
  }, [dispatch]);

  const handleGetProductById = useCallback(async (productId) => {
    const data = await getProductById(productId);
    return data?.product || data;
  }, []);

  const handleAddVariant = useCallback(async (productId, variantData) => {
    const data = await addProductVariant(productId, variantData);
    return data;
  }, []);

  const handleUpdateVariantStock = useCallback(async (productId, variantId, stock) => {
    const data = await updateVariantStock(productId, variantId, stock);
    return data;
  }, []);

  const handleDeleteVariant = useCallback(async (productId, variantId) => {
    const data = await deleteProductVariant(productId, variantId);
    return data;
  }, []);

  return {
    handleCreateProduct,
    handleGetSellerProduct,
    handleGetAllProducts,
    handleGetProductById,
    handleAddVariant,
    handleUpdateVariantStock,
    handleDeleteVariant,
  };
};
