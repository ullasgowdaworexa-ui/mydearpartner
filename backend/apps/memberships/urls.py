from django.urls import path

from .views import PaymentCreateOrderView, PaymentVerifyView


urlpatterns = [
    path("payments/create-order/", PaymentCreateOrderView.as_view(), name="contract-payment-create-order"),
    path("payments/verify/", PaymentVerifyView.as_view(), name="contract-payment-verify"),
]
