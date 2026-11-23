import { createBrowserRouter, Navigate } from "react-router-dom";

import Register from "../features/auth/pages/Register.jsx";
import Login from "../features/auth/pages/Login.jsx";

import CreateProduct from "../features/products/pages/CreateProduct.jsx";
import Dashboard from "../features/products/pages/Dashboard.jsx";
import Home from "../features/products/pages/Home.jsx";
import ProductDetails from "../features/products/pages/ProductDetail.jsx";
import SellerProductDetails from "../features/products/pages/SellerProductDetail.jsx";
import Cart from "../features/cart/pages/Cart.jsx";
import Proctected from "../features/auth/components/Proctected.jsx";
import Applayout from "./Applayout.jsx";

import CreateProduct from "../features/products/pages/CreateProduct.jsx";
import Dashboard from "../features/products/pages/Dashboard.jsx";
import Home from "../features/products/pages/Home.jsx";
import ProductDetails from "../features/products/pages/ProductDetail.jsx";
import SellerProductDetails from "../features/products/pages/SellerProductDetail.jsx";
import Cart from "../features/cart/pages/Cart.jsx";

import Proctected from "../features/auth/components/Proctected.jsx";
import Applayout from "./Applayout.jsx";

export const routes = createBrowserRouter([
  {
    element: <Applayout />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/home",
        element: <Navigate to="/" replace />,
      },
      {
        path: "/products/:productId",
        element: <ProductDetails />,
      },
      {
        path: "/product/:productId",
        element: <ProductDetails />,
      },
    ],
  },
  {
    path: "/cart",
    element: (
      <Proctected>
        <Cart />
      </Proctected>
    ),
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/dashboard",
    element: <Navigate to="/seller/dashboard" replace />,
  },
  {
    path: "/create-product",
    element: <Navigate to="/seller/create-product" replace />,
  },
  {
    path: "/seller",
    children: [
      {
        path: "create-product",
        element: (
          <Proctected role="seller">
            <CreateProduct />
          </Proctected>
        ),
      },
      {
        path: "dashboard",
        element: (
          <Proctected role="seller">
            <Dashboard />
          </Proctected>
        ),
      },
      {
        path: "product/:productId",
        element: (
          <Proctected role="seller">
            <SellerProductDetails />
          </Proctected>
        ),
      },
    ],
  },
]);
