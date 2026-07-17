'use client';

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
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const isBrowser = () => typeof window !== 'undefined';
let accessToken: string | null = null;
let accountTypeHint: AccountType | null = null;
let refreshInFlight: Promise<string> | null = null;

function getFriendlyStatusMessage(status: number) {
  if (status === 400) return 'The server could not process this request.';
  if (status === 401) return 'Please sign in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The requested resource could not be found.';
  if (status === 408) return 'The request timed out. Please try again.';
  if (status === 429) return 'Too many requests. Please try again later.';
  if (status >= 500) return 'The service is temporarily unavailable. Please try again.';
  return `Request failed with status ${status}.`;
}

function fieldErrorsMessage(errors: Record<string, unknown>) {
  const messages: string[] = [];
  for (const [field, value] of Object.entries(errors)) {
    const label = field === 'non_field_errors' ? '' : `${field.replace(/_/g, ' ').replace(/^./, (letter) => letter.toUpperCase())}: `;
    const values = Array.isArray(value) ? value : [value];
    const text = values.filter((item): item is string => typeof item === 'string').join(' ');
    if (text) messages.push(`${label}${text}`.trim());
  }
  return messages.join(' ');
}

export function extractErrorMessage(data: unknown, status: number): string {
  if (!data) return getFriendlyStatusMessage(status);
  if (typeof data === 'string') {
    return /<\/?[a-z][\s\S]*>/i.test(data) ? getFriendlyStatusMessage(status) : data;
  }
  if (typeof data !== 'object') return getFriendlyStatusMessage(status);
  const record = data as Record<string, unknown>;
  if (typeof record.detail === 'string') return record.detail;
  if (typeof record.message === 'string' && record.message !== 'Validation failed.') return record.message;
  if (record.errors && typeof record.errors === 'object') {
    const message = fieldErrorsMessage(record.errors as Record<string, unknown>);
    if (message) return message;
  }
  const message = fieldErrorsMessage(record);
  return message || getFriendlyStatusMessage(status);
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
  const search = new URLSearchParams(existingQuery);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return `/api/proxy${normalizedPath}${query ? `?${query}` : ''}`;
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
    throw new ApiError('The backend service is unavailable.', 502);
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
    throw new ApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      envelope?.errors ?? payload,
      envelope?.data ?? null,
    );
  }
  return unwrapPayload(payload) as T;
}
