import uuid

from django.db import models


class StoredFileDeletionTask(models.Model):
    """Durable, minimal tombstone for an external file awaiting erasure."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    storage_alias = models.CharField(max_length=64)
    storage_key = models.CharField(max_length=1024)
    attempt_count = models.PositiveIntegerField(default=0)
    last_error = models.TextField(blank=True)
    next_retry_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'stored_file_deletion_tasks'
        ordering = ('created_at',)
        constraints = [
            models.UniqueConstraint(
                fields=('storage_alias', 'storage_key'),
                name='unique_stored_file_deletion_task',
            ),
        ]

    def __str__(self):
        return f'Stored file deletion task {self.pk}'
