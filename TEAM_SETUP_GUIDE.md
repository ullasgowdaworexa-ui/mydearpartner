# Team Setup Guide: After Git Pull

## Quick Fix (1 Command)

### Windows (PowerShell)
```powershell
cd backend
python manage.py seed_membership_plans
```

### Mac/Linux/Git Bash
```bash
cd backend
python manage.py seed_membership_plans
```

## Better: Use Setup Scripts

We've created automated setup scripts for you!

### Windows (PowerShell)
```powershell
cd backend
.\setup-database.ps1
```

### Mac/Linux/Git Bash
```bash
cd backend
chmod +x setup-database.sh
./setup-database.sh
```

## What These Scripts Do

1. ✅ Run database migrations (`python manage.py migrate`)
2. ✅ Seed membership plans (Free, Gold, Platinum, Elite)
3. ✅ Verify Free plan exists and is active

## Why Do We Need This?

### The Problem
```
Developer A                    Developer B (Frontend Laptop)
───────────                    ─────────────────────────────
│ Creates Free plan           │ git pull
│ (stored in DB)              │ ✅ Gets code
│                             │ ❌ DB still empty!
│ git push                    │ Frontend: No Free plan showing
```

### The Solution
Git syncs **code**, not **database data**. Each developer must run the seed command to populate their local database.

```
Developer B After Running Seed
─────────────────────────────
│ git pull                    ✅ Code synced
│ python manage.py seed...   ✅ DB populated
│ Frontend now works!         ✅ Free plan showing
```

## Standard Workflow

Every time you pull code, run:

```bash
# 1. Pull latest code
git pull

# 2. Install new dependencies (if any)
cd backend
pip install -r requirements/base.txt

cd ../frontend-next
npm install

# 3. Update database ⭐ IMPORTANT!
cd ../backend
python manage.py migrate
python manage.py seed_membership_plans

# 4. Start servers
# Terminal 1 - Backend
python manage.py runserver

# Terminal 2 - Frontend
cd frontend-next
npm run dev
```

## Troubleshooting

### "No module named 'django'"
**Cause**: Virtual environment not activated

**Solution**:
```bash
# Windows
cd backend
venv\Scripts\activate

# Mac/Linux
cd backend
source .venv/bin/activate
```

### "Table doesn't exist"
**Cause**: Migrations not run

**Solution**:
```bash
cd backend
python manage.py migrate
```

### "Free plan still not showing"
**Causes**:
1. Browser cache
2. Frontend API URL wrong
3. Backend not running

**Solutions**:
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Check frontend `.env` has correct `NEXT_PUBLIC_API_URL`
3. Ensure backend is running on correct port

## For New Team Members

When setting up for the first time:

```bash
# 1. Clone repository
git clone https://github.com/ullasgowdaworexa-ui/mydearpartner.git
cd mydearpartner

# 2. Setup backend
cd backend
python -m venv venv
source venv/bin/activate  # Mac/Linux
# or
venv\Scripts\activate     # Windows

pip install -r requirements/base.txt

# 3. Create .env file
cp .env.example .env.local
# Edit .env.local with your database credentials

# 4. Setup database ⭐
python manage.py migrate
python manage.py seed_membership_plans

# 5. Create superuser (optional)
python manage.py createsuperuser

# 6. Setup frontend
cd ../frontend-next
npm install
cp .env.example .env.local
# Edit .env.local with your API URL

# 7. Start servers
# Terminal 1
cd backend
python manage.py runserver

# Terminal 2
cd frontend-next
npm run dev
```

## Verification

### Check Database Has Free Plan
```bash
cd backend
python manage.py shell
```

```python
from apps.core.models import MembershipPlan
plans = list(MembershipPlan.objects.all().values('slug', 'name', 'is_active'))
print(plans)
# Should show: [{'slug': 'free', 'name': 'Free', 'is_active': True}, ...]
```

### Check API Returns Free Plan
Visit: `http://localhost:8000/api/membership-plans/`

Should return JSON with Free plan:
```json
{
  "success": true,
  "data": [
    {
      "slug": "free",
      "name": "Free",
      "price": "0.00",
      "is_active": true,
      ...
    },
    ...
  ]
}
```

### Check Frontend Shows Free Plan
Visit: `http://localhost:3000/membership`

You should see 4 plans: Free, Gold, Platinum, Elite

## Add to Your Git Workflow

Consider adding a Git hook to remind developers:

### Create `.git/hooks/post-merge`
```bash
#!/bin/bash
echo ""
echo "⚠️  REMINDER: Database might need updating!"
echo "Run: cd backend && python manage.py seed_membership_plans"
echo ""
```

Make it executable:
```bash
chmod +x .git/hooks/post-merge
```

Now every time someone pulls code, they'll see a reminder!

## Summary

**Problem**: Free plan not in database after `git pull`

**Reason**: Git doesn't sync database data, only code

**Solution**: Run `python manage.py seed_membership_plans` after every pull

**Automation**: Use the setup scripts we created in `backend/setup-database.sh` or `backend/setup-database.ps1`
