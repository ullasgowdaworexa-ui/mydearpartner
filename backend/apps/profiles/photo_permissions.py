"""Authorization rules for private profile image endpoints."""

from __future__ import annotations

from django.db.models import Q

from apps.accounts.models import AccountType
from apps.core.models import ProfileBlock

from .models import ProfilePhoto


PHOTO_MODERATION_PERMISSIONS = (
    "verification.approve",
    "verification.reject",
)


def is_active_member(member) -> bool:
    return bool(
        member
        and getattr(member, "is_active", False)
        and getattr(member, "deleted_at", None) is None
        and getattr(member, "account_status", None) == "ACTIVE"
        and not getattr(member, "is_hidden", False)
    )


def _active_administrative_actor(user) -> bool:
    account_type = str(getattr(user, "account_type", ""))
    if account_type == AccountType.SUPER_ADMIN:
        return bool(getattr(user, "can_access_admin", False))
    if account_type not in {AccountType.ADMIN, AccountType.STAFF}:
        return False
    return bool(getattr(user, "can_access_admin", False))


def _has_permission(user, code: str) -> bool:
    has_permission = getattr(user, "has_admin_permission", None)
    return bool(has_permission and has_permission(code))


def _is_assigned_photo_reviewer(user, photo: ProfilePhoto) -> bool:
    if str(getattr(user, "account_type", "")) != AccountType.STAFF:
        return False
    from apps.core.models import ProfileVerificationAssignment, ProfileVerificationRequest

    return ProfileVerificationAssignment.objects.filter(
        assigned_to_staff_id=user.pk,
        is_current=True,
        verification_request__member_id=photo.user_id,
        verification_request__verification_type=(
            ProfileVerificationRequest.VerificationType.PROFILE_PHOTO
        ),
    ).exists()


def can_view_restricted_profile_photo(user, photo: ProfilePhoto) -> bool:
    """Allow private moderation images only within an explicit review scope."""
    if not _active_administrative_actor(user):
        return False
    account_type = str(getattr(user, "account_type", ""))
    if account_type == AccountType.SUPER_ADMIN:
        return True
    if _has_permission(user, "verification.view_all"):
        return True
    if account_type == AccountType.STAFF:
        has_review_scope = _has_permission(user, "verification.view_assigned") or any(
            _has_permission(user, code) for code in PHOTO_MODERATION_PERMISSIONS
        )
        return has_review_scope and _is_assigned_photo_reviewer(user, photo)
    return any(_has_permission(user, code) for code in PHOTO_MODERATION_PERMISSIONS)


def can_review_profile_photos(
    user,
    photo: ProfilePhoto | None = None,
    *,
    action: str | None = None,
) -> bool:
    """Require explicit action permission; assigned staff stay assignment-scoped."""
    if not _active_administrative_actor(user):
        return False
    account_type = str(getattr(user, "account_type", ""))
    if account_type == AccountType.SUPER_ADMIN:
        return True

    permission = {
        "approve": "verification.approve",
        "reject": "verification.reject",
    }.get(action)
    if permission is None:
        # Compatibility for metadata serializers: only actors who can see all
        # verification photos are considered unrestricted without an object.
        if account_type == AccountType.STAFF:
            return _has_permission(user, "verification.view_all")
        return _has_permission(user, "verification.view_all") or any(
            _has_permission(user, code) for code in PHOTO_MODERATION_PERMISSIONS
        )
    if not _has_permission(user, permission):
        return False
    if account_type == AccountType.STAFF:
        return photo is not None and _is_assigned_photo_reviewer(user, photo)
    return True


def can_view_profile_photo(user, photo: ProfilePhoto) -> bool:
    """Apply owner, staff, visibility, state, and reciprocal block rules."""
    if not user or not getattr(user, "is_authenticated", False):
        return False

    account_type = str(getattr(user, "account_type", ""))
    if account_type == AccountType.MEMBER and user.pk == photo.user_id:
        # Owners may review all of their own photos, including pending/rejected.
        return bool(
            getattr(user, "is_active", False)
            and getattr(user, "deleted_at", None) is None
            and getattr(user, "account_status", None) == "ACTIVE"
        )
    if can_view_restricted_profile_photo(user, photo):
        return True
    if account_type != AccountType.MEMBER:
        return False
    if photo.status != ProfilePhoto.Status.APPROVED:
        return False
    # Full-profile and photo approval are separate moderation workflows. A
    # signed-in, active member can see an approved primary photo of another
    # active member. This keeps discovery consistent while blocks and plan
    # entitlements still protect sensitive and secondary images.
    if not is_active_member(user) or not is_active_member(photo.user):
        return False

    # Check photo viewing entitlements: Free members can only view primary photos.
    if not photo.is_primary:
        from apps.core.entitlements import can_view_all_photos as check_photo_entitlement
        allowed, _ = check_photo_entitlement(user)
        if not allowed:
            return False

    return not ProfileBlock.objects.filter(
        Q(blocker_id=user.pk, blocked_id=photo.user_id)
        | Q(blocker_id=photo.user_id, blocked_id=user.pk)
    ).exists()
