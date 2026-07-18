"""
Clean Verification API Views

Standardized verification endpoints with proper status handling and real-time updates.
NO auto-approval - all admin items go through proper review process.
"""

from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models import Member
from .permissions import IsMember, IsAdmin, IsStaffAccount, IsSuperAdmin
from .verification_service import AccountVerificationService
from .verification_events import VerificationEvents
from apps.core.responses import ApiResponse


class MemberVerificationStatusView(APIView):
    """
    GET /api/member/verification/status/
    
    Get current account verification status summary.
    """
    
    permission_classes = (permissions.IsAuthenticated, IsMember)
    
    def get(self, request):
        member = request.user
        verification_summary = AccountVerificationService.get_verification_summary(member)
        
        # Convert to API response format
        data = {
            'overall_status': verification_summary.overall_status,
            'is_verified': verification_summary.is_verified,
            'completed_steps': verification_summary.completed_steps,
            'total_steps': verification_summary.total_steps,
            'email_verified': verification_summary.email_verified,
            'mobile_verified': verification_summary.mobile_verified,
            'profile_information_status': verification_summary.profile_information_status,
            'profile_photo_status': verification_summary.profile_photo_status,
            'government_id_status': verification_summary.government_id_status,
            'next_action': verification_summary.next_action,
            'membership_pending': verification_summary.membership_pending,
            'profile': {
                'status': verification_summary.profile.status,
                'name': verification_summary.profile.name,
                'submitted_at': verification_summary.profile.submitted_at,
                'reviewed_at': verification_summary.profile.reviewed_at,
                'reason': verification_summary.profile.reason,
            },
            'photo': {
                'status': verification_summary.photo.status,
                'name': verification_summary.photo.name,
                'submitted_at': verification_summary.photo.submitted_at,
                'reviewed_at': verification_summary.photo.reviewed_at,
                'reason': verification_summary.photo.reason,
            },
            'document': {
                'status': verification_summary.document.status,
                'name': verification_summary.document.name,
                'submitted_at': verification_summary.document.submitted_at,
                'reviewed_at': verification_summary.document.reviewed_at,
                'reason': verification_summary.document.reason,
            },
        }
        
        return ApiResponse(success=True, data=data, status=status.HTTP_200_OK)
class MemberEmailOtpSendView(APIView):
    """
    POST /api/member/verification/email/send-otp/
    
    Send OTP to email for verification.
    """
    
    permission_classes = (permissions.IsAuthenticated, IsMember)
    
    def post(self, request):
        from .views import _issue_challenge
        from .models import AuthChallenge, AccountType
        from django.conf import settings
        
        member = request.user
        
        if member.is_email_verified:
            return ApiResponse(
                success=False, 
                message='Email is already verified.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        
        code = _issue_challenge(
            account_type=AccountType.MEMBER,
            identifier=member.email,
            purpose=AuthChallenge.Purpose.PHONE_VERIFY,
            request=request,
            lifetime_minutes=5,
        )
        
        data = {'expires_in': 300}
        if settings.DEBUG:
            data['developer_otp'] = code
            
        return ApiResponse(
            success=True,
            data=data, 
            message='Verification code sent to your email.',
            status=status.HTTP_200_OK
        )


class MemberEmailOtpVerifyView(APIView):
    """
    POST /api/member/verification/email/verify-otp/
    
    Verify email OTP. This marks email as verified - NO admin approval needed.
    """
    
    permission_classes = (permissions.IsAuthenticated, IsMember)
    
    def post(self, request):
        from .views import _consume_challenge
        from .models import AuthChallenge, AccountType
        
        member = request.user
        otp_code = request.data.get('code', '').strip()
        
        if not otp_code:
            return ApiResponse(
                success=False, 
                message='Verification code is required.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if member.is_email_verified:
            return ApiResponse(
                success=False, 
                message='Email is already verified.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify OTP
        if not _consume_challenge(
            account_type=AccountType.MEMBER,
            identifier=member.email,
            purpose=AuthChallenge.Purpose.PHONE_VERIFY,
            code=otp_code,
        ):
            return ApiResponse(
                success=False, 
                message='Invalid or expired verification code.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark email as verified - NO ADMIN APPROVAL NEEDED
        member.is_email_verified = True
        member.save(update_fields=['is_email_verified', 'updated_at'])
        
        # Publish real-time event
        VerificationEvents.publish_contact_verified(member, 'email')
        
        return ApiResponse(
            success=True,
            message='Email verified successfully!',
            status=status.HTTP_200_OK
        )
class MemberMobileOtpSendView(APIView):
    """
    POST /api/member/verification/mobile/send-otp/
    
    Send OTP to mobile for verification.
    """
    
    permission_classes = (permissions.IsAuthenticated, IsMember)
    
    def post(self, request):
        from .views import _issue_challenge
        from .models import AuthChallenge, AccountType
        from django.conf import settings
        
        member = request.user
        
        if not member.mobile_number:
            return ApiResponse(
                success=False, 
                message='Mobile number not set in profile.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if member.is_mobile_verified:
            return ApiResponse(
                success=False, 
                message='Mobile number is already verified.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        code = _issue_challenge(
            account_type=AccountType.MEMBER,
            identifier=member.mobile_number,
            purpose=AuthChallenge.Purpose.PHONE_VERIFY,
            request=request,
            lifetime_minutes=5,
        )
        
        data = {'expires_in': 300}
        if settings.DEBUG:
            data['developer_otp'] = code
            
        return ApiResponse(
            success=True,
            data=data, 
            message='Verification code sent to your mobile number.',
            status=status.HTTP_200_OK
        )


class MemberMobileOtpVerifyView(APIView):
    """
    POST /api/member/verification/mobile/verify-otp/
    
    Verify mobile OTP. This marks mobile as verified - NO admin approval needed.
    """
    
    permission_classes = (permissions.IsAuthenticated, IsMember)
    
    def post(self, request):
        from .views import _consume_challenge
        from .models import AuthChallenge, AccountType
        
        member = request.user
        otp_code = request.data.get('code', '').strip()
        
        if not otp_code:
            return ApiResponse(
                success=False, 
                message='Verification code is required.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not member.mobile_number:
            return ApiResponse(
                success=False, 
                message='Mobile number not set in profile.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if member.is_mobile_verified:
            return ApiResponse(
                success=False, 
                message='Mobile number is already verified.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify OTP
        if not _consume_challenge(
            account_type=AccountType.MEMBER,
            identifier=member.mobile_number,
            purpose=AuthChallenge.Purpose.PHONE_VERIFY,
            code=otp_code,
        ):
            return ApiResponse(
                success=False, 
                message='Invalid or expired verification code.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark mobile as verified - NO ADMIN APPROVAL NEEDED
        member.is_mobile_verified = True
        member.save(update_fields=['is_mobile_verified', 'updated_at'])
        
        # Publish real-time event
        VerificationEvents.publish_contact_verified(member, 'mobile')
        
        return ApiResponse(
            success=True,
            message='Mobile number verified successfully!',
            status=status.HTTP_200_OK
        )
class MemberProfileSubmitView(APIView):
    """
    PUT /api/member/verification/profile/
    
    Submit profile information for admin review. Does NOT auto-approve.
    """
    
    permission_classes = (permissions.IsAuthenticated, IsMember)
    
    def put(self, request):
        member = request.user
        
        # Validate that profile has required data
        if not all([
            member.first_name,
            member.date_of_birth,
            member.gender,
        ]):
            return ApiResponse(
                success=False, 
                message='Please complete required profile fields: name, date of birth, and gender.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Submit for review (creates admin queue item)
        with transaction.atomic():
            success = AccountVerificationService.submit_profile_for_review(member)
            
            if success:
                # Publish real-time event
                VerificationEvents.publish_verification_submitted(member, 'profile')
                
                return ApiResponse(
                    success=True,
                    message='Profile submitted for review. You will be notified once reviewed.',
                    status=status.HTTP_200_OK
                )
            else:
                return ApiResponse(
                    success=False, 
                    message='Failed to submit profile for review.', 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )


class MemberPhotoSubmitView(APIView):
    """
    POST /api/member/verification/photo/
    
    Submit photo for verification. Creates admin queue item.
    """
    
    permission_classes = (permissions.IsAuthenticated, IsMember)
    
    def post(self, request):
        from apps.profiles.models import ProfilePhoto
        from apps.core.models import ProfileVerificationRequest
        
        member = request.user
        
        # Check if primary photo exists
        primary_photo = ProfilePhoto.objects.filter(
            user=member, 
            is_primary=True
        ).first()
        
        if not primary_photo:
            return ApiResponse(
                success=False, 
                message='Please upload a primary photo first.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update member photo timestamps
        member.photo_submitted_at = timezone.now()
        member.photo_rejection_reason = ''  # Clear previous rejection
        member.save(update_fields=['photo_submitted_at', 'photo_rejection_reason', 'updated_at'])
        
        # Create verification request for admin queue
        with transaction.atomic():
            ProfileVerificationRequest.objects.get_or_create(
                member=member,
                verification_type=ProfileVerificationRequest.VerificationType.PROFILE_PHOTO,
                status=ProfileVerificationRequest.Status.PENDING_REVIEW,
                defaults={'submitted_at': timezone.now()}
            )
            
            # Publish real-time event
            VerificationEvents.publish_verification_submitted(member, 'photo')
        
        return ApiResponse(
            success=True,
            message='Photo submitted for verification. You will be notified once reviewed.',
            status=status.HTTP_200_OK
        )
class MemberDocumentSubmitView(APIView):
    """
    POST /api/member/verification/government-id/
    
    Submit government ID for verification. Creates admin queue item.
    """
    
    permission_classes = (permissions.IsAuthenticated, IsMember)
    
    def post(self, request):
        from apps.core.models import ProfileVerificationRequest
        
        member = request.user
        
        # Check if member has uploaded any government documents
        has_documents = member.documents.filter(
            document_type__in=['Government ID', 'Aadhaar', 'Passport', 'Driving License']
        ).exists()
        
        if not has_documents:
            return ApiResponse(
                success=False, 
                message='Please upload a government ID document first.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update member document timestamps
        member.document_submitted_at = timezone.now()
        member.document_rejection_reason = ''  # Clear previous rejection
        member.document_status = AccountVerificationService.STATUS_PENDING_REVIEW
        member.save(update_fields=['document_submitted_at', 'document_rejection_reason', 'document_status', 'updated_at'])
        
        # Create verification request for admin queue
        with transaction.atomic():
            ProfileVerificationRequest.objects.get_or_create(
                member=member,
                verification_type=ProfileVerificationRequest.VerificationType.IDENTITY_DOCUMENT,
                status=ProfileVerificationRequest.Status.PENDING_REVIEW,
                defaults={'submitted_at': timezone.now()}
            )
            
            # Publish real-time event
            VerificationEvents.publish_verification_submitted(member, 'document')
        
        return ApiResponse(
            success=True,
            message='Document submitted for verification. You will be notified once reviewed.',
            status=status.HTTP_200_OK
        )


# Admin Verification Views
class AdminVerificationListView(APIView):
    """
    GET /api/admin/verifications/
    
    List all verification requests in admin queue with filters.
    """
    
    permission_classes = (permissions.IsAuthenticated, IsAdmin | IsSuperAdmin)
    
    def get(self, request):
        from apps.core.models import ProfileVerificationRequest
        from django_filters.rest_framework import DjangoFilterBackend
        from django.core.paginator import Paginator
        
        # Get queryset
        queryset = ProfileVerificationRequest.objects.select_related(
            'member', 'reviewed_by_admin', 'reviewed_by_super_admin', 'reviewed_by_staff'
        ).order_by('-submitted_at')
        
        # Apply filters
        verification_type = request.query_params.get('type')
        status_filter = request.query_params.get('status')
        priority_filter = request.query_params.get('priority')
        
        if verification_type:
            queryset = queryset.filter(verification_type=verification_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if priority_filter:
            queryset = queryset.filter(priority=priority_filter)
        
        # Pagination
        page_size = int(request.query_params.get('page_size', 25))
        page_number = int(request.query_params.get('page', 1))
        
        paginator = Paginator(queryset, page_size)
        page_obj = paginator.get_page(page_number)
        
        # Serialize data
        items = []
        for item in page_obj:
            reviewer_name = None
            if item.reviewed_by_admin:
                reviewer_name = item.reviewed_by_admin.get_full_name()
            elif item.reviewed_by_super_admin:
                reviewer_name = item.reviewed_by_super_admin.get_full_name()
            elif item.reviewed_by_staff:
                reviewer_name = item.reviewed_by_staff.get_full_name()
            
            items.append({
                'id': str(item.id),
                'member_id': str(item.member.id),
                'member_name': item.member.get_full_name(),
                'member_email': item.member.email,
                'verification_type': item.verification_type,
                'status': item.status,
                'priority': item.priority,
                'submitted_at': item.submitted_at.isoformat(),
                'reviewed_at': item.reviewed_at.isoformat() if item.reviewed_at else None,
                'reviewed_by': reviewer_name,
                'rejection_reason': item.rejection_reason,
            })
        
        data = {
            'items': items,
            'pagination': {
                'page': page_obj.number,
                'page_size': page_size,
                'total_pages': paginator.num_pages,
                'total_items': paginator.count,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
            }
        }
        
        return ApiResponse(success=True, data=data, status=status.HTTP_200_OK)
class AdminVerificationDetailView(APIView):
    """
    GET /api/admin/verifications/{id}/
    
    Get verification request details for admin review.
    """
    
    permission_classes = (permissions.IsAuthenticated, IsAdmin | IsSuperAdmin)
    
    def get(self, request, verification_id):
        from apps.core.models import ProfileVerificationRequest
        
        try:
            verification = ProfileVerificationRequest.objects.select_related(
                'member', 'reviewed_by_admin', 'reviewed_by_super_admin', 'reviewed_by_staff'
            ).prefetch_related('history').get(id=verification_id)
        except ProfileVerificationRequest.DoesNotExist:
            return ApiResponse(
                success=False, 
                message='Verification request not found.', 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get member verification summary
        verification_summary = AccountVerificationService.get_verification_summary(verification.member)
        
        # Build response
        data = {
            'id': str(verification.id),
            'member': {
                'id': str(verification.member.id),
                'name': verification.member.get_full_name(),
                'email': verification.member.email,
                'mobile': verification.member.mobile_number,
                'date_of_birth': verification.member.date_of_birth.isoformat() if verification.member.date_of_birth else None,
                'gender': verification.member.gender,
            },
            'verification_type': verification.verification_type,
            'status': verification.status,
            'priority': verification.priority,
            'submitted_at': verification.submitted_at.isoformat(),
            'reviewed_at': verification.reviewed_at.isoformat() if verification.reviewed_at else None,
            'rejection_reason': verification.rejection_reason,
            'overall_verification': {
                'overall_status': verification_summary.overall_status,
                'is_verified': verification_summary.is_verified,
                'completed_steps': verification_summary.completed_steps,
                'total_steps': verification_summary.total_steps,
            },
            'history': [
                {
                    'old_status': h.old_status,
                    'new_status': h.new_status,
                    'reason': h.reason,
                    'created_at': h.created_at.isoformat(),
                    'changed_by': (
                        h.changed_by_admin.get_full_name() if h.changed_by_admin else
                        h.changed_by_super_admin.get_full_name() if h.changed_by_super_admin else
                        h.changed_by_staff.get_full_name() if h.changed_by_staff else 'System'
                    )
                } for h in verification.history.all()
            ]
        }
        
        return ApiResponse(success=True, data=data, status=status.HTTP_200_OK)
class AdminVerificationApproveView(APIView):
    """
    POST /api/admin/verifications/{id}/approve/
    
    Approve verification request.
    """
    
    permission_classes = (permissions.IsAuthenticated, IsAdmin | IsSuperAdmin)
    
    def post(self, request, verification_id):
        from apps.core.models import ProfileVerificationRequest
        
        try:
            verification = ProfileVerificationRequest.objects.select_related('member').get(id=verification_id)
        except ProfileVerificationRequest.DoesNotExist:
            return ApiResponse(
                success=False, 
                message='Verification request not found.', 
                status=status.HTTP_404_NOT_FOUND
            )
        
        if verification.status != ProfileVerificationRequest.Status.PENDING_REVIEW:
            return ApiResponse(
                success=False, 
                message='Only pending verifications can be approved.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '').strip()
        
        with transaction.atomic():
            # Approve based on verification type
            if verification.verification_type == ProfileVerificationRequest.VerificationType.FULL_PROFILE:
                success = AccountVerificationService.approve_profile(verification.member, request.user, reason)
            elif verification.verification_type == ProfileVerificationRequest.VerificationType.PROFILE_PHOTO:
                success = self._approve_photo(verification.member, request.user, reason)
            elif verification.verification_type == ProfileVerificationRequest.VerificationType.IDENTITY_DOCUMENT:
                success = self._approve_document(verification.member, request.user, reason)
            else:
                success = False
            
            if success:
                # Publish real-time event
                VerificationEvents.publish_verification_approved(
                    verification.member, 
                    verification.verification_type, 
                    request.user
                )
                
                return ApiResponse(
                    success=True,
                    message='Verification approved successfully.',
                    status=status.HTTP_200_OK
                )
            else:
                return ApiResponse(
                    success=False, 
                    message='Failed to approve verification.', 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
    
    def _approve_photo(self, member, reviewed_by, reason):
        """Approve member's primary photo"""
        from apps.profiles.models import ProfilePhoto
        
        primary_photo = ProfilePhoto.objects.filter(user=member, is_primary=True).first()
        if not primary_photo:
            return False
        
        primary_photo.status = ProfilePhoto.Status.APPROVED
        primary_photo.verified_at = timezone.now()
        primary_photo.save(update_fields=['status', 'verified_at', 'updated_at'])
        
        # Update member timestamps
        member.photo_reviewed_at = timezone.now()
        member.photo_rejection_reason = ''
        member.save(update_fields=['photo_reviewed_at', 'photo_rejection_reason', 'updated_at'])
        
        return True
    
    def _approve_document(self, member, reviewed_by, reason):
        """Approve member's government document"""
        member.document_status = AccountVerificationService.STATUS_APPROVED
        member.document_reviewed_at = timezone.now()
        member.document_rejection_reason = ''
        member.save(update_fields=['document_status', 'document_reviewed_at', 'document_rejection_reason', 'updated_at'])
        
        return True
class AdminVerificationRejectView(APIView):
    """
    POST /api/admin/verifications/{id}/reject/
    
    Reject verification request with reason.
    """
    
    permission_classes = (permissions.IsAuthenticated, IsAdmin | IsSuperAdmin)
    
    def post(self, request, verification_id):
        from apps.core.models import ProfileVerificationRequest
        
        try:
            verification = ProfileVerificationRequest.objects.select_related('member').get(id=verification_id)
        except ProfileVerificationRequest.DoesNotExist:
            return ApiResponse(
                success=False, 
                message='Verification request not found.', 
                status=status.HTTP_404_NOT_FOUND
            )
        
        if verification.status not in [
            ProfileVerificationRequest.Status.PENDING_REVIEW,
            ProfileVerificationRequest.Status.IN_REVIEW
        ]:
            return ApiResponse(
                success=False, 
                message='Only pending or in-review verifications can be rejected.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '').strip()
        if not reason:
            return ApiResponse(
                success=False, 
                message='Rejection reason is required.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Reject based on verification type
            if verification.verification_type == ProfileVerificationRequest.VerificationType.FULL_PROFILE:
                success = AccountVerificationService.reject_profile(verification.member, request.user, reason)
            elif verification.verification_type == ProfileVerificationRequest.VerificationType.PROFILE_PHOTO:
                success = self._reject_photo(verification.member, request.user, reason)
            elif verification.verification_type == ProfileVerificationRequest.VerificationType.IDENTITY_DOCUMENT:
                success = self._reject_document(verification.member, request.user, reason)
            else:
                success = False
            
            if success:
                # Publish real-time event
                VerificationEvents.publish_verification_rejected(
                    verification.member, 
                    verification.verification_type, 
                    reason,
                    request.user
                )
                
                return ApiResponse(
                    success=True,
                    message='Verification rejected.',
                    status=status.HTTP_200_OK
                )
            else:
                return ApiResponse(
                    success=False, 
                    message='Failed to reject verification.', 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
    
    def _reject_photo(self, member, reviewed_by, reason):
        """Reject member's primary photo"""
        from apps.profiles.models import ProfilePhoto
        
        primary_photo = ProfilePhoto.objects.filter(user=member, is_primary=True).first()
        if primary_photo:
            primary_photo.status = ProfilePhoto.Status.REJECTED
            primary_photo.verified_at = timezone.now()
            primary_photo.save(update_fields=['status', 'verified_at', 'updated_at'])
        
        # Update member timestamps
        member.photo_reviewed_at = timezone.now()
        member.photo_rejection_reason = reason
        member.save(update_fields=['photo_reviewed_at', 'photo_rejection_reason', 'updated_at'])
        
        return True
    
    def _reject_document(self, member, reviewed_by, reason):
        """Reject member's government document"""
        member.document_status = AccountVerificationService.STATUS_REJECTED
        member.document_reviewed_at = timezone.now()
        member.document_rejection_reason = reason
        member.save(update_fields=['document_status', 'document_reviewed_at', 'document_rejection_reason', 'updated_at'])
        
        return True


class AdminVerificationRequestChangesView(APIView):
    """
    POST /api/admin/verifications/{id}/request-changes/
    
    Request changes to verification submission.
    """
    
    permission_classes = (permissions.IsAuthenticated, IsAdmin | IsSuperAdmin)
    
    def post(self, request, verification_id):
        from apps.core.models import ProfileVerificationRequest
        
        try:
            verification = ProfileVerificationRequest.objects.select_related('member').get(id=verification_id)
        except ProfileVerificationRequest.DoesNotExist:
            return ApiResponse(
                success=False, 
                message='Verification request not found.', 
                status=status.HTTP_404_NOT_FOUND
            )
        
        reason = request.data.get('reason', '').strip()
        if not reason:
            return ApiResponse(
                success=False, 
                message='Reason for changes is required.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Request changes based on verification type
            if verification.verification_type == ProfileVerificationRequest.VerificationType.FULL_PROFILE:
                success = AccountVerificationService.request_profile_changes(verification.member, request.user, reason)
            else:
                # For photos and documents, we treat "request changes" as rejection
                success = self._reject_with_changes_message(verification, request.user, reason)
            
            if success:
                # Publish real-time event
                VerificationEvents.publish_verification_changes_requested(
                    verification.member, 
                    verification.verification_type, 
                    reason,
                    request.user
                )
                
                return ApiResponse(
                    success=True,
                    message='Changes requested successfully.',
                    status=status.HTTP_200_OK
                )
            else:
                return ApiResponse(
                    success=False, 
                    message='Failed to request changes.', 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
    
    def _reject_with_changes_message(self, verification, reviewed_by, reason):
        """For photos/documents, request changes = reject with specific message"""
        prefixed_reason = f"Changes requested: {reason}"
        
        if verification.verification_type == ProfileVerificationRequest.VerificationType.PROFILE_PHOTO:
            return AdminVerificationRejectView()._reject_photo(verification.member, reviewed_by, prefixed_reason)
        elif verification.verification_type == ProfileVerificationRequest.VerificationType.IDENTITY_DOCUMENT:
            return AdminVerificationRejectView()._reject_document(verification.member, reviewed_by, prefixed_reason)
        
        return False


class AdminVerificationRequestChangesView(APIView):
    """
    POST /api/admin/verifications/{id}/request-changes/
    
    Request changes to verification submission with feedback.
    """
    
    permission_classes = (permissions.IsAuthenticated, IsAdmin | IsSuperAdmin)
    
    def post(self, request, verification_id):
        from apps.core.models import ProfileVerificationRequest
        
        try:
            verification = ProfileVerificationRequest.objects.select_related('member').get(id=verification_id)
        except ProfileVerificationRequest.DoesNotExist:
            return ApiResponse(
                success=False, 
                message='Verification request not found.', 
                status=status.HTTP_404_NOT_FOUND
            )
        
        if verification.status not in [
            ProfileVerificationRequest.Status.PENDING_REVIEW,
            ProfileVerificationRequest.Status.IN_REVIEW
        ]:
            return ApiResponse(
                success=False, 
                message='Only pending or in-review verifications can have changes requested.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        feedback = request.data.get('feedback', '').strip()
        if not feedback:
            return ApiResponse(
                success=False, 
                message='Feedback for requested changes is required.', 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Update verification request to changes requested status
            verification.status = ProfileVerificationRequest.Status.CHANGES_REQUESTED
            verification.reviewed_at = timezone.now()
            verification.rejection_reason = f"Changes requested: {feedback}"
            
            # Set reviewer based on user type
            if request.user.account_type == 'SUPER_ADMIN':
                verification.reviewed_by_super_admin = request.user
            elif request.user.account_type == 'ADMIN':
                verification.reviewed_by_admin = request.user
            else:
                verification.reviewed_by_staff = request.user
            
            verification.save()
            
            # Publish real-time event
            VerificationEvents.publish_verification_changes_requested(
                verification.member, 
                verification.verification_type, 
                feedback,
                request.user
            )
            
            return ApiResponse(
                success=True,
                message='Changes requested successfully.',
                status=status.HTTP_200_OK
            )