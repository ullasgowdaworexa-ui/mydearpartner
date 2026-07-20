import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from django.utils import timezone
from apps.accounts.models import Member
from apps.core.models import MemberMembership, MembershipPurchase

# Find user
member = Member.objects.filter(email__icontains='ullas').first()
print(f"Setting {member.email} to Free plan...")

# Deactivate all active memberships and purchases
active_memberships = MemberMembership.objects.filter(member=member, is_active=True)
active_purchases = MembershipPurchase.objects.filter(user=member, status='active')

print(f"Deactivating {active_memberships.count()} memberships and {active_purchases.count()} purchases")

# Mark as expired/cancelled
active_memberships.update(
    is_active=False, 
    status='expired',
    cancelled_at=timezone.now()
)

active_purchases.update(
    status='cancelled',
    cancelled_at=timezone.now(),
    cancellation_reason='admin_reset_to_free'
)

# Set member to not premium
member.is_premium = False
member.save()

print(f"User {member.email} is now on Free plan")
print(f"is_premium: {member.is_premium}")