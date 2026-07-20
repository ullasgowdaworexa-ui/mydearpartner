import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from django.utils import timezone
from apps.accounts.models import Member
from apps.core.models import MemberMembership, MembershipPurchase

# Find user
members = Member.objects.filter(email__icontains='ullas')
if not members.exists():
    print("No member found")
    exit()

member = members.first()
print(f"Found: {member.email}, premium: {member.is_premium}")

# Check active memberships
active_mem = MemberMembership.objects.filter(member=member, is_active=True)
print(f"Active memberships: {active_mem.count()}")

active_purchase = MembershipPurchase.objects.filter(user=member, status='active')
print(f"Active purchases: {active_purchase.count()}")

# Clean expired records
now = timezone.now()
expired_mem = MemberMembership.objects.filter(member=member, is_active=True, expires_at__lt=now)
expired_purchase = MembershipPurchase.objects.filter(user=member, status='active', expires_at__lt=now)

if expired_mem.exists() or expired_purchase.exists():
    print("Found expired records, cleaning up...")
    expired_mem.update(is_active=False, status='expired')
    expired_purchase.update(status='expired')

# Update member premium status
has_active = MemberMembership.objects.filter(member=member, is_active=True).exists() or MembershipPurchase.objects.filter(user=member, status='active').exists()

if member.is_premium != has_active:
    member.is_premium = has_active
    member.save()
    print(f"Updated is_premium to {has_active}")

print("Done!")