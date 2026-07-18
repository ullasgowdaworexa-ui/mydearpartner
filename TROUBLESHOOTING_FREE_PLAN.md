# Troubleshooting: Free Plan Not Showing on Frontend

## Problem
The Free plan is not appearing on your frontend laptop after doing `git pull`.

## Root Cause Analysis
The Free plan requires:
1. ✅ **Code** - Present in the repository
2. ❌ **Database** - Must be seeded in the database
3. ❌ **Active Status** - Must have `is_active=True`

## Solution Steps

### Step 1: Check if the database is seeded
On the **frontend laptop**, run:

```bash
cd backend
python manage.py shell
```

Then in the Python shell:
```python
from apps.core.models import MembershipPlan
plans = MembershipPlan.objects.all()
print(f"Total plans: {plans.count()}")
for p in plans:
    print(f"  {p.slug}: {p.name} (active={p.is_active})")
```

### Step 2: Seed the membership plans
If the Free plan is missing or no plans exist:

```bash
cd backend
python manage.py seed_membership_plans
```

This command will create/update all 4 plans:
- Free
- Gold
- Platinum
- Elite

### Step 3: Verify the Free plan is active
Check that the Free plan has `is_active=True`:

```bash
python manage.py shell
```

```python
from apps.core.models import MembershipPlan
free = MembershipPlan.objects.get(slug='free')
print(f"Free plan active: {free.is_active}")
if not free.is_active:
    free.is_active = True
    free.save()
    print("✅ Free plan activated!")
```

### Step 4: Test the API endpoint
Test that the API returns the Free plan:

```bash
curl http://localhost:8000/api/membership-plans/
```

Or visit in browser: `http://localhost:8000/api/membership-plans/`

You should see JSON with the Free plan included.

### Step 5: Clear frontend cache
On the **frontend laptop**, clear the browser cache or use Incognito mode to ensure old cached data isn't being used.

## Quick Fix (One Command)
Just run this on the backend:

```bash
cd backend
python manage.py seed_membership_plans
```

## Why This Happens
When you pull code from Git:
- ✅ Code files are synced
- ❌ Database data is **NOT** synced
- ❌ Environment files (`.env`) are **NOT** synced

Each developer needs to:
1. Run migrations: `python manage.py migrate`
2. Seed initial data: `python manage.py seed_membership_plans`

## Prevention
Add this to your team's onboarding checklist:

```bash
# After git pull, always run:
cd backend
python manage.py migrate
python manage.py seed_membership_plans
```

## API Details
- **Endpoint**: `GET /api/membership-plans/`
- **Permission**: Public (no auth required)
- **Filter**: Only returns plans where `is_active=True`
- **Order**: Sorted by `display_order`

## Database Structure
The Free plan should have these values:
```python
{
    'slug': 'free',
    'name': 'Free',
    'price': 0.00,
    'duration_days': 30,
    'is_active': True,
    'display_order': 1,
    'profile_view_limit_daily': 10,
    'interest_limit_daily': 3,
    # ... other fields
}
```
