"""Razorpay test-mode membership checkout and activation service."""

import base64
import hashlib
import hmac
import json
import uuid
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Member
from apps.accounts.verification_service import AccountVerificationService
from apps.profiles.models import ProfilePhoto
from apps.core.api_utils import create_notification
from apps.core.models import MemberMembership, MembershipPlan


class RazorpayGatewayError(Exception):
    """A safe error returned when Razorpay cannot create an order."""


def missing_verification_checks(member):
    """Return stable frontend-facing codes for every failed purchase gate."""
    missing = []
    if member.profile_status != Member.ProfileStatus.APPROVED:
        missing.append('profile_approval')
    if not member.is_email_verified:
        missing.append('email_verification')
    if not member.is_mobile_verified:
        missing.append('mobile_verification')
    if not ProfilePhoto.objects.filter(
        user=member, is_primary=True, status=ProfilePhoto.Status.APPROVED
    ).exists():
        missing.append('photo_verification')
    if not (
        member.document_status == Member.DocumentStatus.APPROVED
        or member.documents.filter(status='APPROVED').exists()
    ):
        missing.append('document_verification')
    return missing


class RazorpayMembershipService:
    ORDER_URL = 'https://api.razorpay.com/v1/orders'

    @staticmethod
    def create_order(*, member, plan):
        missing = missing_verification_checks(member)
        if missing:
            return None, missing
        if not settings.RAZORPAY_DEMO_MODE and not settings.RAZORPAY_KEY_SECRET:
            raise RazorpayGatewayError('Razorpay test credentials are not configured.')
        amount = int((Decimal(plan.price) * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
        if settings.RAZORPAY_DEMO_MODE:
            order = {'id': f'demo_order_{uuid.uuid4().hex}'}
        else:
            payload = json.dumps({
                'amount': amount,
                'currency': plan.currency,
                'receipt': f'membership_{str(member.pk)[:12]}_{str(plan.pk)[:12]}',
                'notes': {'member_id': str(member.pk), 'plan_id': str(plan.pk)},
            }).encode('utf-8')
            credentials = base64.b64encode(
                f'{settings.RAZORPAY_KEY_ID}:{settings.RAZORPAY_KEY_SECRET}'.encode('utf-8')
            ).decode('ascii')
            request = Request(
                RazorpayMembershipService.ORDER_URL,
                data=payload,
                headers={'Authorization': f'Basic {credentials}', 'Content-Type': 'application/json'},
                method='POST',
            )
            try:
                with urlopen(request, timeout=15) as response:  # nosec B310 - fixed HTTPS Razorpay endpoint
                    order = json.loads(response.read().decode('utf-8'))
            except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
                raise RazorpayGatewayError('Unable to create a Razorpay order. Please try again.') from error

        with transaction.atomic():
            MemberMembership.objects.filter(
                member=member,
                status=MemberMembership.MembershipStatus.PENDING_PAYMENT,
            ).update(status=MemberMembership.MembershipStatus.CANCELLED, is_active=False)
            membership = MemberMembership.objects.create(
                member=member,
                plan=plan,
                status=MemberMembership.MembershipStatus.PENDING_PAYMENT,
                is_active=False,
                razorpay_order_id=order['id'],
            )
        return membership, []

    @staticmethod
    def verify_and_activate(*, order_id, payment_id, signature, member=None):
        if settings.RAZORPAY_DEMO_MODE and order_id.startswith('demo_order_'):
            return RazorpayMembershipService.activate_order(
                order_id=order_id,
                payment_id=payment_id or f'demo_payment_{order_id.removeprefix("demo_order_")}',
                signature='DEMO_NO_PAYMENT',
                member=member,
            )
        secret = settings.RAZORPAY_KEY_SECRET.encode('utf-8')
        expected = hmac.new(secret, f'{order_id}|{payment_id}'.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature or ''):
            raise ValueError('Invalid Razorpay payment signature.')
        return RazorpayMembershipService.activate_order(
            order_id=order_id, payment_id=payment_id, signature=signature, member=member
        )

    @staticmethod
    @transaction.atomic
    def activate_order(*, order_id, payment_id, signature='', member=None):
        # ``plan`` is nullable, so joining it would be a LEFT OUTER JOIN.
        # PostgreSQL correctly rejects ``FOR UPDATE`` on that nullable side.
        # Lock only the membership row, then lazy-load its related objects
        # while the transaction remains open.
        membership = MemberMembership.objects.select_for_update().get(razorpay_order_id=order_id)
        if member is not None and membership.member_id != member.pk:
            raise ValueError('The Razorpay order was not found.')
        if membership.razorpay_payment_id:
            if membership.razorpay_payment_id != payment_id:
                raise ValueError('This Razorpay order was already completed with a different payment.')
            return membership
        if membership.status != MemberMembership.MembershipStatus.PENDING_PAYMENT:
            raise ValueError('This Razorpay order is not awaiting payment.')
        if not membership.plan_id or not membership.plan.is_active:
            membership.status = MemberMembership.MembershipStatus.FAILED
            membership.save(update_fields=('status', 'updated_at'))
            raise ValueError('The selected membership plan is no longer available.')

        now = timezone.now()
        # Replacement is the agreed business rule: a successful purchase
        # supersedes (rather than stacks onto) any still-active membership.
        MemberMembership.objects.filter(
            member=membership.member,
            status=MemberMembership.MembershipStatus.ACTIVE,
            is_active=True,
        ).exclude(pk=membership.pk).update(
            status=MemberMembership.MembershipStatus.EXPIRED,
            is_active=False,
            expires_at=now,
            end_date=now,
        )
        expiry = now + timedelta(days=membership.plan.duration_days)
        membership.status = MemberMembership.MembershipStatus.ACTIVE
        membership.is_active = True
        membership.razorpay_payment_id = payment_id
        membership.razorpay_signature = signature
        membership.started_at = membership.start_date = now
        membership.expires_at = membership.end_date = expiry
        membership.save()
        Member.objects.filter(pk=membership.member_id).update(is_premium=True)
        create_notification(
            membership.member,
            type='MEMBERSHIP_ACTIVATED',
            title=f'{membership.plan.name} membership activated',
            body=f'Your membership is active until {expiry.strftime("%d %B %Y")}.',
            link_url='/dashboard',
        )
        return membership

    @staticmethod
    def verify_webhook_signature(*, payload, signature):
        expected = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode('utf-8'), payload, hashlib.sha256
        ).hexdigest()
        return bool(settings.RAZORPAY_WEBHOOK_SECRET) and hmac.compare_digest(expected, signature or '')
