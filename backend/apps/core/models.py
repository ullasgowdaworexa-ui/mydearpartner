import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.accounts.storage import private_media_storage


class MembershipPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    slug = models.SlugField(max_length=50, unique=True, db_index=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration = models.CharField(max_length=50)
    features = models.JSONField(default=list)
    highlighted = models.BooleanField(default=False)
    badge = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=200, blank=True)
    
    # New fields requested for database-driven entitlements
    display_name = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    currency = models.CharField(max_length=10, default='INR')
    duration_days = models.IntegerField(default=30)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    display_order = models.IntegerField(default=0)
    
    # Entitlement parameters (compat and detailed)
    profile_view_limit_daily = models.IntegerField(default=10)
    interest_limit_daily = models.IntegerField(default=3)
    message_limit_daily = models.IntegerField(default=0)
    
    daily_profile_unlock_limit = models.IntegerField(null=True, blank=True)
    monthly_profile_unlock_limit = models.IntegerField(null=True, blank=True)
    interest_limit = models.IntegerField(null=True, blank=True)
    daily_message_limit = models.IntegerField(null=True, blank=True)
    contact_unlock_limit = models.IntegerField(null=True, blank=True)
    
    can_send_interest = models.BooleanField(default=True)
    can_message = models.BooleanField(default=False)
    can_view_contact = models.BooleanField(default=False)
    can_view_private_photos = models.BooleanField(default=False)
    can_view_profile_visitors = models.BooleanField(default=False)
    can_get_priority_listing = models.BooleanField(default=False)
    can_use_profile_boost = models.BooleanField(default=False)
    
    # Access choices
    contact_access_mode = models.CharField(
        max_length=20, 
        choices=[('NONE', 'None'), ('MUTUAL_ONLY', 'Mutual Only'), ('FULL', 'Full')], 
        default='NONE'
    )
    photo_access_mode = models.CharField(
        max_length=20, 
        choices=[('PRIMARY_ONLY', 'Primary Only'), ('ALL_APPROVED', 'All Approved')], 
        default='PRIMARY_ONLY'
    )
    messaging_mode = models.CharField(
        max_length=20,
        choices=[('DISABLED', 'disabled'), ('MUTUAL_ONLY', 'mutual_only'), ('ENABLED', 'enabled')],
        default='DISABLED'
    )
    
    # Flags & Priorities
    can_use_advanced_search = models.BooleanField(default=False)
    can_use_horoscope = models.BooleanField(default=False)
    profile_boost_level = models.CharField(max_length=20, default='NONE') # e.g. NONE, MEDIUM, STRONG
    support_priority = models.CharField(max_length=20, default='STANDARD') # e.g. STANDARD, HIGH
    
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        db_table = 'membership_plans'

    def __str__(self):
        return f'{self.name} ({self.currency} {self.price})'


class MemberMembership(models.Model):
    class MembershipStatus(models.TextChoices):
        FREE = 'FREE', 'Free'
        PAYMENT_PENDING = 'PAYMENT_PENDING', 'Payment Pending'
        PENDING_VERIFICATION = 'PENDING_VERIFICATION', 'Pending Verification'
        ACTIVE = 'ACTIVE', 'Active'
        EXPIRED = 'EXPIRED', 'Expired'
        CANCELLED = 'CANCELLED', 'Cancelled'
        REFUNDED = 'REFUNDED', 'Refunded'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='membership',
    )
    plan = models.ForeignKey(MembershipPlan, on_delete=models.SET_NULL, null=True, blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    status = models.CharField(
        max_length=30,
        choices=MembershipStatus.choices,
        default=MembershipStatus.FREE,
        db_index=True,
    )

    class Meta:
        db_table = 'member_memberships'


class MembershipRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        ACTIVE = 'active', 'Active'
        EXPIRED = 'expired', 'Expired'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='membership_requests',
    )
    selected_plan = models.ForeignKey(
        MembershipPlan,
        on_delete=models.CASCADE,
        related_name='membership_requests',
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by_id = models.UUIDField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejected_by_id = models.UUIDField(null=True, blank=True)

    @property
    def approved_by(self):
        from apps.accounts.models import Admin, SuperAdmin
        if not self.approved_by_id:
            return None
        return Admin.objects.filter(pk=self.approved_by_id).first() or SuperAdmin.objects.filter(pk=self.approved_by_id).first()

    @approved_by.setter
    def approved_by(self, value):
        self.approved_by_id = value.pk if value else None

    @property
    def rejected_by(self):
        from apps.accounts.models import Admin, SuperAdmin
        if not self.rejected_by_id:
            return None
        return Admin.objects.filter(pk=self.rejected_by_id).first() or SuperAdmin.objects.filter(pk=self.rejected_by_id).first()

    @rejected_by.setter
    def rejected_by(self, value):
        self.rejected_by_id = value.pk if value else None
    rejection_reason = models.TextField(blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    expiry_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=False)

    class Meta:
        db_table = 'membership_requests'
        ordering = ['-requested_at']





class Interest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        DECLINED = 'DECLINED', 'Declined'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_interests',
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_interests',
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'interests'
        constraints = [
            models.UniqueConstraint(
                fields=('sender', 'receiver'),
                name='unique_sender_receiver_interest',
            ),
            models.CheckConstraint(
                check=~Q(sender=models.F('receiver')),
                name='interest_sender_not_receiver',
            ),
        ]


class ChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages',
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_messages',
    )
    text = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'chat_messages'
        ordering = ('created_at',)
        indexes = [
            models.Index(
                fields=('sender', 'receiver', 'created_at'),
                name='chat_sender_recv_created_idx',
            ),
        ]


class SuccessStory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    couple_names = models.CharField(max_length=100)
    photo = models.ImageField(upload_to='stories/', blank=True, null=True)
    story = models.TextField()
    date = models.CharField(max_length=30)
    location = models.CharField(max_length=100)
    rating = models.PositiveSmallIntegerField(default=5)

    class Meta:
        db_table = 'success_stories'


class Testimonial(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    photo = models.ImageField(upload_to='testimonials/', blank=True, null=True)
    text = models.TextField()
    rating = models.PositiveSmallIntegerField(default=5)
    plan = models.CharField(max_length=50)

    class Meta:
        db_table = 'testimonials'


class BlogPost(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    excerpt = models.TextField()
    image = models.ImageField(upload_to='blog/', blank=True, null=True)
    date = models.CharField(max_length=30)
    author = models.CharField(max_length=100)
    category = models.CharField(max_length=50)

    class Meta:
        db_table = 'blog_posts'


class FAQ(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.CharField(max_length=255)
    answer = models.TextField()

    class Meta:
        db_table = 'faqs'


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SUCCESS = 'SUCCESS', 'Successful'
        FAILED = 'FAILED', 'Failed'
        REFUNDED = 'REFUNDED', 'Refunded'
        PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED', 'Partially refunded'

    class RefundStatus(models.TextChoices):
        NONE = 'NONE', 'None'
        REQUESTED = 'REQUESTED', 'Requested'
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='payments',
    )
    membership = models.ForeignKey(
        MemberMembership,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
    )
    plan = models.ForeignKey(MembershipPlan, on_delete=models.PROTECT, null=True, related_name='payments')
    client_reference = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PENDING, db_index=True)
    gateway = models.CharField(max_length=50, blank=True)
    gateway_reference = models.CharField(max_length=120, blank=True, null=True, unique=True)
    refunded_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refund_status = models.CharField(
        max_length=12,
        choices=RefundStatus.choices,
        default=RefundStatus.NONE,
        db_index=True,
    )
    refund_reason = models.TextField(blank=True)
    refund_reference = models.CharField(max_length=120, blank=True)
    refund_requested_at = models.DateTimeField(null=True, blank=True)
    refunded_by_admin = models.ForeignKey(
        'accounts.Admin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_refunds',
    )
    refunded_by_super_admin = models.ForeignKey(
        'accounts.SuperAdmin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_refunds',
    )
    refunded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments'
        ordering = ('-created_at',)


class RefundRequest(models.Model):
    class Status(models.TextChoices):
        REQUESTED = 'REQUESTED', 'Requested'
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.PROTECT, related_name='refund_requests')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    idempotency_key = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    gateway_reference = models.CharField(max_length=120, blank=True)
    error_message = models.TextField(blank=True)
    requested_by_member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='refund_requests',
    )
    processed_by_admin = models.ForeignKey(
        'accounts.Admin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='refund_requests_processed',
    )
    processed_by_super_admin = models.ForeignKey(
        'accounts.SuperAdmin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='refund_requests_processed',
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'refund_requests'
        ordering = ('-created_at',)


class SupportCategory(models.Model):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'support_categories'
        ordering = ('name',)

    def __str__(self):
        return self.name


class SupportSlaRule(models.Model):
    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        NORMAL = 'NORMAL', 'Normal'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    category = models.ForeignKey(SupportCategory, on_delete=models.CASCADE, related_name='sla_rules')
    priority = models.CharField(max_length=10, choices=Priority.choices)
    first_response_minutes = models.PositiveIntegerField(default=240)
    resolution_minutes = models.PositiveIntegerField(default=2880)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'support_sla_rules'
        constraints = [
            models.UniqueConstraint(
                fields=('category', 'priority'),
                name='unique_support_sla_category_priority',
            ),
        ]


class SupportTicket(models.Model):
    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        NORMAL = 'NORMAL', 'Normal'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        UNASSIGNED = 'UNASSIGNED', 'Unassigned'
        ASSIGNED = 'ASSIGNED', 'Assigned'
        IN_PROGRESS = 'IN_PROGRESS', 'In progress'
        WAITING_FOR_MEMBER = 'WAITING_FOR_MEMBER', 'Waiting for member'
        WAITING_FOR_INTERNAL = 'WAITING_FOR_INTERNAL', 'Waiting for internal'
        ESCALATED = 'ESCALATED', 'Escalated'
        RESOLVED = 'RESOLVED', 'Resolved'
        CLOSED = 'CLOSED', 'Closed'
        REOPENED = 'REOPENED', 'Reopened'

    class Source(models.TextChoices):
        WEB = 'WEB', 'Web'
        PHONE = 'PHONE', 'Phone'
        SYSTEM = 'SYSTEM', 'System'
        EMAIL = 'EMAIL', 'Email (disabled)'
        WHATSAPP = 'WHATSAPP', 'WhatsApp (disabled)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_number = models.CharField(max_length=40, unique=True, db_index=True, blank=True)
    member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='support_tickets',
    )
    category = models.ForeignKey(SupportCategory, on_delete=models.PROTECT, related_name='tickets')
    subject = models.CharField(max_length=255)
    description = models.TextField()
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.UNASSIGNED, db_index=True)
    source = models.CharField(max_length=12, choices=Source.choices, default=Source.WEB)
    current_assignee = models.ForeignKey(
        'accounts.CustomerSupportAgent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets',
    )
    created_by_member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='support_tickets_created',
    )
    created_by_support = models.ForeignKey(
        'accounts.CustomerSupportAgent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='support_tickets_created',
    )
    related_payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True)
    related_profile = models.ForeignKey(
        'accounts.MemberProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    first_response_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    last_reply_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'support_tickets'
        ordering = ('-created_at',)

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            self.ticket_number = f'MAT-{timezone.now():%Y%m%d}-{str(self.id).split("-")[0].upper()}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.ticket_number}: {self.subject}'


class TicketAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='assignments')
    assigned_to_support_agent = models.ForeignKey(
        'accounts.CustomerSupportAgent',
        on_delete=models.PROTECT,
        related_name='ticket_assignments',
    )
    assigned_by_admin = models.ForeignKey(
        'accounts.Admin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ticket_assignments_made',
    )
    assigned_by_super_admin = models.ForeignKey(
        'accounts.SuperAdmin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ticket_assignments_made',
    )
    claimed_by_support_agent = models.ForeignKey(
        'accounts.CustomerSupportAgent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ticket_assignments_claimed',
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    unassigned_at = models.DateTimeField(null=True, blank=True)
    assignment_reason = models.TextField(blank=True)
    is_current = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = 'ticket_assignments'
        ordering = ('-assigned_at',)
        constraints = [
            models.UniqueConstraint(
                fields=('ticket',),
                condition=Q(is_current=True),
                name='one_current_ticket_assignment',
            ),
            models.CheckConstraint(
                check=(
                    Q(
                        assigned_by_admin__isnull=False,
                        assigned_by_super_admin__isnull=True,
                        claimed_by_support_agent__isnull=True,
                    )
                    | Q(
                        assigned_by_admin__isnull=True,
                        assigned_by_super_admin__isnull=False,
                        claimed_by_support_agent__isnull=True,
                    )
                    | Q(
                        assigned_by_admin__isnull=True,
                        assigned_by_super_admin__isnull=True,
                        claimed_by_support_agent__isnull=False,
                    )
                ),
                name='ticket_assignment_exactly_one_assigner',
            ),
        ]


class SupportTicketReply(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='replies')
    member_sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='support_replies',
    )
    support_sender = models.ForeignKey(
        'accounts.CustomerSupportAgent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='support_replies',
    )
    message = models.TextField()
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'support_ticket_replies'
        ordering = ('created_at',)
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(member_sender__isnull=False, support_sender__isnull=True)
                    | Q(member_sender__isnull=True, support_sender__isnull=False)
                ),
                name='support_reply_exactly_one_sender',
            ),
        ]


class TicketInternalNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='internal_notes')
    support_agent = models.ForeignKey(
        'accounts.CustomerSupportAgent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ticket_internal_notes',
    )
    admin = models.ForeignKey(
        'accounts.Admin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ticket_internal_notes',
    )
    super_admin = models.ForeignKey(
        'accounts.SuperAdmin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ticket_internal_notes',
    )
    note = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ticket_internal_notes'
        ordering = ('created_at',)
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(support_agent__isnull=False, admin__isnull=True, super_admin__isnull=True)
                    | Q(support_agent__isnull=True, admin__isnull=False, super_admin__isnull=True)
                    | Q(support_agent__isnull=True, admin__isnull=True, super_admin__isnull=False)
                ),
                name='ticket_note_exactly_one_author',
            ),
        ]


class TicketStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=30, choices=SupportTicket.Status.choices)
    new_status = models.CharField(max_length=30, choices=SupportTicket.Status.choices)
    changed_by_admin = models.ForeignKey(
        'accounts.Admin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ticket_status_changes',
    )
    changed_by_support = models.ForeignKey(
        'accounts.CustomerSupportAgent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ticket_status_changes',
    )
    changed_by_super_admin = models.ForeignKey(
        'accounts.SuperAdmin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ticket_status_changes',
    )
    changed_by_member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ticket_status_changes',
    )
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ticket_status_history'
        ordering = ('created_at',)
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(
                        changed_by_admin__isnull=False,
                        changed_by_support__isnull=True,
                        changed_by_super_admin__isnull=True,
                        changed_by_member__isnull=True,
                    )
                    | Q(
                        changed_by_admin__isnull=True,
                        changed_by_support__isnull=False,
                        changed_by_super_admin__isnull=True,
                        changed_by_member__isnull=True,
                    )
                    | Q(
                        changed_by_admin__isnull=True,
                        changed_by_support__isnull=True,
                        changed_by_super_admin__isnull=False,
                        changed_by_member__isnull=True,
                    )
                    | Q(
                        changed_by_admin__isnull=True,
                        changed_by_support__isnull=True,
                        changed_by_super_admin__isnull=True,
                        changed_by_member__isnull=False,
                    )
                ),
                name='ticket_history_exactly_one_actor',
            ),
        ]


class SupportTicketAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='attachments')
    reply = models.ForeignKey(
        SupportTicketReply,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attachments',
    )
    uploaded_by_member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='support_attachments',
    )
    uploaded_by_support = models.ForeignKey(
        'accounts.CustomerSupportAgent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='support_attachments',
    )
    file_path = models.FileField(
        upload_to='support_attachments/',
        storage=private_media_storage,
    )
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    file_size = models.PositiveBigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'support_ticket_attachments'
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(uploaded_by_member__isnull=False, uploaded_by_support__isnull=True)
                    | Q(uploaded_by_member__isnull=True, uploaded_by_support__isnull=False)
                ),
                name='support_attachment_exactly_one_uploader',
            ),
        ]


class TicketFeedback(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.OneToOneField(SupportTicket, on_delete=models.CASCADE, related_name='feedback')
    member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ticket_feedback',
    )
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    feedback_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ticket_feedback'


class ProfileVerificationRequest(models.Model):
    class VerificationType(models.TextChoices):
        FULL_PROFILE = 'FULL_PROFILE', 'Full profile'
        PROFILE_PHOTO = 'PROFILE_PHOTO', 'Profile photo'
        IDENTITY_DOCUMENT = 'IDENTITY_DOCUMENT', 'Identity document'
        PHONE = 'PHONE', 'Phone'
        EMAIL = 'EMAIL', 'Email'
        EDUCATION = 'EDUCATION', 'Education'
        EMPLOYMENT = 'EMPLOYMENT', 'Employment'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ASSIGNED = 'ASSIGNED', 'Assigned'
        IN_REVIEW = 'IN_REVIEW', 'In review'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        RESUBMITTED = 'RESUBMITTED', 'Resubmitted'
        ESCALATED = 'ESCALATED', 'Escalated'

    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        NORMAL = 'NORMAL', 'Normal'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='verification_requests',
    )
    verification_type = models.CharField(max_length=30, choices=VerificationType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    submitted_at = models.DateTimeField(default=timezone.now)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    escalation_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'profile_verification_requests'
        ordering = ('-created_at',)


class ProfileVerificationAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    verification_request = models.ForeignKey(
        ProfileVerificationRequest,
        on_delete=models.CASCADE,
        related_name='assignments',
    )
    assigned_to_staff = models.ForeignKey(
        'accounts.Staff',
        on_delete=models.PROTECT,
        related_name='verification_assignments',
    )
    assigned_by_admin = models.ForeignKey(
        'accounts.Admin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verification_assignments_made',
    )
    assigned_by_super_admin = models.ForeignKey(
        'accounts.SuperAdmin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verification_assignments_made',
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_current = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = 'profile_verification_assignments'
        ordering = ('-assigned_at',)
        constraints = [
            models.UniqueConstraint(
                fields=('verification_request',),
                condition=Q(is_current=True),
                name='one_current_verification_assignment',
            ),
            models.CheckConstraint(
                check=(
                    Q(assigned_by_admin__isnull=False, assigned_by_super_admin__isnull=True)
                    | Q(assigned_by_admin__isnull=True, assigned_by_super_admin__isnull=False)
                    | Q(assigned_by_admin__isnull=True, assigned_by_super_admin__isnull=True)
                ),
                name='verification_assignment_exactly_one_assigner_or_system',
            ),
        ]


class ProfileVerificationHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    verification_request = models.ForeignKey(
        ProfileVerificationRequest,
        on_delete=models.CASCADE,
        related_name='history',
    )
    old_status = models.CharField(max_length=20, choices=ProfileVerificationRequest.Status.choices)
    new_status = models.CharField(max_length=20, choices=ProfileVerificationRequest.Status.choices)
    changed_by_staff = models.ForeignKey(
        'accounts.Staff',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verification_status_changes',
    )
    changed_by_admin = models.ForeignKey(
        'accounts.Admin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verification_status_changes',
    )
    changed_by_super_admin = models.ForeignKey(
        'accounts.SuperAdmin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verification_status_changes',
    )
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'profile_verification_history'
        ordering = ('created_at',)
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(
                        changed_by_staff__isnull=False,
                        changed_by_admin__isnull=True,
                        changed_by_super_admin__isnull=True,
                    )
                    | Q(
                        changed_by_staff__isnull=True,
                        changed_by_admin__isnull=False,
                        changed_by_super_admin__isnull=True,
                    )
                    | Q(
                        changed_by_staff__isnull=True,
                        changed_by_admin__isnull=True,
                        changed_by_super_admin__isnull=False,
                    )
                ),
                name='verification_history_exactly_one_actor',
            ),
        ]


class ProfileVerificationDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    verification_request = models.ForeignKey(
        ProfileVerificationRequest,
        on_delete=models.CASCADE,
        related_name='verification_documents',
    )
    member_document = models.ForeignKey(
        'accounts.MemberDocument',
        on_delete=models.PROTECT,
        related_name='verification_links',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'profile_verification_documents'
        constraints = [
            models.UniqueConstraint(
                fields=('verification_request', 'member_document'),
                name='unique_verification_document_link',
            ),
        ]


class Notification(models.Model):
    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        NORMAL = 'NORMAL', 'Normal'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member_recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
    )
    super_admin_recipient = models.ForeignKey(
        'accounts.SuperAdmin', on_delete=models.CASCADE, null=True, blank=True, related_name='notifications'
    )
    admin_recipient = models.ForeignKey(
        'accounts.Admin', on_delete=models.CASCADE, null=True, blank=True, related_name='notifications'
    )
    staff_recipient = models.ForeignKey(
        'accounts.Staff', on_delete=models.CASCADE, null=True, blank=True, related_name='notifications'
    )
    support_recipient = models.ForeignKey(
        'accounts.CustomerSupportAgent',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
    )
    notification_type = models.CharField(max_length=64, db_index=True)
    title = models.CharField(max_length=255)
    message = models.TextField()
    related_object_type = models.CharField(max_length=64, blank=True)
    related_object_id = models.CharField(max_length=100, blank=True)
    priority = models.CharField(max_length=12, choices=Priority.choices, default=Priority.NORMAL)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'notifications'
        ordering = ('-created_at',)
        constraints = [
            models.CheckConstraint(
                check=(
                    Q(
                        member_recipient__isnull=False,
                        super_admin_recipient__isnull=True,
                        admin_recipient__isnull=True,
                        staff_recipient__isnull=True,
                        support_recipient__isnull=True,
                    )
                    | Q(
                        member_recipient__isnull=True,
                        super_admin_recipient__isnull=False,
                        admin_recipient__isnull=True,
                        staff_recipient__isnull=True,
                        support_recipient__isnull=True,
                    )
                    | Q(
                        member_recipient__isnull=True,
                        super_admin_recipient__isnull=True,
                        admin_recipient__isnull=False,
                        staff_recipient__isnull=True,
                        support_recipient__isnull=True,
                    )
                    | Q(
                        member_recipient__isnull=True,
                        super_admin_recipient__isnull=True,
                        admin_recipient__isnull=True,
                        staff_recipient__isnull=False,
                        support_recipient__isnull=True,
                    )
                    | Q(
                        member_recipient__isnull=True,
                        super_admin_recipient__isnull=True,
                        admin_recipient__isnull=True,
                        staff_recipient__isnull=True,
                        support_recipient__isnull=False,
                    )
                ),
                name='notification_exactly_one_recipient',
            ),
        ]


class ContactEnquiry(models.Model):
    class Status(models.TextChoices):
        NEW = 'NEW', 'New'
        CONTACTED = 'CONTACTED', 'Contacted'
        PENDING = 'PENDING', 'Pending'
        RESOLVED = 'RESOLVED', 'Resolved'
        CLOSED = 'CLOSED', 'Closed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contact_enquiries',
    )
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW, db_index=True)
    assigned_to_support = models.ForeignKey(
        'accounts.CustomerSupportAgent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contact_enquiries',
    )
    internal_notes = models.TextField(blank=True)
    contacted_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'contact_enquiries'
        ordering = ('-created_at',)


class Complaint(models.Model):
    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Under review'
        ESCALATED = 'ESCALATED', 'Escalated'
        RESOLVED = 'RESOLVED', 'Resolved'
        CLOSED = 'CLOSED', 'Closed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='complaints')
    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN, db_index=True)
    assigned_to_staff = models.ForeignKey(
        'accounts.Staff', on_delete=models.SET_NULL, null=True, blank=True, related_name='complaints'
    )
    escalated_to_admin = models.ForeignKey(
        'accounts.Admin', on_delete=models.SET_NULL, null=True, blank=True, related_name='complaints'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'complaints'
        ordering = ('-created_at',)


class ProfileReport(models.Model):
    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Under review'
        ACTIONED = 'ACTIONED', 'Actioned'
        DISMISSED = 'DISMISSED', 'Dismissed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reported_member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile_reports_received',
    )
    reported_by_member = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='profile_reports_made',
    )
    reason = models.CharField(max_length=120)
    details = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN, db_index=True)
    reviewed_by_staff = models.ForeignKey(
        'accounts.Staff', on_delete=models.SET_NULL, null=True, blank=True, related_name='profile_reports'
    )
    reviewed_by_admin = models.ForeignKey(
        'accounts.Admin', on_delete=models.SET_NULL, null=True, blank=True, related_name='profile_reports'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'profile_reports'
        ordering = ('-created_at',)


class PlatformSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)
    updated_by_super_admin = models.ForeignKey(
        'accounts.SuperAdmin', on_delete=models.SET_NULL, null=True, blank=True, related_name='settings_updates'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'platform_settings'
        ordering = ('key',)


class BackupRecord(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requested_by_super_admin = models.ForeignKey(
        'accounts.SuperAdmin', on_delete=models.SET_NULL, null=True, related_name='backup_requests'
    )
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    storage_path = models.CharField(max_length=500, blank=True)
    size_bytes = models.PositiveBigIntegerField(default=0)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'backup_records'
        ordering = ('-created_at',)


# Compatibility alias used only by older display components; no user table is created.
UserMembership = MemberMembership


class PaymentWebhookLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=50)
    event_id = models.CharField(max_length=150, unique=True, null=True, blank=True)
    event_type = models.CharField(max_length=100)
    payload = models.JSONField()
    status = models.CharField(max_length=20, default='PENDING')  # PENDING, PROCESSED, FAILED, DUPLICATE
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_webhook_logs'
        ordering = ('-created_at',)

    def __str__(self):
        return f"{self.provider} Webhook: {self.event_type} ({self.status})"


class WorkAssignment(models.Model):
    class AssignmentType(models.TextChoices):
        PROFILE_VERIFICATION = 'PROFILE_VERIFICATION', 'Profile verification'
        PHOTO_VERIFICATION = 'PHOTO_VERIFICATION', 'Photo verification'
        DOCUMENT_VERIFICATION = 'DOCUMENT_VERIFICATION', 'Document verification'
        COMPLAINT_REVIEW = 'COMPLAINT_REVIEW', 'Complaint review'
        PROFILE_REPORT_REVIEW = 'PROFILE_REPORT_REVIEW', 'Profile report review'
        MODERATION_TASK = 'MODERATION_TASK', 'Moderation task'

    class Status(models.TextChoices):
        UNASSIGNED = 'UNASSIGNED', 'Unassigned'
        ASSIGNED = 'ASSIGNED', 'Assigned'
        IN_PROGRESS = 'IN_PROGRESS', 'In progress'
        WAITING = 'WAITING', 'Waiting'
        ESCALATED = 'ESCALATED', 'Escalated'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        NORMAL = 'NORMAL', 'Normal'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment_type = models.CharField(max_length=40, choices=AssignmentType.choices)
    assigned_to_staff = models.ForeignKey(
        'accounts.Staff',
        on_delete=models.PROTECT,
        related_name='work_assignments',
        null=True,
        blank=True,
    )
    assigned_by_admin = models.ForeignKey(
        'accounts.Admin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='work_assignments_made',
    )
    assigned_by_super_admin = models.ForeignKey(
        'accounts.SuperAdmin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='work_assignments_made',
    )
    related_profile_verification = models.ForeignKey(
        'core.ProfileVerificationRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='work_assignments',
    )
    related_document_verification = models.ForeignKey(
        'accounts.MemberDocument',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='work_assignments',
    )
    related_complaint = models.ForeignKey(
        'core.Complaint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='work_assignments',
    )
    related_profile_report = models.ForeignKey(
        'core.ProfileReport',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='work_assignments',
    )
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.UNASSIGNED, db_index=True)
    due_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'work_assignments'
        ordering = ('-created_at',)

    def clean(self):
        from django.core.exceptions import ValidationError
        targets = [
            self.related_profile_verification_id,
            self.related_document_verification_id,
            self.related_complaint_id,
            self.related_profile_report_id,
        ]
        populated = sum(1 for t in targets if t is not None)
        if populated != 1:
            raise ValidationError('Exactly one target (profile, document, complaint, or profile report) must be associated with the WorkAssignment.')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class ProfileViewLog(models.Model):
    """
    Tracks every time a member views another member's profile.
    Used to enforce daily profile-view limits per membership plan.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    viewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile_views_made',
    )
    viewed = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile_views_received',
    )
    viewed_at = models.DateTimeField(auto_now_add=True, db_index=True)
    view_date = models.DateField(db_index=True, help_text='UTC calendar date of the view.')

    class Meta:
        db_table = 'profile_view_logs'
        ordering = ('-viewed_at',)
        indexes = [
            models.Index(fields=('viewer', 'view_date'), name='profile_view_log_viewer_date'),
        ]
        constraints = [
            models.CheckConstraint(
                check=~models.Q(viewer=models.F('viewed')),
                name='profile_view_log_viewer_not_viewed',
            ),
        ]

    def __str__(self):
        return f'{self.viewer_id} viewed {self.viewed_id} on {self.view_date}'


class ProfileUnlock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    viewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile_unlocks_made',
    )
    profile = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile_unlocks_received',
    )
    membership = models.ForeignKey(
        'core.MemberMembership',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='profile_unlocks',
    )
    unlocked_at = models.DateTimeField(auto_now_add=True)
    usage_date = models.DateField(db_index=True)
    consumed_limit = models.BooleanField(default=True)
    source = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'profile_unlocks'
        ordering = ('-unlocked_at',)
        constraints = [
            models.UniqueConstraint(
                fields=('viewer', 'profile', 'usage_date'),
                name='unique_viewer_profile_usage_date',
            ),
            models.CheckConstraint(
                check=~models.Q(viewer=models.F('profile')),
                name='profile_unlock_viewer_not_profile',
            ),
        ]

    def __str__(self):
        return f'{self.viewer_id} unlocked {self.profile_id} on {self.usage_date}'


class ProfileBlock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blocks_sent',
    )
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blocks_received',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'profile_blocks'
        constraints = [
            models.UniqueConstraint(fields=('blocker', 'blocked'), name='unique_blocker_blocked'),
            models.CheckConstraint(
                check=~models.Q(blocker=models.F('blocked')),
                name='block_blocker_not_blocked',
            ),
        ]

    def __str__(self):
        return f'{self.blocker_id} blocked {self.blocked_id}'


class Specialization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'specializations'
        ordering = ('name',)

    def __str__(self):
        return self.name


class Queue(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'queues'
        ordering = ('name',)

    def __str__(self):
        return self.name


class AssignmentStrategy(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assignment_strategies'
        ordering = ('name',)

    def __str__(self):
        return self.name


class EmployeeAvailability(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        BUSY = 'BUSY', 'Busy'
        OFFLINE = 'OFFLINE', 'Offline'
        LEAVE = 'LEAVE', 'On Leave'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff_member = models.OneToOneField(
        'accounts.Staff',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='availability',
    )
    support_agent = models.OneToOneField(
        'accounts.CustomerSupportAgent',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='availability',
    )
    is_online = models.BooleanField(default=True)
    is_suspended = models.BooleanField(default=False)
    availability_status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.AVAILABLE,
    )
    timezone = models.CharField(max_length=50, default='UTC')
    last_active_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'employee_availabilities'

    @property
    def employee(self):
        return self.staff_member or self.support_agent

    def __str__(self):
        emp = self.employee
        email = emp.email if emp else 'Unknown'
        return f'{email} - {self.availability_status}'


class Workload(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff_member = models.OneToOneField(
        'accounts.Staff',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='workload',
    )
    support_agent = models.OneToOneField(
        'accounts.CustomerSupportAgent',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='workload',
    )
    open_tickets_count = models.IntegerField(default=0)
    urgent_tickets_count = models.IntegerField(default=0)
    open_verifications_count = models.IntegerField(default=0)
    avg_resolution_time_minutes = models.FloatField(default=0.0)
    avg_response_time_minutes = models.FloatField(default=0.0)
    current_workload_score = models.IntegerField(default=0)
    capacity = models.IntegerField(default=10)
    last_assigned_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'workloads'

    @property
    def employee(self):
        return self.staff_member or self.support_agent

    def __str__(self):
        emp = self.employee
        email = emp.email if emp else 'Unknown'
        return f'{email} Workload: {self.current_workload_score}'


class AssignmentRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    department = models.ForeignKey(
        'accounts.Department',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assignment_rules',
    )
    designation = models.ForeignKey(
        'accounts.Designation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assignment_rules',
    )
    category = models.ForeignKey(
        SupportCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assignment_rules',
    )
    verification_type = models.CharField(max_length=30, null=True, blank=True)
    priority = models.CharField(max_length=15, null=True, blank=True)
    strategy = models.ForeignKey(
        AssignmentStrategy,
        on_delete=models.PROTECT,
        related_name='rules',
    )
    queue = models.ForeignKey(
        Queue,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rules',
    )
    priority_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assignment_rules'
        ordering = ('-priority_order', 'name')

    def __str__(self):
        return self.name


class TicketAssignmentHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(
        SupportTicket,
        on_delete=models.CASCADE,
        related_name='assignment_history',
    )
    employee = models.ForeignKey(
        'accounts.CustomerSupportAgent',
        on_delete=models.CASCADE,
        related_name='ticket_assignment_history',
    )
    assigned_by_admin = models.ForeignKey(
        'accounts.Admin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ticket_assignments_delegated',
    )
    assigned_by_super_admin = models.ForeignKey(
        'accounts.SuperAdmin',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ticket_assignments_delegated',
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    unassigned_at = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.FloatField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'ticket_assignment_history'
        ordering = ('-assigned_at',)


class AssignmentAudit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    related_object_id = models.UUIDField()
    related_object_type = models.CharField(max_length=30)  # TICKET, VERIFICATION
    rule_applied = models.ForeignKey(
        AssignmentRule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    strategy_applied = models.CharField(max_length=50)
    assigned_staff = models.ForeignKey(
        'accounts.Staff',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assignment_audits',
    )
    assigned_agent = models.ForeignKey(
        'accounts.CustomerSupportAgent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assignment_audits',
    )
    success = models.BooleanField(default=True)
    failure_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'assignment_audits'
        ordering = ('-created_at',)

