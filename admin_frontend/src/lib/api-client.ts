import { OpenAPI, AuthService } from './api';

// Configure the API client base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'https://apiadmin.localtea.ru';
OpenAPI.BASE = API_BASE;

// Token refresh logic
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (typeof window === 'undefined') return '';
  
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    // No refresh token, redirect to login
    window.location.href = '/login';
    return '';
  }
  
  try {
    const response = await fetch(`${OpenAPI.BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    
    if (!response.ok) {
      throw new Error('Refresh failed');
    }
    
    const data = await response.json();
    localStorage.setItem('accessToken', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('refreshToken', data.refresh_token);
    }
    return data.access_token;
  } catch (error) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    return '';
  }
}

// Check if token is expired (simple check based on JWT structure)
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= exp - 60000; // Refresh 1 minute before expiry
  } catch {
    return true;
  }
}

// Export function to get a valid token (with auto-refresh)
export async function getValidToken(): Promise<string> {
  if (typeof window === 'undefined') return '';
  
  let token = localStorage.getItem('accessToken');
  if (!token) return '';
  
  // Check if token is expired or about to expire
  if (isTokenExpired(token)) {
    // Prevent multiple simultaneous refresh requests
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }
    
    if (refreshPromise) {
      token = await refreshPromise;
    }
  }
  
  return token || '';
}

// Token resolver - called on every request
OpenAPI.TOKEN = getValidToken;
