#!/usr/bin/env python
"""Debug member login issues."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import Member
from apps.accounts.services import create_member

print("=== MEMBER LOGIN DEBUG ===")

# Check for existing members
members = Member.objects.all()
print(f"Total members in database: {members.count()}")

if members.count() == 0:
    print("\n✓ Creating test member...")
    try:
        test_member = create_member(
            email='test@example.com',
            password='TestPassword!742',
            mobile_number='9876543210',
            first_name='Test',
            last_name='Member',
            gender='male',
            date_of_birth='1990-01-01'
        )
        test_member.is_active = True
        test_member.save()
        print(f"✅ Created: {test_member.email}")
        print(f"   Password: TestPassword!742")
    except Exception as e:
        print(f"❌ Failed to create member: {e}")

print("\n=== ACTIVE MEMBERS ===")
active_members = Member.objects.filter(is_active=True, deleted_at__isnull=True)
for member in active_members[:5]:
    print(f"📧 Email: {member.email}")
    print(f"📱 Mobile: {member.mobile_number}")
    print(f"👤 Name: {member.get_full_name()}")
    print(f"✅ Active: {member.is_active}")
    print(f"🔐 Password check (TestPassword!742): {member.check_password('TestPassword!742')}")
    print("---")

if active_members.count() > 0:
    print("\n=== LOGIN TEST CREDENTIALS ===")
    member = active_members.first()
    print(f"Email/Mobile: {member.email} or {member.mobile_number}")
    print("Password: TestPassword!742")
    print("\nAPI Endpoint: POST /api/proxy/member-auth/login/")
    print("Body: {\"identifier\": \"" + member.email + "\", \"password\": \"TestPassword!742\"}")
else:
    print("\n❌ No active members found!")