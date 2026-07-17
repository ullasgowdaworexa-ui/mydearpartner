"""
Centralized Account Verification Service

Single source of truth for all account verification logic.
- Profile verification status
- Photo verification status
- Document verification status
- Complete account verification
- Verification state machine
"""

from typing import NamedTuple, List
from django.db import transaction
from .models import Member
from apps.core.models import ProfileVerificationHistory


class VerificationStatus(NamedTuple):
    """Centralized verification status structure"""
    account_status: str  # pending | complete | verified | rejected | suspended
    is_verified: bool
    profile: dict
    primary_photo: dict
    documents: dict
    next_action: str


class DocumentRequirement(NamedTuple):
    """Document requirement specification"""
    document_type: str
    name: str
    is_required: bool


class AccountVerificationService:
    """
    Centralized service for all account verification logic.
    
    Statuses:
    - incomplete: Missing profile, photo, or documents
    - pending: Awaiting admin review
    - in_review: Admin is reviewing
    - correction_required: Admin requested changes
    - verified: All requirements met
    - rejected: Admin rejected account
    - suspended: Account suspended
    
    Requirements (ALL must be met for verification):
    1. Profile is APPROVED
    2. Primary photo is APPROVED
    3. At least one required identity document is APPROVED
    4. Account is ACTIVE (not suspended/deleted)
    """

    # Document types that require approval
    REQUIRED_DOCUMENT_TYPES = ['Government ID']
    
    # Status machine
    STATUS_COMPLETE = 'complete'
    STATUS_INCOMPLETE = 'incomplete'
    STATUS_PENDING = 'pending'
    STATUS_IN_REVIEW = 'in_review'
    STATUS_CORRECTION_REQUIRED = 'correction_required'
    STATUS_VERIFIED = 'verified'
    STATUS_REJECTED = 'rejected'
    STATUS_SUSPENDED = 'suspended'

    @staticmethod
    def get_profile_status(member: Member) -> dict:
        """Get profile verification status"""
        if member.profile_status == 'APPROVED':
            return {'status': 'approved', 'name': 'Profile Approved', 'approved_at': member.updated_at}
        elif member.profile_status == 'PENDING':
            return {'status': 'pending', 'name': 'Profile Under Review', 'submitted_at': member.updated_at}
        elif member.profile_status == 'REJECTED':
            return {'status': 'rejected', 'name': 'Profile Rejected', 'reason': getattr(member, 'rejection_reason', 'No reason provided')}
        else:
            return {'status': 'incomplete', 'name': 'Profile Not Submitted', 'submitted_at': None}

    @staticmethod
    def get_primary_photo_status(member: Member) -> dict:
        """Get primary photo verification status"""
        from apps.profiles.models import ProfilePhoto

        primary_photo = (
            ProfilePhoto.objects.without_binary()
            .filter(user=member, is_primary=True)
            .first()
        )
        
        if not primary_photo:
            return {'status': 'incomplete', 'name': 'No Primary Photo', 'count': 0}
        
        if primary_photo.status == 'APPROVED':
            return {
                'status': 'approved',
                'name': 'Primary Photo Approved',
                'photo_id': str(primary_photo.id),
                'approved_at': primary_photo.verified_at
            }
        elif primary_photo.status == 'PENDING':
            return {'status': 'pending', 'name': 'Primary Photo Under Review', 'photo_id': str(primary_photo.id)}
        elif primary_photo.status == 'REJECTED':
            return {
                'status': 'rejected',
                'name': 'Primary Photo Rejected',
                'photo_id': str(primary_photo.id),
                'reason': getattr(primary_photo, 'rejection_reason', 'No reason provided')
            }
        else:
            return {'status': 'incomplete', 'name': 'Primary Photo Status Unknown'}

    @staticmethod
    def get_required_document_status(member: Member) -> dict:
        """Get required document verification status"""
        required_docs = member.documents.filter(
            document_type__in=AccountVerificationService.REQUIRED_DOCUMENT_TYPES
        )
        
        approved_count = required_docs.filter(status='APPROVED').count()
        pending_count = required_docs.filter(status='PENDING').count()
        rejected_count = required_docs.filter(status='REJECTED').count()
        
        total_required = len(AccountVerificationService.REQUIRED_DOCUMENT_TYPES)
        
        if approved_count > 0:
            approved_doc = required_docs.filter(status='APPROVED').first()
            return {
                'status': 'approved',
                'name': f'{approved_doc.document_type} Verified',
                'approved': approved_count,
                'pending': pending_count,
                'rejected': rejected_count,
                'approved_at': approved_doc.reviewed_at
            }
        elif pending_count > 0:
            return {
                'status': 'pending',
                'name': 'Document Under Review',
                'approved': approved_count,
                'pending': pending_count,
                'rejected': rejected_count
            }
        elif rejected_count > 0:
            rejected_doc = required_docs.filter(status='REJECTED').first()
            return {
                'status': 'rejected',
                'name': f'{rejected_doc.document_type} Rejected',
                'approved': approved_count,
                'pending': pending_count,
                'rejected': rejected_count,
                'reason': getattr(rejected_doc, 'rejection_reason', 'No reason provided')
            }
        else:
            return {
                'status': 'incomplete',
                'name': f'{total_required} Document(s) Required',
                'approved': 0,
                'pending': 0,
                'rejected': 0
            }

    @staticmethod
    def get_verification_summary(member: Member) -> VerificationStatus:
        """
        Get complete verification status summary.
        This is the centralized method used by all APIs and frontend.
        """
        profile_status = AccountVerificationService.get_profile_status(member)
        photo_status = AccountVerificationService.get_primary_photo_status(member)
        document_status = AccountVerificationService.get_required_document_status(member)

        # Determine overall status
        is_verified = AccountVerificationService.is_account_verified(member)
        
        if member.account_status == 'SUSPENDED':
            account_status = AccountVerificationService.STATUS_SUSPENDED
        elif is_verified:
            account_status = AccountVerificationService.STATUS_VERIFIED
        elif profile_status['status'] == 'rejected' or photo_status['status'] == 'rejected' or document_status['status'] == 'rejected':
            account_status = AccountVerificationService.STATUS_REJECTED
        elif profile_status['status'] == 'pending' or photo_status['status'] == 'pending' or document_status['status'] == 'pending':
            account_status = AccountVerificationService.STATUS_IN_REVIEW
        elif profile_status['status'] == 'incomplete' or photo_status['status'] == 'incomplete' or document_status['status'] == 'incomplete':
            account_status = AccountVerificationService.STATUS_INCOMPLETE
        else:
            account_status = AccountVerificationService.STATUS_PENDING

        # Determine next action
        if account_status == AccountVerificationService.STATUS_VERIFIED:
            next_action = 'Account is fully verified. You can access all features.'
        elif profile_status['status'] != 'approved':
            next_action = 'Complete and submit your profile for approval'
        elif photo_status['status'] != 'approved':
            next_action = 'Upload and get approval for your profile photo'
        elif document_status['status'] != 'approved':
            next_action = 'Upload and get approval for your identity document'
        elif account_status == AccountVerificationService.STATUS_SUSPENDED:
            next_action = 'Your account has been suspended. Contact support.'
        else:
            next_action = 'Waiting for final account verification'

        return VerificationStatus(
            account_status=account_status,
            is_verified=is_verified,
            profile=profile_status,
            primary_photo=photo_status,
            documents=document_status,
            next_action=next_action
        )

    @staticmethod
    def is_account_verified(member: Member) -> bool:
        """
        Check if account meets all verification requirements.
        
        REQUIREMENTS (ALL must be true):
        1. Profile is APPROVED
        2. Primary photo is APPROVED
        3. At least one required document is APPROVED
        4. Account status is ACTIVE
        """
        # Check profile approval
        if member.profile_status != 'APPROVED':
            return False

        # Check primary photo approval
        from apps.profiles.models import ProfilePhoto

        primary_photo = ProfilePhoto.objects.filter(
            user=member,
            is_primary=True,
            status=ProfilePhoto.Status.APPROVED,
        ).exists()
        if not primary_photo:
            return False

        # Check required documents approval
        required_doc_approved = member.documents.filter(
            document_type__in=AccountVerificationService.REQUIRED_DOCUMENT_TYPES,
            status='APPROVED'
        ).exists()
        if not required_doc_approved:
            return False

        # Check account is active
        if member.account_status != 'ACTIVE' or member.deleted_at is not None:
            return False

        return True

    @staticmethod
    @transaction.atomic
    def verify_account(member: Member, reviewed_by, reason: str = None) -> bool:
        """
        Mark account as verified after all requirements are met.
        
        Args:
            member: Member to verify
            reviewed_by: User performing verification (Admin or Super Admin)
            reason: Optional reason for verification
            
        Returns:
            bool: True if verification successful, False otherwise
        """
        # Check if all requirements are met
        if not AccountVerificationService.is_account_verified(member):
            return False

        # Update member verification flag (if you have one)
        member.account_status = 'ACTIVE'
        member.save(update_fields=['account_status', 'updated_at'])

        # Record in audit/history
        ProfileVerificationHistory.objects.create(
            member=member,
            old_status='IN_REVIEW',
            new_status='VERIFIED',
            changed_by_admin=reviewed_by if hasattr(reviewed_by, 'admin') else None,
            changed_by_super_admin=reviewed_by if hasattr(reviewed_by, 'super_admin') else None,
            reason=reason or 'Account verification completed'
        )

        return True

    @staticmethod
    @transaction.atomic
    def revoke_verification(member: Member, reason: str, reviewed_by) -> bool:
        """
        Revoke account verification status.
        
        Args:
            member: Member to revoke verification from
            reason: Required reason for revocation
            reviewed_by: User performing revocation
            
        Returns:
            bool: True if revocation successful
        """
        if not reason:
            return False

        member.account_status = 'ACTIVE'
        member.profile_status = 'PENDING'
        member.save(update_fields=['account_status', 'profile_status', 'updated_at'])

        ProfileVerificationHistory.objects.create(
            member=member,
            old_status='VERIFIED',
            new_status='PENDING',
            changed_by_admin=reviewed_by if hasattr(reviewed_by, 'admin') else None,
            changed_by_super_admin=reviewed_by if hasattr(reviewed_by, 'super_admin') else None,
            reason=reason
        )

        return True

    @staticmethod
    def get_verification_requirements() -> List[DocumentRequirement]:
        """Get list of required documents for verification"""
        return [
            DocumentRequirement(
                document_type='Government ID',
                name='Government-Issued ID (Aadhaar, Passport, etc.)',
                is_required=True
            )
        ]
