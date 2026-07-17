import json

import pytest
from django.core.cache import cache
from django.core.files.storage import FileSystemStorage
from django.core.files.storage import storages
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.db import transaction
from django.test import override_settings
from django.utils import timezone

from apps.accounts.models import Member, MemberDocument, SuperAdminActivityLog
from apps.accounts.services import permanently_delete_member
from apps.common.models import StoredFileDeletionTask
from apps.profiles.models import ProfilePhoto, ProfilePhotoAuditLog


pytestmark = pytest.mark.django_db


def _use_test_document_storage(monkeypatch, tmp_path, storage_class=FileSystemStorage):
    storage = storage_class(location=tmp_path)
    field = MemberDocument._meta.get_field('file_path')
    monkeypatch.setattr(field, 'storage', storage)
    monkeypatch.setitem(storages._storages, 'private_media', storage)
    return storage


def _create_document(member):
    return MemberDocument.objects.create(
        member=member,
        document_type='identity_proof',
        file_path=SimpleUploadedFile('identity-proof.pdf', b'private document bytes'),
    )


def _create_photo(member, *, checksum='a' * 64, display_order=0, is_primary=True):
    return ProfilePhoto.objects.create(
        user=member,
        image_data=b'private compressed image bytes',
        thumbnail_data=b'private thumbnail bytes',
        original_filename='portrait.jpg',
        original_size_bytes=1024,
        compressed_size_bytes=30,
        thumbnail_size_bytes=23,
        checksum=checksum,
        display_order=display_order,
        is_primary=is_primary,
        status=ProfilePhoto.Status.APPROVED,
    )


@override_settings(PERMANENT_DELETE_DOCUMENT_POLICY='delete_immediately')
def test_permanent_delete_cascades_photos_keeps_audit_and_erases_document_file(
    authenticated_client,
    django_capture_on_commit_callbacks,
    member,
    monkeypatch,
    super_admin,
    tmp_path,
):
    storage = _use_test_document_storage(monkeypatch, tmp_path)
    document = _create_document(member)
    stored_name = document.file_path.name
    photo = _create_photo(member)
    secondary_photo = _create_photo(
        member,
        checksum='b' * 64,
        display_order=1,
        is_primary=False,
    )
    member_id = member.pk
    photo_id = photo.pk
    secondary_photo_id = secondary_photo.pk
    cache.set(f'profile:{member_id}', {'stale': True})
    cache.set(f'member:{member_id}:profile', {'stale': True})

    with django_capture_on_commit_callbacks(execute=True):
        response = authenticated_client(super_admin).patch(
            f'/api/v1/admin/users/{member_id}/',
            {'action': 'permanent_delete'},
            format='json',
        )
        assert storage.exists(stored_name)

    assert response.status_code == 200
    assert not Member.objects.filter(pk=member_id).exists()
    assert not ProfilePhoto.objects.filter(pk=photo_id).exists()
    assert not ProfilePhoto.objects.filter(pk=secondary_photo_id).exists()
    assert not MemberDocument.objects.filter(pk=document.pk).exists()
    assert not storage.exists(stored_name)
    assert cache.get(f'profile:{member_id}') is None
    assert cache.get(f'member:{member_id}:profile') is None

    photo_audit = ProfilePhotoAuditLog.objects.get(
        photo_id=photo_id,
        action=ProfilePhotoAuditLog.Action.DELETED,
    )
    assert photo_audit.member_id == member_id
    assert photo_audit.actor_id == super_admin.pk
    assert photo_audit.details == {
        'reason': 'permanent_member_deletion',
        'status': ProfilePhoto.Status.APPROVED,
        'is_primary': True,
    }
    assert ProfilePhotoAuditLog.objects.filter(
        photo_id=secondary_photo_id,
        action=ProfilePhotoAuditLog.Action.DELETED,
    ).count() == 1
    assert StoredFileDeletionTask.objects.count() == 0

    deletion_audit = SuperAdminActivityLog.objects.get(
        actor_id=super_admin.pk,
        action='MEMBER_PERMANENTLY_DELETED',
        target_id=str(member_id),
    )
    assert deletion_audit.old_data['profile_photo_count'] == 2
    assert deletion_audit.old_data['document_count'] == 1
    assert deletion_audit.old_data['document_retention_policy'] == 'delete_immediately'
    assert 'retained_document_metadata' not in deletion_audit.old_data


@override_settings(PERMANENT_DELETE_DOCUMENT_POLICY='retain_metadata')
def test_legal_retention_preserves_only_document_metadata_and_still_erases_file(
    authenticated_client,
    django_capture_on_commit_callbacks,
    member,
    monkeypatch,
    super_admin,
    tmp_path,
):
    storage = _use_test_document_storage(monkeypatch, tmp_path)
    document = _create_document(member)
    document_id = document.pk
    stored_name = document.file_path.name
    member_id = member.pk

    with django_capture_on_commit_callbacks(execute=True):
        response = authenticated_client(super_admin).patch(
            f'/api/v1/admin/users/{member_id}/',
            {'action': 'permanent_delete'},
            format='json',
        )

    assert response.status_code == 200
    assert not storage.exists(stored_name)
    assert not MemberDocument.objects.filter(pk=document_id).exists()
    assert StoredFileDeletionTask.objects.count() == 0

    deletion_audit = SuperAdminActivityLog.objects.get(
        actor_id=super_admin.pk,
        action='MEMBER_PERMANENTLY_DELETED',
        target_id=str(member_id),
    )
    retained = deletion_audit.old_data['retained_document_metadata']
    assert retained == [
        {
            'document_id': str(document_id),
            'document_type': 'identity_proof',
            'status': MemberDocument.Status.PENDING,
            'uploaded_at': retained[0]['uploaded_at'],
            'reviewed_at': None,
            'reviewed_by_id': None,
        }
    ]
    assert 'file_path' not in retained[0]
    assert 'filename' not in retained[0]
    assert 'private document bytes' not in json.dumps(deletion_audit.old_data)


@override_settings(PERMANENT_DELETE_DOCUMENT_POLICY='delete_immediately')
def test_transaction_rollback_does_not_delete_document_file(
    django_capture_on_commit_callbacks,
    member,
    monkeypatch,
    super_admin,
    tmp_path,
):
    storage = _use_test_document_storage(monkeypatch, tmp_path)
    document = _create_document(member)
    stored_name = document.file_path.name
    member_id = member.pk

    with django_capture_on_commit_callbacks(execute=True) as callbacks:
        with pytest.raises(RuntimeError, match='force rollback'):
            with transaction.atomic():
                permanently_delete_member(member=member, actor=super_admin)
                raise RuntimeError('force rollback')

    assert callbacks == []
    assert Member.objects.filter(pk=member_id).exists()
    assert MemberDocument.objects.filter(pk=document.pk).exists()
    assert storage.exists(stored_name)
    assert StoredFileDeletionTask.objects.count() == 0


@override_settings(PERMANENT_DELETE_DOCUMENT_POLICY='delete_immediately')
def test_storage_failure_persists_outbox_until_idempotent_retry_succeeds(
    authenticated_client,
    django_capture_on_commit_callbacks,
    member,
    monkeypatch,
    super_admin,
    tmp_path,
):
    class FailingStorage(FileSystemStorage):
        fail_deletion = True

        def delete(self, name):
            if self.fail_deletion:
                raise OSError('simulated private storage outage')
            return super().delete(name)

    storage = _use_test_document_storage(monkeypatch, tmp_path, FailingStorage)
    document = _create_document(member)
    stored_name = document.file_path.name

    with django_capture_on_commit_callbacks(execute=True):
        response = authenticated_client(super_admin).patch(
            f'/api/v1/admin/users/{member.pk}/',
            {'action': 'permanent_delete'},
            format='json',
        )

    assert response.status_code == 200
    assert storage.exists(stored_name)
    task = StoredFileDeletionTask.objects.get()
    assert task.storage_alias == 'private_media'
    assert task.storage_key == stored_name
    assert task.attempt_count == 1
    assert task.last_error == 'OSError'
    assert 'private storage' not in task.last_error
    assert task.next_retry_at > timezone.now()

    storage.fail_deletion = False
    task.next_retry_at = None
    task.save(update_fields=('next_retry_at', 'updated_at'))
    call_command('retry_stored_file_deletions', limit=10)

    assert not storage.exists(stored_name)
    assert StoredFileDeletionTask.objects.count() == 0

    # Re-running after success is a no-op rather than an error or second delete.
    call_command('retry_stored_file_deletions', limit=10)
    assert StoredFileDeletionTask.objects.count() == 0
