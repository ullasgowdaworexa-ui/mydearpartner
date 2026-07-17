from celery import shared_task
from django.utils import timezone

from .models import MembershipSubscription


@shared_task(name="apps.memberships.tasks.reset_daily_view_limits")
def reset_daily_view_limits():
    """Reset usage counters for subscriptions that are active at run time."""

    return MembershipSubscription.objects.filter(end_date__gt=timezone.now()).update(views_used=0)
