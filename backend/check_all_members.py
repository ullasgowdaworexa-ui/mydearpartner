import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
import django
django.setup()
from apps.accounts.models import Member
from apps.profiles.models import ProfilePhoto
print("All members:")
for m in Member.objects.all():
    photos = ProfilePhoto.objects.filter(user=m).count()
    print("  id=%s, name=%s, email=%s, account_status=%s, photos=%d" % (m.id, m.first_name, m.email, m.account_status, photos))
