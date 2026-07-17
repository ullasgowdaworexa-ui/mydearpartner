from .base import *

# Development settings override
DEBUG = True
ALLOWED_HOSTS = ['*']

# Disable strict verification and auto-approve uploaded photos during local development
REQUIRE_MEMBER_VERIFICATION = False
AUTO_APPROVE_PROFILE_PHOTOS = True

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


