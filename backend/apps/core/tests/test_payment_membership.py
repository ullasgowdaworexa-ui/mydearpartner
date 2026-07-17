import pytest
from django.test import override_settings

from apps.core.models import MembershipPlan, Payment, PaymentWebhookLog, MemberMembership
from apps.accounts.models import Member

pytestmark = pytest.mark.django_db


@pytest.fixture
def gold_plan(db):
    plan, _ = MembershipPlan.objects.get_or_create(
        slug='gold',
        defaults={
            'name': 'Gold',
            'price': 2999.00,
            'duration': '3 Months',
            'features': ['Feature 1', 'Feature 2'],
            'highlighted': False,
            'badge': '',
            'color': 'gold-theme',
        }
    )
    return plan


@override_settings(PAYMENT_MODE='online')
def test_payment_order_creation(authenticated_client, member, gold_plan):
    client = authenticated_client(member)
    response = client.post(
        '/api/v1/payments/create-order/',
        {'plan_slug': 'gold'},
        format='json'
    )
    assert response.status_code == 201, response.data
    assert response.data['success'] is True
    assert 'payment_id' in response.data['data']
    assert 'verification_signature' in response.data['data']


@override_settings(PAYMENT_MODE='online')
def test_payment_verification_success(authenticated_client, member, gold_plan):
    client = authenticated_client(member)
    # 1. Create order
    response = client.post(
        '/api/v1/payments/create-order/',
        {'plan_slug': 'gold'},
        format='json'
    )
    assert response.status_code == 201
    order_data = response.data['data']

    # 2. Verify with valid signature
    verify_response = client.post(
        '/api/v1/payments/verify/',
        {
            'payment_id': order_data['payment_id'],
            'gateway_reference': order_data['gateway_reference'],
            'gateway_payment_id': order_data['gateway_payment_id'],
            'signature': order_data['verification_signature'],
        },
        format='json'
    )
    assert verify_response.status_code == 200, verify_response.data
    assert verify_response.data['success'] is True

    # 3. Check membership is PENDING_VERIFICATION (not premium yet)
    member.refresh_from_db()
    assert member.is_premium is False
    membership = MemberMembership.objects.get(member=member)
    assert membership.plan == gold_plan
    assert membership.is_active is False
    assert membership.status == 'PENDING_VERIFICATION'

    # 4. Now, complete verification checks
    member.profile_status = Member.ProfileStatus.APPROVED
    member.is_email_verified = True
    member.is_mobile_verified = True
    member.photo_status = Member.PhotoStatus.APPROVED
    member.document_status = Member.DocumentStatus.APPROVED
    member.save()

    from apps.accounts.models import MemberDocument
    from apps.profiles.models import ProfilePhoto
    ProfilePhoto.objects.create(
        user=member,
        image_data=b'payment-main-image',
        thumbnail_data=b'payment-thumbnail',
        original_filename='photo.webp',
        original_size_bytes=100,
        compressed_size_bytes=18,
        thumbnail_size_bytes=17,
        checksum=f'payment-photo-{member.pk}',
        is_primary=True,
        status=ProfilePhoto.Status.APPROVED,
    )
    MemberDocument.objects.create(
        member=member,
        status=MemberDocument.Status.APPROVED,
        document_type='Government ID',
        file_path='doc.pdf'
    )

    from apps.core.role_views import activate_pending_membership_if_eligible
    activate_pending_membership_if_eligible(member)

    # 5. Check membership is now active and premium is True
    member.refresh_from_db()
    assert member.is_premium is True
    membership.refresh_from_db()
    assert membership.is_active is True
    assert membership.status == 'ACTIVE'


@override_settings(PAYMENT_MODE='online')
def test_payment_verification_failure(authenticated_client, member, gold_plan):
    client = authenticated_client(member)
    response = client.post(
        '/api/v1/payments/create-order/',
        {'plan_slug': 'gold'},
        format='json'
    )
    assert response.status_code == 201
    order_data = response.data['data']

    # Verify with invalid signature
    verify_response = client.post(
        '/api/v1/payments/verify/',
        {
            'payment_id': order_data['payment_id'],
            'gateway_reference': order_data['gateway_reference'],
            'gateway_payment_id': order_data['gateway_payment_id'],
            'signature': 'invalid_signature_here',
        },
        format='json'
    )
    assert verify_response.status_code == 400
    assert verify_response.data['success'] is False


@override_settings(PAYMENT_MODE='manual_approval')
@pytest.mark.parametrize(
    ('path', 'payload'),
    (
        ('/api/v1/payments/create-order/', {'plan_slug': 'gold'}),
        ('/api/v1/payments/verify/', {'payment_id': '00000000-0000-0000-0000-000000000000'}),
    ),
)
def test_online_payment_paths_are_disabled_in_manual_mode(
    authenticated_client, member, gold_plan, path, payload
):
    response = authenticated_client(member).post(path, payload, format='json')

    assert response.status_code == 503
    assert response.data['success'] is False
    assert 'disabled' in response.data['message'].lower()
    assert Payment.objects.count() == 0


def test_payment_webhook_processed(api_client, member, gold_plan):
    import uuid
    ref_uuid = uuid.uuid4()
    payment = Payment.objects.create(
        member=member,
        plan=gold_plan,
        amount=gold_plan.price,
        currency='INR',
        gateway='razorpay',
        client_reference=ref_uuid,
        status=Payment.Status.PENDING,
    )

    response = api_client.post(
        '/api/v1/payments/webhook/',
        {
            'event': 'payment.captured',
            'event_id': 'evt_123456',
            'payload': {
                'payment': {
                    'order_id': str(ref_uuid),
                    'gateway_reference': 'pay_test_ref_abc',
                }
            }
        },
        format='json',
        HTTP_X_EVENT_ID='evt_123456',
    )
    assert response.status_code == 200
    payment.refresh_from_db()
    assert payment.status == Payment.Status.SUCCESS
    assert payment.gateway_reference == 'pay_test_ref_abc'

    # Check membership is PENDING_VERIFICATION (not premium yet)
    member.refresh_from_db()
    assert member.is_premium is False
    membership = MemberMembership.objects.get(member=member)
    assert membership.status == 'PENDING_VERIFICATION'

    # Now, complete verification checks
    member.profile_status = Member.ProfileStatus.APPROVED
    member.is_email_verified = True
    member.is_mobile_verified = True
    member.photo_status = Member.PhotoStatus.APPROVED
    member.document_status = Member.DocumentStatus.APPROVED
    member.save()

    from apps.accounts.models import MemberDocument
    from apps.profiles.models import ProfilePhoto
    ProfilePhoto.objects.create(
        user=member,
        image_data=b'payment-main-image',
        thumbnail_data=b'payment-thumbnail',
        original_filename='photo.webp',
        original_size_bytes=100,
        compressed_size_bytes=18,
        thumbnail_size_bytes=17,
        checksum=f'payment-photo-{member.pk}',
        is_primary=True,
        status=ProfilePhoto.Status.APPROVED,
    )
    MemberDocument.objects.create(
        member=member,
        status=MemberDocument.Status.APPROVED,
        document_type='Government ID',
        file_path='doc.pdf'
    )

    from apps.core.role_views import activate_pending_membership_if_eligible
    activate_pending_membership_if_eligible(member)

    # Check membership is active and premium is True
    member.refresh_from_db()
    assert member.is_premium is True
    membership.refresh_from_db()
    assert membership.status == 'ACTIVE'

    # Duplicate webhook call should return DUPLICATE status without raising error
    response_dup = api_client.post(
        '/api/v1/payments/webhook/',
        {
            'event': 'payment.captured',
            'event_id': 'evt_123456',
            'payload': {
                'payment': {
                    'order_id': str(ref_uuid),
                }
            }
        },
        format='json',
        HTTP_X_EVENT_ID='evt_123456',
    )
    assert response_dup.status_code == 200
    assert PaymentWebhookLog.objects.filter(event_id__startswith='evt_123456', status='DUPLICATE').exists()
