#!/usr/bin/env python
"""Create a test document for testing delete functionality."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import Member, MemberDocument
from django.utils import timezone
import uuid

print("=== CREATING TEST DOCUMENT FOR DELETE TESTING ===")

# Find the test member
test_member = Member.objects.filter(email='test@example.com').first()
if not test_member:
    print("❌ Test member not found. Creating one...")
    from apps.accounts.services import create_member
    test_member = create_member(
        email='test@example.com',
        password='TestPassword!742',
        mobile_number='9876543210',
        first_name='Test',
        last_name='Member',
        gender='male',
        date_of_birth='1990-01-01'
    )

print(f"✅ Using member: {test_member.email} (ID: {test_member.id})")

# Create a test document that can be deleted
print("\n📄 Creating test document...")
test_doc_id = uuid.uuid4()
test_document = MemberDocument.objects.create(
    id=test_doc_id,
    member=test_member,
    document_type='Government ID',
    file_name='test_document.jpg',
    file_content_type='image/jpeg',
    file_size=54321,
    status=MemberDocument.Status.PENDING,  # PENDING can be deleted without reason
    uploaded_at=timezone.now(),
    is_deleted=False
)

print(f"✅ Created test document:")
print(f"   ID: {test_document.id}")
print(f"   Type: {test_document.document_type}")
print(f"   Status: {test_document.status}")
print(f"   Owner: {test_document.member.email}")

# Also create an approved document to test reason requirement
approved_doc_id = uuid.uuid4()
approved_document = MemberDocument.objects.create(
    id=approved_doc_id,
    member=test_member,
    document_type='Passport',
    file_name='passport.jpg',
    file_content_type='image/jpeg',
    file_size=98765,
    status=MemberDocument.Status.APPROVED,  # APPROVED requires reason
    uploaded_at=timezone.now(),
    reviewed_at=timezone.now(),
    is_deleted=False
)

print(f"\n✅ Created approved document:")
print(f"   ID: {approved_document.id}")
print(f"   Type: {approved_document.document_type}")
print(f"   Status: {approved_document.status}")

print(f"\n🧪 TEST COMMANDS:")
print(f"1. Delete PENDING document (no reason needed):")
print(f"   DELETE /api/proxy/member-auth/me/documents/{test_document.id}/")

print(f"\n2. Delete APPROVED document (reason required):")
print(f"   DELETE /api/proxy/member-auth/me/documents/{approved_document.id}/?reason=Testing delete")

print(f"\n3. Login credentials:")
print(f"   Email: {test_member.email}")
print(f"   Password: TestPassword!742")

print(f"\n📋 Current member documents:")
docs = MemberDocument.objects.filter(member=test_member, is_deleted=False)
for doc in docs:
    print(f"   - {doc.id} | {doc.document_type} | {doc.status}")

print(f"\n✅ Test documents created successfully!")
print(f"🎯 Try deleting these documents via the API or frontend.")