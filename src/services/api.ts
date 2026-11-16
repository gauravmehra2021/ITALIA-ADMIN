import type { ApiResponse } from '../types';

const rawBase = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5057').trim().replace(/\/+$/, '');
const API_BASE = rawBase.endsWith('/api') ? rawBase.slice(0, -4) : rawBase;

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]> | null;

  constructor(message: string, status: number, errors?: Record<string, string[]> | null) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

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

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Unable to reach the API. Is the backend running?', 0);
  }

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

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
