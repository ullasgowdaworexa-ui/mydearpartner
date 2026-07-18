import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
import django
django.setup()
from apps.accounts.models import Member
from apps.profiles.models import ProfilePhoto
m = Member.objects.first()
photos = ProfilePhoto.objects.filter(user=m)
print("Total: %d" % photos.count())
for p in photos:
    print("  id=%s, is_primary=%s, status=%s, is_deleted=%s" % (p.id, p.is_primary, p.status, p.is_deleted))
