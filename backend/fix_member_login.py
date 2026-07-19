#!/usr/bin/env python
"""Fix member login by ensuring test account exists."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import Member
from django.utils import timezone

# Check for existing test member
test_member = Member.objects.filter(email='test@example.com').first()

if test_member:
    print("✓ Test member exists, updating...")
    test_member.set_password('TestPassword!742')
    test_member.is_active = True
    test_member.deleted_at = None
    test_member.save()
    print(f"✅ Updated member: {test_member.email}")
else:
    print("Creating new test member...")
    from apps.accounts.services import create_member
    test_member = create_member(
        email='test@example.com',
        password='TestPassword!742',
        mobile_number='9876543210',
        first_name='Test',
        last_name='Member',
        gender='male',
        date_of_birth='1990-01-01'
    )
    print(f"✅ Created member: {test_member.email}")

print("\n=== LOGIN CREDENTIALS ===")
print(f"Email: {test_member.email}")
print(f"Mobile: {test_member.mobile_number}")
print("Password: TestPassword!742")
print("\n=== TEST LOGIN ===")
print("URL: http://localhost:3000/login")
print("Or use API directly:")
print('curl -X POST http://localhost:3000/api/proxy/member-auth/login/ \\')
print('  -H "Content-Type: application/json" \\')
print(f'  -d \'{{"identifier": "{test_member.email}", "password": "TestPassword!742"}}\'')