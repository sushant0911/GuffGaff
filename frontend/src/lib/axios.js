import axios from "axios";

const apiBase =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL)
    || (typeof window !== "undefined" && window.__API_URL__)
    || (import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "https://guffgaff-backend-s983.onrender.com/api");

export const axiosInstance = axios.create({
  baseURL: apiBase,
  withCredentials: true,
});
