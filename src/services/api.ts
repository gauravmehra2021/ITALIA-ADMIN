import type { ApiResponse } from '../types';

// Live builds must never fall back to a local address.
const rawBase = (import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://api.sseuropa.com' : 'http://localhost:5080')).trim().replace(/\/+$/, '');
export const API_BASE = rawBase.endsWith('/api') ? rawBase.slice(0, -4) : rawBase;

/** Course media paths from the API (/content/…, /uploads/…) become absolute URLs. */
export function mediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]> | null;

  constructor(message: string, status: number, errors?: Record<string, string[]> | null) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

/** Fired when the server rejects the saved login, so the app can return to the login page. */
export const SESSION_EXPIRED_EVENT = 'sseuropa:session-expired';
export const SESSION_EXPIRED_FLAG = 'sseuropa_session_expired';

function getToken() {
  return localStorage.getItem('sseuropa_token');
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  // Normal requests time out after 30 s; uploads (FormData) can take as long as they need.
  const controller = new AbortController();
  const timeoutId = options.body instanceof FormData ? undefined : setTimeout(() => controller.abort(), 30000);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: options.signal ?? controller.signal,
    });
  } catch {
    throw new ApiError('Unable to reach the API. Is the backend running?', 0);
  } finally {
    clearTimeout(timeoutId);
  }

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  // The saved login is no longer accepted (expired, or the server was restarted with a fresh database).
  // Tell the app so it can sign out and show the login page instead of failing on every screen.
  if (response.status === 401 && token) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new ApiError('Your session has ended. Please sign in again.', 401);
  }

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.message ?? `Request failed (${response.status})`,
      response.status,
      payload?.errors,
    );
  }

  return payload!.data as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  postForm: <T>(path: string, formData: FormData) =>
    apiRequest<T>(path, { method: 'POST', body: formData }),
  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
