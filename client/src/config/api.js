// API configuration for production deployment
const API_URL = import.meta.env.VITE_API_URL || '';

// Wrapper function for fetch that prepends API_URL
export async function apiFetch(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    return fetch(url, options);
}

export default API_URL;
