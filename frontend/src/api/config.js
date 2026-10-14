/**
 * Resolve the base API URL from Vite environment variables, stripping any trailing slashes.
 * @returns {string} Normalized base URL (empty string for Vite proxy / relative requests)
 */
const getDefaultApiUrl = () => {
  if (import.meta.env.VITE_API_URL !== undefined) {
    return String(import.meta.env.VITE_API_URL).replace(/\/+$/, "");
  }
  return "";
};

export const API_URL = getDefaultApiUrl();

/**
 * Construct JSON request headers with optional Bearer authentication token.
 * @param {string} [token] - JWT access token
 * @returns {Record<string, string>} HTTP headers object
 */
export const getAuthHeaders = (token) => {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};
