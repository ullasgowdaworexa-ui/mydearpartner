#!/usr/bin/env python
"""Test document deletion functionality."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import Member, MemberDocument
from apps.accounts.services import create_member
from django.utils import timezone
import uuid

print("=== TESTING DOCUMENT DELETE FUNCTIONALITY ===")

# Find or create a test member
test_member = Member.objects.filter(email='test@example.com').first()
if not test_member:
    print("Creating test member...")
    test_member = create_member(
        email='test@example.com',
        password='TestPassword!742',
        mobile_number='9876543210',
        first_name='Test',
        last_name='Member',
        gender='male',
        date_of_birth='1990-01-01'
    )

print(f"Test member: {test_member.email} (ID: {test_member.id})")

# Create a test document
print("\nCreating test document...")
test_document = MemberDocument.objects.create(
    id=uuid.uuid4(),
    member=test_member,
    document_type='Test Government ID',
    file_name='test_id.jpg',
    file_content_type='image/jpeg',
    file_size=12345,
    status=MemberDocument.Status.PENDING,
    uploaded_at=timezone.now()
)

print(f"Created document: {test_document.id}")
print(f"Document type: {test_document.document_type}")
print(f"Document status: {test_document.status}")
print(f"Member document status: {test_member.document_status}")

# Test the delete logic manually
print(f"\n=== TESTING DELETE LOGIC ===")
print(f"Document belongs to member: {test_document.member_id == test_member.id}")
print(f"Document is not deleted: {not test_document.is_deleted}")
print(f"Document status allows deletion: {test_document.status != MemberDocument.Status.APPROVED}")

# Show how to delete via API
print(f"\n=== API DELETE COMMANDS ===")
print("For PENDING/REJECTED documents:")
print(f"DELETE /api/proxy/member-auth/me/documents/{test_document.id}/")

print("\nFor APPROVED documents:")
print(f"DELETE /api/proxy/member-auth/me/documents/{test_document.id}/?reason=No longer needed")

print("\nOR with request body:")
print(f"DELETE /api/proxy/member-auth/me/documents/{test_document.id}/")
print("Body: {\"reason\": \"No longer needed\"}")

# Test manual deletion
print(f"\n=== MANUAL DELETE TEST ===")
test_document.is_deleted = True
test_document.deleted_at = timezone.now()
test_document.deleted_by_id = test_member.pk
test_document.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by_id', 'updated_at'])

remaining = MemberDocument.objects.filter(member=test_member, is_deleted=False).count()
print(f"Remaining active documents: {remaining}")

if remaining == 0:
    print("Would update member document_status to NOT_STARTED")

print("\n✅ Document delete logic test completed!")
print(f"\nTo test via frontend:")
print(f"1. Login as: test@example.com / TestPassword!742")
print(f"2. Upload a document")
print(f"3. Try to delete it from the member dashboard")