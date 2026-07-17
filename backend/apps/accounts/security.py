import hashlib
import uuid
from datetime import datetime, timezone as datetime_timezone

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    AccountType,
    Admin,
    AuthSession,
    CustomerSupportAgent,
    Member,
    Staff,
    SuperAdmin,
)


ACCOUNT_MODEL_MAP = {
    AccountType.MEMBER: Member,
    AccountType.SUPER_ADMIN: SuperAdmin,
    AccountType.ADMIN: Admin,
    AccountType.STAFF: Staff,
    AccountType.CUSTOMER_SUPPORT: CustomerSupportAgent,
}


def account_model_for_type(account_type):
    try:
        return ACCOUNT_MODEL_MAP[str(account_type)]
    except KeyError as exc:
        raise AuthenticationFailed('Unknown account type.', code='invalid_account_type') from exc


def _digest_jti(jti):
    return hashlib.sha256(str(jti).encode('utf-8')).hexdigest()


def _token_expiry(token):
    return datetime.fromtimestamp(int(token['exp']), tz=datetime_timezone.utc)


def _set_account_claims(token, account, session_id):
    token['account_id'] = str(account.pk)
    token['account_type'] = str(account.account_type)
    token['session_id'] = str(session_id)
    token['token_version'] = account.token_version


@transaction.atomic
def issue_account_tokens(account, *, session=None):
    """Issue a refresh/access pair without storing either raw token."""

    if not account.is_active or account.deleted_at is not None:
        raise AuthenticationFailed('Account is inactive.', code='account_inactive')

    session_id = session.pk if session else uuid.uuid4()
    refresh = RefreshToken()
    _set_account_claims(refresh, account, session_id)

    values = {
        'account_id': account.pk,
        'account_type': str(account.account_type),
        'token_version': account.token_version,
        'refresh_jti_digest': _digest_jti(refresh['jti']),
        'expires_at': _token_expiry(refresh),
        'revoked_at': None,
    }
    if session:
        AuthSession.objects.filter(pk=session.pk).update(**values, updated_at=timezone.now())
        session.refresh_from_db()
    else:
        session = AuthSession.objects.create(id=session_id, **values)

    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'session_id': str(session.pk),
    }


@transaction.atomic
def rotate_refresh_token(raw_refresh, *, expected_account_type=None):
    try:
        refresh = RefreshToken(raw_refresh)
    except TokenError as exc:
        raise AuthenticationFailed('Invalid or expired refresh token.', code='invalid_refresh') from exc

    account_type = refresh.get('account_type')
    account_id = refresh.get('account_id')
    session_id = refresh.get('session_id')
    token_version = refresh.get('token_version')
    if not all((account_type, account_id, session_id)) or token_version is None:
        raise AuthenticationFailed('Refresh token is missing required claims.', code='invalid_claims')
    if expected_account_type and account_type != str(expected_account_type):
        raise AuthenticationFailed('Token belongs to a different account type.', code='wrong_account_type')

    session = AuthSession.objects.select_for_update().filter(
        pk=session_id,
        account_id=account_id,
        account_type=account_type,
    ).first()
    if (
        session is None
        or not session.is_usable
        or session.refresh_jti_digest != _digest_jti(refresh['jti'])
        or session.token_version != int(token_version)
    ):
        raise AuthenticationFailed('This refresh session has been revoked.', code='session_revoked')

    model = account_model_for_type(account_type)
    account = model.objects.filter(pk=account_id, is_active=True, deleted_at__isnull=True).first()
    if account is None or account.token_version != int(token_version):
        raise AuthenticationFailed('This refresh session has been revoked.', code='session_revoked')
    return issue_account_tokens(account, session=session)


@transaction.atomic
def revoke_session(raw_refresh, *, expected_account_type=None):
    try:
        refresh = RefreshToken(raw_refresh)
    except TokenError:
        return None
    account_type = refresh.get('account_type')
    if expected_account_type and account_type != str(expected_account_type):
        return None
    session = AuthSession.objects.select_for_update().filter(
        pk=refresh.get('session_id'),
        account_id=refresh.get('account_id'),
        account_type=account_type,
        refresh_jti_digest=_digest_jti(refresh.get('jti')),
        revoked_at__isnull=True,
    ).first()
    if session:
        session.revoked_at = timezone.now()
        session.save(update_fields=('revoked_at', 'updated_at'))
    return session


@transaction.atomic
def revoke_all_account_sessions(account):
    locked = account.__class__.objects.select_for_update().get(pk=account.pk)
    locked.token_version += 1
    locked.save(update_fields=('token_version', 'updated_at'))
    account.token_version = locked.token_version
    return AuthSession.objects.filter(
        account_id=locked.pk,
        account_type=str(locked.account_type),
        revoked_at__isnull=True,
    ).update(revoked_at=timezone.now(), updated_at=timezone.now())


# Compatibility aliases retained for internal callers while endpoint names migrate.
issue_refresh_token = issue_account_tokens
revoke_all_user_sessions = revoke_all_account_sessions
