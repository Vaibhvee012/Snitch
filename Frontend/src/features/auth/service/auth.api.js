
import axios from "axios";

const authApiInstance = axios.create({
    baseURL: "/api/auth",
    withCredentials: true,
});


export async function register({
    email,
    contact,
    password,
    fullname,
    isSeller,
}) {
    try {
        const response = await authApiInstance.post("/register", {
            email,
            contact,
            password,
            fullname,
            isSeller,
        });

        return response.data;
    } catch (error) {
        console.error(
            "Registration API Error:",
            error.response?.data || error.message
        );
        throw error;
    }
}


export async function login({ email, password }) {
    const response = await authApiInstance.post("/login", {
        email,
        password,
    });

    return response.data;
}

export async function getMe() {
    const response = await authApiInstance.get("/me");
    return response.data;
}
