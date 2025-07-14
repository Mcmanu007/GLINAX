import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 Add Authorization header if access token exists
api.interceptors.request.use((config) => {
  const access = localStorage.getItem("access");
  if (access) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// 🔁 Handle expired token and refresh flow
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and refresh token available
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem("refresh")
    ) {
      originalRequest._retry = true;

      try {
        const res = await axios.post("http://127.0.0.1:8000/api/auth/token/refresh/", {
          refresh: localStorage.getItem("refresh"),
        });

        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);

        // Retry original request with new access
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshErr) {
        // Refresh failed → force logout
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/auth/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
