"""Member authentication endpoints.

The legacy ``/api/v1/auth/`` mount also points here during the frontend
transition, but it can authenticate members only.
"""

from django.urls import path

from .views import (
    MemberChangePasswordView,
    MemberDocumentListCreateView,
    MemberForgotPasswordView,
    MemberLoginView,
    MemberLogoutAllView,
    MemberLogoutView,
    MemberMeView,
    MemberOtpRequestView,
    MemberOtpVerifyView,
    MemberProfileSubmitView,
    MemberRefreshView,
    MemberRegisterView,
    MemberResetPasswordView,
    MemberVerificationStatusView,
)
from apps.profiles.views import (
    ProfilePhotoDeleteView as MemberPhotoDeleteView,
    ProfilePhotoSetPrimaryView as MemberPhotoSetPrimaryView,
    ProfilePhotoUploadView as MemberPhotoUploadView,
)

# Import membership views from core app
from apps.core.views.membership_views import (
    MembershipSummaryView,
    MembershipDeactivateView,
)


app_name = 'member_auth'

urlpatterns = [
    path('register/', MemberRegisterView.as_view(), name='register'),
    path('login/', MemberLoginView.as_view(), name='login'),
    path('logout/', MemberLogoutView.as_view(), name='logout'),
    path('logout-all/', MemberLogoutAllView.as_view(), name='logout_all'),
    path('token/refresh/', MemberRefreshView.as_view(), name='token_refresh'),
    path('me/', MemberMeView.as_view(), name='me'),
    path('me/submit/', MemberProfileSubmitView.as_view(), name='profile_submit'),
    path('me/documents/', MemberDocumentListCreateView.as_view(), name='member_documents'),
    path('me/photos/', MemberPhotoUploadView.as_view(), name='member_photos_upload'),
    path('me/photos/<uuid:photo_id>/', MemberPhotoDeleteView.as_view(), name='member_photo_delete'),
    path('me/photos/<uuid:photo_id>/set-primary/', MemberPhotoSetPrimaryView.as_view(), name='member_photo_set_primary'),
    path('change-password/', MemberChangePasswordView.as_view(), name='change_password'),
    path('forgot-password/', MemberForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', MemberResetPasswordView.as_view(), name='reset_password'),
    path('otp/request/', MemberOtpRequestView.as_view(), name='otp_request'),
    path('otp/verify/', MemberOtpVerifyView.as_view(), name='otp_verify'),
    
    # Membership management endpoints
    path('membership/summary/', MembershipSummaryView.as_view(), name='membership_summary'),
    path('membership/deactivate/', MembershipDeactivateView.as_view(), name='membership_deactivate'),
    
    # Verification endpoints
    path('verification/status/', MemberVerificationStatusView.as_view(), name='verification_status'),
]
