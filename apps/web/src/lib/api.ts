"use client";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

const TOKEN_KEY = "inv_access_token";
const REFRESH_KEY = "inv_refresh_token";
const USER_KEY = "inv_user";

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ApiClientError extends Error {
  status: number;
  code: string;
  details: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
  window.localStorage.setItem(TOKEN_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function getStoredUser<T>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setStoredUser<T>(user: T): void {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, params?: QueryParams): string {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  if (!params) return url;
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

async function parseError(res: Response): Promise<ApiClientError> {
  let code = "HTTP_ERROR";
  let message = `Error ${res.status}`;
  let details: unknown;
  try {
    const body = await res.json();
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      details = body.error.details;
    }
  } catch {
    /* sin cuerpo JSON */
  }
  return new ApiClientError(res.status, code, message, details);
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: QueryParams;
  headers?: Record<string, string>;
  formData?: FormData;
  isForm?: boolean;
}

async function rawRequest<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(buildUrl(path, opts.params), {
    method,
    headers,
    body,
    credentials: "include",
    cache: "no-store",
  });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return rawRequest<T>(method, path, opts);
    }
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      clearAuth();
      return false;
    }
    const parsed = await res.json();
    const data = parsed?.data;
    if (!data?.accessToken || !data?.refreshToken) {
      clearAuth();
      return false;
    }
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearAuth();
    return false;
  }
}

export interface ApiData<T> {
  data: T;
  meta?: PaginationMeta;
}

export async function apiGet<T>(path: string, params?: QueryParams): Promise<T> {
  const res = await rawRequest<ApiData<T>>("GET", path, { params });
  return res.data;
}

export async function apiGetPage<T>(path: string, params?: QueryParams): Promise<{ items: T[]; meta: PaginationMeta }> {
  const res = await rawRequest<ApiData<T[]>>("GET", path, { params });
  return {
    items: res.data ?? [],
    meta: res.meta ?? { total: 0, page: 1, pageSize: 0, totalPages: 0 },
  };
}

export async function apiPost<T>(path: string, body?: unknown, params?: QueryParams): Promise<T> {
  const res = await rawRequest<ApiData<T>>("POST", path, { body, params });
  return res.data;
}

export async function apiPatch<T>(path: string, body?: unknown, params?: QueryParams): Promise<T> {
  const res = await rawRequest<ApiData<T>>("PATCH", path, { body, params });
  return res.data;
}

export async function apiDelete<T>(path: string, params?: QueryParams): Promise<T> {
  const res = await rawRequest<ApiData<T>>("DELETE", path, { params });
  return res.data;
}

export async function apiUpload<T>(path: string, formData: FormData, method = "POST"): Promise<T> {
  const res = await rawRequest<ApiData<T>>(method, path, { formData });
  return res.data;
}

export async function apiDownload(path: string, filename: string): Promise<void> {
  const res = await fetch(buildUrl(path), {
    headers: { Authorization: `Bearer ${getToken() ?? ""}` },
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw await parseError(res);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function forgotPassword(email: string): Promise<{ message: string; resetUrl?: string }> {
  const res = await rawRequest<ApiData<{ message: string; resetUrl?: string }>>("POST", "/auth/forgot-password", {
    body: { email },
  });
  return res.data;
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
  const res = await rawRequest<ApiData<{ success: boolean }>>("POST", "/auth/reset-password", {
    body: { token, newPassword },
  });
  return res.data;
}

export function apiAssetUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith("/files/")) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return url;
    }
    return url;
  }
  if (url.startsWith("/")) return url;
  const apiRoot = API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${apiRoot}/${url}`;
}
