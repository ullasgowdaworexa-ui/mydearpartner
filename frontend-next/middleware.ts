import { NextRequest, NextResponse } from "next/server";

export type Portal = "MEMBER" | "SUPER_ADMIN" | "ADMIN" | "STAFF" | "CUSTOMER_SUPPORT";

const ADMIN_PORTAL_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ADMIN_PORTAL === "true";

const authRoutes = new Set([
  "/login",
  "/register",
  "/verify-otp",
  "/forgot-password",
  "/reset-password",
  "/admin/login",
  "/super-admin/login",
  "/staff/login",
  "/support/login",
]);

export function routePolicy(pathname: string): { roles: Portal[]; login: string } | null {
  if (authRoutes.has(pathname)) return null;
  if (pathname === "/support" || pathname.startsWith("/support/")) {
    return { roles: ["CUSTOMER_SUPPORT"], login: "/support/login" };
  }
  if (pathname === "/super-admin" || pathname.startsWith("/super-admin/")) {
    return { roles: ["SUPER_ADMIN"], login: "/super-admin/login" };
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return { roles: ["SUPER_ADMIN", "ADMIN"], login: "/admin/login" };
  }
  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    return { roles: ["STAFF"], login: "/staff/login" };
  }
  if (pathname.startsWith("/membership/")) {
    return { roles: ["MEMBER"], login: "/login" };
  }

  const memberRoots = [
    "/dashboard",
    "/profile",
    "/search",
    "/matches",
    "/interests",
    "/shortlist",
    "/messages",
    "/tickets",
    "/notifications",
    "/settings",
  ];
  if (
    memberRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`))
  ) {
    return { roles: ["MEMBER"], login: "/login" };
  }
  return null;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPausedBackOfficePath = ["/admin", "/super-admin", "/staff", "/support", "/customer-support"]
    .some((root) => pathname === root || pathname.startsWith(`${root}/`));
  if (!ADMIN_PORTAL_ENABLED && isPausedBackOfficePath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const policy = routePolicy(pathname);
  if (!policy) return NextResponse.next();

  const portal = request.cookies.get("mdp_portal")?.value as Portal | undefined;
  if (!portal) {
    const loginUrl = new URL(policy.login, request.url);
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }
  if (!policy.roles.includes(portal)) {
    return NextResponse.redirect(new URL("/403", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|fonts).*)"],
};
