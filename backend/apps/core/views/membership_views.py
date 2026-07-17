"""
Membership Views

Member-facing views for membership activation and management.
All business logic delegated to MembershipActivationService and AccountVerificationService.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework import permissions
from django.conf import settings

from apps.accounts.permissions import IsMember
from apps.accounts.verification_service import AccountVerificationService
from apps.core.responses import ApiResponse
from apps.core.membership_activation_service import MembershipActivationService
from apps.core.services.membership_service import MembershipService


class MembershipActivateView(APIView):
    """
    POST /api/v1/member-auth/membership/activate/
    
    Select a membership plan.
    
    Behavior:
    - Unverified member: Save plan as pending_verification, redirect to verification
    - Verified member: Activate plan immediately
    
    Request Body:
        {
            "plan_slug": "gold"  // or "platinum", "elite"
        }
    
    Response (Unverified):
        {
            "success": true,
            "message": "Gold plan selected. Waiting for account verification to activate.",
            "data": {
                "status": "pending_verification",
                "membership": {...},
                "next_action": "Complete your account verification"
            }
        }
    
    Response (Verified):
        {
            "success": true,
            "message": "Gold plan activated successfully!",
            "data": {
                "status": "active",
                "membership": {...}
            }
        }
    """
    
    permission_classes = (permissions.IsAuthenticated, IsMember)
    
    def post(self, request):
        from apps.core.serializers import MemberMembershipSerializer
        
        plan_slug = request.data.get('plan_slug', '').strip().lower()
        
        if not plan_slug:
            return ApiResponse(
                success=False,
                message='plan_slug is required.',
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # During the current rollout a selected plan is active immediately.
        # The legacy verification workflow remains available behind its flag.
        if not getattr(settings, 'REQUIRE_MEMBER_VERIFICATION', False):
            success, message, membership = MembershipService.activate_plan(
                request.user,
                plan_slug,
                source='member_selection',
            )
            if not success:
                return ApiResponse(
                    success=False,
                    message=message,
                    status=status.HTTP_400_BAD_REQUEST,
                )
            membership_data = MemberMembershipSerializer(membership).data if membership else None
            return ApiResponse(
                success=True,
                message=message,
                data={
                    'status': 'active',
                    'membership': membership_data,
                },
                status=status.HTTP_200_OK,
            )

        # Check if account is verified when verification is enabled.
        is_verified = AccountVerificationService.is_account_verified(request.user)
        
        if not is_verified:
            # Unverified flow: save as pending_verification
            result = MembershipActivationService.select_plan_unverified(
                member=request.user,
                plan_slug=plan_slug,
                source='member_request'
            )
            
            if not result.success:
                return ApiResponse(
                    success=False,
                    message=result.message,
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            membership_data = MemberMembershipSerializer(result.membership).data if result.membership else None
            
            return ApiResponse(
                success=True,
                message=result.message,
                data={
                    'status': 'pending_verification',
                    'membership': membership_data,
                    'next_action': 'Complete your account verification to activate this plan',
                    'verification_required': True
                },
                status=status.HTTP_200_OK
            )
        
        else:
            # Verified flow: activate immediately
            result = MembershipActivationService.select_plan_verified(
                member=request.user,
                plan_slug=plan_slug,
                source='member_request'
            )
            
            if not result.success:
                return ApiResponse(
                    success=False,
                    message=result.message,
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            membership_data = MemberMembershipSerializer(result.membership).data if result.membership else None
            
            return ApiResponse(
                success=True,
                message=result.message,
                data={
                    'status': 'active',
                    'membership': membership_data
                },
                status=status.HTTP_200_OK
            )


class MembershipSummaryView(APIView):
    """
    GET /api/v1/member-auth/membership/summary/
    
    Get current membership summary.
    
    Response:
        {
            "success": true,
            "data": {
                "has_active_plan": true,
                "plan_name": "Gold",
                "plan_slug": "gold",
                "is_free": false,
                "status": "active" | "pending_verification" | "none",
                "start_date": "2026-07-16T10:30:00Z",
                "end_date": "2026-10-14T10:30:00Z",
                "days_remaining": 90
            }
        }
    """
    
    permission_classes = (permissions.IsAuthenticated, IsMember)
    
    def get(self, request):
        if not getattr(settings, 'REQUIRE_MEMBER_VERIFICATION', False):
            summary = MembershipService.get_membership_summary(request.user)
            summary['status'] = 'active' if summary['has_active_plan'] else 'none'
            return ApiResponse(
                success=True,
                data=summary,
                status=status.HTTP_200_OK,
            )
        summary = MembershipActivationService.get_membership_summary(request.user)
        
        return ApiResponse(
            success=True,
            data=summary,
            status=status.HTTP_200_OK
        )


class MembershipDeactivateView(APIView):
    """
    POST /api/v1/member-auth/membership/deactivate/
    
    Deactivate current membership (downgrade to Free).
    
    Response:
        {
            "success": true,
            "message": "Membership deactivated"
        }
    """
    
    permission_classes = (permissions.IsAuthenticated, IsMember)
    
    def post(self, request):
        if not getattr(settings, 'REQUIRE_MEMBER_VERIFICATION', False):
            success, message = MembershipService.deactivate_membership(
                member=request.user,
                reason='member_requested',
            )
            return ApiResponse(
                success=success,
                message=message,
                status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST,
            )
        success, message = MembershipActivationService.deactivate_membership(
            member=request.user,
            reason='member_requested'
        )
        
        if not success:
            return ApiResponse(
                success=False,
                message=message,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return ApiResponse(
            success=True,
            message=message,
            status=status.HTTP_200_OK
        )
