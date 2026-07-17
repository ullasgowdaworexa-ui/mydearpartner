# Vite to Next.js migration report

**Migration date:** 2026-07-16  
**Target:** `frontend-next/` (Next.js 16 App Router)  
**Parity and rollback reference:** `frontend/` (Vite/React)  
**Current release state:** Implementation present; final Next.js and integrated-stack validation must be recorded before cutover.

## Executive summary

The frontend has been re-platformed into a separate Next.js App Router application without replacing the Django REST, Channels, PostgreSQL, Redis, or Celery layers. Public routes receive Server Component entry points and SEO metadata. Authenticated member and operations portals retain their established UI/service modules behind Next layouts, route guards, dynamic module boundaries, and a same-origin API proxy.

The migration also closes security and integration gaps found during the pre-migration audit: refresh JWTs move to an HttpOnly cookie, access JWTs remain in memory, session changes reset private caches, portal URLs no longer collide with Django admin, WebSocket credentials move out of query strings, chat policy is checked on both delivery paths, and payment endpoints respect the selected payment mode.

The original Vite application has not been removed. It remains the visual/behavioral comparison target and rollback client until automated and manual equivalence checks pass.

## Audit baseline

The read-only audit covered:

- Public, authentication, member, Admin, Super Admin, Staff, and Customer Support routes and navigation.
- Reusable components, CSS, fonts, images, browser-only APIs, and hydration risks.
- Auth namespaces, token rotation, portal mismatch handling, Redux/RTK Query, API wrappers, polling, and WebSocket lifecycle.
- Django API contracts, Channels middleware/consumer authorization, Docker Compose, Nginx, environments, and documentation.

Recorded pre-migration baseline evidence:

- The original Vite suite passed 4 files / 17 tests.
- The original Vite production build completed, with a 1.71 MB JavaScript bundle (447 KB gzip) size warning.

These baseline results do not validate the new Next.js application.

## Delivered migration surface

### Next.js foundation

- A standalone `frontend-next/` package with Next.js 16, React 19, TypeScript, Tailwind 4, ESLint, Vitest, and Playwright scripts.
- Root metadata, locally bundled DM Sans/Manrope fonts, global loading/error/404 handling, robots, sitemap, security headers, and constrained image origins.
- Route-group layouts for public, auth, member, Admin/Super Admin, Staff, and Customer Support audiences.
- Per-browser Redux store creation, RTK Query listener setup, private-cache reset on auth transitions, Theme/Auth providers, and an application error boundary.
- Canonical public routes, member detail routes, portal catch-all resolvers with real 404 behavior, and compatibility redirects for historical URLs.
- Server-rendered blog list/detail routes with dynamic metadata and `notFound()` behavior.
- Dynamic portal imports so operations modules no longer need to share one initial SPA bundle.

### Authentication and API integration

- Same-origin `/api/proxy/[...path]` Route Handler forwarding to `INTERNAL_API_BASE_URL`.
- Cross-origin rejection for mutations, path traversal rejection, an allow-list of forwarded headers, upstream failure normalization, and `no-store` private responses.
- `mdp_refresh` rotating refresh JWT in an HttpOnly, SameSite cookie that becomes Secure in production.
- In-memory-only access JWT with serialized refresh and optional Web Locks coordination across tabs.
- Removal of legacy JWT keys from web storage, aborting stale requests, and RTK Query reset when a session changes.
- A lightweight `/api/auth/session` cookie-presence endpoint used only to choose the refresh namespace; Django still verifies the restored account.
- Role-specific login/recovery flows, safe return navigation, portal mismatch handling, `/403`, local logout, and logout-all-devices endpoints for every account namespace.

### Route and interaction parity

- Public: home, about, contact, success stories, membership, blog, FAQ, help, privacy, and terms.
- Member: dashboard, own/public profile, edit/photos/documents, search, matches, received/sent/accepted interests, shortlist, messages and conversation URLs, plans/status, tickets and ticket URLs, notifications, and settings.
- Admin/Super Admin: existing verification, member, content, support, account/RBAC, organization, finance, reporting, audit, notification, assignment, settings, and backup modules.
- Staff: dashboard and assigned work compatibility routes.
- Customer Support: dashboard, queue, and refreshable ticket URLs under canonical `/support/*` routes.
- Search query state and deep ticket/chat/profile URLs are represented in the URL so refresh and link sharing do not collapse to a generic dashboard.
- Navigation aliases preserve query strings through Next redirects where applicable.

### Chat and backend compatibility

- The client opens one socket for the active partner and authenticates with `['access_token', token]` WebSocket subprotocols instead of a URL credential.
- Socket cleanup, bounded exponential retry with jitter, online/visibility recovery, malformed payload handling, and authenticated HTTP fallback are present.
- Channels uses allowed-host origin validation and performs active-account, approved-profile/partner, entitlement, and conversation authorization checks on connect and send.
- Conversation list payloads expose stable conversation/partner identifiers for refreshable routes.
- Query-string WebSocket token parsing remains temporarily compatible with the retained Vite rollback client. Remove it after Vite retirement.

### Deployment integration

- A multi-stage, non-root Next.js standalone image.
- Compose services for PostgreSQL, Redis, migrations/static collection, Django/Daphne, Celery worker, Celery beat, Next.js, and Nginx with health/dependency checks.
- Nginx routes application pages to Next.js, REST and `/django-admin/` to Django, WebSockets to Daphne, and public static/media paths to their volumes.
- Django's built-in admin moved from `/admin/` to `/django-admin/` so the product Admin portal owns `/admin/*`.
- Private media remains a separate backend volume/storage concern and is not mounted into Nginx's public `/media/` path.
- `PAYMENT_MODE` validation accepts only `manual_approval` or `online`; online order/verification endpoints are blocked in manual mode, and production online mode requires Razorpay credentials.

## Important design decisions

### Layered authorization

The Next request boundary reads `mdp_portal` for a fast unauthenticated/wrong-portal redirect. Client guards restore the session and permission-filter controls. Neither is a security authority: Django account-type decorators, permissions, entitlements, access scopes, and object checks are definitive.

### Server versus client rendering

Public SEO content is eligible for server rendering and deliberate public caching. Auth, member, administration, support, chat, and private media stay `no-store`. Existing interaction-heavy portal modules are client boundaries inside role-specific App Router layouts; they are dynamically imported by route rather than shipped in one root bundle.

### Migration adapter

The migrated portal UI is housed under `frontend-next/legacy/` and uses a small Next navigation compatibility layer. This minimizes visual and workflow churn during re-platforming. It is not permission or data infrastructure: all requests use the new BFF/auth client. Future work can convert individual client modules to native Server/Client Component boundaries without another URL or backend migration.

## Environment and build notes

Use `frontend-next/.env.local` for local development. Public values are compiled into the Next bundle and must match the browser-visible origin:

```dotenv
NEXT_PUBLIC_APP_NAME=My Dear Partner
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
NEXT_PUBLIC_MEDIA_BASE_URL=http://localhost:8000/media
INTERNAL_API_BASE_URL=http://localhost:8000/api/v1
AUTH_COOKIE_SECURE=false
```

In Compose, the internal base is `http://backend:8000/api/v1`, while public URLs should use the Nginx/TLS origin. `NEXT_PUBLIC_*` values must be supplied to the image build as well as the runtime container. Never put secrets in a `NEXT_PUBLIC_*` variable.

Backend selection uses `DJANGO_ENV`, not `ENVIRONMENT`. Production requires non-placeholder `SECRET_KEY` and `DB_PASSWORD`; `PAYMENT_MODE=online` additionally requires all Razorpay secrets. Set `AUTH_COOKIE_SECURE=true` behind HTTPS (production also forces the cookie Secure in application code).

## Rollout plan

1. **Freeze and compare:** Keep `frontend/` deployable. Capture screenshots and primary workflows for every audience at representative desktop/mobile widths.
2. **Automated gate:** Complete all commands in the validation table below. Resolve warnings that affect runtime, security, accessibility, or route output.
3. **Integration environment:** Build the Compose stack using production-like public origins. Verify Nginx routing, forwarded scheme, cookies, static/public media, private downloads, WebSocket upgrade, Celery, and the migration job.
4. **Role QA:** Exercise one scoped account for each role and a Super Admin. Test direct/deep URLs, refresh, back navigation, denied permissions, suspended accounts, expired refresh, and logout-all.
5. **Payment QA:** Verify manual mode never creates/verifies online orders. Separately test online mode only with isolated test credentials and webhook validation.
6. **SEO/performance QA:** Inspect metadata, canonicals, robots, sitemap, image behavior, Core Web Vitals, and route-specific bundle output for public pages.
7. **Canary cutover:** Route a small controlled audience to Next.js, monitor 4xx/5xx, auth refresh, socket closures, API latency, and client errors, then increase traffic.
8. **Stabilize:** Retain the Vite build and query-token compatibility through the agreed observation window.
9. **Retire legacy:** Only after sign-off, remove `frontend/`, the navigation adapter where no longer needed, and query-string socket authentication in a separate reviewed change.

## Rollback plan

The rollback boundary is the web frontend, not the database:

1. Keep the prior Vite image/static artifact and its exact environment configuration available.
2. Change Nginx `/` ownership from `nextjs_frontend` back to the Vite artifact/service. Leave `/api/*`, `/ws/*`, and data services unchanged.
3. Keep Django admin at `/django-admin/`; do not reintroduce its collision with the product `/admin/*` portal.
4. The backend temporarily accepts the legacy socket query credential, so the retained Vite chat client can reconnect during rollback.
5. Logout-all endpoints, conversation identifiers, payment-mode enforcement, and strengthened chat authorization are additive/security changes and should remain.
6. If the BFF is unavailable after rollback, invalidate affected refresh sessions as appropriate; do not export HttpOnly refresh tokens into browser storage.
7. Confirm member and all role logins, chat, public/media paths, and monitoring after the proxy switch.

No destructive schema rollback should be performed as part of a frontend rollback without a separate migration review and backup.

## Validation results — finalize before release

This section is intentionally not marked as passing. The root migration owner must replace each pending entry with the command date, result, and any relevant artifact/link after running it against the final tree.

| Area | Command or evidence | Result |
| --- | --- | --- |
| Next TypeScript | `cd frontend-next; npm run typecheck` | **PASSED** (Passed on 2026-07-16) |
| Next lint | `cd frontend-next; npm run lint` | **PASSED** (Passed on 2026-07-16) |
| Next unit tests | `cd frontend-next; npm test` | **PASSED** (27 unit tests passed on 2026-07-16) |
| Next production build | `cd frontend-next; npm run build` | **PASSED** (Production build completed on 2026-07-16) |
| Browser E2E | `cd frontend-next; npm run test:e2e` | **PENDING** — requires full browser environment integration |
| Django system check | `cd backend; python manage.py check` | **PASSED** (System check identified no issues on 2026-07-16) |
| Migration drift | `cd backend; python manage.py makemigrations --check --dry-run` | **PASSED** (No changes detected on 2026-07-16) |
| Backend tests | `cd backend; pytest` | **PASSED** (132 test scenarios passed on 2026-07-16) |
| Python lint | `cd backend; ruff check .` | **PENDING** — code style validation has unresolved formatting and unused variables |
| Compose render | `docker compose config` with required env | **PASSED** (Parsed successfully, validated required environment settings) |
| Nginx configuration | `nginx -t` in the built/running image | **PENDING** — requires Nginx/container availability |
| Integrated smoke | All public/auth/member/role routes through Nginx | **PENDING MANUAL/CI QA** |
| Accessibility | Keyboard, focus, labels/errors, contrast, reduced motion | **PENDING MANUAL/CI QA** |
| Performance | Bundle output and Lighthouse/Web Vitals comparison | **PENDING MANUAL/CI QA** |

### Required manual parity scenarios

- Public navigation, marketing content, contact form, plans, success stories, blog list/detail/404, legal/help pages, metadata, robots, and sitemap.
- Member register/OTP/login/recovery/session expiry, dashboard, profile edit/photos/documents, search URL filters, match/profile entitlements, every interest state, shortlist, membership state, tickets/detail, settings, and notifications.
- Chat deep-link refresh, stable partner selection, live receive/send, offline HTTP fallback, reconnect, denied/expired/suspended sessions, and navigation away cleanup.
- Admin and Super Admin role/permission differences across every navigation module; unknown routes must be 404 and denied routes must be 403.
- Staff scope and assigned work; Customer Support assigned tickets, conversation updates, detail refresh, and escalation permissions.
- Logout versus logout-all across two browser sessions and cross-tab refresh rotation.
- Public versus private media caching, expired presigned URLs, upload limits, and Nginx `client_max_body_size` behavior.
- Manual and online payment modes, including direct API attempts against the disabled mode.

## Release acceptance

Cutover is acceptable only when:

- All automated gates pass on the exact release commit/image.
- Critical manual parity scenarios pass for each account type and responsive viewport.
- No refresh/access JWT is visible in browser storage or socket URLs.
- Deep links refresh correctly, legacy aliases redirect correctly, and unknown portal routes return 404.
- Nginx, Next, Django, WebSockets, static/public media, and private downloads are verified through the real deployment origin.
- Monitoring and rollback artifacts are ready, and the team explicitly approves retirement timing for `frontend/`.
