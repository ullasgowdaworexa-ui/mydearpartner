import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
import django
django.setup()
from apps.accounts.models import Member
m = Member.objects.first()
print("Has deleted_at:", hasattr(m, "deleted_at"))
try:
    print("deleted_at:", m.deleted_at)
except AttributeError as e:
    print("AttributeError:", e)
