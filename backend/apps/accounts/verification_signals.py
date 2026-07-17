"""
Django Signals for Account Verification

Signals fired when account verification status changes:
- When account is verified → auto-activate pending membership
- When verification is revoked → handle membership
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Member
from apps.core.membership_activation_service import MembershipActivationService
from apps.accounts.verification_service import AccountVerificationService


@receiver(post_save, sender=Member)
def on_member_saved(sender, instance, created, update_fields, **kwargs):
    """
    Signal handler when Member model is saved.
    
    Check if account was just verified (account_status changed to ACTIVE,
    profile_status changed to APPROVED).
    
    If verified, automatically activate any pending_verification membership.
    """
    if created:
        # New member - no action needed
        return

    # Check if this update changed verification-related fields
    if update_fields is None:
        # update_fields is None when using bulk_update or direct assignment
        # We can't reliably detect the change, so skip
        return

    verification_fields = {'account_status', 'profile_status', 'photo_status', 'document_status'}
    changed_verification = bool(verification_fields & update_fields)

    if not changed_verification:
        # No verification-related fields changed
        return

    # Check if account is now fully verified
    if AccountVerificationService.is_account_verified(instance):
        # Account just became verified - activate pending membership
        pending = MembershipActivationService.get_pending_membership(instance)
        
        if pending:
            result = MembershipActivationService.activate_pending_membership(instance)
            
            if result.success:
                # Send notification to member
                from apps.core.models import Notification
                Notification.objects.create(
                    member=instance,
                    notification_type='membership_activated',
                    title='Membership Activated!',
                    message=f'Your account has been verified. {result.message}',
                    priority='HIGH'
                )


def ready():
    """Called when apps are ready"""
    pass
