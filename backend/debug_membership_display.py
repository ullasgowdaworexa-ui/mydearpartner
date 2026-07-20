#!/usr/bin/env python
"""
Debug script to check and fix membership display issues.
This script will:
1. Find the user with incorrect display (shows Platinum but should be Free)
2. Check database state
3. Clean up any inconsistent data
4. Ensure correct plan display
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from django.utils import timezone
from apps.accounts.models import Member
from apps.core.models import MemberMembership, MembershipPurchase, MembershipPlan
from apps.core.services.membership_service import MembershipService
from apps.core.services.membership_lifecycle_service import MembershipLifecycleService

def debug_user_membership(email_pattern):
    """Debug membership for a specific user"""
    try:
        # Find user
        members = Member.objects.filter(email__icontains=email_pattern)
        if not members.exists():
            print(f"❌ No member found with email containing '{email_pattern}'")
            return
        
        member = members.first()
        print(f"🔍 Debugging membership for: {member.email}")
        print(f"   Member ID: {member.id}")
        print(f"   is_premium: {member.is_premium}")
        print(f"   account_status: {member.account_status}")
        print(f"   is_active: {member.is_active}")
        print()
        
        # Check MemberMembership records
        print("📋 MemberMembership Records:")
        memberships = MemberMembership.objects.filter(member=member).order_by('-created_at')
        for i, mem in enumerate(memberships):
            print(f"   {i+1}. Plan: {mem.plan.slug if mem.plan else 'None'}")
            print(f"      Status: {mem.status}, Active: {mem.is_active}")
            print(f"      Started: {mem.started_at}")
            print(f"      Expires: {mem.expires_at}")
            print(f"      Created: {mem.created_at}")
            print()
        
        # Check MembershipPurchase records  
        print("💳 MembershipPurchase Records:")
        purchases = MembershipPurchase.objects.filter(user=member).order_by('-created_at')
        for i, purchase in enumerate(purchases):
            print(f"   {i+1}. Plan: {purchase.membership_plan.slug if purchase.membership_plan else 'None'}")
            print(f"      Status: {purchase.status}")
            print(f"      Starts: {purchase.starts_at}")
            print(f"      Expires: {purchase.expires_at}")
            print(f"      Created: {purchase.created_at}")
            print()
        
        # Check what services return
        print("🔧 Service Results:")
        effective_plan = MembershipService.get_effective_plan(member)
        print(f"   Effective plan: {effective_plan.slug if effective_plan else 'None (Free)'}")
        
        current_slug = MembershipLifecycleService.get_current_plan_slug(member)
        print(f"   Current plan slug: {current_slug}")
        
        summary = MembershipService.get_membership_summary(member)
        print(f"   Summary plan: {summary['plan_slug']}")
        print(f"   Summary is_free: {summary['is_free']}")
        print(f"   Summary has_active_plan: {summary['has_active_plan']}")
        print()
        
        return member, memberships, purchases, summary
        
    except Exception as e:
        print(f"❌ Error debugging membership: {e}")
        import traceback
        traceback.print_exc()

def clean_membership_data(member):
    """Clean up inconsistent membership data"""
    print(f"🧹 Cleaning membership data for: {member.email}")
    
    now = timezone.now()
    
    # 1. Expire any active memberships that are past their expiry date
    expired_memberships = MemberMembership.objects.filter(
        member=member,
        is_active=True,
        expires_at__lt=now
    )
    
    expired_count = expired_memberships.count()
    if expired_count > 0:
        expired_memberships.update(
            is_active=False,
            status=MemberMembership.MembershipStatus.EXPIRED
        )
        print(f"   ✅ Expired {expired_count} MemberMembership records")
    
    # 2. Expire any active purchases that are past their expiry date
    expired_purchases = MembershipPurchase.objects.filter(
        user=member,
        status='active',
        expires_at__lt=now
    )
    
    expired_purchase_count = expired_purchases.count()
    if expired_purchase_count > 0:
        expired_purchases.update(status='expired')
        print(f"   ✅ Expired {expired_purchase_count} MembershipPurchase records")
    
    # 3. Check if member should have is_premium=False
    active_membership = MembershipService.get_active_membership(member)
    should_be_premium = active_membership is not None
    
    if member.is_premium != should_be_premium:
        member.is_premium = should_be_premium
        member.save(update_fields=['is_premium'])
        print(f"   ✅ Updated member.is_premium to {should_be_premium}")
    
    # 4. Remove duplicate active memberships (keep most recent)
    active_memberships = MemberMembership.objects.filter(
        member=member,
        is_active=True
    ).order_by('-started_at', '-created_at')
    
    if active_memberships.count() > 1:
        # Keep the first (most recent), deactivate others
        keep = active_memberships.first()
        duplicates = active_memberships.exclude(id=keep.id)
        duplicates.update(is_active=False, status=MemberMembership.MembershipStatus.EXPIRED)
        print(f"   ✅ Removed {duplicates.count()} duplicate active memberships")
    
    # 5. Remove duplicate active purchases (keep most recent)
    active_purchases = MembershipPurchase.objects.filter(
        user=member,
        status='active'
    ).order_by('-starts_at', '-created_at')
    
    if active_purchases.count() > 1:
        # Keep the first (most recent), deactivate others
        keep = active_purchases.first()
        duplicates = active_purchases.exclude(id=keep.id)
        duplicates.update(status='expired')
        print(f"   ✅ Removed {duplicates.count()} duplicate active purchases")
    
    print("   🎉 Cleanup completed!")

def main():
    print("🚀 Starting membership display debug...")
    print()
    
    # Debug user with display issue
    member, memberships, purchases, summary = debug_user_membership('ullas')
    
    if member:
        print("=" * 50)
        print("🧹 CLEANING UP DATA...")
        print("=" * 50)
        
        # Clean up the data
        clean_membership_data(member)
        
        print()
        print("=" * 50)
        print("✅ AFTER CLEANUP:")
        print("=" * 50)
        
        # Check again after cleanup
        debug_user_membership('ullas')

if __name__ == '__main__':
    main()