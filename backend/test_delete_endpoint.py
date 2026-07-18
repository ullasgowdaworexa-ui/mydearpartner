"""Test the delete photo endpoint directly through Django's request factory."""
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
import django
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from rest_framework.test import force_authenticate
from apps.accounts.models import Member
from apps.profiles.models import ProfilePhoto
from apps.profiles.views import ProfilePhotoDetailView

member = Member.objects.get(email="ullasgowda.worexa@gmail.com")
photo = ProfilePhoto.objects.filter(user=member).first()

if not photo:
    print("NO PHOTOS - need to upload first")
else:
    print(f"Found photo: {photo.id}, user={photo.user_id}, member={member.id}")
    
    factory = RequestFactory()
    request = factory.delete(f"/profile-photos/{photo.id}/")
    request.user = member
    request.request_id = "test-123"
    
    view = ProfilePhotoDetailView.as_view()
    response = view(request, photo_id=photo.id)
    
    print(f"Response status: {response.status_code}")
    print(f"Response data: {response.data}")
