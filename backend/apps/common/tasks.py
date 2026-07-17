from celery import shared_task

from .file_deletion import process_due_stored_file_deletions


@shared_task(name='apps.common.tasks.retry_stored_file_deletions')
def retry_stored_file_deletions(limit: int = 100):
    attempted, deleted, pending = process_due_stored_file_deletions(limit=limit)
    return {
        'attempted': attempted,
        'deleted': deleted,
        'pending': pending,
    }
