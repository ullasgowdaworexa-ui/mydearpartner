# 📋 Member Data Status

## Current Status

**Member Data: 🗑️ DELETED (Clean Database)**

When you ran the cleanup script, all member data was deleted:
- ✅ All members deleted
- ✅ All user accounts deleted  
- ✅ All auth challenges deleted
- ✅ All notifications deleted

---

## Where Member Data Is Stored

### Database Location

**Database**: `matiromony`
**Table**: `accounts_member`

### To View Member Data:

#### Option 1: pgAdmin UI
1. Open pgAdmin4 (or download from https://www.pgadmin.org)
2. Connect to `matiromony` database
3. Navigate: `Databases` → `matiromony` → `Schemas` → `public` → `Tables`
4. Right-click `accounts_member` → `View Data` → `All Rows`

#### Option 2: Django Shell
```bash
cd backend
python manage.py shell
```

Then:
```python
from apps.accounts.models import Member

# Count members
print(Member.objects.count())  # Shows total

# View first 10
members = Member.objects.all()[:10]
for member in members:
    print(f"{member.email} - {member.first_name}")

# Exit
exit()
```

#### Option 3: Direct SQL
```sql
SELECT * FROM accounts_member LIMIT 10;
```

---

## Member Table Fields

```
id (UUID)              - Member ID
email (string)         - Email address
mobile_number          - Phone number
first_name             - First name
last_name              - Last name
gender                 - Gender (Male/Female/Other)
date_of_birth          - DOB
is_email_verified      - Email verified flag
is_mobile_verified     - Mobile verified flag
is_active              - Active status
profile_status         - Profile verification status
photo_status           - Photo verification status
document_status        - Document verification status
created_at             - Created date
updated_at             - Updated date
deleted_at             - Deleted date (soft delete)
... (20+ more fields)
```

---

## Current Data Status

**Today's Cleanup Summary:**
- ✅ Members table: **EMPTY** (0 records)
- ✅ Users table: **EMPTY** (0 records)
- ✅ Auth challenges: **EMPTY** (0 records)
- ✅ All other user data: **DELETED**

---

## How to Add New Member Data

### Option 1: API Registration
```bash
curl -X POST http://localhost:8000/api/v1/member-auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### Option 2: Django Shell
```python
from apps.accounts.models import Member

member = Member.objects.create_user(
    email="user@example.com",
    password="secure123",
    first_name="John",
    last_name="Doe"
)
```

### Option 3: Admin Interface
```bash
python manage.py createsuperuser
python manage.py runserver
# Go to http://localhost:8000/admin/
```

---

## Backup Check

If you want to restore member data from a backup:

```bash
# List available backups
ls -la backup*.sql

# Restore from backup
psql -U postgres -d matiromony < backup_file.sql
```

---

## Next Steps

1. **Check Current Data**: No members currently
2. **Create New Member**: Use API or Django shell
3. **Verify Member**: Check in pgAdmin
4. **Add Profile**: Complete member profile
5. **Upload Photos**: Add profile photos
6. **Start Verification**: Begin verification process

---

## FAQ

**Q: Where is my old member data?**
A: It was deleted during the cleanup process. If you need it back, restore from a backup file.

**Q: How do I create test members?**
A: Use the API `/api/v1/member-auth/register/` or Django shell.

**Q: Can I see members in pgAdmin?**
A: Yes, connect to matiromony database and navigate to `accounts_member` table.

**Q: Is the table structure intact?**
A: Yes! Only the data (rows) was deleted. Table schema is 100% intact.

---

**Summary**: Database is clean and ready for fresh member data! 🎉
