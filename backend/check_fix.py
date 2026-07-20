import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import Member
from apps.core.models import MemberMembership, MembershipPurchase
from apps.core.services.membership_service import MembershipService
from apps.core.services.membership_lifecycle_service import MembershipLifecycleService

# Find user
member = Member.objects.filter(email__icontains='ullas').first()
print(f"User: {member.email}")
print(f"is_premium: {member.is_premium}")

# Check what services return
effective_plan = MembershipService.get_effective_plan(member)
print(f"Effective plan: {effective_plan.slug if effective_plan else 'Free'}")

current_slug = MembershipLifecycleService.get_current_plan_slug(member)
print(f"Current slug: {current_slug}")

summary = MembershipService.get_membership_summary(member)
print(f"Summary plan: {summary['plan_slug']}")
print(f"Is free: {summary['is_free']}")

# Check active records
active_mem = MemberMembership.objects.filter(member=member, is_active=True).first()
if active_mem:
    print(f"Active membership: {active_mem.plan.slug}, expires: {active_mem.expires_at}")

active_purchase = MembershipPurchase.objects.filter(user=member, status='active').first()
if active_purchase:
    print(f"Active purchase: {active_purchase.membership_plan.slug}, expires: {active_purchase.expires_at}")