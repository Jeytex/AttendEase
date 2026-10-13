const getDefaultApiUrl = () => {
  if (import.meta.env.VITE_API_URL !== undefined) {
    return String(import.meta.env.VITE_API_URL).replace(/\/+$/, "");
  }
  return "";
};

export const API_URL = getDefaultApiUrl();

export const getAuthHeaders = (token) => {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};
