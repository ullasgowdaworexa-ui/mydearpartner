# 🗑️ DATABASE CLEANUP - Complete Instructions

**Goal**: Delete all users, members, and notifications to start fresh

---

## ✅ Method 1: Django Management Command (EASIEST)

### Step 1: Open PowerShell in backend folder
```powershell
cd c:\Users\ullas\Desktop\Company\ projects\matiromony\backend
```

### Step 2: Run the cleanup command
```powershell
.\.venv\bin\python manage.py clear_all_data --force
```

### Expected Output:
```
================================================================================
DATABASE CLEANUP - DELETE ALL USERS AND MEMBERS
================================================================================

⚠️  WARNING: This will permanently delete:
   • All user accounts
   • All member profiles
   • All notifications
   • All verification data
   • All auth challenges

================================================================================
STARTING DATABASE CLEANUP...
================================================================================

📊 Current database state:
  • Members: X
  • Users: X
  • Auth Challenges: X

🔄 Step 1: Deleting auth challenges...
  ✓ Deleted X auth challenges

🔄 Step 2: Deleting members...
  ✓ Deleted X members

🔄 Step 3: Deleting users...
  ✓ Deleted X users

✅ Verification after cleanup:
  • Members: 0
  • Users: 0
  • Auth Challenges: 0

================================================================================
✅ DATABASE CLEANUP COMPLETE!
================================================================================

✨ Database is now clean and ready for fresh data!
```

---

## ✅ Method 2: SQL Direct Delete (PostgreSQL)

### Step 1: Open command prompt
```cmd
psql -U postgres -d matiromony -h localhost
```

### Step 2: Run these SQL commands:
```sql
-- Turn off foreign key constraints
SET session_replication_role = 'replica';

-- Delete everything
DELETE FROM core_notification;
DELETE FROM core_profileverificationrequest;
DELETE FROM profiles_profilephoto;
DELETE FROM accounts_document;
DELETE FROM accounts_authchallenge;
DELETE FROM accounts_member;
DELETE FROM accounts_user;

-- Turn on foreign key constraints
SET session_replication_role = 'origin';

-- Check result (should show 0, 0, 0)
SELECT 
    (SELECT COUNT(*) FROM accounts_member) as members,
    (SELECT COUNT(*) FROM accounts_user) as users,
    (SELECT COUNT(*) FROM accounts_authchallenge) as auth_challenges;
```

### Step 3: Exit psql
```
\q
```

---

## ✅ Method 3: Python Script Directly

### Step 1: Run from backend folder
```powershell
.\.venv\bin\python simple_clean.py
```

---

## 🔍 Verify Cleanup Success

After running cleanup, verify with:

```powershell
.\.venv\bin\python manage.py shell
```

Then in the Python shell:
```python
from apps.accounts.models import Member, User, AuthChallenge

print(f"Members: {Member.objects.count()}")
print(f"Users: {User.objects.count()}")
print(f"Auth Challenges: {AuthChallenge.objects.count()}")

# Should all print 0
```

Press Ctrl+Z to exit Python shell.

---

## 📊 What Gets Deleted

### ✅ These ARE deleted:
- ✅ All users
- ✅ All members
- ✅ All auth challenges (OTPs)
- ✅ All notifications
- ✅ All verification requests
- ✅ All profile photos
- ✅ All documents

### ✅ These are NOT deleted:
- ✅ Database schema (tables structure)
- ✅ Migrations
- ✅ Settings
- ✅ Admin configuration
- ✅ Seed data in other apps (if any)

---

## 🎯 After Cleanup - Start Fresh

Once database is clean:

### 1. Create a New User
```bash
curl -X POST http://localhost:8000/api/v1/member-auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "securepassword123",
    "account_type": "MEMBER"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:8000/api/v1/member-auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "securepassword123"
  }'
```

### 3. Complete Verification
- Verify email
- Verify mobile
- Submit profile
- Submit photo
- Submit documents

---

## ⚠️ Troubleshooting

### Problem: Command not found
```
Solution: Make sure you're in the backend folder
cd c:\Users\ullas\Desktop\Company\ projects\matiromony\backend
```

### Problem: Permission denied
```
Solution: Use superuser database credentials
psql -U postgres  # then enter password
```

### Problem: Still showing data
```
Solution 1: Run the cleanup command again with --force
.\.venv\bin\python manage.py clear_all_data --force

Solution 2: Restart Python shell
exit
python manage.py shell
```

### Problem: Foreign key constraint
```
Solution: Disable constraints temporarily
SET session_replication_role = 'replica';
-- Run DELETE commands
SET session_replication_role = 'origin';
```

---

## 🔄 Backup Before Cleanup (Optional)

If you want to keep a backup:

```bash
pg_dump -U postgres -d matiromony > backup_before_cleanup_$(date +%Y%m%d_%H%M%S).sql
```

To restore later:
```bash
psql -U postgres -d matiromony < backup_file.sql
```

---

## ✨ Quick Summary

**3 easy steps:**

1. Open PowerShell in `backend` folder
2. Run: `.\.venv\bin\python manage.py clear_all_data --force`
3. Type: `yes` if prompted (or use `--force` flag to skip)

**Done!** Database is clean and ready for fresh data.

---

## 📚 Files Provided

- `clear_database.py` - Interactive cleanup script
- `cleanup_all.py` - Simple cleanup script  
- `simple_clean.py` - Output showing cleanup
- `clear_all_data.py` - Django management command (RECOMMENDED)
- `clear_db.sql` - SQL cleanup script
- `CLEAR_DATABASE_GUIDE.md` - Detailed guide
- `DATABASE_CLEANUP_INSTRUCTIONS.md` - This file

---

**Ready to delete all demo data and start fresh! 🚀**

Choose Method 1 (Django command) for easiest cleanup.
