const API_URL = "http://localhost:8000";  // Backend is on port 8000

export const getApiUrl = () => API_URL;

export const getWsUrl = () => {
  const base = API_URL.replace(/^http/, "ws");
  return base;
};
