"""Typed, database-backed membership entitlement resolution.

This is the sole plan-resolution boundary for member feature checks.  Callers
receive an :class:`EntitlementSet`, never a plan JSON dictionary.  Results are
deliberately not cached: a Super Admin plan change takes effect on the member's
next request.
"""

from dataclasses import asdict, dataclass
from datetime import datetime, time, timedelta

from django.utils import timezone


@dataclass(frozen=True)
class EntitlementSet:
    plan_id: str | None
    plan_name: str
    plan_slug: str
    daily_profile_view_limit: int | None
    can_send_interest: bool
    daily_interest_limit: int | None
    can_chat: bool
    can_view_contact_details: bool
    profile_visibility_boost: bool
    can_see_who_viewed_profile: bool
    can_view_received_interests: bool
    priority_support: bool
    max_photos: int
    contact_access_mode: str
    photo_access_mode: str
    can_use_advanced_search: bool

    def as_dict(self):
        return asdict(self)


FREE_DEFAULTS = {
    'daily_profile_view_limit': 5,
    'can_send_interest': True,
    'daily_interest_limit': 3,
    'can_chat': False,
    'can_view_contact_details': False,
    'profile_visibility_boost': False,
    'can_see_who_viewed_profile': False,
    'can_view_received_interests': False,
    'priority_support': False,
    'max_photos': 6,
    'contact_access_mode': 'NONE',
    'photo_access_mode': 'PRIMARY_ONLY',
    'can_use_advanced_search': False,
}


def _limit(value, fallback):
    if value is None:
        return fallback
    if isinstance(value, int) and value < 0:
        return None
    return value


def _plan_values(plan):
    """Normalise both formal JSON and legacy plan columns during rollout."""
    raw = plan.entitlements or {}
    return {
        'daily_profile_view_limit': _limit(
            raw.get('daily_profile_view_limit'),
            plan.daily_profile_unlock_limit
            if plan.daily_profile_unlock_limit is not None else plan.profile_view_limit_daily,
        ),
        'can_send_interest': bool(raw.get('can_send_interest', plan.can_send_interest)),
        'daily_interest_limit': _limit(
            raw.get('daily_interest_limit'),
            plan.interest_limit if plan.interest_limit is not None else plan.interest_limit_daily,
        ),
        'can_chat': bool(raw.get('can_chat', plan.can_message or plan.messaging_mode != 'DISABLED')),
        'can_view_contact_details': bool(
            raw.get('can_view_contact_details', plan.can_view_contact or plan.contact_access_mode != 'NONE')
        ),
        'profile_visibility_boost': bool(
            raw.get('profile_visibility_boost', plan.can_use_profile_boost or plan.profile_boost_level != 'NONE')
        ),
        'can_see_who_viewed_profile': bool(
            raw.get('can_see_who_viewed_profile', plan.can_view_profile_visitors)
        ),
        'can_view_received_interests': bool(
            raw.get('can_view_received_interests', plan.can_view_received_interests)
        ),
        'priority_support': bool(raw.get('priority_support', plan.support_priority == 'HIGH')),
        'max_photos': max(1, int(raw.get('max_photos', 6))),
        'contact_access_mode': raw.get('contact_access_mode', plan.contact_access_mode),
        'photo_access_mode': raw.get('photo_access_mode', plan.photo_access_mode),
        'can_use_advanced_search': bool(raw.get('can_use_advanced_search', plan.can_use_advanced_search)),
    }


def get_active_entitlements(member) -> EntitlementSet:
    """Resolve a member's unexpired paid plan, otherwise the Free plan."""
    from apps.accounts.models import Member
    from apps.core.models import MemberMembership, MembershipPlan, MembershipPurchase

    if not isinstance(member, Member):
        member = Member.objects.filter(pk=getattr(member, 'pk', None)).first()
    paid_plan = None
    if member and member.is_active and member.account_status == Member.AccountStatus.ACTIVE:
        # Primary source of truth: MembershipPurchase record
        purchase = (
            MembershipPurchase.objects.select_related('membership_plan')
            .filter(user=member, status='active')
            .order_by('-starts_at', '-created_at')
            .first()
        )
        if purchase and purchase.membership_plan_id:
            expiry = purchase.expires_at
            if expiry is None or expiry > timezone.now():
                paid_plan = purchase.membership_plan

        # Fallback source: MemberMembership (for legacy/instant development setups)
        if not paid_plan:
            membership = (
                MemberMembership.objects.select_related('plan')
                .filter(member=member, is_active=True, status=MemberMembership.MembershipStatus.ACTIVE)
                .order_by('-started_at', '-created_at')
                .first()
            )
            if membership and membership.plan_id:
                expiry = membership.expires_at or membership.end_date
                if expiry is None or expiry > timezone.now():
                    paid_plan = membership.plan

    plan = paid_plan or MembershipPlan.objects.filter(slug__iexact='free').first()
    if not plan:
        return EntitlementSet(plan_id=None, plan_name='Free', plan_slug='free', **FREE_DEFAULTS)
    values = _plan_values(plan)
    return EntitlementSet(
        plan_id=str(plan.pk),
        plan_name=plan.display_name or plan.name or 'Free',
        plan_slug=plan.slug.lower(),
        **values,
    )


def daily_resets_at():
    local_now = timezone.localtime()
    tomorrow = local_now.date() + timedelta(days=1)
    return timezone.make_aware(datetime.combine(tomorrow, time.min), local_now.tzinfo)


def usage_for(member, entitlements: EntitlementSet | None = None):
    """Return DB-backed, unique daily usage consistent with existing unlocks."""
    from apps.core.models import Interest, ProfileUnlock

    entitlements = entitlements or get_active_entitlements(member)
    today = timezone.localdate()
    profile_used = ProfileUnlock.objects.filter(viewer=member, usage_date=today).count()
    interest_used = Interest.objects.filter(sender=member, created_at__date=today).exclude(
        status=Interest.Status.DECLINED
    ).count()
    remaining = lambda limit, used: None if limit is None else max(0, limit - used)
    return {
        'profile_views_used_today': profile_used,
        'profile_views_remaining_today': remaining(entitlements.daily_profile_view_limit, profile_used),
        'interests_used_today': interest_used,
        'interests_remaining_today': remaining(entitlements.daily_interest_limit, interest_used),
        'resets_at': daily_resets_at().isoformat(),
    }


def entitlement_denial(entitlements: EntitlementSet, entitlement: str, *, daily_limit=False):
    """Canonical payload for every membership entitlement rejection."""
    payload = {
        'error': 'DAILY_LIMIT_REACHED' if daily_limit else 'ENTITLEMENT_DENIED',
        'entitlement': entitlement,
        'current_plan': entitlements.plan_name,
        'upgrade_url': '/membership',
    }
    if daily_limit:
        payload['resets_at'] = daily_resets_at().isoformat()
    return payload


# Compatibility wrappers for legacy imports. New code should use the typed API.
def get_entitlements(member):
    resolved = get_active_entitlements(member)
    return resolved.as_dict(), resolved.plan_slug


def can_view_profile(member, today_view_count):
    resolved = get_active_entitlements(member)
    allowed = resolved.daily_profile_view_limit is None or today_view_count < resolved.daily_profile_view_limit
    return allowed, '' if allowed else 'Daily profile view limit reached.'


def can_send_interest(member, today_interest_count):
    resolved = get_active_entitlements(member)
    allowed = resolved.can_send_interest and (
        resolved.daily_interest_limit is None or today_interest_count < resolved.daily_interest_limit
    )
    return allowed, '' if allowed else 'Daily interest limit reached.'


def can_message(member):
    resolved = get_active_entitlements(member)
    return resolved.can_chat, '' if resolved.can_chat else 'Messaging is not included in your plan.'


def can_view_all_photos(member):
    resolved = get_active_entitlements(member)
    allowed = resolved.photo_access_mode in {'ALL_APPROVED', 'ALL'}
    return allowed, '' if allowed else 'Viewing all photos is not included in your plan.'
