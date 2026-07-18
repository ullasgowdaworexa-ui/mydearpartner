# Verification System - Quick Reference Card

**Print this for quick access to common tasks**

---

## Server Management

### Start Server
```bash
# With WebSocket support (recommended)
daphne -b 0.0.0.0 -p 8000 config.asgi:application

# Or simple runserver
python manage.py runserver
```

### Check System
```bash
python manage.py check --deploy
```

### Run Tests
```bash
pytest apps/accounts/tests/
```

---

## Database Operations

### Apply Migrations
```bash
python manage.py migrate accounts 0017
python manage.py migrate core 0023
```

### Backup Database
```bash
pg_dump matiromony > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Backup
```bash
psql matiromony < backup_file.sql
```

---

## API Endpoints Quick List

### Member - Get Status
```
GET /api/v1/member-auth/verification/status/
Authorization: Bearer <token>
```

### Member - Verify Email
```
POST /api/v1/member-auth/verification/email/send-otp/
POST /api/v1/member-auth/verification/email/verify-otp/
Body: {"code": "123456"}
```

### Member - Verify Mobile
```
POST /api/v1/member-auth/verification/mobile/send-otp/
POST /api/v1/member-auth/verification/mobile/verify-otp/
Body: {"code": "123456"}
```

### Member - Submit Items
```
PUT /api/v1/member-auth/verification/profile/
POST /api/v1/member-auth/verification/photo/
POST /api/v1/member-auth/verification/government-id/
```

### Admin - List Queue
```
GET /api/v1/member-auth/verification/admin/
?status=pending_review&type=PROFILE_PHOTO&page=1
Authorization: Bearer <admin_token>
```

### Admin - Review
```
POST /api/v1/member-auth/verification/admin/{id}/approve/
POST /api/v1/member-auth/verification/admin/{id}/reject/
Body: {"reason": "..."}
POST /api/v1/member-auth/verification/admin/{id}/request-changes/
Body: {"feedback": "..."}
```

---

## WebSocket Testing

### Connect
```bash
wscat -c ws://localhost:8000/ws/verification/
```

### Send Ping
```json
{"type": "ping"}
```

### Expect Pong
```json
{"type": "pong"}
```

---

## Status Values

```
pending_review
approved
rejected
changes_requested
```

---

## Permission Classes

```python
IsMember                    # Member-only
IsAdmin | IsSuperAdmin      # Admin-level
```

---

## Common Troubleshooting

### WebSocket Won't Connect
- [ ] Check if server is running
- [ ] Check if ASGI server is used (Daphne/uvicorn)
- [ ] Check firewall settings
- [ ] Check Redis is running (if using)

### Events Not Publishing
- [ ] Check Redis connection
- [ ] Check transaction.on_commit is being called
- [ ] Look in Django logs for errors

### Django Check Fails
- [ ] Run: `python manage.py check --deploy`
- [ ] Fix reported issues
- [ ] Re-run check

### 404 on Endpoints
- [ ] Verify URL pattern is correct
- [ ] Check if URLs are included
- [ ] Verify app is in INSTALLED_APPS

### 401/403 on Admin Endpoints
- [ ] Verify admin token is valid
- [ ] Check user account_type is ADMIN or SUPER_ADMIN
- [ ] Check can_access_admin flag is True

---

## File Locations

```
backend/apps/accounts/verification_service.py    Business logic
backend/apps/accounts/verification_views.py      API endpoints
backend/apps/accounts/verification_urls.py       URL routing
backend/apps/accounts/verification_events.py     Event publishing
backend/apps/accounts/consumers.py               WebSocket consumer
backend/apps/accounts/routing.py                 WS routing
backend/apps/core/routing.py                     Main WS routing
```

---

## Key Classes

```python
AccountVerificationService          Main service
VerificationStatusSummary           Status model
VerificationEvents                  Event publisher
VerificationConsumer                WS consumer
MemberVerificationStatusView        Member status API
AdminVerificationListView           Admin queue API
AdminVerificationApproveView        Admin approve API
```

---

## Documentation Files

```
VERIFICATION_SYSTEM_COMPLETE.md     Full documentation
FRONTEND_INTEGRATION_GUIDE.md        Frontend examples
DEPLOYMENT_CHECKLIST.md             Production checklist
IMPLEMENTATION_COMPLETE_SUMMARY.md  Implementation summary
FINAL_STATUS_REPORT.md              Current status
QUICK_REFERENCE.md                  This file
```

---

## Environment Variables

```
DEBUG=False                         Production flag
SECRET_KEY=xxx                      Django secret
ALLOWED_HOSTS=domain.com           Allowed domains
DATABASE_NAME=matiromony           DB name
DATABASE_USER=app_user             DB user
DATABASE_PASSWORD=xxx              DB password
REDIS_URL=redis://localhost:6379  Channel layer
```

---

## Performance Targets

```
API Response: < 500ms
WebSocket Latency: < 50ms
Database Query: < 100ms
Event Delivery: < 1 second
```

---

## Support Quick Links

- Documentation: `VERIFICATION_SYSTEM_COMPLETE.md`
- Integration: `FRONTEND_INTEGRATION_GUIDE.md`
- Deployment: `DEPLOYMENT_CHECKLIST.md`
- Backend: `backend/apps/accounts/`
- Tests: `backend/apps/accounts/tests/`

---

## Common Commands

```bash
# Activate virtual environment
.\.venv\Scripts\Activate.ps1          # Windows
source .venv/bin/activate             # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Run development server
python manage.py runserver

# Check system
python manage.py check --deploy

# Create superuser
python manage.py createsuperuser

# Django shell
python manage.py shell

# Test specific app
pytest apps/accounts/

# Run migrations
python manage.py migrate

# Create migration
python manage.py makemigrations

# View database
python manage.py dbshell
```

---

## Response Format

### Success
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...}
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "errors": {"field": ["error"]}
}
```

---

**Last Updated**: July 18, 2026
**Status**: Complete ✅
**Keep This Handy!**
