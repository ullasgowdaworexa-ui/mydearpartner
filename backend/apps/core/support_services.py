from django.conf import settings
from django.core.exceptions import ValidationError

from apps.accounts.models import Admin, SuperAdmin

from .api_utils import notify
from .models import SupportCategory, SupportTicket
from .serializers import validate_private_attachment


def validate_support_attachment(file_obj):
    try:
        return validate_private_attachment(file_obj)
    except Exception as exc:
        detail = getattr(exc, 'detail', None)
        raise ValidationError(str(detail or exc)) from exc


def create_system_ticket(member, category, subject, description, ref_id=None):
    """Create one unassigned SYSTEM ticket for an incident reference."""

    if isinstance(category, str):
        category = SupportCategory.objects.get(code=category)
    marker = f'System Reference Code: {ref_id}' if ref_id else ''
    if marker and SupportTicket.objects.filter(
        member=member,
        category=category,
        description__contains=marker,
    ).exclude(status__in=(SupportTicket.Status.RESOLVED, SupportTicket.Status.CLOSED)).exists():
        return None
    full_description = f'{description}\n\n{marker}'.strip()
    ticket = SupportTicket.objects.create(
        member=member,
        category=category,
        subject=subject,
        description=full_description,
        priority=SupportTicket.Priority.HIGH,
        status=SupportTicket.Status.UNASSIGNED,
        source=SupportTicket.Source.SYSTEM,
    )
    managers = Admin.objects.filter(
        is_active=True,
        deleted_at__isnull=True,
        role__role_permissions__permission__code='tickets.assign',
        role__role_permissions__is_allowed=True,
    ).distinct()
    for manager in managers:
        notify(
            manager,
            notification_type='SYSTEM_TICKET_CREATED',
            title=f'System ticket: {ticket.ticket_number}',
            message=subject,
            related_object=ticket,
            priority='HIGH',
        )
    for owner in SuperAdmin.objects.filter(is_active=True, deleted_at__isnull=True):
        notify(
            owner,
            notification_type='SYSTEM_TICKET_CREATED',
            title=f'System ticket: {ticket.ticket_number}',
            message=subject,
            related_object=ticket,
            priority='HIGH',
        )
    return ticket


class EmailTicketService:
    """Disabled integration seam; no email is consumed until configured."""

    @staticmethod
    def get_settings():
        return {
            'SUPPORT_EMAIL_ADDRESS': getattr(settings, 'SUPPORT_EMAIL_ADDRESS', ''),
            'SUPPORT_EMAIL_HOST': getattr(settings, 'SUPPORT_EMAIL_HOST', ''),
        }

    @staticmethod
    def fetch_pending_emails():
        return []
