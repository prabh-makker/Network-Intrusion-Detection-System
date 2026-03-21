const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const getApiUrl = () => API_URL;

export const getWsUrl = () => {
  const base = API_URL.replace(/^http/, "ws");
  return base;
};
