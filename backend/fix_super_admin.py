#!/usr/bin/env python
"""Fix Super Admin login by ensuring account exists and is unlocked."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import SuperAdmin, AdminRole, RoleCode

print("=== FIXING SUPER ADMIN LOGIN ===")

# Check for existing super admin (we know from earlier it's admin@example.com)
existing_admin = SuperAdmin.objects.filter(email='admin@example.com').first()

if existing_admin:
    print(f"✓ Found existing super admin: {existing_admin.email}")
    
    # Reset password
    existing_admin.set_password('TestPassword!742')
    
    # Unlock account
    existing_admin.failed_login_attempts = 0
    existing_admin.locked_until = None
    
    # Ensure active
    existing_admin.is_active = True
    existing_admin.deleted_at = None
    
    existing_admin.save()
    print(f"✅ Fixed super admin: {existing_admin.email}")
    
else:
    print("Creating new super admin...")
    
    # Ensure role exists
    super_admin_role, created = AdminRole.objects.get_or_create(
        code=RoleCode.SUPER_ADMIN,
        defaults={
            'name': 'Super Administrator',
            'description': 'Full platform access'
        }
    )
    
    # Create new super admin
    new_admin = SuperAdmin.objects.create_user(
        email='admin@example.com',
        password='TestPassword!742',
        mobile_number='9876543200',
        first_name='Super',
        last_name='Admin',
        role=super_admin_role,
        is_email_verified=True
    )
    print(f"✅ Created new super admin: {new_admin.email}")

# Also fix any other super admins
print("\n=== UNLOCKING ALL SUPER ADMIN ACCOUNTS ===")
for admin in SuperAdmin.objects.all():
    admin.failed_login_attempts = 0
    admin.locked_until = None
    admin.is_active = True
    admin.save(update_fields=['failed_login_attempts', 'locked_until', 'is_active', 'updated_at'])
    print(f"✓ Unlocked: {admin.email}")

print("\n=== SUPER ADMIN LOGIN CREDENTIALS ===")
admin = SuperAdmin.objects.filter(email='admin@example.com').first()
if admin:
    print(f"✅ Email: {admin.email}")
    print("✅ Password: TestPassword!742")
    print("✅ Status: Active & Unlocked")
    print("\n🌐 Login URL: http://localhost:3000/super-admin/login")
    print("\n🔧 Test API call:")
    print('curl -X POST http://localhost:3000/api/proxy/super-admin-auth/login/ \\')
    print('  -H "Content-Type: application/json" \\')
    print(f'  -d \'{{"email": "{admin.email}", "password": "TestPassword!742"}}\'')