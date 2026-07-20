import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from django.utils import timezone
from apps.accounts.models import Member
from apps.core.models import MemberMembership, MembershipPurchase

# Find user
member = Member.objects.filter(email__icontains='ullas').first()
print(f"Fixing conflicts for: {member.email}")

# Get all active records
active_memberships = MemberMembership.objects.filter(member=member, is_active=True)
active_purchases = MembershipPurchase.objects.filter(user=member, status='active')

print(f"Found {active_memberships.count()} active MemberMembership records")
print(f"Found {active_purchases.count()} active MembershipPurchase records")

# Show details
for i, mem in enumerate(active_memberships):
    print(f"  Membership {i+1}: {mem.plan.slug}, created: {mem.created_at}")

for i, purchase in enumerate(active_purchases):
    print(f"  Purchase {i+1}: {purchase.membership_plan.slug}, created: {purchase.created_at}")

# Decision: If user has active purchases, deactivate all MemberMembership records
# If no active purchases, keep the most recent MemberMembership
if active_purchases.exists():
    print("\nUser has active purchases - deactivating all MemberMembership records...")
    active_memberships.update(is_active=False, status='expired')
    print("Deactivated all MemberMembership records")
else:
    print("\nNo active purchases - keeping most recent MemberMembership...")
    if active_memberships.count() > 1:
        # Keep most recent, deactivate others
        latest = active_memberships.order_by('-created_at').first()
        others = active_memberships.exclude(id=latest.id)
        others.update(is_active=False, status='expired')
        print(f"Kept {latest.plan.slug} membership, deactivated {others.count()} others")

print("\nAfter fix:")
active_memberships = MemberMembership.objects.filter(member=member, is_active=True)
active_purchases = MembershipPurchase.objects.filter(user=member, status='active')
print(f"Active MemberMembership: {active_memberships.count()}")
print(f"Active MembershipPurchase: {active_purchases.count()}")

# Update premium status
has_active = active_memberships.exists() or active_purchases.exists()
member.is_premium = has_active
member.save()
print(f"Updated is_premium to: {has_active}")
print("Fix completed!")