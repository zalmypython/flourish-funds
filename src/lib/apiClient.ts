import axios, { AxiosError } from 'axios';
import { getDeviceFingerprint } from '@/utils/encryption';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Device-Fingerprint': getDeviceFingerprint(),
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Enhanced error handling and security
apiClient.interceptors.response.use(
  (response) => {
    // Log successful API calls for audit
    console.debug(`API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status,
      timestamp: new Date().toISOString()
    });
    return response;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;
    const config = error.config;
    
    // Log security events
    console.warn(`API Error: ${config?.method?.toUpperCase()} ${config?.url}`, {
      status,
      error: error.response?.data,
      timestamp: new Date().toISOString()
    });
    
    // Handle different error types
    if (status === 401) {
      // Unauthorized - clear auth and redirect
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/';
    } else if (status === 429) {
      // Rate limited
      const retryAfter = error.response?.headers['retry-after'];
      if (retryAfter) {
        console.warn(`Rate limited. Retry after: ${retryAfter} seconds`);
      }
    } else if (status === 403) {
      // Forbidden - possible security issue
      console.error('Access forbidden - possible security violation');
    } else if (!status) {
      // Network error
      console.error('Network error - check connection');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;