# Setup Instructions for Team Members

## Quick Start (For Your Friend)

### Step 1: Pull Latest Code
```bash
git pull
```

### Step 2: Setup Database (IMPORTANT!)
Choose based on your operating system:

#### Windows (PowerShell):
```powershell
cd backend
.\setup-database.ps1
```

#### Mac/Linux/Git Bash:
```bash
cd backend
chmod +x setup-database.sh
./setup-database.sh
```

### Step 3: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd frontend-next
npm run dev
```

### Step 4: Verify Everything Works
- Backend API: http://localhost:8000/api/membership-plans/
- Frontend: http://localhost:3000/membership

You should see 4 plans: **Free**, Gold, Platinum, Elite

---

## What Just Happened?

The setup script did 3 things:
1. ✅ Ran database migrations (created tables)
2. ✅ Seeded membership plans (created Free, Gold, Platinum, Elite)
3. ✅ Verified Free plan exists and is active

---

## If Something Goes Wrong

### Problem: Virtual environment not activated
**Error:** `ModuleNotFoundError: No module named 'django'`

**Solution:**
```bash
cd backend

# Windows:
venv\Scripts\activate

# Mac/Linux:
source .venv/bin/activate
```

### Problem: Script won't run on Windows
**Error:** `cannot be loaded because running scripts is disabled`

**Solution:**
```powershell
# Run PowerShell as Administrator, then:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then try the script again:
.\setup-database.ps1
```

### Problem: Database connection error
**Error:** `django.db.utils.OperationalError`

**Solution:**
1. Check your `.env.local` file exists in backend folder
2. Make sure database credentials are correct
3. If using PostgreSQL, make sure it's running

---

## Manual Setup (If Scripts Don't Work)

If the automated scripts fail, run these commands manually:

```bash
cd backend

# 1. Activate virtual environment
source .venv/bin/activate  # Mac/Linux
# or
venv\Scripts\activate      # Windows

# 2. Run migrations
python manage.py migrate

# 3. Seed membership plans
python manage.py seed_membership_plans

# 4. Verify
python manage.py shell
```

Then in Python shell:
```python
from apps.core.models import MembershipPlan
plans = list(MembershipPlan.objects.values_list('slug', 'name', 'is_active'))
print(plans)
# Should show: [('free', 'Free', True), ('gold', 'Gold', True), ...]
```

---

## Why Do We Need This?

Git syncs **code** but NOT **database data**.

After `git pull`:
- ✅ You have the code
- ❌ Your database is empty

Running `setup-database` populates your database with the necessary data.

---

## Need More Help?

Check these files in the repository:
- `TEAM_SETUP_GUIDE.md` - Detailed setup guide
- `TROUBLESHOOTING_FREE_PLAN.md` - Troubleshooting tips
- `WHY_FREE_PLAN_NOT_IN_DB.md` - Technical explanation

---

## Every Time You Pull Code

Make it a habit:

```bash
git pull
cd backend
python manage.py migrate
python manage.py seed_membership_plans
```

Or just run the setup script:
```bash
cd backend
.\setup-database.ps1    # Windows
./setup-database.sh     # Mac/Linux
```

---

## First Time Setup?

If this is your first time setting up the project, follow the complete guide in `TEAM_SETUP_GUIDE.md`
