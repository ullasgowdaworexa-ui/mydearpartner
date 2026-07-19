#!/usr/bin/env python
"""Debug Super Admin login issues."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import SuperAdmin, AdminRole, RoleCode

print("=== SUPER ADMIN LOGIN DEBUG ===")

# Check for existing super admins
super_admins = SuperAdmin.objects.all()
print(f"Total super admins in database: {super_admins.count()}")

if super_admins.count() == 0:
    print("\n✓ Creating test super admin...")
    try:
        # Ensure super admin role exists
        super_admin_role, created = AdminRole.objects.get_or_create(
            code=RoleCode.SUPER_ADMIN,
            defaults={
                'name': 'Super Administrator',
                'description': 'Full platform access'
            }
        )
        if created:
            print(f"✓ Created Super Admin role")
        
        test_super_admin = SuperAdmin.objects.create_user(
            email='superadmin@example.com',
            password='TestPassword!742',
            mobile_number='9876543200',
            first_name='Super',
            last_name='Admin',
            role=super_admin_role,
            is_email_verified=True
        )
        test_super_admin.is_active = True
        test_super_admin.save()
        print(f"✅ Created: {test_super_admin.email}")
        print(f"   Password: TestPassword!742")
    except Exception as e:
        print(f"❌ Failed to create super admin: {e}")

print("\n=== ACTIVE SUPER ADMINS ===")
active_super_admins = SuperAdmin.objects.filter(is_active=True, deleted_at__isnull=True)
for admin in active_super_admins:
    print(f"📧 Email: {admin.email}")
    print(f"📱 Mobile: {admin.mobile_number}")
    print(f"👤 Name: {admin.get_full_name()}")
    print(f"✅ Active: {admin.is_active}")
    print(f"🔐 Password check (TestPassword!742): {admin.check_password('TestPassword!742')}")
    print(f"🔒 Account Locked: {admin.is_account_locked}")
    print(f"🚫 Failed Attempts: {admin.failed_login_attempts}")
    print(f"⏰ Locked Until: {admin.locked_until}")
    print("---")

if active_super_admins.count() > 0:
    print("\n=== SUPER ADMIN LOGIN CREDENTIALS ===")
    admin = active_super_admins.first()
    print(f"Email: {admin.email}")
    print("Password: TestPassword!742")
    print("\nLogin URL: http://localhost:3000/super-admin/login")
    print("API Endpoint: POST /api/proxy/super-admin-auth/login/")
    print("Body: {\"email\": \"" + admin.email + "\", \"password\": \"TestPassword!742\"}")
else:
    print("\n❌ No active super admins found!")

print("\n=== UNLOCK ALL ACCOUNTS ===")
for admin in SuperAdmin.objects.all():
    if admin.failed_login_attempts > 0 or admin.locked_until:
        admin.failed_login_attempts = 0
        admin.locked_until = None
        admin.save(update_fields=['failed_login_attempts', 'locked_until', 'updated_at'])
        print(f"✓ Unlocked: {admin.email}")