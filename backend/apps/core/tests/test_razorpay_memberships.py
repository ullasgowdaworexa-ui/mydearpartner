import hashlib
import hmac

import pytest
from django.test import override_settings

from apps.core.models import MemberMembership, MembershipPlan, Notification
from apps.core.services.razorpay_memberships import RazorpayMembershipService


pytestmark = pytest.mark.django_db


@pytest.fixture
def paid_plan():
    return MembershipPlan.objects.create(
        name='Gold', slug='gold-payment', price='499.00', duration='30 days',
        duration_days=30, features=[], is_active=True,
    )


def test_unverified_member_cannot_create_payment_order(authenticated_client, member, paid_plan):
    response = authenticated_client(member).post(
        '/api/v1/member/memberships/create-order/', {'plan_slug': paid_plan.slug}, format='json'
    )

    assert response.status_code == 403
    assert response.json()['error'] == 'ACCOUNT_NOT_VERIFIED'
    assert 'email_verification' in response.json()['missing']
    assert 'photo_verification' in response.json()['missing']


@override_settings(RAZORPAY_KEY_SECRET='test_secret')
def test_verified_payment_signature_activates_once_and_notifies(member, paid_plan):
    pending = MemberMembership.objects.create(
        member=member,
        plan=paid_plan,
        status=MemberMembership.MembershipStatus.PENDING_PAYMENT,
        is_active=False,
        razorpay_order_id='order_test_123',
    )
    payment_id = 'pay_test_123'
    signature = hmac.new(
        b'test_secret', f'{pending.razorpay_order_id}|{payment_id}'.encode(), hashlib.sha256
    ).hexdigest()

    membership = RazorpayMembershipService.verify_and_activate(
        order_id=pending.razorpay_order_id,
        payment_id=payment_id,
        signature=signature,
        member=member,
    )
    retry = RazorpayMembershipService.verify_and_activate(
        order_id=pending.razorpay_order_id,
        payment_id=payment_id,
        signature=signature,
        member=member,
    )

    membership.refresh_from_db()
    member.refresh_from_db()
    assert retry.pk == membership.pk
    assert membership.status == MemberMembership.MembershipStatus.ACTIVE
    assert membership.expires_at is not None
    assert member.is_premium is True
    assert Notification.objects.filter(
        member_recipient=member, notification_type='MEMBERSHIP_ACTIVATED'
    ).count() == 1
