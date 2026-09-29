import { createBrowserRouter } from "react-router-dom";
import Register from "../features/auth/pages/Register.jsx";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: <h1>Hello World</h1>,
  },
  {
    path: "/register",
    element: <Register />,
  },
]);