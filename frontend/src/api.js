import axios from "axios";

/**
 * API base URL priority:
 * 1) window.__API_BASE__  (optional: set in public/index.html)
 * 2) process.env.REACT_APP_API_BASE_URL  (set via frontend/.env)
 * 3) fallback: http://127.0.0.1:8000
 */
const BASE_URL =
  (typeof window !== "undefined" && window.__API_BASE__) ||
  process.env.REACT_APP_API_BASE_URL ||
  "http://127.0.0.1:8000";

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail =
      err?.response?.data?.detail ||
      err?.response?.data?.message ||
      err?.message ||
      "Request failed";
    return Promise.reject(new Error(detail));
  }
);

// ---------- Auth ----------
export const registerUser = (data) => API.post("/users", data);      // {username, email, password}
export const loginUser    = (data) => API.post("/auth/login", data); // {email, password}

// ---------- Detections / ML ----------
export const detectThreat  = (payload) => API.post("/detect", payload); // {src_ip, dest_ip, features, threshold, block_target}
export const getDetections = () => API.get("/detections");

// ---------- Blacklist ----------
export const getBlacklist    = (q) => API.get("/blacklist", { params: q ? { q } : {} });
export const addBlacklist    = (data) => API.post("/blacklist", data);   // {ip, reason?}
export const deleteBlacklist = (ip) => API.delete(`/blacklist/${encodeURIComponent(ip)}`);

// ---------- Health ----------
export const health = () => API.get("/health");

export default API;
