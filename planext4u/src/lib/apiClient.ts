/**
 * HTTP API client — wraps fetch to talk to the Planext4U backend.
 * Handles: base URL, JWT auth headers, token refresh, error normalization.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// ─── Token storage ────────────────────────────────────────────────────────────

export const tokenStore = {
  getAccess: () => localStorage.getItem('p4u_access_token'),
  getRefresh: () => localStorage.getItem('p4u_refresh_token'),
  set: (access: string, refresh: string) => {
    localStorage.setItem('p4u_access_token', access);
    localStorage.setItem('p4u_refresh_token', refresh);
  },
  clear: () => {
    localStorage.removeItem('p4u_access_token');
    localStorage.removeItem('p4u_refresh_token');
    localStorage.removeItem('p4u_user');
  },
};

// ─── Token refresh ────────────────────────────────────────────────────────────

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return null;

  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push((token) => resolve(token));
    });
  }

  isRefreshing = true;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    // Refresh rejected: drop just the access token so the next call retries refresh,
    // but KEEP the user logged in UI-side. Only explicit logout clears the session.
    if (res.status === 401 || res.status === 403) {
      refreshQueue.forEach((cb) => cb(''));
      refreshQueue = [];
      return null;
    }
    if (!res.ok) {
      refreshQueue.forEach((cb) => cb(''));
      refreshQueue = [];
      return null;
    }

    const data = await res.json();
    const { access_token, refresh_token } = data.data;
    tokenStore.set(access_token, refresh_token);
    refreshQueue.forEach((cb) => cb(access_token));
    refreshQueue = [];
    return access_token;
  } catch {
    refreshQueue.forEach((cb) => cb(''));
    refreshQueue = [];
    return null;
  } finally {
    isRefreshing = false;
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;           // default true
  rawResponse?: boolean;    // return raw Response object
  fullResponse?: boolean;   // return full JSON (with data + meta)
}

export async function request<T = unknown>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, params, auth = true, rawResponse = false } = options;

  // Build URL with query params
  let url = `${BASE_URL}${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth) {
    const token = tokenStore.getAccess();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const init: RequestInit = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);

  let res = await fetch(url, init);

  // Auto-refresh on 401
  if (res.status === 401 && auth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { ...init, headers });
    }
  }

  if (rawResponse) return res as unknown as T;

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = json?.message || json?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }

  // Return full json when caller needs meta/pagination alongside data
  if (options.fullResponse) return json as T;

  return (json.data ?? json) as T;
}

// ─── Convenience methods ──────────────────────────────────────────────────────

export const api = {
  get: <T = unknown>(path: string, params?: RequestOptions['params'], opts?: Omit<RequestOptions, 'params'>) =>
    request<T>('GET', path, { params, ...opts }),

  post: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'body'>) =>
    request<T>('POST', path, { body, ...opts }),

  put: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'body'>) =>
    request<T>('PUT', path, { body, ...opts }),

  patch: <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'body'>) =>
    request<T>('PATCH', path, { body, ...opts }),

  delete: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>('DELETE', path, opts),

  /** Paginated GET — returns { data, count, page, per_page, total_pages } */
  paginate: async <T = unknown>(
    path: string,
    params?: RequestOptions['params'],
  ): Promise<{ data: T[]; count: number; page: number; per_page: number; total_pages: number }> => {
    const json: any = await request('GET', path, { params, fullResponse: true });
    const meta = json.meta || {};
    const data: T[] = Array.isArray(json.data) ? json.data : [];
    const count = meta.total ?? data.length;
    const page = meta.page ?? 1;
    const per_page = meta.limit ?? 20;
    const total_pages = meta.totalPages ?? Math.ceil(count / per_page);
    return { data, count, page, per_page, total_pages };
  },
};
