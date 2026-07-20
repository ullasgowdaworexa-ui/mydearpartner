"""
Redis-backed online presence.

Presence is intentionally NOT stored in PostgreSQL. Each browser tab/device
opens one WebSocket connection and contributes to a per-user live connection
counter, plus a single liveness timestamp that is refreshed on every heartbeat
and on connect:

    presence:user:{user_id}:count          -> integer (live connections)
    presence:user:{user_id}:expires_at      -> unix ts (now + PRESENCE_TTL)

A user is ONLINE while ``count > 0`` AND ``now < expires_at``. The liveness
timestamp is the backstop for unclean disconnects / crashes where the
``disconnect`` handler is never called: the timestamp eventually lapses and the
user is reported OFFLINE even if the counter is stale.

This supports multiple tabs, multiple browsers, desktop + mobile, and unclean
disconnects, using only atomic cache primitives (incr/decr/get/set/delete) so
it works with Django's built-in Redis cache backend.

No PostgreSQL row is written on heartbeat. ``last_seen_at`` is updated only on
genuine disconnect (and throttled) so presence traffic never creates database
write pressure.
"""

from __future__ import annotations

import logging
import time
from datetime import timedelta
from typing import Iterable

from django.core.cache import caches

logger = logging.getLogger(__name__)

PRESENCE_TTL = timedelta(seconds=75)
HEARTBEAT_INTERVAL = timedelta(seconds=28)
LAST_SEEN_THROTTLE = timedelta(minutes=2)

_ONLINE = "ONLINE"
_OFFLINE = "OFFLINE"


def _cache():
    try:
        return caches["default"]
    except Exception:
        return None


def _count_key(user_id: str) -> str:
    return f"presence:user:{user_id}:count"


def _expire_key(user_id: str) -> str:
    return f"presence:user:{user_id}:expires_at"


def mark_online(user_id: str, connection_id: str) -> bool:
    """Register a connection as alive. Returns True if Redis is available."""
    cache = _cache()
    if cache is None:
        return False
    try:
        # connection_id is accepted for API symmetry / future per-conn keys.
        cache.incr(_count_key(user_id), 1)
        cache.set(_expire_key(user_id), time.time() + PRESENCE_TTL.total_seconds(), PRESENCE_TTL)
        return True
    except Exception:
        logger.exception("presence.mark_online failed for user=%s", user_id)
        return False


def refresh_connection(user_id: str, connection_id: str) -> bool:
    """Extend the liveness window for a live connection (heartbeat)."""
    cache = _cache()
    if cache is None:
        return False
    try:
        cache.set(_expire_key(user_id), time.time() + PRESENCE_TTL.total_seconds(), PRESENCE_TTL)
        return True
    except Exception:
        logger.exception("presence.refresh_connection failed for user=%s", user_id)
        return False


def mark_offline(user_id: str, connection_id: str) -> bool:
    """Remove one connection. Returns True if Redis is available."""
    cache = _cache()
    if cache is None:
        return False
    try:
        count_key = _count_key(user_id)
        try:
            cache.decr(count_key, 1)
        except ValueError:
            # Key missing/non-numeric; reset to 0.
            cache.set(count_key, 0)
        if (cache.get(count_key) or 0) <= 0:
            cache.delete(count_key)
            cache.delete(_expire_key(user_id))
        return True
    except Exception:
        logger.exception("presence.mark_offline failed for user=%s", user_id)
        return False


def is_online(user_id: str) -> bool:
    cache = _cache()
    if cache is None:
        return False
    try:
        count = cache.get(_count_key(user_id)) or 0
        if count <= 0:
            return False
        expires_at = cache.get(_expire_key(user_id))
        if expires_at is None:
            return False
        return time.time() < float(expires_at)
    except Exception:
        logger.exception("presence.is_online failed for user=%s", user_id)
        return False


def get_bulk_status(user_ids: Iterable[str]) -> dict[str, str]:
    """Return ``{user_id: "ONLINE" | "OFFLINE"}`` without broadcasting."""
    result: dict[str, str] = {}
    cache = _cache()
    if cache is None:
        return {str(uid): _OFFLINE for uid in user_ids}
    try:
        for user_id in user_ids:
            result[str(user_id)] = _ONLINE if is_online(str(user_id)) else _OFFLINE
    except Exception:
        logger.exception("presence.get_bulk_status failed")
        return {str(uid): _OFFLINE for uid in user_ids}
    return result
