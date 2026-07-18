# Complete Database Cleanup Guide

**Objective**: Delete all users, members, and notifications to start fresh

---

## Option 1: Using Django Management Command (RECOMMENDED)

### Run the cleanup command:
```bash
cd backend
python manage.py clear_all_data --force
```

This will:
- ✅ Delete all users
- ✅ Delete all members  
- ✅ Delete all auth challenges
- ✅ Delete all notifications
- ✅ Delete all verification requests
- ✅ Keep database schema intact

---

## Option 2: Manual Python Script

### Run directly:
```bash
cd backend
python verify_cleanup.py
```

---

## Option 3: Using psql (PostgreSQL Direct)

### Connect to database:
```bash
psql -U postgres -d matiromony -h localhost
```

### Run cleanup SQL:
```sql
-- Disable foreign keys
SET session_replication_role = 'replica';

-- Delete in order
DELETE FROM core_notification;
DELETE FROM core_profileverificationrequest;
DELETE FROM profiles_profilephoto;
DELETE FROM accounts_document;
DELETE FROM accounts_authchallenge;
DELETE FROM accounts_member;
DELETE FROM accounts_user;
DELETE FROM django_session;

-- Re-enable foreign keys
SET session_replication_role = 'origin';

-- Verify
SELECT 
    (SELECT COUNT(*) FROM accounts_member) as members,
    (SELECT COUNT(*) FROM accounts_user) as users,
    (SELECT COUNT(*) FROM accounts_authchallenge) as auth_challenges;
```

Output should show: `members | users | auth_challenges`
                     `0       | 0     | 0`

---

## Option 4: Complete Database Reset (Nuclear Option)

### This drops and recreates the entire database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Drop existing database
DROP DATABASE IF EXISTS matiromony;

# Create new database
CREATE DATABASE matiromony;

# Exit psql
\q

# Now run migrations to rebuild schema
cd backend
python manage.py migrate
```

---

## Verification

### After cleanup, verify with:

```bash
python manage.py shell
```

Then in the shell:
```python
from apps.accounts.models import Member, User
print(f"Members: {Member.objects.count()}")
print(f"Users: {User.objects.count()}")
```

Should print:
```
Members: 0
Users: 0
```

---

## What Gets Deleted

### ✅ Deleted
- All user accounts
- All member profiles
- All auth challenges/OTPs
- All notifications
- All verification requests
- All profile photos
- All documents
- All sessions

### ✅ NOT Deleted
- Database schema
- Migrations
- Tables structure
- Settings
- Admin configuration

---

## After Cleanup

### To start fresh:
1. Create new user via API: `POST /api/v1/member-auth/register/`
2. Register member profile
3. Start verification process
4. Upload photos and documents

---

## Troubleshooting

### If cleanup doesn't work:

**Issue**: Permission denied
```bash
# Solution: Use superuser
psql -U postgres -d matiromony
```

**Issue**: Cannot drop table due to foreign keys
```sql
-- Use CASCADE to drop dependencies
DROP TABLE accounts_member CASCADE;
DROP TABLE accounts_user CASCADE;
```

**Issue**: Still showing data after cleanup
```bash
# Restart Django shell
python manage.py shell
# Try again
```

---

## Quick Command

Run this single command to delete everything:

```bash
python manage.py clear_all_data --force
```

---

## Database Backup (Before Cleanup)

### Create backup first:
```bash
pg_dump -U postgres -d matiromony > backup_before_cleanup.sql
```

### Restore if needed:
```bash
psql -U postgres -d matiromony < backup_before_cleanup.sql
```

---

## Status Check Command

```bash
python manage.py dbshell
SELECT COUNT(*) FROM accounts_member;
SELECT COUNT(*) FROM accounts_user;
SELECT COUNT(*) FROM accounts_authchallenge;
```

---

**Ready to start fresh! 🎉**

Use Option 1 (management command) for the easiest cleanup.
