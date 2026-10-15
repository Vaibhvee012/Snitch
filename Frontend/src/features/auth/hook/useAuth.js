
import { useDispatch } from "react-redux";
import { setUser, setLoading } from "../state/auth.slice";
import { register, login, getMe } from "../service/auth.api";

export const useAuth = () => {
  const dispatch = useDispatch();

  async function handleRegister({
    email,
    contact,
    password,
    fullname,
    isSeller = false,
  }) {
    const data = await register({
      email,
      contact,
      password,
      fullname,
      isSeller,
    });

    dispatch(setUser(data.user));

    return data;
  }

  async function handleLogin({ email, password }) {
    const data = await login({ email, password });

    dispatch(setUser(data.user));

    return data;
  }

  async function handleGetMe() {
    try {
      dispatch(setLoading(true));

      const data = await getMe();

      dispatch(setUser(data.user));

      return data;
    } catch (error) {
      dispatch(setUser(null));

      if (error.response?.status !== 401) {
        console.error("Unable to get current user:", error);
      }

      return null;
    } finally {
      dispatch(setLoading(false));
    }
  }

  return {
    handleRegister,
    handleLogin,
    handleGetMe,
  };
};
