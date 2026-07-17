from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework.exceptions import AuthenticationFailed

from apps.accounts.authentication import VersionedJWTAuthentication


MAX_WEBSOCKET_TOKEN_LENGTH = 4096
TOKEN_PROTOCOLS = {'access_token', 'jwt', 'bearer'}


def token_from_subprotocols(subprotocols):
    """Return ``(JWT, negotiated_protocol)`` from browser WebSocket protocols."""

    protocols = [str(value) for value in (subprotocols or ())]
    for index, protocol in enumerate(protocols):
        if protocol.lower() in TOKEN_PROTOCOLS:
            if index + 1 >= len(protocols):
                return None, protocol
            token = protocols[index + 1]
            if token and len(token) <= MAX_WEBSOCKET_TOKEN_LENGTH:
                return token, protocol
            return None, protocol

    # Compatibility with clients that encode the credential in one protocol.
    for protocol in protocols:
        lowered = protocol.lower()
        for prefix in ('access_token.', 'jwt.', 'bearer.'):
            if lowered.startswith(prefix):
                token = protocol[len(prefix):]
                if token and len(token) <= MAX_WEBSOCKET_TOKEN_LENGTH:
                    return token, protocol
                return None, protocol
    return None, None


def token_from_query_string(query_string):
    """Temporary fallback for clients that have not migrated to subprotocols."""

    params = parse_qs(query_string, keep_blank_values=False)
    values = params.get('token') or params.get('access_token')
    if not values:
        return None
    token = values[0]
    if not token or len(token) > MAX_WEBSOCKET_TOKEN_LENGTH:
        return None
    return token


@sync_to_async
def get_user_from_token(raw_token):
    if not raw_token:
        return AnonymousUser()

    jwt_auth = VersionedJWTAuthentication()
    try:
        validated_token = jwt_auth.get_validated_token(raw_token)
        return jwt_auth.get_user(validated_token)
    except (AuthenticationFailed, ValueError, TypeError):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        raw_token, negotiated_protocol = token_from_subprotocols(scope.get('subprotocols'))
        if raw_token is None and negotiated_protocol is None:
            query_string = scope.get('query_string', b'').decode('utf-8', errors='ignore')
            raw_token = token_from_query_string(query_string)

        scope['user'] = await get_user_from_token(raw_token)
        scope['jwt_subprotocol'] = negotiated_protocol
        return await super().__call__(scope, receive, send)
