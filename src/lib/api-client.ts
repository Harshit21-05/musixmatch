/**
 * Centralized API client utility with NEXT_PUBLIC_API_BASE support.
 * Essential for Capacitor Android APK wrapping where requests run from capacitor:// or localhost
 * and must point to the remote production backend if configured.
 */

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/$/, '');

/**
 * Returns a fully qualified or relative URL depending on NEXT_PUBLIC_API_BASE.
 */
export function apiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${cleanEndpoint}`;
}

/**
 * Enhanced fetch wrapper for API endpoints.
 */
export async function apiFetch(endpoint: string, init?: RequestInit): Promise<Response> {
  const url = apiUrl(endpoint);
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}
