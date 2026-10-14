import { createBrowserRouter } from "react-router-dom";
import Register from "../features/auth/pages/Register.jsx";
import Login from "../features/auth/pages/Login.jsx";
import CreateProduct from "../features/products/pages/CreateProduct.jsx";
import Dashboard from "../features/products/pages/Dashboard.jsx";

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
    path: "/seller",
    children:[
      {
        path:"/seller/create-product",
        element:<CreateProduct />
      },
      {
        path:"/seller/dashboard",
        element:<Dashboard />
      }
    ],
  },
]);
