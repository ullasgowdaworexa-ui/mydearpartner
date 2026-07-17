from django.urls import path

from .views import (
    CustomerSupportChangePasswordView,
    CustomerSupportLoginView,
    CustomerSupportLogoutAllView,
    CustomerSupportLogoutView,
    CustomerSupportMeView,
    CustomerSupportRefreshView,
)

app_name = 'customer_support_auth'

urlpatterns = [
    path('login/', CustomerSupportLoginView.as_view(), name='login'),
    path('logout/', CustomerSupportLogoutView.as_view(), name='logout'),
    path('logout-all/', CustomerSupportLogoutAllView.as_view(), name='logout_all'),
    path('token/refresh/', CustomerSupportRefreshView.as_view(), name='token_refresh'),
    path('me/', CustomerSupportMeView.as_view(), name='me'),
    path('change-password/', CustomerSupportChangePasswordView.as_view(), name='change_password'),
]
