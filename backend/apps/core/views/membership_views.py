"""
Membership Views

Member-facing views for membership activation and management.
All business logic delegated to MembershipActivationService and AccountVerificationService.
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework import permissions
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from apps.accounts.permissions import IsMember
from apps.accounts.verification_service import AccountVerificationService
from apps.core.responses import ApiResponse
from apps.core.membership_activation_service import MembershipActivationService
from apps.core.services.membership_service import MembershipService
from apps.core.models import MemberMembership, MembershipPlan
from apps.core.services.razorpay_memberships import (
    RazorpayGatewayError,
    RazorpayMembershipService,
    missing_verification_checks,
)


class MembershipEntitlementsView(APIView):
    """Return the resolved, typed entitlement set and today's shared usage."""

    permission_classes = (permissions.IsAuthenticated, IsMember)

    def get(self, request):
        from apps.core.entitlements import get_active_entitlements, usage_for

        entitlements = get_active_entitlements(request.user)
        return ApiResponse(data={
            'entitlements': entitlements.as_dict(),
            'usage': usage_for(request.user, entitlements),
        })


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
        # Entitlements must always come from the active MemberMembership row.
        # The verification workflow may add a pending upgrade, but it must not
        # replace an already-active paid plan in the summary used by chat,
        # photos, and other gated features.
        summary = MembershipService.get_membership_summary(request.user)
        summary['status'] = 'active' if summary['has_active_plan'] else 'none'

        if (
            getattr(settings, 'REQUIRE_MEMBER_VERIFICATION', False)
            and not summary['has_active_plan']
        ):
            activation_summary = MembershipActivationService.get_membership_summary(request.user)
            if activation_summary.get('status') == 'pending_verification':
                summary.update({
                    'plan_name': activation_summary.get('plan_name', summary['plan_name']),
                    'plan_slug': activation_summary.get('plan_slug', summary['plan_slug']),
                    'is_free': False,
                    'status': 'pending_verification',
                    'next_action': activation_summary.get('next_action'),
                })
        
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


class MembershipCreateOrderView(APIView):
    """Create a Razorpay test-mode order after enforcing the full member gate."""

    permission_classes = (permissions.IsAuthenticated, IsMember)

    def post(self, request):
        missing = missing_verification_checks(request.user)
        if missing:
            return ApiResponse(
                success=False,
                code='ACCOUNT_NOT_VERIFIED',
                message='Your account must be fully verified before purchasing a membership.',
                errors={'missing': missing},
                status=status.HTTP_403_FORBIDDEN,
            )
        plan_id = request.data.get('plan_id')
        plan_slug = str(request.data.get('plan_slug') or '').strip().lower()
        queryset = MembershipPlan.objects.filter(is_active=True)
        if plan_id:
            queryset = queryset.filter(pk=plan_id)
        elif plan_slug:
            queryset = queryset.filter(slug=plan_slug)
        else:
            return JsonResponse({'error': 'PLAN_REQUIRED', 'message': 'plan_id or plan_slug is required.'}, status=400)
        plan = queryset.first()
        if not plan:
            return JsonResponse({'error': 'PLAN_NOT_FOUND', 'message': 'The selected membership plan is unavailable.'}, status=404)
        if plan.price <= 0:
            return JsonResponse({'error': 'PAID_PLAN_REQUIRED', 'message': 'Free plans do not require checkout.'}, status=400)
        try:
            membership, _missing = RazorpayMembershipService.create_order(member=request.user, plan=plan)
        except RazorpayGatewayError as error:
            return JsonResponse({'error': 'PAYMENT_GATEWAY_ERROR', 'message': str(error)}, status=502)
        return JsonResponse({
            'order_id': membership.razorpay_order_id,
            'amount': int(plan.price * 100),
            'currency': plan.currency,
            'key_id': settings.RAZORPAY_KEY_ID,
            'demo_mode': settings.RAZORPAY_DEMO_MODE,
            'plan': {'id': str(plan.pk), 'name': plan.name, 'duration_days': plan.duration_days},
        }, status=201)


class MembershipVerifyPaymentView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    def post(self, request):
        order_id = str(request.data.get('razorpay_order_id') or '')
        payment_id = str(request.data.get('razorpay_payment_id') or '')
        signature = str(request.data.get('razorpay_signature') or '')
        if not order_id or (not settings.RAZORPAY_DEMO_MODE and not all((payment_id, signature))):
            return JsonResponse({'error': 'PAYMENT_DETAILS_REQUIRED', 'message': 'Razorpay payment details are required.'}, status=400)
        try:
            membership = RazorpayMembershipService.verify_and_activate(
                order_id=order_id, payment_id=payment_id, signature=signature, member=request.user
            )
        except MemberMembership.DoesNotExist:
            return JsonResponse({'error': 'ORDER_NOT_FOUND', 'message': 'The Razorpay order was not found.'}, status=404)
        except ValueError as error:
            return JsonResponse({'error': 'PAYMENT_VERIFICATION_FAILED', 'message': str(error)}, status=400)
        return JsonResponse({
            'membership': {
                'id': str(membership.pk), 'status': membership.status,
                'plan_name': membership.plan.name, 'expires_at': membership.expires_at.isoformat(),
            }
        })


@method_decorator(csrf_exempt, name='dispatch')
class RazorpayWebhookView(APIView):
    """Idempotent fallback activation for a captured Razorpay payment."""

    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()

    def post(self, request):
        if not RazorpayMembershipService.verify_webhook_signature(
            payload=request.body, signature=request.headers.get('X-Razorpay-Signature', '')
        ):
            return JsonResponse({'error': 'INVALID_WEBHOOK_SIGNATURE'}, status=400)
        try:
            event = request.data
            if event.get('event') != 'payment.captured':
                return JsonResponse({'status': 'ignored'})
            payment = event['payload']['payment']['entity']
            membership = RazorpayMembershipService.activate_order(
                order_id=payment['order_id'], payment_id=payment['id']
            )
        except (KeyError, TypeError, MemberMembership.DoesNotExist):
            return JsonResponse({'error': 'ORDER_NOT_FOUND'}, status=404)
        except ValueError as error:
            return JsonResponse({'error': 'PAYMENT_VERIFICATION_FAILED', 'message': str(error)}, status=400)
        return JsonResponse({'status': membership.status.lower(), 'membership_id': str(membership.pk)})
