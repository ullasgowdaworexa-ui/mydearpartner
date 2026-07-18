# 🔍 Where is Member Table?

## Location in pgAdmin

### Path to Member Table:

```
Database: matiromony
    └── Schemas
        └── public
            └── Tables (97)
                └── members  ← HERE!
```

---

## Visual Steps in pgAdmin

### Step 1: Expand Tables
In pgAdmin left sidebar, look for **"Tables (97)"** and click the arrow ▶ to expand it

### Step 2: Find "members" Table
Scroll down through the table list until you find:
```
▶ members
```

### Step 3: View Member Data
Right-click on **`members`** table → Select **"View/Edit Data"** → **"All Rows"**

---

## Table Details

### Table Name
```
members
```

### Database
```
matiromony
```

### Schema
```
public
```

### Full Path
```
matiromony.public.members
```

---

## Member Table Columns

The `members` table contains:

```
• id (UUID) - Member ID
• email - Email address
• password - Hashed password
• first_name - First name
• last_name - Last name
• mobile_number - Phone number
• gender - Male/Female/Other
• date_of_birth - Date of birth
• is_active - Active status
• is_email_verified - Email verified?
• is_mobile_verified - Mobile verified?
• profile_status - Profile status
• photo_status - Photo status
• document_status - Document status
• created_at - Creation date
• updated_at - Last update
• deleted_at - Deletion date (soft delete)
• ... (more fields)
```

---

## How to Access Member Table

### Method 1: pgAdmin GUI (EASIEST)
1. Open pgAdmin4
2. Connect to `matiromony` database
3. In left sidebar: `Databases` → `matiromony` → `Schemas` → `public` → `Tables`
4. Find and click **`members`**
5. Right-click → **"View/Edit Data"** → **"All Rows"**

### Method 2: SQL Query
```sql
SELECT * FROM members LIMIT 10;
```

### Method 3: Django Shell
```bash
python manage.py shell
```

```python
from apps.accounts.models import Member
Member.objects.all()[:10]
```

### Method 4: Direct PostgreSQL
```bash
psql -U postgres -d matiromony -c "SELECT * FROM members;"
```

---

## Current Status of Members Table

**Table**: `members`
**Status**: ✅ EXISTS
**Records**: Currently EMPTY (0 rows) - you deleted all members
**Schema**: INTACT - table structure is preserved

---

## Quick Navigation Map

```
🗄️ Database: matiromony
   📂 Public Schema
      📋 Tables (97 total)
         ├── account_sessions
         ├── admin_activity_logs
         ├── admins
         ├── ...
         ├── ⭐ members  ← YOU ARE HERE
         ├── ...
         └── ... (other tables)
```

---

## In Your pgAdmin Screenshot

Looking at your screenshot, scroll down from where you are and find:

```
▼ Tables (97)
  ▶ account_sessions
  ▶ admin_access_scopes
  ▶ admin_activity_logs
  ▶ admin_login_activity
  ▶ admin_permissions
  ▶ admin_role_permissions
  ▶ admin_roles
  ▶ admins
  ▶ assignment_audits
  ▶ assignment_rules
  ▶ assignment_strategies
  ▶ auth_challenges
  ▶ auth_group
  ▶ auth_group_permissions
  ▶ auth_permission
  ▶ backup_records
  ▶ blog_posts
  ▶ branches
  ▶ chat_messages
  ▶ cities
  ▶ complaints
  ▶ contact_enquiries
  ▶ countries
  ... (scroll down more)
  ▶ members  ← SCROLL DOWN TO FIND THIS
  ... (more tables)
```

---

## Summary

**Member Table Location:**
- 📍 **Database**: matiromony
- 📍 **Schema**: public  
- 📍 **Table**: members
- 📍 **Records**: 0 (empty)
- 📍 **Status**: Ready for new data

**To view**: Scroll down in pgAdmin Tables list and click on `members` table
