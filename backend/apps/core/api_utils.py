import math
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from django.core.paginator import EmptyPage, Paginator
from rest_framework import status


def _json_safe(value):
    """Recursively convert non-JSON-serializable objects to strings so audit
    payloads can be stored in a JSONB column without psycopg2 raising."""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (UUID, Decimal)):
        return str(value)
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return value

from apps.accounts.models import (
    AccountType,
    AdminActivityLog,
    CustomerSupportActivityLog,
    StaffActivityLog,
    SuperAdminActivityLog,
)

from .models import Notification, SupportTicketAttachment
from .responses import ApiResponse


ACTIVITY_MODELS = {
    AccountType.SUPER_ADMIN: SuperAdminActivityLog,
    AccountType.ADMIN: AdminActivityLog,
    AccountType.STAFF: StaffActivityLog,
    AccountType.CUSTOMER_SUPPORT: CustomerSupportActivityLog,
}


def client_ip(request):
    return request.META.get('REMOTE_ADDR') or None


def audit(
    request,
    actor,
    *,
    action,
    module,
    target_type='',
    target_id='',
    description='',
    old_data=None,
    new_data=None,
):
    model = ACTIVITY_MODELS.get(str(actor.account_type))
    if not model:
        return None
    return model.objects.create(
        actor_id=actor.pk,
        action=action,
        module=module,
        target_type=target_type,
        target_id=str(target_id or ''),
        description=description,
        old_data=_json_safe(old_data or {}),
        new_data=_json_safe(new_data or {}),
        ip_address=client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:1000],
    )


def create_notification(recipient, *, type, title, body, link_url='', related_object=None, priority='NORMAL'):
    """Persist a notification and publish it to the member's websocket group.

    Persistence happens first, so a disconnected browser always receives the
    notification on its next API load. Broadcasting is deliberately best
    effort; a websocket outage cannot make notification creation fail.
    """
    recipient_field = {
        AccountType.MEMBER: 'member_recipient',
        AccountType.SUPER_ADMIN: 'super_admin_recipient',
        AccountType.ADMIN: 'admin_recipient',
        AccountType.STAFF: 'staff_recipient',
        AccountType.CUSTOMER_SUPPORT: 'support_recipient',
    }[str(recipient.account_type)]
    values = {
        recipient_field: recipient,
        'notification_type': type,
        'title': title,
        'message': body,
        'link_url': link_url,
        'priority': priority,
    }
    if related_object is not None:
        values['related_object_type'] = related_object._meta.label_lower
        values['related_object_id'] = str(related_object.pk)
    return Notification.objects.create(**values)


def broadcast_notification(notification):
    """Best-effort realtime delivery for every persisted member notification."""
    if not notification.member_recipient_id:
        return
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'notifications_{notification.member_recipient_id}',
                {'type': 'notification.created', 'notification': {
                    'id': str(notification.pk), 'notification_type': notification.notification_type,
                    'title': notification.title, 'message': notification.message,
                    'link_url': notification.link_url, 'is_read': notification.is_read,
                    'created_at': notification.created_at.isoformat(),
                }},
            )
    except Exception:
        # Persistence is the delivery guarantee; a realtime outage is not.
        pass


def notify(recipient, *, notification_type, title, message, related_object=None, priority='NORMAL'):
    """Backward-compatible wrapper for legacy callers."""
    return create_notification(
        recipient,
        type=notification_type,
        title=title,
        body=message,
        related_object=related_object,
        priority=priority,
    )


def paginated_response(request, queryset, serializer_class, *, context=None, message='Request completed successfully.'):
    try:
        requested_size = int(request.query_params.get('page_size', 10))
    except (TypeError, ValueError):
        requested_size = 10
    page_size = max(1, min(requested_size, 100))
    try:
        page_number = int(request.query_params.get('page', 1))
    except (TypeError, ValueError):
        page_number = 1
    paginator = Paginator(queryset, page_size)
    try:
        page = paginator.page(max(1, page_number))
    except EmptyPage:
        page = paginator.page(paginator.num_pages or 1)
    serializer_context = {'request': request}
    serializer_context.update(context or {})
    data = serializer_class(page.object_list, many=True, context=serializer_context).data
    payload = {
        'count': paginator.count,
        'page': page.number,
        'page_size': page_size,
        'num_pages': max(1, math.ceil(paginator.count / page_size)),
        'next': page.next_page_number() if page.has_next() else None,
        'previous': page.previous_page_number() if page.has_previous() else None,
        'results': data,
    }
    return ApiResponse(data=payload, message=message)


def create_ticket_attachment(*, ticket, upload, member=None, support=None, reply=None):
    return SupportTicketAttachment.objects.create(
        ticket=ticket,
        reply=reply,
        uploaded_by_member=member,
        uploaded_by_support=support,
        file_path=upload,
        original_filename=upload.name[:255],
        mime_type=(getattr(upload, 'content_type', '') or 'application/octet-stream')[:100],
        file_size=upload.size,
    )


def bad_request(message, *, errors=None):
    return ApiResponse(
        success=False,
        message=message,
        errors=errors,
        status=status.HTTP_400_BAD_REQUEST,
    )
