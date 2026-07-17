from __future__ import annotations

import logging
from datetime import timedelta

from django.core.files.storage import storages
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import StoredFileDeletionTask


logger = logging.getLogger(__name__)

PRIVATE_MEDIA_STORAGE_ALIAS = 'private_media'
MAX_ERROR_LENGTH = 1000


def _retry_delay(attempt_count: int) -> timedelta:
    delay_minutes = min(5 * (2 ** max(attempt_count - 1, 0)), 24 * 60)
    return timedelta(minutes=delay_minutes)


def _safe_error(exc: Exception) -> str:
    # Storage errors often include bucket names, signed query strings, or local
    # paths. Persist only the exception class; detailed diagnostics stay in the
    # storage provider and application logs.
    return type(exc).__name__[:MAX_ERROR_LENGTH]


def attempt_stored_file_deletion(task_id, *, storage=None) -> bool:
    """Try one idempotent deletion and retain retry state on any failure."""

    with transaction.atomic():
        try:
            task = StoredFileDeletionTask.objects.select_for_update().get(pk=task_id)
        except StoredFileDeletionTask.DoesNotExist:
            return True

        task.attempt_count += 1
        try:
            target_storage = storage if storage is not None else storages[task.storage_alias]
            target_storage.delete(task.storage_key)
            if target_storage.exists(task.storage_key):
                raise OSError('storage backend still reports the key as present')
        except Exception as exc:  # Storage implementations have backend-specific errors.
            task.last_error = _safe_error(exc)
            task.next_retry_at = timezone.now() + _retry_delay(task.attempt_count)
            task.save(
                update_fields=(
                    'attempt_count',
                    'last_error',
                    'next_retry_at',
                    'updated_at',
                )
            )
            logger.warning(
                'Stored file deletion task %s failed on attempt %s and remains queued.',
                task.pk,
                task.attempt_count,
            )
            return False

        task.delete()
        return True


def enqueue_stored_file_deletion(*, storage_alias: str, storage_key: str, storage=None):
    """Persist a deletion task now and attempt it only after transaction commit."""

    task, _ = StoredFileDeletionTask.objects.get_or_create(
        storage_alias=storage_alias,
        storage_key=storage_key,
    )
    task_id = task.pk
    transaction.on_commit(
        lambda: attempt_stored_file_deletion(task_id, storage=storage)
    )
    return task


def process_due_stored_file_deletions(*, limit: int = 100) -> tuple[int, int, int]:
    """Attempt a bounded due batch and return attempted/deleted/pending counts."""
    task_ids = list(
        StoredFileDeletionTask.objects.filter(
            Q(next_retry_at__isnull=True) | Q(next_retry_at__lte=timezone.now())
        )
        .order_by('created_at')
        .values_list('pk', flat=True)[:limit]
    )
    deleted = 0
    pending = 0
    for task_id in task_ids:
        if attempt_stored_file_deletion(task_id):
            deleted += 1
        else:
            pending += 1
    return len(task_ids), deleted, pending
