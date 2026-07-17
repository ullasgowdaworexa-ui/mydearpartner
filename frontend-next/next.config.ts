import type { NextConfig } from "next";

const publicApi = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const publicWs = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8000";

function remotePattern(value: string) {
  try {
    const url = new URL(value);
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: "/**",
    };
  } catch {
    return null;
  }
}

const allowedImageOrigins = [publicApi, process.env.NEXT_PUBLIC_MEDIA_BASE_URL]
  .filter((value): value is string => Boolean(value))
  .map(remotePattern)
  .filter((value): value is NonNullable<ReturnType<typeof remotePattern>> => Boolean(value));

const connectOrigins = [publicApi, publicWs]
  .map((value) => {
    try {
      return new URL(value).origin;
    } catch {
      return "";
    }
  })
  .filter(Boolean)
  .join(" ");

const isDev = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: http://localhost:8000 https:",
  `connect-src 'self' ${connectOrigins}`,
  "media-src 'self' blob:",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: allowedImageOrigins,
    formats: ["image/avif", "image/webp"],
    contentDispositionType: "attachment",
    dangerouslyAllowSVG: false,
  },
  async redirects() {
    return [
      { source: "/membership-plans", destination: "/membership", permanent: true },
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },
      { source: "/search-profiles", destination: "/search", permanent: true },
      { source: "/matchmaking", destination: "/matches", permanent: true },
      { source: "/admin-login", destination: "/admin/login", permanent: true },
      { source: "/unauthorized", destination: "/403", permanent: true },
      { source: "/customer-support/login", destination: "/support/login", permanent: true },
      { source: "/customer-support/:path*", destination: "/support/:path*", permanent: true },
      { source: "/admin/users", destination: "/admin/members", permanent: true },
      { source: "/admin/profile-verifications", destination: "/admin/profiles", permanent: true },
      { source: "/admin/profile-approvals", destination: "/admin/profiles", permanent: true },
      { source: "/admin/photo-verifications", destination: "/admin/photos", permanent: true },
      { source: "/admin/photo-approvals", destination: "/admin/photos", permanent: true },
      { source: "/admin/document-verifications", destination: "/admin/documents", permanent: true },
      { source: "/admin/document-verification", destination: "/admin/documents", permanent: true },
      { source: "/admin/support-tickets/:path*", destination: "/admin/tickets/:path*", permanent: true },
      { source: "/admin/admin-management", destination: "/admin/admins", permanent: true },
      { source: "/admin/activity", destination: "/admin/audit-logs", permanent: true },
      { source: "/admin/activity-logs", destination: "/admin/audit-logs", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, private" }],
      },
    ];
  },
};

export default nextConfig;
