import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
    withCredentials: true, // Important for cookies
});

// Response interceptor to handle token refresh? 
// The browser handles sending cookies automatically. 
// If we get 401, we might want to try /auth/refresh endpoint.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                // Attempt refresh
                await api.post('/auth/refresh');
                // Retry original request
                return api(originalRequest);
            } catch (refreshError) {
                // If refresh fails, user is logged out
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
