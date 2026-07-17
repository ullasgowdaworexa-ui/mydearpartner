"""
Membership Service

Handles all membership-related business logic:
- Instant plan activation
- Plan deactivation
- Membership status management
- Audit trail creation
"""

from datetime import timedelta
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404

from apps.core.models import MembershipPlan, MemberMembership, MembershipRequest
from apps.accounts.models import Member


class MembershipService:
    """
    Centralized service for membership operations.
    
    Supports three activation modes via MEMBERSHIP_ACTIVATION_MODE setting:
    - 'instant': Immediate activation without payment (current)
    - 'payment_verified': Activate after successful payment (future)
    - 'manual_approval': Requires admin approval (legacy)
    """
    
    ACTIVATION_MODE_INSTANT = 'instant'
    ACTIVATION_MODE_PAYMENT = 'payment_verified'
    ACTIVATION_MODE_MANUAL = 'manual_approval'
    
    @staticmethod
    def get_activation_mode():
        """Get current membership activation mode from settings."""
        return getattr(settings, 'MEMBERSHIP_ACTIVATION_MODE', MembershipService.ACTIVATION_MODE_INSTANT)
    
    @staticmethod
    def get_payment_mode():
        """Get current payment mode from settings."""
        return getattr(settings, 'PAYMENT_MODE', 'disabled')
    
    @staticmethod
    @transaction.atomic
    def activate_plan(member, plan_slug, actor=None, source='member_request'):
        """
        Activate a membership plan for a member.
        
        Args:
            member: Member instance
            plan_slug: Plan slug to activate (e.g., 'gold', 'platinum', 'elite')
            actor: User performing the activation (for audit)
            source: Source of activation ('member_request', 'admin_direct', 'payment_verified')
            
        Returns:
            tuple: (success: bool, message: str, membership: MemberMembership or None)
        """
        # Validate plan exists and is active
        plan = get_object_or_404(MembershipPlan, slug=plan_slug, is_active=True)
        
        # Lock the member record
        member = Member.objects.select_for_update().get(pk=member.pk)
        
        # Deactivate any existing active membership
        MemberMembership.objects.filter(
            member=member,
            is_active=True
        ).update(is_active=False)
        
        # Calculate start and end dates
        start_date = timezone.now()
        duration_days = plan.duration_days or 30
        end_date = start_date + timedelta(days=duration_days) if duration_days else None
        
        # Create or update membership
        membership, created = MemberMembership.objects.update_or_create(
            member=member,
            defaults={
                'plan': plan,
                'start_date': start_date,
                'end_date': end_date,
                'is_active': True,
                'status': MemberMembership.MembershipStatus.ACTIVE,
            }
        )
        
        # Update member's premium status
        member.is_premium = True
        member.save(update_fields=['is_premium', 'updated_at'])
        
        # Create approved membership request for audit trail
        MembershipRequest.objects.create(
            user=member,
            selected_plan=plan,
            status=MembershipRequest.Status.APPROVED,
            requested_at=start_date,
            approved_at=start_date,
            approved_by_id=actor.pk if actor else None,
            start_date=start_date,
            expiry_date=end_date,
            is_active=True,
        )
        
        # Log audit event
        from apps.core.api_utils import audit
        audit(
            request=None,
            actor=actor or member,
            action='MEMBERSHIP_ACTIVATED',
            module='memberships',
            target_type='MEMBER',
            target_id=member.pk,
            new_data={
                'plan_slug': plan.slug,
                'plan_name': plan.name,
                'duration_days': duration_days,
                'source': source,
                'activation_mode': MembershipService.get_activation_mode(),
            }
        )
        
        return (
            True,
            f'{plan.name} plan activated successfully. Valid until {end_date.strftime("%B %d, %Y") if end_date else "indefinite"}.',
            membership
        )
    
    @staticmethod
    @transaction.atomic
    def deactivate_membership(member, reason='manual_deactivation', actor=None):
        """
        Deactivate a member's current membership.
        
        Args:
            member: Member instance
            reason: Reason for deactivation
            actor: User performing the deactivation
            
        Returns:
            tuple: (success: bool, message: str)
        """
        member = Member.objects.select_for_update().get(pk=member.pk)
        
        active_memberships = MemberMembership.objects.filter(
            member=member,
            is_active=True
        )
        
        if not active_memberships.exists():
            return False, 'No active membership to deactivate.'
        
        count = active_memberships.update(is_active=False)
        
        # Update member's premium status
        member.is_premium = False
        member.save(update_fields=['is_premium', 'updated_at'])
        
        # Log audit event
        from apps.core.api_utils import audit
        audit(
            request=None,
            actor=actor or member,
            action='MEMBERSHIP_DEACTIVATED',
            module='memberships',
            target_type='MEMBER',
            target_id=member.pk,
            new_data={
                'reason': reason,
                'deactivated_count': count,
            }
        )
        
        return True, f'{count} membership(s) deactivated successfully.'
    
    @staticmethod
    def get_active_membership(member):
        """
        Get the member's active membership.
        
        Args:
            member: Member instance
            
        Returns:
            MemberMembership or None
        """
        try:
            return MemberMembership.objects.select_related('plan').get(
                member=member,
                is_active=True,
                status=MemberMembership.MembershipStatus.ACTIVE
            )
        except MemberMembership.DoesNotExist:
            return None
    
    @staticmethod
    def get_effective_plan(member):
        """
        Get the effective plan for a member (returns plan or None for Free).
        
        Args:
            member: Member instance
            
        Returns:
            MembershipPlan or None
        """
        membership = MembershipService.get_active_membership(member)
        
        if not membership or not membership.plan_id:
            return None
        
        # Check if membership has expired
        if membership.end_date and membership.end_date <= timezone.now():
            return None
        
        # Check member account status
        if member.account_status != Member.AccountStatus.ACTIVE or not member.is_active:
            return None
        
        return membership.plan
    
    @staticmethod
    def check_membership_expiry(member):
        """
        Check if membership has expired and update status if needed.
        
        Args:
            member: Member instance
            
        Returns:
            bool: True if expired and updated, False otherwise
        """
        membership = MembershipService.get_active_membership(member)
        
        if not membership:
            return False
        
        if membership.end_date and membership.end_date <= timezone.now():
            membership.is_active = False
            membership.status = MemberMembership.MembershipStatus.EXPIRED
            membership.save(update_fields=['is_active', 'status'])
            
            member.is_premium = False
            member.save(update_fields=['is_premium', 'updated_at'])
            
            return True
        
        return False
    
    @staticmethod
    def get_membership_summary(member):
        """
        Get comprehensive membership summary for a member.
        
        Args:
            member: Member instance
            
        Returns:
            dict: Membership summary with plan details and limits
        """
        plan = MembershipService.get_effective_plan(member)
        membership = MembershipService.get_active_membership(member)
        
        if not plan:
            # Free plan
            return {
                'has_active_plan': False,
                'plan_name': 'Free',
                'plan_slug': 'free',
                'is_free': True,
                'start_date': None,
                'end_date': None,
                'days_remaining': None,
                'daily_profile_unlock_limit': 5,
                'daily_interest_limit': 3,
                'can_message': False,
                'can_use_advanced_search': False,
                'contact_access_mode': 'NONE',
                'photo_access_mode': 'PRIMARY_ONLY',
                'messaging_mode': 'DISABLED',
            }
        
        # Calculate days remaining
        days_remaining = None
        if membership and membership.end_date:
            delta = membership.end_date - timezone.now()
            days_remaining = max(0, delta.days)
        
        return {
            'has_active_plan': True,
            'plan_name': plan.name,
            'plan_slug': plan.slug,
            'is_free': False,
            'start_date': membership.start_date if membership else None,
            'end_date': membership.end_date if membership else None,
            'days_remaining': days_remaining,
            'daily_profile_unlock_limit': plan.daily_profile_unlock_limit,
            'daily_interest_limit': plan.interest_limit,
            'can_message': plan.can_message or plan.messaging_mode != 'DISABLED',
            'can_use_advanced_search': plan.can_use_advanced_search,
            'contact_access_mode': plan.contact_access_mode,
            'photo_access_mode': plan.photo_access_mode,
            'messaging_mode': plan.messaging_mode,
        }
