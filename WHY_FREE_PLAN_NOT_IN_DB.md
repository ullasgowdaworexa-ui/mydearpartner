# Why Free Plan Is Not Stored in Database

## The Problem
After running `git pull`, the Free plan doesn't appear on the frontend because it's not in the database.

## Root Cause: Database vs Code Separation

### What Git Syncs ✅
- Source code files (`.py`, `.ts`, `.tsx`, etc.)
- Configuration templates (`.env.example`)
- Migration files (Python files that describe database changes)
- Seed commands (Python files that contain data to insert)

### What Git DOES NOT Sync ❌
- **Database data** (actual records in PostgreSQL/SQLite)
- **Environment variables** (`.env`, `.env.local`)
- **Media files** (`media/`, `private_media/`)
- **Cache files** (`__pycache__/`, `.ruff_cache/`)

## The Solution Path

The Free plan exists in **TWO places**:

### 1. In Code (Already Synced ✅)
```python
# File: backend/apps/accounts/management/commands/seed_membership_plans.py
{
    'slug': 'free',
    'name': 'Free',
    'price': 0.00,
    'duration': '30 Days',
    'duration_days': 30,
    'is_active': True,
    # ... more fields
}
```

### 2. In Database (NOT Synced ❌)
```sql
-- Table: membership_plans
-- Record must exist with slug='free'
```

## Why the Disconnect?

When you push code to Git, you're pushing the **seed command** (the recipe), not the **database records** (the actual data).

Each developer must:
1. Pull the code (`git pull`) ← Gets the recipe
2. Run migrations (`python manage.py migrate`) ← Creates tables
3. **Run seed command** (`python manage.py seed_membership_plans`) ← Creates data

## Step-by-Step Fix for Frontend Laptop

### Option 1: Run the Seed Command (Recommended)
```bash
cd backend

# Activate virtual environment (choose based on your setup)
# Windows (if using venv):
venv\Scripts\activate

# Mac/Linux or Git Bash on Windows (if using .venv):
source .venv/bin/activate

# Run the seed command
python manage.py seed_membership_plans
```

### Option 2: Manual Database Insert (If seed command fails)
```bash
cd backend
python manage.py shell
```

Then in Python shell:
```python
from apps.core.models import MembershipPlan

# Check if Free plan exists
free_exists = MembershipPlan.objects.filter(slug='free').exists()
print(f"Free plan exists: {free_exists}")

if not free_exists:
    # Create Free plan manually
    free_plan = MembershipPlan.objects.create(
        slug='free',
        name='Free',
        price=0.00,
        duration='30 Days',
        duration_days=30,
        is_active=True,
        is_featured=False,
        display_order=1,
        profile_view_limit_daily=10,
        interest_limit_daily=3,
        message_limit_daily=0,
        can_message=False,
        can_view_profile_visitors=False,
        can_view_received_interests=False,
        can_view_private_photos=False,
        can_get_priority_listing=False,
        can_use_profile_boost=False,
        contact_access_mode='NONE',
        photo_access_mode='PRIMARY_ONLY',
        can_use_advanced_search=False,
        can_use_horoscope=False,
        profile_boost_level='NONE',
        support_priority='STANDARD',
        description='Basic search and matching with limitations',
        color='from-gray-400 to-gray-600',
        features=['Basic profiles search', 'Send 3 interests daily', 'View primary photos only'],
        entitlements={
            'daily_profile_view_limit': 10,
            'can_send_interest': True,
            'daily_interest_limit': 3,
            'can_chat': False,
            'can_view_contact_details': False,
            'profile_visibility_boost': False,
            'can_see_who_viewed_profile': False,
            'can_view_received_interests': False,
            'priority_support': False,
            'max_photos': 6,
            'contact_access_mode': 'NONE',
            'photo_access_mode': 'PRIMARY_ONLY',
            'can_use_advanced_search': False
        }
    )
    print(f"✅ Created Free plan: {free_plan.id}")
else:
    # If it exists but inactive, activate it
    free_plan = MembershipPlan.objects.get(slug='free')
    if not free_plan.is_active:
        free_plan.is_active = True
        free_plan.save()
        print("✅ Activated existing Free plan")
    else:
        print("✅ Free plan already exists and is active")
```

### Option 3: Database Dump/Restore (For Production)
If you want to sync the entire database:

**On your machine (source):**
```bash
cd backend
python manage.py dumpdata core.MembershipPlan --indent 2 > membership_plans.json
```

**On frontend laptop (destination):**
```bash
cd backend
python manage.py loaddata membership_plans.json
```

## Verification Steps

### 1. Check Database
```bash
cd backend
python manage.py shell
```

```python
from apps.core.models import MembershipPlan
plans = MembershipPlan.objects.all().values('slug', 'name', 'is_active', 'price')
for p in plans:
    print(p)
```

Expected output:
```
{'slug': 'free', 'name': 'Free', 'is_active': True, 'price': Decimal('0.00')}
{'slug': 'gold', 'name': 'Gold', 'is_active': True, 'price': Decimal('2999.00')}
{'slug': 'platinum', 'name': 'Platinum', 'is_active': True, 'price': Decimal('5999.00')}
{'slug': 'elite', 'name': 'Elite', 'is_active': True, 'price': Decimal('14999.00')}
```

### 2. Check API Endpoint
```bash
# Test the API
curl http://localhost:8000/api/membership-plans/ | python -m json.tool
```

Or visit in browser: `http://localhost:8000/api/membership-plans/`

### 3. Check Frontend
Visit: `http://localhost:3000/membership`

You should see all 4 plans including Free.

## Prevention: Add to Team Workflow

### Create a Setup Script
```bash
# File: backend/setup.sh (Mac/Linux)
#!/bin/bash
python manage.py migrate
python manage.py seed_membership_plans
echo "✅ Database setup complete"
```

```powershell
# File: backend/setup.ps1 (Windows PowerShell)
python manage.py migrate
python manage.py seed_membership_plans
Write-Host "✅ Database setup complete"
```

### Update Documentation
Add to `README.md`:

```markdown
## After Git Pull

Always run these commands to sync your database:

```bash
cd backend
python manage.py migrate
python manage.py seed_membership_plans
```

## Common Issues

### Issue 1: "No module named 'django'"
**Cause**: Virtual environment not activated
**Solution**:
```bash
# Windows
venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate
```

### Issue 2: "Table 'membership_plans' doesn't exist"
**Cause**: Migrations not run
**Solution**:
```bash
python manage.py migrate
```

### Issue 3: Free plan exists but still not showing
**Cause**: Plan is inactive or frontend cache
**Solutions**:
1. Check `is_active` flag in database
2. Clear browser cache
3. Restart frontend dev server
4. Check console for API errors

### Issue 4: "Permission denied" when running seed command
**Cause**: Database connection issues
**Solution**:
1. Check `.env` file has correct DB credentials
2. Ensure PostgreSQL/SQLite is running
3. Check database name matches in `.env`

## Architecture Understanding

```
┌─────────────────┐
│   Git Repo      │  ← Only code files
│  (GitHub)       │
└────────┬────────┘
         │ git pull
         ↓
┌─────────────────┐
│ Local Machine   │
│                 │
│  ┌───────────┐  │
│  │ Code      │  │ ← Seed command file exists
│  └───────────┘  │
│                 │
│  ┌───────────┐  │
│  │ Database  │  │ ← Empty! Need to run seed
│  └───────────┘  │
└─────────────────┘
```

After running `python manage.py seed_membership_plans`:

```
┌─────────────────┐
│ Local Machine   │
│                 │
│  ┌───────────┐  │
│  │ Code      │  │ ← Seed command
│  └───────────┘  │
│         │        │
│         ↓ executes
│  ┌───────────┐  │
│  │ Database  │  │ ← Now has Free plan!
│  │  • free   │  │
│  │  • gold   │  │
│  │  • platinum│ │
│  │  • elite  │  │
│  └───────────┘  │
└─────────────────┘
```

## Summary

**Question**: Why is Free plan not in database after git pull?

**Answer**: Because Git only syncs **code**, not **database data**. The seed command (code) is synced, but it needs to be **executed** to create the database records.

**Solution**: Run `python manage.py seed_membership_plans` on every machine after pulling code.

**Prevention**: Add database seeding to your team's standard workflow after `git pull`.
