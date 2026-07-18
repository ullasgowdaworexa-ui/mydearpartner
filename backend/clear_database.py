#!/usr/bin/env python
"""
Clear Database Script

WARNING: This will DELETE all user data, members, and notifications.
Use only in development environment!

This script:
1. Deletes all users and members
2. Deletes all notifications
3. Deletes verification data
4. Keeps database schema intact (migrations stay)
5. Does NOT delete seed data from other apps
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from django.db import connection
from django.db.models import Q
from apps.accounts.models import Member, User, AccountType, AuthChallenge
from django.contrib.auth.models import User as DjangoUser

print("=" * 80)
print("DATABASE CLEANUP - DELETE ALL USERS AND MEMBERS")
print("=" * 80)
print("\n⚠️  WARNING: This will permanently delete:")
print("   • All user accounts")
print("   • All member profiles")
print("   • All notifications")
print("   • All verification data")
print("   • All auth challenges")
print("\n✅ It will NOT delete:")
print("   • Database schema")
print("   • Migrations")
print("   • Settings")
print("\n")

# Ask for confirmation
response = input("Type 'YES I UNDERSTAND' to proceed (or press Enter to cancel): ")

if response != "YES I UNDERSTAND":
    print("\n❌ Cancelled. Database not modified.")
    sys.exit(0)

print("\n" + "=" * 80)
print("STARTING DATABASE CLEANUP...")
print("=" * 80)

try:
    # Count before deletion
    print("\n📊 Current database state:")
    print(f"  • Members: {Member.objects.count()}")
    print(f"  • Users: {User.objects.count()}")
    print(f"  • Django Users: {DjangoUser.objects.count()}")
    print(f"  • Auth Challenges: {AuthChallenge.objects.count()}")
    
    # Get all IDs before deletion (for logging)
    member_ids = list(Member.objects.values_list('id', flat=True))
    user_ids = list(User.objects.values_list('id', flat=True))
    
    # Step 1: Delete all auth challenges
    print("\n🔄 Step 1: Deleting auth challenges...")
    auth_challenges_count, _ = AuthChallenge.objects.all().delete()
    print(f"  ✓ Deleted {auth_challenges_count} auth challenges")
    
    # Step 2: Delete all members
    print("\n🔄 Step 2: Deleting members...")
    members_count, _ = Member.objects.all().delete()
    print(f"  ✓ Deleted {members_count} member records")
    
    # Step 3: Delete all custom users
    print("\n🔄 Step 3: Deleting custom User model...")
    users_count, _ = User.objects.all().delete()
    print(f"  ✓ Deleted {users_count} user records")
    
    # Step 4: Delete all notifications
    print("\n🔄 Step 4: Deleting notifications...")
    try:
        from apps.core.models import Notification
        notif_count, _ = Notification.objects.all().delete()
        print(f"  ✓ Deleted {notif_count} notification records")
    except ImportError:
        print("  ⓘ Notifications model not found (skipped)")
    
    # Step 5: Delete all profile verification requests
    print("\n🔄 Step 5: Deleting verification requests...")
    try:
        from apps.core.models import ProfileVerificationRequest
        verif_count, _ = ProfileVerificationRequest.objects.all().delete()
        print(f"  ✓ Deleted {verif_count} verification request records")
    except ImportError:
        print("  ⓘ Verification request model not found (skipped)")
    
    # Step 6: Verify deletion
    print("\n✅ Verification after cleanup:")
    print(f"  • Members: {Member.objects.count()}")
    print(f"  • Users: {User.objects.count()}")
    print(f"  • Auth Challenges: {AuthChallenge.objects.count()}")
    
    print("\n" + "=" * 80)
    print("✅ DATABASE CLEANUP COMPLETE!")
    print("=" * 80)
    print("\n📝 Summary:")
    print(f"  • Members deleted: {members_count}")
    print(f"  • Users deleted: {users_count}")
    print(f"  • Auth challenges deleted: {auth_challenges_count}")
    print("\n✨ Database is now clean and ready for fresh data!")
    print("\n💡 Next steps:")
    print("  1. Create new user via API")
    print("  2. Register as member")
    print("  3. Start fresh verification process")
    print("\n")

except Exception as e:
    print(f"\n❌ Error during cleanup: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
