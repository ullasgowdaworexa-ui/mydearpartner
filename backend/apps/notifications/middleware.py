import logging
from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework.exceptions import AuthenticationFailed

from apps.accounts.authentication import AccountJWTAuthentication

logger = logging.getLogger(__name__)


MAX_TOKEN_LENGTH = 4096


def token_from_query_string(scope):
    """Extract JWT from ``?token=...`` query parameter."""
    qs = scope.get("query_string", b"").decode("utf-8", errors="ignore")
    params = parse_qs(qs, keep_blank_values=False)
    values = params.get("token") or params.get("access_token")
    if not values:
        return None
    token = values[0]
    if not token or len(token) > MAX_TOKEN_LENGTH:
        return None
    return token


def token_from_subprotocols(scope):
    """Extract JWT from WebSocket subprotocol headers."""
    for proto in (scope.get("subprotocols") or ()):
        lowered = str(proto).lower()
        for prefix in ("access_token.", "jwt.", "bearer."):
            if lowered.startswith(prefix):
                token = str(proto)[len(prefix):]
                if token and len(token) <= MAX_TOKEN_LENGTH:
                    return token
    return None


@sync_to_async
def authenticate_token(raw_token):
    """Validate a JWT and return the authenticated account or AnonymousUser."""
    if not raw_token:
        return AnonymousUser()
    jwt_auth = AccountJWTAuthentication()
    try:
        validated = jwt_auth.get_validated_token(raw_token)
        return jwt_auth.get_user(validated)
    except (AuthenticationFailed, ValueError, TypeError):
        return AnonymousUser()


class JwtAuthMiddleware(BaseMiddleware):
    """
    Django Channels middleware that authenticates WebSocket connections
    using a JWT access token.

    Token sources (checked in order):
      1. Subprotocol header (``access_token.<JWT>``)
      2. Query string parameter (``?token=<JWT>``)
    """

    async def __call__(self, scope, receive, send):
        raw_token = token_from_subprotocols(scope)

        if raw_token is None:
            raw_token = token_from_query_string(scope)

        if raw_token:
            scope["user"] = await authenticate_token(raw_token)
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
