import uuid
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Member

from . import gateway
from .models import MembershipSubscription
from .serializers import MembershipSubscriptionSerializer
from .services import active_subscription_for


def plan_config_for(plan_slug):
    config = getattr(settings, "PLAN_CONFIG", {}).get(str(plan_slug).lower())
    if not config:
        return None
    required = {"name", "amount", "currency", "views_limit"}
    if not required.issubset(config):
        return None
    return config


class PaymentCreateOrderView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        plan_slug = str(request.data.get("plan_slug", "")).lower()
        plan = plan_config_for(plan_slug)
        if plan is None:
            return Response(
                {"detail": "plan_slug must be gold, platinum, or elite."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        receipt = f"membership_{request.user.pk.hex}_{uuid.uuid4().hex[:12]}"
        try:
            order = gateway.create_order(
                amount=plan["amount"],
                currency=plan["currency"],
                receipt=receipt,
            )
        except ImproperlyConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception:
            return Response(
                {"detail": "Unable to create a payment order."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        order_id = order.get("id") if isinstance(order, dict) else None
        if not order_id:
            return Response(
                {"detail": "Payment gateway returned an invalid order."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(
            {
                "order_id": order_id,
                "amount": int(plan["amount"]),
                "currency": plan["currency"],
                "key": settings.RAZORPAY_KEY_ID,
            }
        )


class PaymentVerifyView(APIView):
    permission_classes = (IsAuthenticated,)

    @transaction.atomic
    def post(self, request):
        order_id = str(request.data.get("order_id", "")).strip()
        payment_id = str(request.data.get("payment_id", "")).strip()
        signature = str(
            request.data.get("razorpay_signature") or request.data.get("signature") or ""
        ).strip()
        plan_slug = str(request.data.get("plan_slug", "")).lower()
        plan = plan_config_for(plan_slug)
        if not plan:
            return Response(
                {"detail": "plan_slug must be gold, platinum, or elite."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not order_id or not payment_id or not signature:
            return Response(
                {"detail": "payment_id, order_id, and razorpay_signature are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            gateway.verify_payment_signature(
                order_id=order_id,
                payment_id=payment_id,
                signature=signature,
            )
        except ImproperlyConfigured as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception:
            # Do not mutate membership state on a failed verification.
            return Response(
                {"detail": "Payment signature verification failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = Member.objects.select_for_update().get(pk=request.user.pk)
        subscription = active_subscription_for(user, for_update=True)
        end_date = timezone.now() + timedelta(days=30)
        defaults = {
            "plan_name": plan["name"],
            "plan_slug": plan_slug,
            "views_limit": int(plan["views_limit"]),
            "views_used": 0,
            "end_date": end_date,
        }
        if subscription is None:
            subscription = MembershipSubscription.objects.create(user=user, **defaults)
        else:
            for field, value in defaults.items():
                setattr(subscription, field, value)
            subscription.save(update_fields=(*defaults.keys(), "updated_at"))
        user.is_premium = True
        user.save(update_fields=("is_premium", "updated_at"))
        return Response(
            {
                "success": True,
                "subscription": MembershipSubscriptionSerializer(subscription).data,
            }
        )
