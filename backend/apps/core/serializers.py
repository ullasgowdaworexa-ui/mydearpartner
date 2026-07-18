from pathlib import Path

from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import Member, MemberPreference, MemberProfile
from apps.profiles.models import ProfilePhoto
from apps.profiles.photo_permissions import can_view_profile_photo
from apps.profiles.serializers import ProfilePhotoSerializer, photo_endpoint_urls

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
    ProfileReport,
    ProfileVerificationAssignment,
    ProfileVerificationHistory,
    ProfileVerificationRequest,
    SuccessStory,
    SupportCategory,
    SupportTicket,
    SupportTicketAttachment,
    SupportTicketReply,
    Testimonial,
    TicketFeedback,
    TicketInternalNote,
    TicketStatusHistory,
)


MAX_PRIVATE_UPLOAD_SIZE = 10 * 1024 * 1024
ALLOWED_ATTACHMENT_MIME_TYPES = {
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
}
ALLOWED_ATTACHMENT_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.webp', '.txt'}


def member_summary(member, *, include_contact=False):
    if member is None:
        return None
    result = {
        'id': str(member.pk),
        'full_name': member.get_full_name(),
        'first_name': member.first_name,
        'last_name': member.last_name,
    }
    if include_contact:
        result.update(email=member.email, mobile_number=member.mobile_number)
    return result


def administrative_summary(account):
    if account is None:
        return None
    return {
        'id': str(account.pk),
        'full_name': account.get_full_name(),
        'email': account.email,
        'account_type': str(account.account_type),
        'role': account.admin_role_code,
    }


def validate_private_attachment(upload):
    if upload is None:
        return None
    if upload.size > MAX_PRIVATE_UPLOAD_SIZE:
        raise serializers.ValidationError('Attachments must be 10 MB or smaller.')
    extension = Path(upload.name).suffix.lower()
    if extension not in ALLOWED_ATTACHMENT_EXTENSIONS:
        raise serializers.ValidationError('Unsupported attachment file type.')
    mime_type = (getattr(upload, 'content_type', '') or '').lower()
    if mime_type not in ALLOWED_ATTACHMENT_MIME_TYPES:
        raise serializers.ValidationError('Unsupported attachment MIME type.')
    return upload


class MembershipPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipPlan
        fields = '__all__'


class MemberMembershipSerializer(serializers.ModelSerializer):
    plan = MembershipPlanSerializer(read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_slug = serializers.CharField(source='plan.slug', read_only=True)

    class Meta:
        model = MemberMembership
        fields = (
            'id', 'member', 'plan', 'plan_name', 'plan_slug', 'start_date', 'end_date',
            'started_at', 'expires_at', 'is_active', 'status', 'created_at'
        )
        read_only_fields = ('id', 'member')


class SuccessStorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SuccessStory
        fields = '__all__'


class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = '__all__'


class BlogPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogPost
        fields = '__all__'


class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = '__all__'


class ContactEnquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactEnquiry
        fields = ('id', 'name', 'email', 'phone', 'subject', 'message', 'created_at')
        read_only_fields = ('id', 'created_at')


class MemberPublicSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    age = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    photo_visibility = serializers.SerializerMethodField()
    photos = serializers.SerializerMethodField()
    is_verified = serializers.BooleanField(read_only=True)
    height = serializers.SerializerMethodField()
    religion = serializers.SerializerMethodField()
    mother_tongue = serializers.SerializerMethodField()
    caste = serializers.SerializerMethodField()
    highest_education = serializers.SerializerMethodField()
    occupation = serializers.SerializerMethodField()
    annual_income = serializers.SerializerMethodField()
    work_location = serializers.SerializerMethodField()
    about = serializers.SerializerMethodField()
    family_type = serializers.SerializerMethodField()
    marital_status = serializers.SerializerMethodField()
    hobbies = serializers.SerializerMethodField()
    compatibility = serializers.SerializerMethodField()
    pref_about = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = (
            'id', 'full_name', 'age', 'gender', 'photo', 'photo_visibility', 'photos', 'is_verified', 'is_premium',
            'height', 'religion', 'mother_tongue', 'caste', 'highest_education',
            'occupation', 'annual_income', 'work_location', 'about', 'family_type',
            'marital_status', 'hobbies', 'compatibility', 'pref_about',
            'chat_public_key',
        )

    def get_age(self, obj):
        if not obj.date_of_birth:
            return None
        today = timezone.localdate()
        born = obj.date_of_birth
        return today.year - born.year - ((today.month, today.day) < (born.month, born.day))

    def _profile_value(self, obj, field, default=''):
        try:
            return getattr(obj.profile, field, default)
        except MemberProfile.DoesNotExist:
            return default

    def _get_viewer(self):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return request.user
        return None

    @staticmethod
    def _approved_photos(obj):
        """Use the existing byte-deferred prefetch for discovery results."""
        prefetched = getattr(obj, '_prefetched_objects_cache', {}).get('profile_photos')
        if prefetched is not None:
            return sorted(
                (
                    photo
                    for photo in prefetched
                    if photo.status == ProfilePhoto.Status.APPROVED
                ),
                key=lambda photo: (photo.display_order, photo.created_at),
            )
        return list(
            ProfilePhoto.objects.without_binary()
            .filter(user=obj, status=ProfilePhoto.Status.APPROVED)
            .order_by('display_order', 'created_at')
        )

    def get_photo(self, obj):
        """Return a thumbnail endpoint, never image binary or a media URL."""
        approved = self._approved_photos(obj)
        photo = next((item for item in approved if item.is_primary), None)
        viewer = self._get_viewer()
        # Do not advertise a private endpoint that will reject the current
        # viewer. Discovery cards use the null value to show their neutral
        # placeholder instead of triggering noisy 403 thumbnail requests.
        if not photo or not can_view_profile_photo(viewer, photo):
            return None
        urls = photo_endpoint_urls(photo)
        return urls['thumbnail_url']

    def get_photo_visibility(self, obj):
        """Tell discovery clients why a profile card has no photo URL."""
        photos = getattr(obj, '_prefetched_objects_cache', {}).get('profile_photos')
        if photos is None:
            photos = ProfilePhoto.objects.without_binary().filter(user=obj)
        if any(photo.status == ProfilePhoto.Status.PENDING for photo in photos):
            return 'pending_approval'
        return 'visible' if self.get_photo(obj) else 'unavailable'

    def get_photos(self, obj):
        """Return all approved photos for Gold+ members, only primary for FREE."""
        from apps.core.entitlement_service import MembershipEntitlementService
        viewer = self._get_viewer()
        approved_photos = [
            photo for photo in self._approved_photos(obj)
            if can_view_profile_photo(viewer, photo)
        ]
        if viewer is None:
            return []  # Not authenticated — no photos in list context

        photo_mode = MembershipEntitlementService.get_photo_access_mode(viewer)
        if photo_mode == 'PRIMARY_ONLY':
            # FREE: only primary photo
            primary = next((item for item in approved_photos if item.is_primary), None)
            if not primary:
                return []
            urls = photo_endpoint_urls(primary)
            return [{
                'id': str(primary.pk),
                'image_url': urls['image_url'],
                'thumbnail_url': urls['thumbnail_url'],
                'url': urls['image_url'],  # legacy compat
                'is_primary': True,
                'display_order': primary.display_order,
            }]

        return [
            {
                'id': str(p.pk),
                'image_url': photo_endpoint_urls(p)['image_url'],
                'thumbnail_url': photo_endpoint_urls(p)['thumbnail_url'],
                'url': photo_endpoint_urls(p)['image_url'],  # legacy compat
                'is_primary': p.is_primary,
                'display_order': p.display_order,
            }
            for p in approved_photos
        ]

    def get_height(self, obj): return self._profile_value(obj, 'height')
    def get_religion(self, obj): return self._profile_value(obj, 'religion')
    def get_mother_tongue(self, obj): return self._profile_value(obj, 'mother_tongue')
    def get_caste(self, obj): return self._profile_value(obj, 'caste')
    def get_highest_education(self, obj): return self._profile_value(obj, 'highest_education')
    def get_occupation(self, obj): return self._profile_value(obj, 'occupation')
    def get_annual_income(self, obj): return self._profile_value(obj, 'annual_income')
    def get_work_location(self, obj): return self._profile_value(obj, 'work_location')
    def get_about(self, obj): return self._profile_value(obj, 'about')
    def get_family_type(self, obj): return self._profile_value(obj, 'family_type')
    def get_marital_status(self, obj): return self._profile_value(obj, 'marital_status')
    def get_hobbies(self, obj): return self._profile_value(obj, 'hobbies', [])
    def get_compatibility(self, obj): return self._profile_value(obj, 'compatibility', 0)

    def get_pref_about(self, obj):
        try:
            return obj.preferences.additional_expectations
        except MemberPreference.DoesNotExist:
            return ''

    def to_representation(self, instance):
        data = super().to_representation(instance)
        viewer = self._get_viewer()
        if viewer is None:
            return data

        from apps.core.models import ProfileUnlock
        from apps.core.entitlement_service import MembershipEntitlementService
        import zoneinfo
        kolkata_tz = zoneinfo.ZoneInfo("Asia/Kolkata")
        today = timezone.now().astimezone(kolkata_tz).date()

        data['is_unlocked'] = ProfileUnlock.objects.filter(
            viewer=viewer,
            profile=instance,
            usage_date=today
        ).exists()

        allowed, contact_mode = MembershipEntitlementService.can_view_contact(viewer, instance)
        if allowed:
            data['email'] = instance.email
            data['mobile_number'] = instance.mobile_number
        else:
            # Surface a plan-locked indicator instead of null to help the frontend
            if contact_mode == 'MUTUAL_ONLY':
                data['contact_locked'] = 'Accept each other\'s interest to unlock contact details.'
            else:
                data['contact_locked'] = 'Upgrade to Platinum or Elite to view contact details.'
        return data


class InterestSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    receiver = serializers.SerializerMethodField()

    class Meta:
        model = Interest
        fields = ('id', 'sender', 'receiver', 'status', 'created_at', 'updated_at')

    def get_sender(self, obj):
        return MemberPublicSerializer(obj.sender, context=self.context).data

    def get_receiver(self, obj):
        return MemberPublicSerializer(obj.receiver, context=self.context).data


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.UUIDField(read_only=True)
    receiver_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = ChatMessage
        fields = ('id', 'sender_id', 'receiver_id', 'text', 'is_read', 'created_at')


class SupportCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportCategory
        fields = ('id', 'code', 'name', 'description')


class SupportTicketReplySerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    sender = serializers.SerializerMethodField()
    is_internal_note = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicketReply
        fields = ('id', 'author', 'sender', 'message', 'is_public', 'is_internal_note', 'created_at', 'updated_at')

    def get_author(self, obj):
        if obj.member_sender_id:
            return member_summary(obj.member_sender)
        return administrative_summary(obj.support_sender)

    def get_sender(self, obj):
        return self.get_author(obj)

    def get_is_internal_note(self, _obj):
        return False


class TicketInternalNoteSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = TicketInternalNote
        fields = ('id', 'author', 'note', 'created_at', 'updated_at')

    def get_author(self, obj):
        return administrative_summary(obj.support_agent or obj.admin or obj.super_admin)


class TicketStatusHistorySerializer(serializers.ModelSerializer):
    changed_by = serializers.SerializerMethodField()

    class Meta:
        model = TicketStatusHistory
        fields = ('id', 'old_status', 'new_status', 'changed_by', 'reason', 'created_at')

    def get_changed_by(self, obj):
        if obj.changed_by_member_id:
            return member_summary(obj.changed_by_member)
        return administrative_summary(
            obj.changed_by_support or obj.changed_by_admin or obj.changed_by_super_admin
        )


class SupportTicketSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    member = serializers.SerializerMethodField()
    category = serializers.CharField(source='category.code', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    assigned_to = serializers.SerializerMethodField()
    current_assignee = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    message = serializers.CharField(source='description', read_only=True)
    reply_count = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    status_history = TicketStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = SupportTicket
        fields = (
            'id', 'ticket_number', 'user', 'member', 'category', 'category_name',
            'subject', 'description', 'message', 'priority', 'status', 'source',
            'assigned_to', 'current_assignee', 'created_by', 'related_payment_id',
            'related_profile_id', 'first_response_at', 'resolved_at', 'closed_at',
            'last_reply_at', 'reply_count', 'replies', 'status_history',
            'created_at', 'updated_at',
        )

    def get_user(self, obj):
        return member_summary(obj.member, include_contact=self.context.get('include_contact', False))

    def get_member(self, obj):
        return self.get_user(obj)

    def get_assigned_to(self, obj):
        return administrative_summary(obj.current_assignee)

    def get_current_assignee(self, obj):
        return self.get_assigned_to(obj)

    def get_created_by(self, obj):
        if obj.created_by_member_id:
            return member_summary(obj.created_by_member)
        return administrative_summary(obj.created_by_support)

    def get_reply_count(self, obj):
        return obj.replies.filter(is_public=True).count()

    def get_replies(self, obj):
        if not self.context.get('include_replies'):
            return []
        replies = obj.replies.filter(is_public=True).select_related('member_sender', 'support_sender')
        return SupportTicketReplySerializer(replies, many=True).data


class MemberTicketCreateSerializer(serializers.Serializer):
    category = serializers.CharField(max_length=50)
    subject = serializers.CharField(max_length=255)
    description = serializers.CharField()
    priority = serializers.ChoiceField(choices=SupportTicket.Priority.choices, default=SupportTicket.Priority.NORMAL)
    attachment = serializers.FileField(required=False, validators=[validate_private_attachment])


class TicketReplyInputSerializer(serializers.Serializer):
    message = serializers.CharField()
    attachment = serializers.FileField(required=False, validators=[validate_private_attachment])


class TicketFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketFeedback
        fields = ('id', 'rating', 'feedback_text', 'created_at')
        read_only_fields = ('id', 'created_at')


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            'id', 'notification_type', 'title', 'message', 'link_url', 'related_object_type',
            'related_object_id', 'priority', 'is_read', 'read_at', 'created_at',
        )


class PaymentSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)

    class Meta:
        model = Payment
        fields = (
            'id', 'plan_id', 'plan_name', 'client_reference', 'amount', 'currency',
            'status', 'gateway', 'gateway_reference', 'refund_status',
            'refunded_amount', 'created_at', 'updated_at',
        )


class VerificationAssignmentSerializer(serializers.ModelSerializer):
    assigned_to_staff = serializers.SerializerMethodField()

    class Meta:
        model = ProfileVerificationAssignment
        fields = ('id', 'assigned_to_staff', 'assigned_at', 'completed_at', 'is_current')

    def get_assigned_to_staff(self, obj):
        return administrative_summary(obj.assigned_to_staff)


class VerificationHistorySerializer(serializers.ModelSerializer):
    changed_by = serializers.SerializerMethodField()

    class Meta:
        model = ProfileVerificationHistory
        fields = ('id', 'old_status', 'new_status', 'changed_by', 'reason', 'created_at')

    def get_changed_by(self, obj):
        return administrative_summary(
            obj.changed_by_staff or obj.changed_by_admin or obj.changed_by_super_admin
        )


class ProfileVerificationSerializer(serializers.ModelSerializer):
    member = serializers.SerializerMethodField()
    current_assignment = serializers.SerializerMethodField()
    profile_photos = serializers.SerializerMethodField()
    verification_documents = serializers.SerializerMethodField()
    history = VerificationHistorySerializer(many=True, read_only=True)

    class Meta:
        model = ProfileVerificationRequest
        fields = (
            'id', 'member', 'verification_type', 'status', 'priority',
            'submitted_at', 'reviewed_at', 'approved_at', 'rejected_at',
            'rejection_reason', 'escalation_reason', 'current_assignment',
            'profile_photos', 'verification_documents', 'history', 'created_at', 'updated_at',
        )

    def get_member(self, obj):
        return member_summary(obj.member, include_contact=True)

    def get_current_assignment(self, obj):
        assignment = obj.assignments.filter(is_current=True).select_related('assigned_to_staff').first()
        return VerificationAssignmentSerializer(assignment).data if assignment else None

    def get_profile_photos(self, obj):
        """Expose binary-free, actionable photos on photo-verification work only."""
        if obj.verification_type != ProfileVerificationRequest.VerificationType.PROFILE_PHOTO:
            return []
        photos = (
            ProfilePhoto.objects.without_binary()
            .filter(user_id=obj.member_id, status=ProfilePhoto.Status.PENDING)
            .order_by('display_order', 'created_at')
        )
        return ProfilePhotoSerializer(photos, many=True, context=self.context).data

    def get_verification_documents(self, obj):
        """Return only documents explicitly attached to this document review."""
        if obj.verification_type != ProfileVerificationRequest.VerificationType.IDENTITY_DOCUMENT:
            return []
        from apps.accounts.serializers import MemberDocumentSerializer

        documents = [link.member_document for link in obj.verification_documents.select_related('member_document')]
        return MemberDocumentSerializer(documents, many=True, context=self.context).data


class SupportAttachmentSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicketAttachment
        fields = ('id', 'original_filename', 'mime_type', 'file_size', 'download_url', 'created_at')

    def get_download_url(self, obj):
        request = self.context.get('request')
        path = f'/api/v1/support/attachments/{obj.pk}/download/'
        return request.build_absolute_uri(path) if request else path


class MemberComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = ('id', 'subject', 'description', 'status', 'created_at', 'updated_at')
        read_only_fields = ('id', 'status', 'created_at', 'updated_at')


class MemberProfileReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileReport
        fields = ('id', 'reported_member', 'reason', 'details', 'status', 'created_at', 'updated_at')
        read_only_fields = ('id', 'status', 'created_at', 'updated_at')
