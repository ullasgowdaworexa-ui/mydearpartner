import hashlib
import hmac
import mimetypes
import uuid
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.db import connection, transaction
from django.db.models import OuterRef, Prefetch, Q, Subquery
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import permissions, status, serializers
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.accounts.models import AccountType, Member, MemberDocument
from apps.accounts.permissions import IsMember, IsVerifiedMember
from apps.profiles.models import ProfilePhoto

from .api_utils import audit, bad_request, create_ticket_attachment, notify, paginated_response
from .models import (
    BlogPost,
    ChatMessage,
    Complaint,
    ContactEnquiry,
    FAQ,
    Interest,
    MemberMembership,
    MembershipPlan,
    Notification,
    Payment,
    PaymentWebhookLog,
    ProfileReport,
    ProfileVerificationAssignment,
    ProfileViewLog,
    SuccessStory,
    SupportCategory,
    SupportTicket,
    SupportTicketAttachment,
    SupportTicketReply,
    Testimonial,
    TicketFeedback,
    TicketStatusHistory,
)
from .responses import ApiResponse
from .serializers import (
    BlogPostSerializer,
    ChatMessageSerializer,
    ContactEnquirySerializer,
    FAQSerializer,
    InterestSerializer,
    MemberPublicSerializer,
    MemberTicketCreateSerializer,
    MembershipPlanSerializer,
    NotificationSerializer,
    PaymentSerializer,
    SuccessStorySerializer,
    SupportCategorySerializer,
    SupportTicketReplySerializer,
    SupportTicketSerializer,
    TestimonialSerializer,
    TicketFeedbackSerializer,
    TicketReplyInputSerializer,
    MemberComplaintSerializer,
    MemberProfileReportSerializer,
)


class HealthCheckView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, _request):
        return ApiResponse(data={'status': 'healthy'})


class DatabaseHealthCheckView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, _request):
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
                cursor.fetchone()
        except Exception:
            return ApiResponse(
                success=False,
                message='Database is unavailable.',
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return ApiResponse(data={'database': 'healthy'})


class PublicListView(APIView):
    permission_classes = (permissions.AllowAny,)
    model = None
    serializer_class = None

    def get(self, request):
        rows = self.model.objects.all()
        return ApiResponse(data=self.serializer_class(rows, many=True, context={'request': request}).data)


class MembershipPlanListView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        rows = MembershipPlan.objects.filter(is_active=True).order_by('display_order')
        return ApiResponse(data=MembershipPlanSerializer(rows, many=True, context={'request': request}).data)


class SuccessStoryListView(PublicListView):
    model = SuccessStory
    serializer_class = SuccessStorySerializer


class TestimonialListView(PublicListView):
    model = Testimonial
    serializer_class = TestimonialSerializer


class BlogPostListView(PublicListView):
    model = BlogPost
    serializer_class = BlogPostSerializer


class FAQListView(PublicListView):
    model = FAQ
    serializer_class = FAQSerializer


class SupportCategoryListView(PublicListView):
    model = SupportCategory
    serializer_class = SupportCategorySerializer

    def get(self, request):
        rows = SupportCategory.objects.filter(is_active=True)
        return ApiResponse(data=SupportCategorySerializer(rows, many=True).data)


class ContactEnquiryCreateView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_scope = 'contact-enquiry'

    def post(self, request):
        serializer = ContactEnquirySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enquiry = serializer.save(
            member=request.user if getattr(request.user, 'account_type', None) == AccountType.MEMBER else None
        )
        return ApiResponse(
            data=ContactEnquirySerializer(enquiry).data,
            message='Your enquiry has been received.',
            status=status.HTTP_201_CREATED,
        )


class ProfileListView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsVerifiedMember)

    # Advanced-search fields only available to Gold+ plans
    ADVANCED_FILTERS = (
        ('caste', 'profile__caste__icontains'),
        ('marital_status', 'profile__marital_status__iexact'),
        ('education', 'profile__highest_education__icontains'),
        ('occupation', 'profile__occupation__icontains'),
        ('min_age', None),
        ('max_age', None),
    )

    def get(self, request):
        from apps.core.eligibility import get_eligible_profiles_for
        from apps.core.entitlements import entitlement_denial, get_active_entitlements, usage_for
        import datetime
        from django.utils import timezone
        
        viewer = request.user
        entitlements = get_active_entitlements(viewer)
        can_use_advanced_search = entitlements.can_use_advanced_search
        usage = usage_for(viewer, entitlements)
        if (
            entitlements.daily_profile_view_limit is not None
            and usage['profile_views_used_today'] >= entitlements.daily_profile_view_limit
        ):
            return Response(
                entitlement_denial(entitlements, 'daily_profile_view_limit', daily_limit=True), status=403
            )

        # Get eligible profiles (opposite gender, active, non-hidden, non-suspended, non-blocked)
        queryset = (
            get_eligible_profiles_for(viewer)
            .select_related('profile', 'preferences')
            .prefetch_related(
                Prefetch(
                    'profile_photos',
                    queryset=ProfilePhoto.objects.without_binary(),
                )
            )
        )

        # Basic query parameters filter (allowed for everyone)
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(profile__occupation__icontains=search)
                | Q(profile__work_location__icontains=search)
            )

        location = request.query_params.get('location', '').strip()
        if location:
            queryset = queryset.filter(profile__work_location__icontains=location)

        # min_age / max_age basic filtering:
        today = timezone.now().date()
        min_age = request.query_params.get('min_age', '').strip()
        max_age = request.query_params.get('max_age', '').strip()
        if min_age.isdigit():
            max_dob = today - datetime.timedelta(days=int(min_age) * 365)
            queryset = queryset.filter(date_of_birth__lte=max_dob)
        if max_age.isdigit():
            min_dob = today - datetime.timedelta(days=(int(max_age) + 1) * 365)
            queryset = queryset.filter(date_of_birth__gte=min_dob)

        # Advanced search filters — Gold+ only
        if can_use_advanced_search:
            for qparam, lookup in [
                ('caste', 'profile__caste__icontains'),
                ('marital_status', 'profile__marital_status__iexact'),
                ('education', 'profile__highest_education__icontains'),
                ('occupation', 'profile__occupation__icontains'),
                ('religion', 'profile__religion__iexact'),
            ]:
                value = request.query_params.get(qparam, '').strip()
                if value:
                    queryset = queryset.filter(**{lookup: value})

        return paginated_response(request, queryset, MemberPublicSerializer)


class ProfileDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsVerifiedMember)

    def get(self, request, pk):
        """Return an eligible profile and atomically record its daily unlock.

        The unlock, entitlement and access calculations belong to
        ``ProfileService``.  Keeping this view as a thin HTTP adapter prevents
        its response from drifting from the daily-usage endpoint.
        """
        from rest_framework.response import Response
        from apps.core.services.profile_service import ProfileService

        success, message, payload = ProfileService.get_full_profile(
            request.user,
            pk,
            source=request.query_params.get('source', 'search'),
        )
        if not success:
            if payload and payload.get('code') == 'daily_profile_unlock_limit_reached':
                if 'limit' in payload:
                    payload['views_limit'] = payload['limit']
                from apps.core.entitlements import entitlement_denial, get_active_entitlements
                return Response(
                    entitlement_denial(get_active_entitlements(request.user), 'daily_profile_view_limit', daily_limit=True),
                    status=status.HTTP_403_FORBIDDEN,
                )
            return ApiResponse(
                success=False,
                message=message,
                status=(
                    status.HTTP_400_BAD_REQUEST
                    if str(pk) == str(request.user.pk)
                    else status.HTTP_404_NOT_FOUND
                ),
            )

        member = payload['profile']
        return ApiResponse(data={
            'profile': MemberPublicSerializer(member, context={'request': request}).data,
            'compatibility': payload['compatibility'],
            'access': payload['access'],
        })


class ProfileVisitorListView(APIView):
    """List recent unique profile visitors without leaking locked identities."""

    permission_classes = (permissions.IsAuthenticated, IsMember)

    def get(self, request):
        from apps.core.entitlements import get_active_entitlements

        try:
            limit = max(1, min(int(request.query_params.get("limit", 3)), 20))
        except (TypeError, ValueError):
            return bad_request("limit must be an integer between 1 and 20.")

        base = ProfileViewLog.objects.filter(viewed=request.user)
        total_unique_visitors = base.values("viewer_id").distinct().count()
        entitlements = get_active_entitlements(request.user)
        can_view_visitors = entitlements.can_see_who_viewed_profile
        if not can_view_visitors:
            return ApiResponse(data={
                "can_view_visitors": False,
                "total_unique_visitors": total_unique_visitors,
                "results": [],
            })

        latest_for_viewer = base.filter(viewer_id=OuterRef("viewer_id")).order_by("-viewed_at", "-pk")
        visits = (
            base.filter(pk=Subquery(latest_for_viewer.values("pk")[:1]))
            .select_related("viewer", "viewer__profile")
            .prefetch_related(
                Prefetch("viewer__profile_photos", queryset=ProfilePhoto.objects.without_binary())
            )
            .order_by("-viewed_at", "-pk")[:limit]
        )
        return ApiResponse(data={
            "can_view_visitors": True,
            "total_unique_visitors": total_unique_visitors,
            "results": [
                {
                    "id": str(visit.pk),
                    "viewed_at": visit.viewed_at.isoformat(),
                    "profile": MemberPublicSerializer(visit.viewer, context={"request": request}).data,
                }
                for visit in visits
            ],
        })


class InterestListCreateView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    def get(self, request):
        from apps.core.entitlements import entitlement_denial, get_active_entitlements, usage_for

        direction = request.query_params.get('type', 'incoming')
        if direction not in {'incoming', 'outgoing'}:
            return bad_request('type must be incoming or outgoing.')
        if direction == 'incoming':
            entitlements = get_active_entitlements(request.user)
            if not entitlements.can_view_received_interests:
                return Response(entitlement_denial(entitlements, 'can_view_received_interests'), status=403)
        queryset = Interest.objects.select_related(
            'sender', 'receiver', 'sender__profile', 'receiver__profile'
        )
        queryset = queryset.filter(sender=request.user) if direction == 'outgoing' else queryset.filter(receiver=request.user)
        return ApiResponse(data=InterestSerializer(queryset, many=True, context={'request': request}).data)

    @transaction.atomic
    def post(self, request):
        from apps.core.entitlements import entitlement_denial, get_active_entitlements
        from apps.core.eligibility import get_eligible_profiles_for
        viewer = request.user
        entitlements = get_active_entitlements(viewer)
        interest_usage = usage_for(viewer, entitlements)
        allowed = entitlements.can_send_interest and (
            entitlements.daily_interest_limit is None
            or interest_usage['interests_used_today'] < entitlements.daily_interest_limit
        )
        if not allowed:
            key = 'can_send_interest' if not entitlements.can_send_interest else 'daily_interest_limit'
            return Response(entitlement_denial(entitlements, key, daily_limit=key == 'daily_interest_limit'), status=403)

        receiver_id = request.data.get('receiver_id')
        receiver = get_eligible_profiles_for(viewer).filter(pk=receiver_id).first()
        if not receiver:
            return ApiResponse(
                success=False,
                message="This member is not eligible or available.",
                status=status.HTTP_404_NOT_FOUND
            )

        if receiver.pk == request.user.pk:
            return bad_request('You cannot send an interest to yourself.')
        interest, created = Interest.objects.get_or_create(sender=request.user, receiver=receiver)
        if not created:
            return ApiResponse(
                success=False,
                message='An interest already exists for this member.',
                status=status.HTTP_409_CONFLICT,
            )
        notify(
            receiver,
            notification_type='INTEREST_RECEIVED',
            title='New interest received',
            message=f'{request.user.get_full_name()} sent you an interest.',
            related_object=interest,
        )
        return ApiResponse(
            data=InterestSerializer(interest, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class InterestDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    def patch(self, request, pk):
        interest = get_object_or_404(Interest, pk=pk, receiver=request.user)
        new_status = request.data.get('status')
        if new_status not in {Interest.Status.ACCEPTED, Interest.Status.DECLINED}:
            return bad_request('Status must be ACCEPTED or DECLINED.')
        interest.status = new_status
        interest.save(update_fields=('status', 'updated_at'))
        notify(
            interest.sender,
            notification_type='INTEREST_UPDATED',
            title='Interest updated',
            message=f'{request.user.get_full_name()} {new_status.lower()} your interest.',
            related_object=interest,
        )
        return ApiResponse(data=InterestSerializer(interest, context={'request': request}).data)


class ConversationListView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    def get(self, request):
        messages = (
            ChatMessage.objects.filter(Q(sender=request.user) | Q(receiver=request.user))
            .select_related('sender', 'receiver')
            .order_by('-created_at')
        )
        seen = set()
        conversations = []
        for message in messages:
            other = message.receiver if message.sender_id == request.user.pk else message.sender
            if other.pk in seen:
                continue
            seen.add(other.pk)
            unread = ChatMessage.objects.filter(sender=other, receiver=request.user, is_read=False).count()
            conversations.append({
                # ``id`` is retained for the existing chat UI; ``partner_id``
                # is the explicit contract for new clients.
                'id': str(other.pk),
                'partner_id': str(other.pk),
                'profile': MemberPublicSerializer(other, context={'request': request}).data,
                'lastMessage': message.text,
                'time': message.created_at,
                'unread': unread,
            })
        return ApiResponse(data=conversations)


class MessageHistoryView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    def _check_messaging(self, request, partner=None):
        """Enforce messaging entitlement. Returns None if allowed, else Response."""
        from apps.core.entitlement_service import MembershipEntitlementService
        from apps.core.entitlements import entitlement_denial, get_active_entitlements
        from rest_framework.response import Response
        
        # General check if partner is not specified
        if not partner:
            entitlements = get_active_entitlements(request.user)
            if not entitlements.can_chat:
                return Response(entitlement_denial(entitlements, 'can_chat'), status=status.HTTP_403_FORBIDDEN)
            return None

        allowed, reason = MembershipEntitlementService.can_message(request.user, partner)
        if not allowed:
            if reason == 'messaging_not_included':
                return Response(
                    entitlement_denial(get_active_entitlements(request.user), 'can_chat'),
                    status=status.HTTP_403_FORBIDDEN,
                )
            code = reason
            message = "Messaging is not available in your current membership plan."
            if code == "messaging_not_included":
                message = "Messaging is not included in your Free membership."
            elif code == "messaging_requires_mutual_interest":
                message = "Messaging is only available after mutual interest acceptance."
            elif code == "messaging_blocked":
                message = "Messaging is not available."
            elif code == "target_ineligible":
                message = "This member is not eligible or available."

            return Response(
                data={
                    "code": code,
                    "message": message
                },
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def _partner(self, user_id):
        filters = {
            'pk': user_id,
            'is_active': True,
            'deleted_at__isnull': True,
            'account_status': Member.AccountStatus.ACTIVE,
            'is_hidden': False,
        }
        if getattr(settings, 'REQUIRE_MEMBER_VERIFICATION', False):
            filters['profile_status'] = Member.ProfileStatus.APPROVED
        return get_object_or_404(Member, **filters)

    def get(self, request, user_id):
        partner = self._partner(user_id)
        block = self._check_messaging(request, partner)
        if block:
            return block
        queryset = ChatMessage.objects.filter(
            Q(sender=request.user, receiver=partner) | Q(sender=partner, receiver=request.user)
        )
        queryset.filter(sender=partner, receiver=request.user, is_read=False).update(is_read=True)
        return ApiResponse(data=ChatMessageSerializer(queryset, many=True).data)

    def post(self, request, user_id):
        partner = self._partner(user_id)
        block = self._check_messaging(request, partner)
        if block:
            return block
        text = str(request.data.get('text', '')).strip()
        if not text:
            return bad_request('Message text is required.')
        message = ChatMessage.objects.create(sender=request.user, receiver=partner, text=text)
        return ApiResponse(data=ChatMessageSerializer(message).data, status=status.HTTP_201_CREATED)


class CompatibilityCheckView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    def post(self, request):
        target_id = request.data.get('member_id') or request.data.get('profile_id')
        if not target_id:
            return bad_request('member_id is required.')
        target = get_object_or_404(Member, pk=target_id, is_active=True, deleted_at__isnull=True)
        score = 50
        try:
            own = request.user.preferences
            profile = target.profile
            score += 10 if not own.preferred_religion or own.preferred_religion.lower() == profile.religion.lower() else 0
            score += 10 if not own.preferred_location or own.preferred_location.lower() in profile.work_location.lower() else 0
            score += 10 if not own.preferred_education or own.preferred_education.lower() in profile.highest_education.lower() else 0
        except Exception:
            pass
        return ApiResponse(data={'member_id': str(target.pk), 'compatibility': min(score, 100)})


class MemberSupportTicketListView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def get(self, request):
        queryset = SupportTicket.objects.filter(member=request.user).select_related('category', 'current_assignee')
        requested_status = request.query_params.get('status')
        if requested_status:
            queryset = queryset.filter(status=requested_status)
        return paginated_response(request, queryset, SupportTicketSerializer)

    @transaction.atomic
    def post(self, request):
        serializer = MemberTicketCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        category_value = values.pop('category')
        category = SupportCategory.objects.filter(
            Q(code__iexact=category_value) | Q(name__iexact=category_value),
            is_active=True,
        ).first()
        if not category:
            return bad_request('Choose a valid support category.')
        attachment = values.pop('attachment', None)
        from apps.core.entitlements import get_active_entitlements
        if get_active_entitlements(request.user).priority_support:
            values['priority'] = SupportTicket.Priority.HIGH
        ticket = SupportTicket.objects.create(
            member=request.user,
            created_by_member=request.user,
            category=category,
            source=SupportTicket.Source.WEB,
            **values,
        )
        if attachment:
            create_ticket_attachment(ticket=ticket, upload=attachment, member=request.user)
        return ApiResponse(
            data=SupportTicketSerializer(ticket, context={'request': request}).data,
            message='Support ticket created.',
            status=status.HTTP_201_CREATED,
        )


class MemberSupportTicketDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)
    parser_classes = (JSONParser, FormParser, MultiPartParser)

    def _ticket(self, request, pk):
        return get_object_or_404(
            SupportTicket.objects.select_related('category', 'current_assignee').prefetch_related('replies', 'status_history'),
            pk=pk,
            member=request.user,
        )

    def get(self, request, pk):
        ticket = self._ticket(request, pk)
        return ApiResponse(
            data=SupportTicketSerializer(ticket, context={'request': request, 'include_replies': True}).data
        )

    @transaction.atomic
    def post(self, request, pk):
        ticket = self._ticket(request, pk)
        action = request.query_params.get('action') or request.data.get('action')
        if action == 'reply':
            return self._reply(request, ticket)
        if action == 'reopen':
            return self._reopen(request, ticket)
        if action == 'confirm-resolution':
            return self._confirm_resolution(request, ticket)
        return bad_request('Unsupported ticket action.')

    def _reply(self, request, ticket):
        if ticket.status == SupportTicket.Status.CLOSED:
            return bad_request('Reopen the ticket before replying.')
        serializer = TicketReplyInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attachment = serializer.validated_data.get('attachment')
        reply = SupportTicketReply.objects.create(
            ticket=ticket,
            member_sender=request.user,
            message=serializer.validated_data['message'],
            is_public=True,
        )
        if attachment:
            create_ticket_attachment(
                ticket=ticket, reply=reply, upload=attachment, member=request.user
            )
        old_status = ticket.status
        if ticket.status == SupportTicket.Status.WAITING_FOR_MEMBER:
            ticket.status = SupportTicket.Status.IN_PROGRESS
            TicketStatusHistory.objects.create(
                ticket=ticket,
                old_status=old_status,
                new_status=ticket.status,
                changed_by_member=request.user,
                reason='Member replied',
            )
        ticket.last_reply_at = timezone.now()
        ticket.save(update_fields=('status', 'last_reply_at', 'updated_at'))
        if ticket.current_assignee_id:
            notify(
                ticket.current_assignee,
                notification_type='TICKET_REPLIED',
                title=f'Member replied to {ticket.ticket_number}',
                message=ticket.subject,
                related_object=ticket,
                priority=ticket.priority,
            )
        return ApiResponse(
            data=SupportTicketReplySerializer(reply).data,
            message='Reply sent.',
            status=status.HTTP_201_CREATED,
        )

    def _reopen(self, request, ticket):
        if ticket.status not in {SupportTicket.Status.RESOLVED, SupportTicket.Status.CLOSED}:
            return bad_request('Only resolved or closed tickets can be reopened.')
        if ticket.closed_at and ticket.closed_at < timezone.now() - timedelta(days=30):
            return bad_request('Tickets closed for more than 30 days cannot be reopened.')
        old_status = ticket.status
        ticket.status = SupportTicket.Status.REOPENED
        ticket.closed_at = None
        ticket.resolved_at = None
        ticket.save(update_fields=('status', 'closed_at', 'resolved_at', 'updated_at'))
        TicketStatusHistory.objects.create(
            ticket=ticket,
            old_status=old_status,
            new_status=ticket.status,
            changed_by_member=request.user,
            reason='Member reopened ticket',
        )
        if ticket.current_assignee_id:
            notify(
                ticket.current_assignee,
                notification_type='TICKET_REOPENED',
                title=f'{ticket.ticket_number} reopened',
                message=ticket.subject,
                related_object=ticket,
                priority=ticket.priority,
            )
        return ApiResponse(data=SupportTicketSerializer(ticket).data, message='Ticket reopened.')

    def _confirm_resolution(self, request, ticket):
        if ticket.status != SupportTicket.Status.RESOLVED:
            return bad_request('Only a resolved ticket can be confirmed.')
        serializer = TicketFeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        feedback, _ = TicketFeedback.objects.update_or_create(
            ticket=ticket,
            defaults={'member': request.user, **serializer.validated_data},
        )
        old_status = ticket.status
        ticket.status = SupportTicket.Status.CLOSED
        ticket.closed_at = timezone.now()
        ticket.save(update_fields=('status', 'closed_at', 'updated_at'))
        TicketStatusHistory.objects.create(
            ticket=ticket,
            old_status=old_status,
            new_status=ticket.status,
            changed_by_member=request.user,
            reason='Member confirmed resolution',
        )
        return ApiResponse(data=TicketFeedbackSerializer(feedback).data, message='Resolution confirmed.')


class SupportAttachmentDownloadView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, attachment_id):
        attachment = get_object_or_404(
            SupportTicketAttachment.objects.select_related('ticket'),
            pk=attachment_id,
        )
        account_type = str(request.user.account_type)
        allowed = False
        if account_type == AccountType.MEMBER:
            allowed = attachment.ticket.member_id == request.user.pk
        elif account_type == AccountType.CUSTOMER_SUPPORT:
            allowed = attachment.ticket.current_assignee_id == request.user.pk
        elif account_type in {AccountType.ADMIN, AccountType.SUPER_ADMIN}:
            allowed = True
        if not allowed:
            return ApiResponse(success=False, message='Attachment access denied.', status=status.HTTP_403_FORBIDDEN)
        handle = attachment.file_path.open('rb')
        response = FileResponse(handle, content_type=attachment.mime_type)
        response['Content-Disposition'] = f'attachment; filename="{attachment.original_filename}"'
        response['X-Content-Type-Options'] = 'nosniff'
        return response


class VerificationDocumentDownloadView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, document_id):
        document = get_object_or_404(MemberDocument, pk=document_id)
        account_type = str(request.user.account_type)
        allowed = account_type == AccountType.MEMBER and document.member_id == request.user.pk
        if account_type == AccountType.SUPER_ADMIN:
            allowed = True
        elif account_type == AccountType.ADMIN:
            allowed = request.user.has_admin_permission('verification.view_all')
        elif account_type == AccountType.STAFF:
            allowed = (
                request.user.has_admin_permission('verification.view_assigned')
                and ProfileVerificationAssignment.objects.filter(
                    assigned_to_staff=request.user,
                    is_current=True,
                    verification_request__member_id=document.member_id,
                    verification_request__verification_documents__member_document=document,
                ).exists()
            )
        if not allowed:
            return ApiResponse(
                success=False,
                message='Verification document access denied.',
                status=status.HTTP_403_FORBIDDEN,
            )
        if account_type != AccountType.MEMBER:
            audit(
                request,
                request.user,
                action='VERIFICATION_DOCUMENT_VIEWED',
                module='verification',
                target_type='MEMBER_DOCUMENT',
                target_id=document.pk,
                new_data={'member_id': str(document.member_id)},
            )
        filename = Path(document.file_path.name).name.replace('"', '')
        content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        response = FileResponse(document.file_path.open('rb'), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['X-Content-Type-Options'] = 'nosniff'
        response['Cache-Control'] = 'private, no-store'
        return response


class MemberNotificationListView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    def get(self, request):
        return paginated_response(
            request,
            Notification.objects.filter(member_recipient=request.user),
            NotificationSerializer,
        )


class MemberNotificationUnreadCountView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    def get(self, request):
        count = Notification.objects.filter(member_recipient=request.user, is_read=False).count()
        return ApiResponse(data={'unread_count': count})


class MemberNotificationReadView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    def patch(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, member_recipient=request.user)
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=('is_read', 'read_at'))
        return ApiResponse(data=NotificationSerializer(notification).data)

    def post(self, request, pk=None):
        if pk:
            return self.patch(request, pk)
        Notification.objects.filter(member_recipient=request.user, is_read=False).update(
            is_read=True,
            read_at=timezone.now(),
        )
        return ApiResponse(message='All notifications marked as read.')


class SecurePaymentCreateOrderView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    @extend_schema(
        request=serializers.Serializer,
        responses={201: PaymentSerializer},
        summary="Create a new payment order",
        description="Creates a payment record and returns signature for sandbox verification"
    )
    def post(self, request):
        if str(getattr(settings, 'PAYMENT_MODE', '')).strip().lower() != 'online':
            return ApiResponse(
                success=False,
                message='Online payments are disabled. Submit a membership request for manual approval.',
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        plan_id = request.data.get('plan_id')
        plan_slug = request.data.get('plan_slug')
        if plan_id:
            plan = get_object_or_404(MembershipPlan, pk=plan_id)
        elif plan_slug:
            plan = get_object_or_404(MembershipPlan, slug=plan_slug)
        else:
            return ApiResponse(success=False, message='plan_id or plan_slug is required.', status=status.HTTP_400_BAD_REQUEST)

        client_ref = request.data.get('client_reference') or str(uuid.uuid4())

        payment = Payment.objects.create(
            member=request.user,
            plan=plan,
            amount=plan.price,
            currency='INR',
            gateway=str(request.data.get('gateway', 'manual'))[:50],
            client_reference=client_ref,
        )

        data = PaymentSerializer(payment).data
        data['payment_id'] = str(payment.id)
        data['order_id'] = str(payment.client_reference)

        if (settings.DEBUG or getattr(settings, 'TESTING', False)) and not getattr(settings, 'PAYMENT_GATEWAY_VERIFICATION_SECRET', None):
            secret = "sandbox_secret"
            mock_gateway_ref = f"pay_mock_{uuid.uuid4().hex[:12]}"
            sig = hmac.new(
                secret.encode(),
                f'{payment.client_reference}:{mock_gateway_ref}:{payment.amount}'.encode(),
                hashlib.sha256,
            ).hexdigest()
            data['gateway_reference'] = mock_gateway_ref
            data['gateway_payment_id'] = mock_gateway_ref
            data['verification_signature'] = sig

        return ApiResponse(data=data, message='Payment order created.', status=status.HTTP_201_CREATED)


class SecurePaymentVerifyView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    @extend_schema(
        request=serializers.Serializer,
        responses={200: PaymentSerializer},
        summary="Verify a payment signature",
        description="Verifies the payment gateway signature and activates membership"
    )
    @transaction.atomic
    def post(self, request):
        if str(getattr(settings, 'PAYMENT_MODE', '')).strip().lower() != 'online':
            return ApiResponse(
                success=False,
                message='Online payments are disabled. Submit a membership request for manual approval.',
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        payment_id = request.data.get('payment_id') or request.data.get('order_id')
        payment = get_object_or_404(
            Payment.objects.select_for_update(),
            Q(id=payment_id) | Q(client_reference=payment_id) if payment_id else Q(),
            member=request.user,
        )
        
        if (settings.DEBUG or getattr(settings, 'TESTING', False)) and not getattr(settings, 'PAYMENT_GATEWAY_VERIFICATION_SECRET', None):
            secret = "sandbox_secret"
        else:
            secret = getattr(settings, 'PAYMENT_GATEWAY_VERIFICATION_SECRET', None)
            if not secret:
                return ApiResponse(success=False, message='Payment verification is not configured.', status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        gateway_reference = str(request.data.get('gateway_reference', ''))
        signature = str(request.data.get('signature', ''))

        is_dev_runserver = settings.DEBUG and not getattr(settings, 'TESTING', False)

        if is_dev_runserver:
            if not gateway_reference:
                gateway_reference = f"pay_mock_{uuid.uuid4().hex[:12]}"
            payment.status = Payment.Status.SUCCESS
            payment.gateway_reference = gateway_reference
            payment.save(update_fields=('status', 'gateway_reference', 'updated_at'))
        else:
            expected = hmac.new(
                secret.encode(),
                f'{payment.client_reference}:{gateway_reference}:{payment.amount}'.encode(),
                hashlib.sha256,
            ).hexdigest()
            if not gateway_reference or not hmac.compare_digest(signature, expected):
                payment.status = Payment.Status.FAILED
                payment.save(update_fields=('status', 'updated_at'))
                return ApiResponse(success=False, message='Payment verification failed.', status=status.HTTP_400_BAD_REQUEST)
            payment.status = Payment.Status.SUCCESS
            payment.gateway_reference = gateway_reference
            payment.save(update_fields=('status', 'gateway_reference', 'updated_at'))
        # Payment completion never bypasses account verification.  The
        # development gateway is simulated, but it must follow the same
        # membership lifecycle as a real payment provider.
        is_verified = getattr(request.user, 'are_verification_checks_passed', False)
        duration_days = getattr(payment.plan, 'duration_days', 30)
        
        if is_verified:
            start_date = timezone.now()
            end_date = start_date + timedelta(days=duration_days)
            membership_status = 'ACTIVE'
            is_active = True
        else:
            start_date = None
            end_date = None
            membership_status = 'PENDING_VERIFICATION'
            is_active = False

        membership, _ = MemberMembership.objects.update_or_create(
            member=request.user,
            defaults={
                'plan': payment.plan,
                'start_date': start_date,
                'end_date': end_date,
                'is_active': is_active,
                'status': membership_status,
            },
        )
        payment.membership = membership
        payment.save(update_fields=('membership', 'updated_at'))
        request.user.is_premium = is_active
        request.user.save(update_fields=('is_premium', 'updated_at'))
        return ApiResponse(data=PaymentSerializer(payment).data, message='Payment verified.')


class SecurePaymentWebhookView(APIView):
    permission_classes = (permissions.AllowAny,)

    @extend_schema(
        request=serializers.Serializer,
        responses={200: OpenApiResponse(description="Webhook processed successfully")},
        summary="Payment provider webhook",
        description="Processes webhook notifications from the payment gateway"
    )
    @transaction.atomic
    def post(self, request):
        provider = request.headers.get('X-Payment-Provider', 'razorpay')
        event_id = request.headers.get('X-Event-ID') or request.data.get('event_id')
        event_type = request.data.get('event') or 'payment.captured'
        payload = request.data

        # Duplicate/Idempotency check
        if event_id and PaymentWebhookLog.objects.filter(event_id=event_id).exists():
            PaymentWebhookLog.objects.create(
                provider=provider,
                event_id=f"{event_id}_dup_{uuid.uuid4().hex[:6]}",
                event_type=event_type,
                payload=payload,
                status='DUPLICATE',
                error_message='Duplicate event ignored.'
            )
            return ApiResponse(message='Duplicate event ignored.')

        # Log webhook
        log_entry = PaymentWebhookLog.objects.create(
            provider=provider,
            event_id=event_id,
            event_type=event_type,
            payload=payload,
            status='PENDING'
        )

        try:
            payment_info = payload.get('payload', {}).get('payment', {}) or payload
            payment_id = payment_info.get('payment_id') or payment_info.get('order_id')
            gateway_ref = payment_info.get('gateway_reference') or payment_info.get('gateway_payment_id')

            if payment_id:
                payment = Payment.objects.filter(
                    Q(id=payment_id) | Q(client_reference=payment_id)
                ).select_for_update().first()

                if payment:
                    if payment.status == Payment.Status.PENDING:
                        payment.status = Payment.Status.SUCCESS
                        payment.gateway_reference = gateway_ref or f"pay_web_{uuid.uuid4().hex[:12]}"
                        payment.save(update_fields=('status', 'gateway_reference', 'updated_at'))

                        # Webhooks follow the same verification gate as the
                        # synchronous checkout confirmation above.
                        is_verified = getattr(payment.member, 'are_verification_checks_passed', False)
                        duration_days = getattr(payment.plan, 'duration_days', 30)
                        
                        if is_verified:
                            start_date = timezone.now()
                            end_date = start_date + timedelta(days=duration_days)
                            membership_status = 'ACTIVE'
                            is_active = True
                        else:
                            start_date = None
                            end_date = None
                            membership_status = 'PENDING_VERIFICATION'
                            is_active = False

                        membership, _ = MemberMembership.objects.update_or_create(
                            member=payment.member,
                            defaults={
                                'plan': payment.plan,
                                'start_date': start_date,
                                'end_date': end_date,
                                'is_active': is_active,
                                'status': membership_status,
                            },
                        )
                        payment.membership = membership
                        payment.save(update_fields=('membership', 'updated_at'))

                        # Mark user premium
                        payment.member.is_premium = is_active
                        payment.member.save(update_fields=('is_premium', 'updated_at'))

                        log_entry.status = 'PROCESSED'
                    else:
                        log_entry.status = 'PROCESSED'
                        log_entry.error_message = f"Payment status was already {payment.status}."
                else:
                    log_entry.status = 'FAILED'
                    log_entry.error_message = f"Payment with reference {payment_id} not found."
            else:
                log_entry.status = 'FAILED'
                log_entry.error_message = "No payment identifier found in payload."

        except Exception as e:
            log_entry.status = 'FAILED'
            log_entry.error_message = str(e)
            log_entry.save(update_fields=('status', 'error_message'))
            return bad_request(f'Error processing webhook: {str(e)}')

        log_entry.save(update_fields=('status', 'error_message'))
        return ApiResponse(message='Webhook processed successfully.')


class MemberComplaintListCreateView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    @extend_schema(
        request=MemberComplaintSerializer,
        responses={200: MemberComplaintSerializer(many=True), 201: MemberComplaintSerializer},
        summary="List or raise complaints",
        description="Enables regular members to submit a new complaint or list their past complaints"
    )
    def get(self, request):
        queryset = Complaint.objects.filter(member=request.user)
        return paginated_response(request, queryset, MemberComplaintSerializer)

    def post(self, request):
        serializer = MemberComplaintSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint = serializer.save(member=request.user, status=Complaint.Status.PENDING)
        return ApiResponse(data=MemberComplaintSerializer(complaint).data, message='Complaint submitted.', status=status.HTTP_201_CREATED)


class MemberProfileReportCreateView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    @extend_schema(
        request=MemberProfileReportSerializer,
        responses={201: MemberProfileReportSerializer},
        summary="Report a profile",
        description="Enables regular members to file a safety report against a malicious member profile"
    )
    def post(self, request):
        serializer = MemberProfileReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save(reported_by_member=request.user, status=ProfileReport.Status.PENDING)
        return ApiResponse(data=MemberProfileReportSerializer(report).data, message='Profile report submitted.', status=status.HTTP_201_CREATED)


class PaymentHistoryView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    @extend_schema(
        responses={200: PaymentSerializer(many=True)},
        summary="Payment history",
        description="Lists all past payments for the logged-in member"
    )
    def get(self, request):
        return paginated_response(
            request,
            Payment.objects.filter(member=request.user).select_related('plan'),
            PaymentSerializer,
        )


class MemberMembershipRequestView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    def post(self, request):
        from apps.core.models import MembershipPlan, MembershipRequest
        plan_slug = request.data.get('plan_slug')
        if not plan_slug:
            return ApiResponse(success=False, message='plan_slug is required.', status=status.HTTP_400_BAD_REQUEST)
        
        plan = get_object_or_404(MembershipPlan, slug=plan_slug)
        
        # Check if there is already a pending request for this user across any plan
        existing = MembershipRequest.objects.filter(user=request.user, status='pending').exists()
        if existing:
            return ApiResponse(success=False, message='You already have a pending membership request.', status=status.HTTP_400_BAD_REQUEST)
        
        # Create membership request
        req = MembershipRequest.objects.create(
            user=request.user,
            selected_plan=plan,
            status='pending',
            is_active=False
        )
        
        return ApiResponse(
            data={
                'id': str(req.pk),
                'plan_name': plan.name,
                'plan_slug': plan.slug,
                'status': req.status,
                'requested_at': req.requested_at
            },
            message='Membership request submitted successfully.',
            status=status.HTTP_201_CREATED
        )


class MemberMembershipRequestHistoryView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    def get(self, request):
        from apps.core.models import MembershipRequest
        queryset = MembershipRequest.objects.filter(user=request.user).select_related('selected_plan')
        
        rows = []
        for req in queryset:
            rows.append({
                'id': str(req.pk),
                'plan_name': req.selected_plan.name,
                'plan_slug': req.selected_plan.slug,
                'status': req.status,
                'requested_at': req.requested_at,
                'approved_at': req.approved_at,
                'rejected_at': req.rejected_at,
                'rejection_reason': req.rejection_reason,
                'start_date': req.start_date,
                'expiry_date': req.expiry_date,
                'is_active': req.is_active
            })
        return ApiResponse(data=rows)


class ProfileUnlockDailyUsageView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    def get(self, request):
        from apps.core.services.profile_unlock_service import ProfileUnlockService
        from apps.core.services.interest_service import InterestService
        
        viewer = request.user
        unlock_usage = ProfileUnlockService.get_daily_usage(viewer)
        interest_usage = InterestService.get_daily_usage(viewer)
        
        data = {
            'daily_limit': unlock_usage['daily_limit'],
            'used_today': unlock_usage['used_today'],
            'remaining_today': unlock_usage['remaining_today'],
            'resets_at': unlock_usage['resets_at'],
            'interest_limit': interest_usage['daily_limit'],
            'interest_used_today': interest_usage['used_today'],
            'interest_remaining_today': interest_usage['remaining_today'],
        }
        return ApiResponse(data=data)


class ProfileUnlockHistoryView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsMember)

    def get(self, request):
        from apps.core.models import ProfileUnlock
        unlocks = ProfileUnlock.objects.filter(viewer=request.user).select_related('profile').order_by('-unlocked_at')
        
        data = []
        for u in unlocks:
            data.append({
                'id': str(u.id),
                'profile_id': str(u.profile.id),
                'profile_name': u.profile.full_name or 'Member',
                'unlocked_at': u.unlocked_at.isoformat(),
                'source': u.source or 'search',
            })
            
        return ApiResponse(data=data)
