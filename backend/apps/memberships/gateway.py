"""Small, testable adapter around Razorpay's official Python SDK."""

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

try:  # Keep ``manage.py check`` useful before optional dependencies are installed.
    import razorpay
except ImportError:  # pragma: no cover - exercised only in incomplete installs
    razorpay = None


def client():
    if razorpay is None:
        raise ImproperlyConfigured(
            "Razorpay support requires the 'razorpay' package. Install backend requirements."
        )
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_order(*, amount, currency, receipt):
    return client().order.create(
        {"amount": int(amount), "currency": currency, "receipt": receipt}
    )


def verify_payment_signature(*, order_id, payment_id, signature):
    """Raise the SDK's signature error when the checkout payload is invalid."""

    return client().utility.verify_payment_signature(
        {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        }
    )
