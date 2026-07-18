import pytest

from apps.core.models import Payment


pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    ('path', 'payload'),
    (
        ('/api/v1/payments/create-order/', {'plan_slug': 'gold'}),
        ('/api/v1/payments/verify/', {'payment_id': '00000000-0000-0000-0000-000000000000'}),
        ('/payments/create-order/', {'plan_slug': 'gold'}),
        ('/payments/verify/', {'payment_id': 'payment_test'}),
    ),
)
def test_online_payment_endpoints_are_removed(api_client, path, payload):
    response = api_client.post(path, payload, format='json')

    assert response.status_code == 404


def test_razorpay_webhook_rejects_unsigned_requests(api_client):
    response = api_client.post('/api/v1/payments/webhook/', {'event': 'payment.captured'}, format='json')

    assert response.status_code == 400
    assert Payment.objects.count() == 0
