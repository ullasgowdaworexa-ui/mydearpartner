"""
Membership plan entitlement definitions and enforcement helpers.

Plans (by slug):
    free      – default, no active MemberMembership needed
    gold      – Rs. 2999 / 3 months
    platinum  – Rs. 5999 / 6 months
    elite     – Rs. 14999 / 12 months
"""

from django.utils import timezone


# ---------------------------------------------------------------------------
# Plan limits
# ---------------------------------------------------------------------------

PLAN_LIMITS = {
    'free': {
        'daily_profile_views': 5,
        'daily_interests': 3,
        'can_message': False,
        'can_view_contact': False,
        'can_view_all_photos': False,
        'advanced_search': False,
        'can_boost': False,
    },
    'gold': {
        'daily_profile_views': 50,
        'daily_interests': 15,
        'can_message': True,
        'can_view_contact': False,   # Gold sees contact only on mutual acceptance
        'can_view_all_photos': True,
        'advanced_search': True,
        'can_boost': False,
    },
    'platinum': {
        'daily_profile_views': 200,
        'daily_interests': 50,
        'can_message': True,
        'can_view_contact': True,
        'can_view_all_photos': True,
        'advanced_search': True,
        'can_boost': True,
    },
    'elite': {
        'daily_profile_views': 999,  # effectively unlimited
        'daily_interests': 999,
        'can_message': True,
        'can_view_contact': True,
        'can_view_all_photos': True,
        'advanced_search': True,
        'can_boost': True,
    },
}

FREE_LIMITS = PLAN_LIMITS['free']


def _get_plan_slug(member):
    """Return the slug of the member's active membership plan, or 'free'."""
    try:
        from apps.accounts.models import Member
        if not isinstance(member, Member):
            member = Member.objects.filter(pk=member.pk).first()
            if not member:
                return 'free'

        if getattr(member, 'account_status', 'ACTIVE') != 'ACTIVE' or not member.is_active:
            return 'free'

        membership = member.membership
        if membership.is_active and membership.plan_id and getattr(membership, 'status', 'FREE') == 'ACTIVE':
            if membership.end_date and membership.end_date <= timezone.now():
                return 'free'
            return (membership.plan.slug or 'free').lower()
    except Exception:
        pass
    return 'free'


def get_entitlements(member):
    """
    Return a dictionary of entitlements read dynamically from the database
    for the member's current active MembershipPlan, falling back to FREE defaults.
    """
    slug = _get_plan_slug(member)
    
    try:
        from apps.core.models import MembershipPlan
        plan = MembershipPlan.objects.filter(slug__iexact=slug, is_active=True).first()
        if not plan and slug != 'free':
            plan = MembershipPlan.objects.filter(slug__iexact='free', is_active=True).first()
            
        if plan:
            # Map standard DB fields to limit names
            daily_views = plan.daily_profile_unlock_limit if plan.daily_profile_unlock_limit is not None else plan.profile_view_limit_daily
            daily_interests = plan.interest_limit if plan.interest_limit is not None else plan.interest_limit_daily
            
            return {
                'daily_profile_views': daily_views,
                'daily_interests': daily_interests,
                'can_message': plan.can_message,
                'can_view_contact': plan.can_view_contact or (plan.contact_access_mode != 'NONE'),
                'can_view_all_photos': plan.can_view_private_photos or (plan.photo_access_mode == 'ALL_APPROVED'),
                'advanced_search': plan.can_use_advanced_search,
                'can_boost': plan.can_use_profile_boost or (plan.profile_boost_level != 'NONE'),
                'contact_access_mode': plan.contact_access_mode,
                'photo_access_mode': plan.photo_access_mode,
            }, slug
    except Exception:
        pass
        
    return PLAN_LIMITS.get(slug, FREE_LIMITS), slug


def can_view_profile(member, today_view_count: int) -> tuple[bool, str]:
    """Return (allowed, reason). Check against daily profile view limit."""
    limits, slug = get_entitlements(member)
    limit = limits['daily_profile_views']
    
    # None or -1 represents unlimited
    if limit is not None and limit >= 0:
        if today_view_count >= limit:
            if slug == 'free':
                return False, 'You have used all 5 profile unlocks available today.'
            return False, f'You have reached your daily profile view limit of {limit}. Upgrade your plan to view more profiles.'
    return True, ''


def can_send_interest(member, today_interest_count: int) -> tuple[bool, str]:
    """Return (allowed, reason). Check against daily interest limit."""
    limits, slug = get_entitlements(member)
    limit = limits['daily_interests']
    if limit is not None and limit >= 0:
        if today_interest_count >= limit:
            return False, f'You have reached your daily interest limit of {limit}. Upgrade your plan to send more interests.'
    return True, ''


def can_message(member) -> tuple[bool, str]:
    """Return (allowed, reason). Check if member's plan includes messaging."""
    limits, slug = get_entitlements(member)
    if not limits['can_message']:
        return False, 'Messaging is not available in your current membership plan.'
    return True, ''


def can_view_contact(member, target_member=None) -> tuple[bool, str]:
    """
    Return (allowed, reason). Check if member can see contact details.
    Gold members can only view contact details if there's a mutual accepted interest.
    """
    from apps.core.models import Interest  # local import to avoid circular
    from django.db.models import Q

    limits, slug = get_entitlements(member)
    contact_access = limits.get('contact_access_mode', 'NONE')
    
    # Compatibility fallback if contact_access_mode is missing from limits dict
    if contact_access == 'NONE' and limits.get('can_view_contact', False):
        contact_access = 'FULL'

    if contact_access == 'FULL' or limits.get('can_view_contact', False):
        return True, ''
    elif contact_access == 'MUTUAL_ONLY' and target_member is not None:
        matched = Interest.objects.filter(
            Q(sender=member, receiver=target_member) | Q(sender=target_member, receiver=member),
            status=Interest.Status.ACCEPTED,
        ).exists()
        if matched:
            return True, ''
        return False, 'Contact details are visible to Gold members only upon mutual accepted interest.'
    
    return False, 'Contact details are visible to Platinum and Elite members.'


def can_view_all_photos(member) -> tuple[bool, str]:
    """Return (allowed, reason). Check if member can view all photos."""
    limits, slug = get_entitlements(member)
    photo_access = limits.get('photo_access_mode', 'PRIMARY_ONLY')
    
    # Compatibility fallback
    if photo_access == 'PRIMARY_ONLY' and limits.get('can_view_all_photos', False):
        photo_access = 'ALL_APPROVED'
        
    if photo_access == 'ALL_APPROVED' or limits.get('can_view_all_photos', False):
        return True, ''
    return False, 'View all photos with a Gold plan or above.'
