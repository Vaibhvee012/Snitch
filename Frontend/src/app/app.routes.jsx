import { createBrowserRouter, Navigate } from "react-router-dom";
import Register from "../features/auth/pages/Register.jsx";
import Login from "../features/auth/pages/Login.jsx";
import CreateProduct from "../features/products/pages/CreateProduct.jsx";
import Dashboard from "../features/products/pages/Dashboard.jsx";
import Proctected from "../features/auth/components/Proctected.jsx";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: <h1>Hello World</h1>,
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
    ],
  },
]);
