import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import Member, User, AuthChallenge
from apps.core.models import ProfileVerificationRequest, Notification

print("Deleting all data...")

# Delete in order
AuthChallenge.objects.all().delete()
print("✓ Auth challenges deleted")

Member.objects.all().delete()
print("✓ Members deleted")

User.objects.all().delete()
print("✓ Users deleted")

try:
    ProfileVerificationRequest.objects.all().delete()
    print("✓ Verification requests deleted")
except:
    pass

try:
    Notification.objects.all().delete()
    print("✓ Notifications deleted")
except:
    pass

print("\nDatabase is now clean!")
print(f"Members remaining: {Member.objects.count()}")
print(f"Users remaining: {User.objects.count()}")
