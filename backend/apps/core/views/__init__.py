"""
Views module for core app.

Exports views from submodules. Legacy views are in legacy_views.py
to avoid circular imports.
"""

from .membership_views import (
    MembershipActivateView,
    MembershipSummaryView,
    MembershipDeactivateView,
)

from .plan_views import (
    PublicMembershipPlanListView,
    AdminMembershipPlanDetailView,
    AdminMembershipPlanToggleView,
)

from .legacy_views import (
    BlogPostListView,
    CompatibilityCheckView,
    ContactEnquiryCreateView,
    ConversationListView,
    DatabaseHealthCheckView,
    FAQListView,
    HealthCheckView,
    InterestDetailView,
    InterestListCreateView,
    MemberNotificationListView,
    MemberNotificationReadView,
    MemberNotificationUnreadCountView,
    MemberSupportTicketDetailView,
    MemberSupportTicketListView,
    MembershipPlanListView,
    MessageHistoryView,
    PaymentHistoryView,
    ProfileDetailView,
    ProfileListView,
    SecurePaymentCreateOrderView,
    SecurePaymentVerifyView,
    SecurePaymentWebhookView,
    MemberComplaintListCreateView,
    MemberProfileReportCreateView,
    SuccessStoryListView,
    SupportAttachmentDownloadView,
    SupportCategoryListView,
    TestimonialListView,
    MemberMembershipRequestView,
    MemberMembershipRequestHistoryView,
    ProfileUnlockDailyUsageView,
    ProfileUnlockHistoryView,
)

# Import admin content views - these are created dynamically in role_views.py
# We import them here for re-export in the __all__ list
from ..role_views import (
    AdminBlogDetailView,
    AdminBlogListCreateView,
    AdminFAQDetailView,
    AdminFAQListCreateView,
    AdminSuccessStoryDetailView,
    AdminSuccessStoryListCreateView,
    AdminTestimonialDetailView,
    AdminTestimonialListCreateView,
    AdminMembershipPlanListCreateView,
)

__all__ = [
    # New views
    'MembershipActivateView',
    'MembershipSummaryView',
    'MembershipDeactivateView',
    'PublicMembershipPlanListView',
    'AdminMembershipPlanDetailView',
    'AdminMembershipPlanToggleView',
    # Legacy views
    'BlogPostListView',
    'CompatibilityCheckView',
    'ContactEnquiryCreateView',
    'ConversationListView',
    'DatabaseHealthCheckView',
    'FAQListView',
    'HealthCheckView',
    'InterestDetailView',
    'InterestListCreateView',
    'MemberNotificationListView',
    'MemberNotificationReadView',
    'MemberNotificationUnreadCountView',
    'MemberSupportTicketDetailView',
    'MemberSupportTicketListView',
    'MembershipPlanListView',
    'MessageHistoryView',
    'PaymentHistoryView',
    'ProfileDetailView',
    'ProfileListView',
    'SecurePaymentCreateOrderView',
    'SecurePaymentVerifyView',
    'SecurePaymentWebhookView',
    'MemberComplaintListCreateView',
    'MemberProfileReportCreateView',
    'SuccessStoryListView',
    'SupportAttachmentDownloadView',
    'SupportCategoryListView',
    'TestimonialListView',
    'MemberMembershipRequestView',
    'MemberMembershipRequestHistoryView',
    'ProfileUnlockDailyUsageView',
    'ProfileUnlockHistoryView',
    # Admin content views
    'AdminBlogDetailView',
    'AdminBlogListCreateView',
    'AdminFAQDetailView',
    'AdminFAQListCreateView',
    'AdminSuccessStoryDetailView',
    'AdminSuccessStoryListCreateView',
    'AdminTestimonialDetailView',
    'AdminTestimonialListCreateView',
    'AdminMembershipPlanListCreateView',
]



