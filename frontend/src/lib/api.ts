const API_URL = "http://localhost:8001";  // Backend is on port 8001

export const getApiUrl = () => API_URL;

export const getWsUrl = () => {
  const base = API_URL.replace(/^http/, "ws");
  return base;
};
