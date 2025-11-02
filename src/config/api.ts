// API Configuration
// This file centralizes all API URL management
// Uses environment variables only - no hardcoded URLs

// Get the current API base URL from environment variables
export const getApiBaseUrl = (): string => {
  // Use environment variable (set in Vercel for production)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Check if we're in production (Vercel)
  if (import.meta.env.PROD) {
    // In production, try to construct the API URL
    const vercelUrl = import.meta.env.VITE_VERCEL_URL;
    if (vercelUrl) {
      return `https://${vercelUrl}/api`;
    }
    
    // Fallback for production - use environment variable
    const fallbackUrl = import.meta.env.VITE_FALLBACK_API_URL;
    if (fallbackUrl) {
      return fallbackUrl;
    }
    
    // No fallback configured
    console.error('No API URL configured for production. Please set VITE_API_BASE_URL or VITE_FALLBACK_API_URL environment variable.');
    throw new Error('API URL not configured for production');
  }
  
  // Development fallback - use environment variable
  const devUrl = import.meta.env.VITE_DEV_API_URL;
  if (devUrl) {
    return devUrl;
  }
  
  // Last resort for development
  console.warn('No development API URL configured. Please set VITE_DEV_API_URL environment variable.');
  return 'http://localhost:5000/api';
};

// Export the current API base URL
export const API_BASE_URL = getApiBaseUrl();

// Export individual API endpoints for easy access
export const API_ENDPOINTS = {
  // Dashboard
  DASHBOARD_STATS: '/dashboard/stats',
  DASHBOARD_ACTIVITIES: '/dashboard/activities',
  
  // Customers
  CUSTOMERS: '/customers',
  CUSTOMER_BY_ID: (id: string) => `/customers/${id}`,
  CUSTOMER_STATUS: (id: string) => `/customers/${id}/status`,
  
  // Orders
  ORDERS: '/orders',
  ORDER_BY_ID: (id: string) => `/orders/${id}`,
  
  // Riders
  RIDERS: '/riders',
  RIDER_BY_ID: (id: string) => `/riders/${id}`,
  RIDER_DASHBOARD: (id: string) => `/riders/${id}/dashboard`,
  
  // Payments
  PAYMENTS: '/payments',
  PAYMENT_BY_ID: (id: string) => `/payments/${id}`,
  
  // Reports
  REPORTS_ANALYTICS: '/reports/analytics',
  REPORTS_DATA: '/reports/data',
  
  // System
  TEST: '/test',
  HEALTH: '/health'
};

// Log current configuration (for debugging)
console.log('API Configuration:', {
  apiBaseUrl: API_BASE_URL,
  isUsingEnvVar: !!import.meta.env.VITE_API_BASE_URL,
  environment: import.meta.env.VITE_API_BASE_URL ? 'production' : 'development'
});
