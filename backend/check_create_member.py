#!/usr/bin/env python
"""Check for existing members and create a test member if none exist."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import Member
from apps.accounts.services import create_member

print("=== EXISTING MEMBERS ===")
members = Member.objects.all()[:5]
for member in members:
    print(f"ID: {member.id}")
    print(f"Email: {member.email}")
    print(f"Mobile: {member.mobile_number}")
    print(f"Name: {member.get_full_name()}")
    print(f"Active: {member.is_active}")
    print(f"Deleted: {member.deleted_at}")
    print(f"Email Verified: {member.is_email_verified}")
    print(f"Mobile Verified: {member.is_mobile_verified}")
    print("---")

if not members.exists():
    print("\n=== CREATING TEST MEMBER ===")
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
        print(f"✓ Created test member: {test_member.email}")
        print(f"  Password: TestPassword!742")
        print(f"  ID: {test_member.id}")
    except Exception as e:
        print(f"✗ Failed to create test member: {e}")
else:
    print(f"\n✓ Found {members.count()} existing members")

print("\n=== LOGIN CREDENTIALS ===")
active_members = Member.objects.filter(is_active=True, deleted_at__isnull=True)[:3]
for member in active_members:
    print(f"Email: {member.email}")
    print("Password: TestPassword!742 (if this is a test account)")
    print()