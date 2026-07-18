from .base import *

# Development settings override
DEBUG = True
ALLOWED_HOSTS = ['*']

# Keep account verification relaxed locally, but never bypass profile-photo moderation.
# This makes development behave like production for the member-visible photo flow.
REQUIRE_MEMBER_VERIFICATION = False
AUTO_APPROVE_PROFILE_PHOTOS = False

# Fallback to local in-memory Cache and Channels when Redis is not running/needed locally
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'matiromony-development-cache',
    }
}

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

