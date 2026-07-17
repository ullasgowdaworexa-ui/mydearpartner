import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

from .routing import application  # noqa: E402,F401
