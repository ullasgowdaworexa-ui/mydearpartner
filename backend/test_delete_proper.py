"""Test delete photo with proper DRF test client."""
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
import django
django.setup()

from rest_framework.test import APIClient, force_authenticate
from rest_framework import status
from apps.accounts.models import Member
from apps.profiles.models import ProfilePhoto
from rest_framework_simplejwt.tokens import AccessToken

member = Member.objects.get(email="ullasgowda.worexa@gmail.com")

# Create a token for this member
token = AccessToken()
token["account_type"] = member.account_type
token["account_id"] = str(member.pk)
token["session_id"] = "test-session"
token["token_version"] = member.token_version

client = APIClient()
client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token)}")

# Get photos before delete
response = client.get("/api/v1/profile-photos/mine/")
print(f"Before delete: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print(f"  Photos: {data.get('data', {}).get('count', 'N/A')}")

# Get a photo ID to delete
photo = ProfilePhoto.objects.filter(user=member).first()
if photo:
    print(f"\nDeleting photo: {photo.id}")
    response = client.delete(f"/api/v1/profile-photos/{photo.id}/")
    print(f"Delete status: {response.status_code}")
    print(f"Delete response: {response.json()}")
else:
    print("No photos to delete")
