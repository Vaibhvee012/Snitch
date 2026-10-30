import { createBrowserRouter, Navigate } from "react-router-dom";
import Register from "../features/auth/pages/Register.jsx";
import Login from "../features/auth/pages/Login.jsx";
import CreateProduct from "../features/products/pages/CreateProduct.jsx";
import Dashboard from "../features/products/pages/Dashboard.jsx";
import Proctected from "../features/auth/components/Proctected.jsx";
import Home from "../features/products/pages/Home.jsx"
import ProductDetails from "../features/products/pages/ProductDetail.jsx";
import SellerProductDetails from "../features/products/pages/SellerProductDetail.jsx";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: <Home/>,
  },
  {
    path: "/home",
    element: <Navigate to="/" replace />,
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
    path: "/products/:productId",
    element: <ProductDetails />,
  },
  {
    path: "/product/:productId",
    element: <ProductDetails />,
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
        path: "/seller/create-product",
        element: (
          <Proctected role="seller">
            <CreateProduct />
          </Proctected>
        ),
      },
      {
        path: "/seller/dashboard",
        element: (
          <Proctected role="seller">
            <Dashboard />
          </Proctected>
        ),
      },
      {
        path: "/seller/product/:productId",
        element: (
          <Proctected role="seller">
            <SellerProductDetails />
          </Proctected>
        ),
      },
    ],
  },
]);