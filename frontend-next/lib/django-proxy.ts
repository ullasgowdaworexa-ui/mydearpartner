import { NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/config/env";
import {
  accountFromApiPath,
  PORTAL_COOKIE,
  REFRESH_COOKIE,
  PHOTO_ACCESS_COOKIE,
  type AccountType,
} from "@/lib/auth-config";

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const tokenResponsePath = /\/(?:login|register|otp\/verify|token\/refresh)\/?$/;
const refreshRequestPath = /\/(?:token\/refresh|logout|logout-all)\/?$/;
const logoutPath = /\/(?:logout|logout-all)\/?$/;
const UPSTREAM_TIMEOUT_MS = 15_000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: serverEnv.authCookieSecure,
    sameSite: "lax" as const,
    path: "/",
  };
}

function originAllowed(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const configuredOrigin = new URL(serverEnv.NEXT_PUBLIC_APP_URL).origin;
  const match = origin === request.nextUrl.origin || origin === configuredOrigin;
  if (match) return true;

  // Local development fallback: treat localhost and 127.0.0.1 as equivalent
  const isLocalOrigin = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      return url.hostname === "localhost" || url.hostname === "127.0.0.1";
    } catch {
      return false;
    }
  };
  return isLocalOrigin(origin) && (isLocalOrigin(request.nextUrl.origin) || isLocalOrigin(configuredOrigin));
}

function targetUrl(path: string, search: string) {
  const base = serverEnv.INTERNAL_API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  let finalPath = cleanPath;
  if (finalPath && !finalPath.endsWith("/") && !finalPath.includes(".")) {
    finalPath += "/";
  }
  // INTERNAL_API_BASE_URL already includes the /api/v1/ prefix
  // (e.g. http://localhost:8000/api/v1), so forward the path as-is.
  return `${base}/${finalPath}${search}`;
}

function safePath(segments: string[]) {
  return segments.length > 0 && segments.every((segment) => segment && segment !== "." && segment !== ".." && !segment.includes("\\"));
}

function isProtectedPhotoPath(path: string) {
  return /(?:^|\/)profile-photos\/[^/]+\/(?:image|thumbnail)\/?$/.test(path);
}

function isProtectedDocumentPath(path: string) {
  return /verification\/documents\/[^/]+\/download\/?$/.test(path);
}

function isProtectedResourcePath(path: string) {
  return isProtectedPhotoPath(path) || isProtectedDocumentPath(path);
}

/**
 * Perform a server-side token refresh using the HttpOnly refresh cookie so
 * users who were logged in before mdp_photo_access was introduced don't need
 * to sign in again.  Returns the new access token, or null on failure.
 */
async function inlineRefreshForProtectedResource(request: NextRequest): Promise<string | null> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  const portalHint = request.cookies.get(PORTAL_COOKIE)?.value;
  const namespaceMap: Record<string, string> = {
    MEMBER: "member-auth",
    SUPER_ADMIN: "super-admin-auth",
    ADMIN: "admin-auth",
    STAFF: "staff-auth",
    CUSTOMER_SUPPORT: "customer-support-auth",
  };
  const namespace = portalHint ? (namespaceMap[portalHint] ?? "member-auth") : "member-auth";
  try {
    const base = serverEnv.INTERNAL_API_BASE_URL.replace(/\/$/, "");
    const refreshUrl = `${base}/${namespace}/token/refresh/`;
    const resp = await fetch(refreshUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
      cache: "no-store",
    });
    if (!resp.ok) return null;
    const json = await resp.json() as Record<string, unknown>;
    const data = (json.data && typeof json.data === "object") ? json.data as Record<string, unknown> : json;
    return typeof data.access === "string" ? data.access : null;
  } catch {
    return null;
  }
}

function extractRefresh(payload: unknown): { refresh: string | null; account: AccountType | null } {
  if (!payload || typeof payload !== "object") return { refresh: null, account: null };
  const envelope = payload as Record<string, unknown>;
  const rootData = envelope.data && typeof envelope.data === "object"
    ? envelope.data as Record<string, unknown>
    : envelope;
  const data = rootData.data && typeof rootData.data === "object"
    ? rootData.data as Record<string, unknown>
    : rootData;
  const user = data.user && typeof data.user === "object" ? data.user as Record<string, unknown> : null;
  return {
    refresh: typeof data.refresh === "string" ? data.refresh : null,
    account: typeof user?.account_type === "string" ? user.account_type as AccountType : null,
  };
}

function extractAccess(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const envelope = payload as Record<string, unknown>;
  const rootData = envelope.data && typeof envelope.data === "object"
    ? envelope.data as Record<string, unknown>
    : envelope;
  const data = rootData.data && typeof rootData.data === "object"
    ? rootData.data as Record<string, unknown>
    : rootData;
  return typeof data.access === "string" ? data.access : null;
}

function stripRefresh(payload: unknown) {
  if (!payload || typeof payload !== "object") return payload;
  const envelope = payload as Record<string, unknown>;
  const rootData = envelope.data && typeof envelope.data === "object"
    ? envelope.data as Record<string, unknown>
    : envelope;
  const isNested = rootData !== envelope;
  const innerData = rootData.data && typeof rootData.data === "object"
    ? rootData.data as Record<string, unknown>
    : rootData;
  if (innerData !== rootData && typeof innerData === "object") {
    const cleaned = { ...innerData };
    delete cleaned.refresh;
    return {
      ...envelope,
      data: { ...rootData, data: cleaned },
    };
  }
  if (rootData !== envelope && typeof rootData === "object") {
    const cleaned = { ...rootData };
    delete cleaned.refresh;
    return { ...envelope, data: cleaned };
  }
  const clone = { ...envelope };
  delete clone.refresh;
  return clone;
}

async function requestBody(request: NextRequest, path: string) {
  if (!mutatingMethods.has(request.method)) return undefined;
  const bytes = await request.arrayBuffer();
  if (!refreshRequestPath.test(`/${path}`)) return bytes.byteLength ? bytes : undefined;

  let payload: Record<string, unknown> = {};
  if (bytes.byteLength) {
    try {
      payload = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      payload = {};
    }
  }
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (refresh) payload.refresh = refresh;
  return new TextEncoder().encode(JSON.stringify(payload)).buffer;
}

export async function forwardToDjango(request: NextRequest, segments: string[]) {
  if (!safePath(segments)) {
    return NextResponse.json({ success: false, message: "Invalid API path." }, { status: 400 });
  }
  if (mutatingMethods.has(request.method) && !originAllowed(request)) {
    return NextResponse.json({ success: false, message: "Cross-origin request rejected." }, { status: 403 });
  }

  let path = segments.join("/");
  if (request.nextUrl.pathname.endsWith("/") && !path.endsWith("/")) {
    path += "/";
  }
  const headers = new Headers();
  for (const name of ["accept", "content-type", "authorization", "if-none-match", "x-request-id"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const requestId = headers.get("x-request-id") || crypto.randomUUID();
  headers.set("x-request-id", requestId);
  if (isProtectedResourcePath(path) && !headers.has("authorization")) {
    let accessToken = request.cookies.get(PHOTO_ACCESS_COOKIE)?.value;
    if (!accessToken) {
      accessToken = (await inlineRefreshForProtectedResource(request)) ?? undefined;
    }
    if (accessToken) {
      headers.set("authorization", `Bearer ${accessToken}`);
    }
  }
  headers.set("x-forwarded-host", request.headers.get("host") ?? request.nextUrl.host);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  let upstream: Response;
  let timedOut = false;
  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    timedOut = true;
    abortController.abort();
  }, UPSTREAM_TIMEOUT_MS);
  try {
    upstream = await fetch(targetUrl(path, request.nextUrl.search), {
      method: request.method,
      headers,
      body: await requestBody(request, path),
      cache: "no-store",
      signal: abortController.signal,
      redirect: "manual",
    });
  } catch (error) {
    clearTimeout(timeout);
    if (timedOut) {
      return NextResponse.json(
        {
          success: false,
          message: "The request took too long. Please try again.",
          code: "GATEWAY_TIMEOUT",
          errors: { detail: "The request took too long. Please try again." },
          meta: { request_id: requestId, gateway: true },
        },
        { status: 504, headers: { "Cache-Control": "no-store" } },
      );
    }
    const isNetworkError = error instanceof TypeError && error.message?.includes("fetch");
    if (isNetworkError) {
      return NextResponse.json(
        {
          success: false,
          message: "The backend service is unavailable. Please try again.",
          code: "SERVICE_UNAVAILABLE",
          errors: { detail: "The backend service is unavailable. Please try again." },
          meta: { request_id: requestId, gateway: true },
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: "The Django API is currently unavailable.",
        code: "BAD_GATEWAY",
        errors: { detail: "The Django API is currently unavailable." },
        meta: { request_id: requestId, gateway: true },
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    clearTimeout(timeout);
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const isJson = contentType.includes("application/json");
  const raw = await upstream.arrayBuffer();
  let payload: unknown = raw;
  if (isJson) {
    try {
      payload = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      payload = { success: false, message: "The API returned malformed JSON." };
    }
  }

  const upstreamCacheControl = upstream.headers.get("cache-control");
  const mayUsePrivateImageCache = isProtectedPhotoPath(path)
    && (contentType.toLowerCase().startsWith("image/") || upstream.status === 304)
    && Boolean(upstreamCacheControl?.toLowerCase().includes("private"));
  const responseHeaders = new Headers({
    "Content-Type": contentType,
    // JSON and non-image responses stay non-cacheable. Authenticated image
    // responses preserve Django's private ETag-aware cache policy.
    "Cache-Control": mayUsePrivateImageCache ? upstreamCacheControl! : "no-store, private",
  });
  for (const name of ["content-disposition", "content-length", "etag", "last-modified", "vary", "x-request-id"]) {
    if (name === "content-length" && isJson) continue;
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  const response = new NextResponse(
    upstream.status === 204 || upstream.status === 304
      ? null
      : isJson
        ? JSON.stringify(tokenResponsePath.test(`/${path}`) ? stripRefresh(payload) : payload)
        : raw,
    { status: upstream.status, headers: responseHeaders },
  );

  if (upstream.ok && isJson && tokenResponsePath.test(`/${path}`)) {
    const tokens = extractRefresh(payload);
    if (tokens.refresh) {
      const account = tokens.account ?? accountFromApiPath(path);
      response.cookies.set(REFRESH_COOKIE, tokens.refresh, cookieOptions());
      if (account) response.cookies.set(PORTAL_COOKIE, account, cookieOptions());
    }
    const accessTokenVal = extractAccess(payload);
    if (accessTokenVal) {
      // Use root path so the cookie is sent on ALL /api/proxy/* image requests
      // regardless of subdirectory depth, avoiding narrow-path cookie issues.
      response.cookies.set(PHOTO_ACCESS_COOKIE, accessTokenVal, {
        ...cookieOptions(),
        path: "/",
      });
    }
  }
  if (logoutPath.test(`/${path}`)) {
    response.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
    response.cookies.set(PORTAL_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
    response.cookies.set(PHOTO_ACCESS_COOKIE, "", {
      ...cookieOptions(),
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
