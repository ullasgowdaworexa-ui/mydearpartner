# My Dear Partner — Next.js migration checklist

This checklist was created from a read-only audit of the Vite frontend, Django API,
Channels chat, tests, Docker Compose, and Nginx configuration on 2026-07-16. The
original `frontend/` application remains the parity reference until the Next.js
application passes its production checks.

## Audited baseline

- [x] Inventory root/public/auth/member routes from `frontend/src/App.tsx`.
- [x] Inventory Admin, Super Admin, Staff, and Customer Support nested routes.
- [x] Inventory public/member/admin navigation and compatibility aliases.
- [x] Inventory reusable components, global/page CSS, fonts, images, and dead UI.
- [x] Inventory Redux store, RTK Query services, duplicate API layers, and polling.
- [x] Inventory authentication namespaces, refresh rotation, browser storage, and role redirects.
- [x] Inventory browser-only APIs, `localStorage`, `sessionStorage`, and hydration risks.
- [x] Inventory Django REST endpoints and frontend/backend contract mismatches.
- [x] Inventory Django Channels middleware, consumer authorization, and client socket lifecycle.
- [x] Inventory environment files, Docker services, Nginx routes, static/media handling, and docs.
- [x] Run the existing frontend tests: 4 files / 17 tests passed.
- [x] Run the existing Vite production build: passed; 1.71 MB JS (447 KB gzip) warning recorded.

## Defects that must not be copied

- [ ] Remove access and refresh JWT persistence from browser storage.
- [ ] Store the rotating refresh token only in a Secure, HttpOnly, SameSite cookie.
- [ ] Keep the access token in memory and serialize refresh attempts.
- [ ] Clear Redux/RTK Query private cache when sessions change.
- [ ] Add explicit logout-all-devices support.
- [ ] Fix conversation rows to expose a stable partner/conversation identifier.
- [ ] Replace query-string WebSocket JWTs and share REST/socket chat authorization.
- [ ] Add WebSocket origin validation, bounded reconnect, cleanup, and HTTP fallback.
- [ ] Disable payment/order/verification flows while manual membership approval is active.
- [ ] Make public search parameters drive Search page filters.
- [ ] Make ticket, chat, member, and approval detail URLs refreshable.
- [ ] Preserve safe back destinations, list filters, pagination, and scroll state.
- [ ] Replace portal wildcard dashboard redirects with genuine 404 handling.
- [ ] Route authenticated-but-unauthorized users to `/403`.
- [ ] Correct Staff/Support/Super Admin logo, search, notification, login, and logout destinations.
- [ ] Move Django's built-in admin away from `/admin/` before Next owns that URL space.

## Next.js foundation

- [ ] Create `frontend-next/` with Next.js 16 App Router, TypeScript, Tailwind 4, and ESLint.
- [ ] Add `next/font` local font assets and CSS variables without runtime Google CSS imports.
- [ ] Copy only used public assets; omit Vite/React logos and invalid/unused videos.
- [ ] Add root providers with a per-browser Redux store, Auth provider, Theme provider, and error boundary.
- [ ] Centralize public, internal, proxy, and WebSocket URLs with validated environment configuration.
- [ ] Add same-origin Django proxy Route Handlers with origin checks and `no-store` auth responses.
- [ ] Add high-level portal protection at the Next request boundary and client/layout verification.
- [ ] Add strict security headers and safe `next/image` remote patterns.

## Layouts and routing

- [ ] Root layout: metadata base, fonts, providers, global loading/error/not-found handling.
- [ ] Public layout: Navbar and Footer.
- [ ] Authentication layout: member/admin/staff/support login and recovery screens.
- [ ] Member layout: member guard, responsive navigation, and private `noindex` metadata.
- [ ] Admin layout: Admin/Super Admin guard, persistent sidebar/header, and permissions.
- [ ] Staff layout: Staff guard and role-correct sidebar/header.
- [ ] Support layout: Customer Support guard and role-correct sidebar/header.
- [ ] Add canonical public routes: `/`, `/about`, `/contact`, `/success-stories`, `/membership`, `/blog`, `/blog/[slug]`, `/faq`, `/help`, `/privacy`, `/terms`.
- [ ] Add auth routes: `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password`, portal logins, `/session-expired`, `/403`.
- [ ] Add all canonical member routes for dashboard, profile, search, matches, interests, shortlist, chat, membership, tickets, notifications, and settings.
- [ ] Add all canonical Admin routes plus existing content, support, finance, assignment, and management modules.
- [ ] Add all Staff routes and preserve assigned-ticket compatibility.
- [ ] Add all Support routes and redirect legacy `/customer-support/*` URLs.
- [ ] Preserve legacy URL aliases with query strings intact.

## Data, forms, and interactive behavior

- [ ] Migrate centralized API services and remove hardcoded/Vite API URLs.
- [ ] Forward RTK Query cancellation signals and rationalize duplicate endpoint layers.
- [ ] Map Django validation errors to accessible form fields and prevent duplicate submits.
- [ ] Keep manual membership requests and entitlements authoritative in Django.
- [ ] Keep matchmaking filtering and every role/permission/object check authoritative in Django.
- [ ] Add reusable permission hook/guard for UX while retaining backend enforcement.
- [ ] Add skeleton, empty, retry, permission-denied, and error states to important routes.
- [ ] Replace appropriate `<img>` usage with `next/image` and safe fallbacks.
- [ ] Ensure private/presigned media is not cached past authorization or expiry.

## SEO and performance

- [ ] Add route metadata, canonicals, Open Graph/Twitter values, robots, and sitemap.
- [ ] Server-fetch/cache only public SEO content; never cache private/admin/chat data.
- [ ] Use dynamic metadata and `notFound()` for blog detail pages.
- [ ] Keep public Server Component shells and isolate interactive client boundaries.
- [ ] Dynamically load portal modules so the former monolithic 1.71 MB bundle is split by route.
- [ ] Centralize unread counts and pause unnecessary polling when unfocused.

## Deployment, tests, and documentation

- [ ] Add a multi-stage non-root Next.js standalone Docker image.
- [ ] Update Compose with Next, Django/Daphne, migration, Celery, Redis, Postgres, and Nginx services.
- [ ] Route `/` to Next, `/api/` and `/django-admin/` to Django, and `/ws/` to Daphne.
- [ ] Fix shared static/public-media mounts and keep private media behind authenticated downloads.
- [ ] Add frontend unit tests for route policy, auth refresh, permission UI, and navigation fallbacks.
- [ ] Add route/build smoke coverage; document remaining E2E coverage if browsers are unavailable.
- [ ] Run TypeScript, ESLint, unit tests, and a production Next build.
- [ ] Run Django checks, migration drift check, and backend tests.
- [ ] Update `README.md`, `brain.md`, architecture documentation, environments, and commands.
- [ ] Keep `frontend/` until all equivalence checks pass; do not claim deleted Vite files prematurely.
