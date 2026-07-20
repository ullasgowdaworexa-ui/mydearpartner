'use client';

import {
  friendlyMessage,
  statusMessage,
  networkErrorMessage,
  formatFieldErrors,
} from '@/lib/error-messages';

export type AccountType = 'MEMBER' | 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'CUSTOMER_SUPPORT';

const API_NAMESPACE: Record<AccountType, string> = {
  MEMBER: 'member-auth',
  SUPER_ADMIN: 'super-admin-auth',
  ADMIN: 'admin-auth',
  STAFF: 'staff-auth',
  CUSTOMER_SUPPORT: 'customer-support-auth',
};

export const AUTH_STORAGE_KEYS = {
  access: 'mdp.auth.access',
  refresh: 'mdp.auth.refresh',
  accountType: 'mdp.auth.accountType',
  authenticated: 'mdp.auth.authenticated',
} as const;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors: unknown = null,
    public data: unknown = null,
    public code?: string | null,
    public requestId?: string | null,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const isBrowser = () => typeof window !== 'undefined';
let accessToken: string | null = null;
let accountTypeHint: AccountType | null = null;
let refreshInFlight: Promise<string> | null = null;

function getFriendlyStatusMessage(status: number, retryAfter?: number): string {
  return statusMessage(status, retryAfter);
}

function fieldErrorsMessage(errors: Record<string, unknown>) {
  const formatted = formatFieldErrors(errors);
  return Object.entries(formatted)
    .map(([label, text]) => (label && label !== 'General' ? `${label}: ${text}` : text))
    .join(' ');
}

export function extractErrorMessage(data: unknown, status: number, retryAfter?: number): string {
  if (!data) return getFriendlyStatusMessage(status, retryAfter);
  if (typeof data === 'string') {
    return /<\/?[a-z][\s\S]*>/i.test(data)
      ? getFriendlyStatusMessage(status, retryAfter)
      : friendlyMessage({ message: data, status, retryAfter });
  }
  if (typeof data !== 'object') return getFriendlyStatusMessage(status, retryAfter);
  const record = data as Record<string, unknown>;
  return friendlyMessage({
    code: typeof record.code === 'string' ? record.code : null,
    message: typeof record.message === 'string' ? record.message : null,
    status,
    errors: record.errors ?? null,
    retryAfter,
  });
}

function persistPortalHint(type: AccountType | null) {
  accountTypeHint = type;
  if (!isBrowser()) return;
  if (type) {
    window.localStorage.setItem(AUTH_STORAGE_KEYS.accountType, type);
    window.localStorage.setItem(AUTH_STORAGE_KEYS.authenticated, 'true');
    document.cookie = `mdp_portal=${type}; path=/; max-age=31536000; SameSite=Lax`;
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.accountType);
    window.localStorage.removeItem(AUTH_STORAGE_KEYS.authenticated);
    document.cookie = 'mdp_portal=; path=/; max-age=0; SameSite=Lax';
  }
}

export const authNamespace = (accountType: AccountType) => API_NAMESPACE[accountType];
export const getAccessToken = () => accessToken;
export const getRefreshToken = (): null => null;

export const getStoredAccountType = (): AccountType | null => {
  if (accountTypeHint) return accountTypeHint;
  if (!isBrowser()) return null;
  const value = window.localStorage.getItem(AUTH_STORAGE_KEYS.accountType);
  if (!value || !(value in API_NAMESPACE)) return null;
  accountTypeHint = value as AccountType;
  return accountTypeHint;
};

export const storeClientAuthState = (type: AccountType, access: string, _refresh?: string) => {
  // Access JWTs intentionally stay in memory. The refresh JWT is held only
  // by the secure, HttpOnly cookie set by the Next.js proxy.
  accessToken = access;
  persistPortalHint(type);
};

export const clearClientAuthState = () => {
  accessToken = null;
  accountTypeHint = null;
  refreshInFlight = null;
  if (!isBrowser()) return;
  for (const key of [
    AUTH_STORAGE_KEYS.access,
    AUTH_STORAGE_KEYS.refresh,
    AUTH_STORAGE_KEYS.accountType,
    AUTH_STORAGE_KEYS.authenticated,
    'accessToken',
    'refreshToken',
    'cachedUser',
    'mdp.auth.userId',
  ]) window.localStorage.removeItem(key);
  for (const key of ['mdp.auth.state', 'account-cache.member']) window.sessionStorage.removeItem(key);
  document.cookie = 'mdp_portal=; path=/; max-age=0; SameSite=Lax';
  window.dispatchEvent(new Event('auth:cache-clear'));
};

export const beginAuthTransition = () => {
  clearClientAuthState();
  return 1;
};

function unwrapPayload(payload: unknown) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as Record<string, unknown>).data;
  }
  return payload;
}

function proxyUrl(endpoint: string, params?: FetchOptions['params']) {
  const [path, existingQuery = ''] = endpoint.split('?', 2);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Strip a trailing slash so Next.js does not issue a 308 redirect. A 308 on a
  // POST can drop the body/method and break mutating requests. The Django proxy
  // (django-proxy.ts -> targetUrl) re-appends the slash before forwarding.
  const cleanPath = normalizedPath.replace(/\/+$/, '') || '/';
  const search = new URLSearchParams(existingQuery);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return `/api/proxy${cleanPath}${query ? `?${query}` : ''}`;
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | null | undefined>;
  skipAuthRefresh?: boolean;
  _retried?: boolean;
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';
  const raw = await response.text();
  if (!raw) return null;
  if (!contentType.includes('application/json')) return raw;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

export function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;
  const accountType = getStoredAccountType();
  if (!accountType) return Promise.reject(new ApiError('Please sign in again.', 401));

  refreshInFlight = fetch(`/api/proxy/${authNamespace(accountType)}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    cache: 'no-store',
    body: '{}',
  }).then(async (response) => {
    const payload = await parseResponse(response);
    const data = unwrapPayload(payload) as Record<string, unknown> | null;
    if (!response.ok || !data || typeof data.access !== 'string') {
      throw new ApiError(extractErrorMessage(payload, response.status), response.status, payload);
    }
    accessToken = data.access;
    return data.access;
  }).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export const getFreshAccessToken = () => accessToken ? Promise.resolve(accessToken) : refreshAccessToken();

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(proxyUrl(endpoint, options.params), {
      ...options,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    const navigatorOffline =
      typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
        ? !navigator.onLine
        : false;
    throw new ApiError(
      networkErrorMessage(navigatorOffline),
      0,
      null,
      null,
      'NETWORK_ERROR',
      null,
      undefined,
    );
  }
  const payload = await parseResponse(response);

  if (response.status === 401 && !options.skipAuthRefresh && !options._retried && getStoredAccountType()) {
    try {
      await refreshAccessToken();
      return fetchApi<T>(endpoint, { ...options, _retried: true });
    } catch {
      clearClientAuthState();
      window.dispatchEvent(new Event('auth:session-expired'));
    }
  }

  const envelope = payload as Record<string, unknown> | null;
  if (!response.ok || (envelope && envelope.success === false)) {
    const retryAfter = response.headers.get('Retry-After');
    const retryAfterNum = retryAfter ? Number.parseInt(retryAfter, 10) : undefined;
    const meta =
      envelope && typeof envelope.meta === 'object' && envelope.meta
        ? (envelope.meta as Record<string, unknown>)
        : null;
    const requestId =
      (typeof meta?.request_id === 'string' ? meta.request_id : null) ??
      response.headers.get('X-Request-ID') ??
      null;
    const code =
      envelope && typeof envelope.code === 'string' ? envelope.code : undefined;
    throw new ApiError(
      extractErrorMessage(payload, response.status, retryAfterNum),
      response.status,
      envelope?.errors ?? payload,
      envelope?.data ?? null,
      code,
      requestId,
      Number.isFinite(retryAfterNum) ? retryAfterNum : undefined,
    );
  }
  return unwrapPayload(payload) as T;
}
