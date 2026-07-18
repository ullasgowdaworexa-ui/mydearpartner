#!/usr/bin/env python
"""Simple database cleanup - outputs results"""
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

import django
django.setup()

from apps.accounts.models import Member, User, AuthChallenge

print("=" * 60)
print("DATABASE CLEANUP SCRIPT")
print("=" * 60)

# Before
print("\n📊 BEFORE CLEANUP:")
before_members = Member.objects.count()
before_users = User.objects.count()
before_auth = AuthChallenge.objects.count()

print(f"  Members: {before_members}")
print(f"  Users: {before_users}")
print(f"  Auth Challenges: {before_auth}")

if before_members == 0 and before_users == 0 and before_auth == 0:
    print("\n✅ Database is already clean!")
    sys.exit(0)

# Delete
print("\n🗑️  DELETING...")
print("  Deleting auth challenges...")
AuthChallenge.objects.all().delete()

print("  Deleting members...")
Member.objects.all().delete()

print("  Deleting users...")
User.objects.all().delete()

try:
    print("  Deleting verification requests...")
    from apps.core.models import ProfileVerificationRequest
    ProfileVerificationRequest.objects.all().delete()
except:
    pass

try:
    print("  Deleting notifications...")
    from apps.core.models import Notification
    Notification.objects.all().delete()
except:
    pass

# After
print("\n📊 AFTER CLEANUP:")
after_members = Member.objects.count()
after_users = User.objects.count()
after_auth = AuthChallenge.objects.count()

print(f"  Members: {after_members}")
print(f"  Users: {after_users}")
print(f"  Auth Challenges: {after_auth}")

print("\n✅ CLEANUP COMPLETE!")
print(f"  Deleted {before_members} members")
print(f"  Deleted {before_users} users")
print(f"  Deleted {before_auth} auth challenges")

print("\n🎉 Database is ready for fresh data!")
