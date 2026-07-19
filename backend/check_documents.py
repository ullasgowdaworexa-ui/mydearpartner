#!/usr/bin/env python
"""Check existing documents and provide correct IDs for testing."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import Member, MemberDocument

print("=== CHECKING EXISTING DOCUMENTS ===")

# Find the test member
test_member = Member.objects.filter(email='test@example.com').first()
if not test_member:
    print("❌ Test member not found. Run fix_member_login.py first.")
    exit()

print(f"✅ Found member: {test_member.email} (ID: {test_member.id})")

# Check all documents for this member
documents = MemberDocument.objects.filter(member=test_member).order_by('-uploaded_at')
print(f"\n📋 Documents for {test_member.email}:")
print(f"Total documents: {documents.count()}")

if documents.count() == 0:
    print("\n❌ No documents found for this member.")
    print("💡 Upload a document through the frontend first, then try delete.")
else:
    for doc in documents:
        print(f"\n📄 Document ID: {doc.id}")
        print(f"   Type: {doc.document_type}")
        print(f"   Status: {doc.status}")
        print(f"   Filename: {doc.file_name}")
        print(f"   Size: {doc.file_size} bytes")
        print(f"   Uploaded: {doc.uploaded_at}")
        print(f"   Is Deleted: {doc.is_deleted}")
        print(f"   DELETE URL: DELETE /api/proxy/member-auth/me/documents/{doc.id}/")
        
        if doc.status == MemberDocument.Status.APPROVED:
            print(f"   ⚠️  APPROVED - Needs deletion reason:")
            print(f"   DELETE /api/proxy/member-auth/me/documents/{doc.id}/?reason=Test deletion")

# Check documents from all members (to see if there are any)
print(f"\n🌍 All documents in database:")
all_docs = MemberDocument.objects.all().order_by('-uploaded_at')[:10]
print(f"Total documents system-wide: {MemberDocument.objects.count()}")

for doc in all_docs:
    member_email = doc.member.email if doc.member else 'Unknown'
    print(f"📄 {doc.id} | {member_email} | {doc.document_type} | {doc.status} | Deleted: {doc.is_deleted}")

# Check the specific document that was giving 404
specific_id = '2373b6e6-d8c0-451f-8ce6-8015315387be'
specific_doc = MemberDocument.objects.filter(id=specific_id).first()
print(f"\n🔍 Checking specific document {specific_id}:")
if specific_doc:
    print(f"   ✅ Found: {specific_doc.document_type} | Status: {specific_doc.status}")
    print(f"   Owner: {specific_doc.member.email}")
    print(f"   Is Deleted: {specific_doc.is_deleted}")
    if specific_doc.member != test_member:
        print(f"   ⚠️  This document belongs to a different member!")
else:
    print(f"   ❌ Document {specific_id} not found (may have been deleted)")

print("\n=== TESTING INSTRUCTIONS ===")
if documents.exists():
    active_doc = documents.filter(is_deleted=False).first()
    if active_doc:
        print(f"✅ Test with this document ID: {active_doc.id}")
        print(f"DELETE /api/proxy/member-auth/me/documents/{active_doc.id}/")
        if active_doc.status == MemberDocument.Status.APPROVED:
            print("Add reason: ?reason=Testing delete functionality")
    else:
        print("❌ No active documents to test with")
else:
    print("❌ No documents found. Upload one first through the frontend.")