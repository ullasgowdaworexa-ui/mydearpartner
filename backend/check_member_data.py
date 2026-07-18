#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import Member, User
from django.db import connection

print("=" * 80)
print("MEMBER DATA CHECK")
print("=" * 80)

# Check Member table
print("\n📊 MEMBERS TABLE:")
cursor = connection.cursor()
cursor.execute("SELECT COUNT(*) FROM accounts_member")
member_count = cursor.fetchone()[0]
print(f"   Total members: {member_count}")

# Check User table
print("\n📊 USERS TABLE:")
cursor.execute("SELECT COUNT(*) FROM accounts_user")
user_count = cursor.fetchone()[0]
print(f"   Total users: {user_count}")

# If there are members, show details
if member_count > 0:
    print("\n📋 MEMBER DETAILS:")
    members = Member.objects.all()[:10]
    for member in members:
        print(f"   • {member.email} - {member.first_name} {member.last_name}")
else:
    print("\n⚠️  NO MEMBER DATA FOUND")
    print("   Table is empty - ready for new data")

# Check other related tables
print("\n📊 RELATED TABLES:")
cursor.execute("SELECT COUNT(*) FROM accounts_authchallenge")
auth_count = cursor.fetchone()[0]
print(f"   Auth challenges: {auth_count}")

cursor.execute("SELECT COUNT(*) FROM profiles_profilephoto")
photo_count = cursor.fetchone()[0]
print(f"   Profile photos: {photo_count}")

try:
    cursor.execute("SELECT COUNT(*) FROM core_profileverificationrequest")
    verif_count = cursor.fetchone()[0]
    print(f"   Verification requests: {verif_count}")
except:
    pass

print("\n" + "=" * 80)

if member_count == 0:
    print("✅ DATABASE IS CLEAN - NO MEMBER DATA")
    print("\nNext steps:")
    print("1. Create a new member via API")
    print("2. Register with email")
    print("3. Verify email/mobile")
    print("4. Complete profile")
else:
    print(f"✅ DATABASE HAS {member_count} MEMBERS")
    print("\nYou can:")
    print("1. View members in pgAdmin")
    print("2. Query via API")
    print("3. Check verification status")

print("=" * 80)
