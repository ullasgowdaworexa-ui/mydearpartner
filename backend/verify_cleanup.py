#!/usr/bin/env python
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import Member, User, AuthChallenge

members = Member.objects.all().count()
users = User.objects.all().count()
auth_challenges = AuthChallenge.objects.all().count()

print(f"Members in database: {members}")
print(f"Users in database: {users}")
print(f"Auth challenges in database: {auth_challenges}")

if members == 0 and users == 0 and auth_challenges == 0:
    print("\n✅ SUCCESS! Database is completely clean!")
else:
    print(f"\n⚠️  Database still contains data. Running cleanup...")
    
    # Force delete
    AuthChallenge.objects.all().delete()
    Member.objects.all().delete()
    User.objects.all().delete()
    
    print("\n✅ Cleanup complete!")
    print(f"Members in database: {Member.objects.all().count()}")
    print(f"Users in database: {User.objects.all().count()}")
