from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from apps.accounts.models import Admin, SuperAdmin

from .api_utils import notify
from .models import Notification, SupportTicket


def _already_notified(recipient_field, recipient, ticket):
    return Notification.objects.filter(
        **{recipient_field: recipient},
        notification_type='TICKET_SLA_OVERDUE',
        related_object_id=str(ticket.pk),
    ).exists()


@shared_task(name='apps.core.tasks.process_sla_escalations')
def process_sla_escalations():
    """Notify only the people responsible for unresolved overdue tickets."""

    now = timezone.now()
    unresolved = SupportTicket.objects.exclude(
        status__in=(SupportTicket.Status.RESOLVED, SupportTicket.Status.CLOSED)
    ).select_related('category', 'current_assignee')
    overdue_count = 0
    for ticket in unresolved:
        sla = ticket.category.sla_rules.filter(
            priority=ticket.priority,
            is_active=True,
        ).first()
        if not sla or ticket.created_at + timedelta(minutes=sla.resolution_minutes) >= now:
            continue
        overdue_count += 1
        if ticket.current_assignee_id and not _already_notified(
            'support_recipient', ticket.current_assignee, ticket
        ):
            notify(
                ticket.current_assignee,
                notification_type='TICKET_SLA_OVERDUE',
                title=f'SLA overdue: {ticket.ticket_number}',
                message=ticket.subject,
                related_object=ticket,
                priority='URGENT' if ticket.priority == SupportTicket.Priority.URGENT else 'HIGH',
            )
        managers = Admin.objects.filter(
            is_active=True,
            deleted_at__isnull=True,
            role__role_permissions__permission__code='tickets.assign',
            role__role_permissions__is_allowed=True,
        ).distinct()
        for manager in managers:
            if not _already_notified('admin_recipient', manager, ticket):
                notify(
                    manager,
                    notification_type='TICKET_SLA_OVERDUE',
                    title=f'SLA overdue: {ticket.ticket_number}',
                    message=ticket.subject,
                    related_object=ticket,
                    priority='HIGH',
                )
        if ticket.priority == SupportTicket.Priority.URGENT:
            for owner in SuperAdmin.objects.filter(is_active=True, deleted_at__isnull=True):
                if not _already_notified('super_admin_recipient', owner, ticket):
                    notify(
                        owner,
                        notification_type='TICKET_SLA_OVERDUE',
                        title=f'URGENT SLA breach: {ticket.ticket_number}',
                        message=ticket.subject,
                        related_object=ticket,
                        priority='URGENT',
                    )
    return overdue_count
