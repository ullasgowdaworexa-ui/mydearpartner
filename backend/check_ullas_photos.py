import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
import django
django.setup()
from apps.accounts.models import Member
from apps.profiles.models import ProfilePhoto
m = Member.objects.get(email='ullasgowda.worexa@gmail.com')
photos = ProfilePhoto.objects.filter(user=m)
print("Member: %s" % m.first_name)
print("Account status: %s" % m.account_status)
print("Is active: %s" % m.is_active)
print("Deleted at: %s" % m.deleted_at)
print("Account type: %s" % m.account_type)
print("Total photos: %d" % photos.count())
for p in photos:
    print("  id=%s, is_primary=%s, status=%s, is_deleted=%s, display_order=%s" % (p.id, p.is_primary, p.status, p.is_deleted, p.display_order))
