# My Dear Partner operations guide

This guide describes the current membership, account-verification, approval,
notification, and reset workflows.  API paths below are relative to
`/api/v1/`.

## Membership lifecycle

Each paid checkout creates one `MemberMembership` record.  Its normal lifecycle
is `PENDING_PAYMENT` -> `ACTIVE` -> `EXPIRED`.  A new successful purchase
replaces the member's prior active plan; paid memberships do not stack.

An active membership is the only source of paid-feature access.  The plan's
entitlement fields control access to visitor lists, received interests, private
photos, priority listing, boosts, messaging, contact details, search, horoscope, and numeric
limits.  Do not grant a generic "premium" bypass in the frontend: update the
plan's entitlement instead.

Free members cannot see the identities of members who sent them an interest.
This is enforced by the `can_view_received_interests` plan entitlement at the
API layer; it is enabled for the default paid plans and can be changed in the
membership-plan administration screen.

The background task `apps.memberships.tasks.expire_memberships` runs daily. It
expires active memberships past `expires_at` and creates expiry and three-day
warning notifications.  Ensure Celery Beat and a Celery worker are both running
in every deployed environment.

### Checkout API

| Endpoint | Purpose |
| --- | --- |
| `POST member/memberships/create-order/` | Validates the full verification gate and creates a pending checkout order. Send `plan_id` or `plan_slug`. |
| `POST member/memberships/verify/` | Verifies a Razorpay signature, then immediately activates the plan. |
| `POST payments/webhook/` | Validates Razorpay's webhook signature and idempotently activates a captured payment if the browser callback was missed. |
| `GET member-auth/membership/summary/` | Returns the active plan, expiry, remaining days, and effective membership summary. |
| `POST member-auth/membership/deactivate/` | Cancels the member's active membership. |

`create-order` returns HTTP 403 with `ACCOUNT_NOT_VERIFIED` and a `missing`
array when the account cannot buy a paid plan.  The client should direct the
member to the missing step rather than treating this as a payment failure.

### Demo versus real Razorpay

For local demonstrations, set:

```dotenv
RAZORPAY_DEMO_MODE=true
```

The UI then asks for confirmation and activates a demo order.  It never opens
Razorpay, charges money, or contacts a payment provider.  This mode must never
be enabled in production.

For a real deployment, set `RAZORPAY_DEMO_MODE=false` and provide real
environment-specific values for all of the following (never commit them):

```dotenv
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

Configure the Razorpay webhook to call `POST /api/v1/payments/webhook/` and use
the same webhook secret.  Release only after testing a real test-mode payment,
the client callback, and the webhook fallback separately.

## Account verification

A member may purchase a paid plan only when all of these are true:

1. Profile status is `APPROVED`.
2. Both email and mobile are verified.
3. The primary profile photo is `APPROVED`.
4. At least one identity document is `APPROVED`.
5. The member account is active and not deleted.

The current status is available through `GET member-auth/verification/status/`.
Its `contact`, `profile`, `primary_photo`, and `documents` values are the
authoritative UI inputs.  `next_action` describes the first step still needed.

Administrative contact verification (`action: "verify"`) sets both the email
and mobile flags.  `unverify` clears both.  Document approval requires an
actual pending document; provide `document_id` when a member has more than one.

## Approvals and roles

Super Admin has every permission.  Admin has full member-review authority:
approve or reject profiles, photos, and KYC documents; verify or unverify
contact details; and activate, suspend, or soft-delete member accounts.  Only
Super Admin may permanently delete a member.

The member action endpoint is `PATCH admin/users/<member-uuid>/` with an
`action` field.  Supported approval actions are:

```text
approve_profile, reject_profile, approve_photo, reject_photo,
verify, unverify, verify_document, reject_document
```

Rejections require a non-empty `reason`.  Member actions are audited.  Staff
may review approval work only where their assigned permissions allow it;
Customer Support is limited to ticket workflows.

Membership plans are managed at `super-admin/membership-plans/`.  Super Admin
can create, edit, archive, activate, deactivate, or delete a plan.  Admin can
do the same only when its assigned `memberships.*` permissions permit it.  A
plan with historical payments or memberships is archived (`is_active=false`)
instead of being hard-deleted, which preserves financial history.

## Notifications

Notifications are database records first and real-time events second.  The
server creates a `Notification` row, then broadcasts it after the transaction
commits.  A disconnected user therefore sees the same notification on the next
page load.

Member APIs:

| Endpoint | Purpose |
| --- | --- |
| `GET notifications/` | Recent notifications. |
| `GET notifications/unread-count/` | Navbar unread badge. |
| `POST notifications/<notification-uuid>/read/` | Mark one notification read. |
| `POST notifications/mark-all-read/` | Mark all notifications read. |

The client uses the notifications WebSocket when connected and polling as a
fallback.  New event code should call the shared `create_notification` utility,
including a useful `link_url`; do not create unbroadcast notification rows
directly in views.

## Safe database reset

`reset_database_keep_users` is intentionally destructive and is not part of a
normal deployment.  It keeps exactly four explicitly named accounts (Member,
Admin, Super Admin, Staff, or Customer Support) plus `MemberProfile` rows owned
by retained members.  It deletes all other data, including memberships,
payments, tickets, chats, photos, documents, verification requests,
notifications, flags, and audit logs.

Never run it without a verified database backup and explicit written approval
of the exact four accounts.  First run the dry run:

```powershell
cd backend
.\venv\Scripts\python.exe manage.py reset_database_keep_users `
  person1@example.com person2@example.com person3@example.com person4@example.com
```

Review the displayed retained accounts and per-table deletion counts.  Only
then add `--execute` to perform the transactional reset.  The command rolls
back on failure, resets applicable database sequences, and verifies that only
the retained rows remain.  It has not been run merely by adding this command.

## Release checklist

Before deployment:

1. Apply migrations, including the membership migration.
2. Set `REQUIRE_MEMBER_VERIFICATION=true` for the full checkout gate.
3. Set `RAZORPAY_DEMO_MODE=false`, inject live Razorpay secrets through the
   deployment secret store, and configure the signed webhook.
4. Run Celery worker and Beat; verify daily expiry scheduling.
5. Confirm every paid plan's entitlement checkboxes match the sold features.
6. Verify an unapproved member is blocked, an approved member can pay, the
   membership becomes active, its notification arrives, and the dashboard and
   gated features update after purchase.
7. Run the release checks:

```powershell
cd backend
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe -m pytest -q

cd ..\frontend-next
npm run typecheck
npm run lint
npm test -- --run
npm run build
```
