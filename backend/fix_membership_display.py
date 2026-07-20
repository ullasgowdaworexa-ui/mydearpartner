#!/usr/bin/env python
"""
Django management command to fix membership display issues
"""

from django.utils import timezone
from django.db import transaction
from apps.accounts.models import Member
from apps.core.models import MemberMembership, MembershipPurchase
from apps.core.services.membership_service import MembershipService
from apps.core.services.membership_lifecycle_service import MembershipLifecycleService

# Find user with display issue
print("🔍 Finding user with membership display issue...")
members = Member.objects.filter(email__icontains='ullas')
if not members.exists():
    print("❌ No member found with 'ullas' in email")
    exit()

member = members.first()
print(f"Found member: {member.email}")
print(f"Member ID: {member.id}")
print(f"is_premium: {member.is_premium}")
print()

# Check current state
print("📋 Current MemberMembership records:")
memberships = MemberMembership.objects.filter(member=member).order_by('-created_at')
for i, mem in enumerate(memberships):
    print(f"  {i+1}. Plan: {mem.plan.slug if mem.plan else 'None'}")
    print(f"     Status: {mem.status}, Active: {mem.is_active}")
    print(f"     Expires: {mem.expires_at}")

print()
print("💳 Current MembershipPurchase records:")
purchases = MembershipPurchase.objects.filter(user=member).order_by('-created_at')
for i, purchase in enumerate(purchases):
    print(f"  {i+1}. Plan: {purchase.membership_plan.slug if purchase.membership_plan else 'None'}")
    print(f"     Status: {purchase.status}")
    print(f"     Expires: {purchase.expires_at}")

print()
print("🔧 Service results BEFORE cleanup:")
effective_plan = MembershipService.get_effective_plan(member)
print(f"Effective plan: {effective_plan.slug if effective_plan else 'None (Free)'}")

current_slug = MembershipLifecycleService.get_current_plan_slug(member)
print(f"Current plan slug: {current_slug}")

summary = MembershipService.get_membership_summary(member)
print(f"Summary: plan={summary['plan_slug']}, free={summary['is_free']}, active={summary['has_active_plan']}")

# Fix the data
print()
print("🧹 Cleaning up membership data...")

now = timezone.now()

with transaction.atomic():
    # 1. Expire any past-due memberships
    expired_memberships = MemberMembership.objects.filter(
        member=member,
        is_active=True,
        expires_at__lt=now
    )
    expired_count = expired_memberships.update(
        is_active=False,
        status=MemberMembership.MembershipStatus.EXPIRED
    )
    if expired_count > 0:
        print(f"✅ Expired {expired_count} MemberMembership records")

    # 2. Expire any past-due purchases
    expired_purchases = MembershipPurchase.objects.filter(
        user=member,
        status='active',
        expires_at__lt=now
    )
    expired_purchase_count = expired_purchases.update(status='expired')
    if expired_purchase_count > 0:
        print(f"✅ Expired {expired_purchase_count} MembershipPurchase records")

    # 3. If no active memberships/purchases, ensure is_premium=False
    has_active_membership = MemberMembership.objects.filter(
        member=member,
        is_active=True,
        status=MemberMembership.MembershipStatus.ACTIVE
    ).exists()
    
    has_active_purchase = MembershipPurchase.objects.filter(
        user=member,
        status='active'
    ).exists()

    should_be_premium = has_active_membership or has_active_purchase
    
    if member.is_premium != should_be_premium:
        member.is_premium = should_be_premium
        member.save(update_fields=['is_premium'])
        print(f"✅ Updated member.is_premium to {should_be_premium}")

    # 4. Remove duplicate active records
    active_memberships = MemberMembership.objects.filter(
        member=member,
        is_active=True
    ).order_by('-started_at', '-created_at')
    
    if active_memberships.count() > 1:
        keep = active_memberships.first()
        duplicates = active_memberships.exclude(id=keep.id)
        dup_count = duplicates.update(is_active=False, status=MemberMembership.MembershipStatus.EXPIRED)
        print(f"✅ Removed {dup_count} duplicate active memberships")

print()
print("🎉 Cleanup completed! Checking results...")

# Check after cleanup
effective_plan = MembershipService.get_effective_plan(member)
print(f"Effective plan AFTER: {effective_plan.slug if effective_plan else 'None (Free)'}")

current_slug = MembershipLifecycleService.get_current_plan_slug(member)
print(f"Current plan slug AFTER: {current_slug}")

summary = MembershipService.get_membership_summary(member)
print(f"Summary AFTER: plan={summary['plan_slug']}, free={summary['is_free']}, active={summary['has_active_plan']}")

print()
print("✅ Fix completed! The user should now show the correct plan in frontend.")