from django.core.management.base import BaseCommand, CommandError
from apps.common.file_deletion import process_due_stored_file_deletions


class Command(BaseCommand):
    help = 'Retry due durable external-file deletion tasks.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=100,
            help='Maximum due tasks to attempt (default: 100).',
        )

    def handle(self, *args, **options):
        limit = options['limit']
        if limit < 1:
            raise CommandError('--limit must be at least 1.')

        attempted, deleted, pending = process_due_stored_file_deletions(limit=limit)

        self.stdout.write(
            self.style.SUCCESS(
                f'Attempted {attempted} task(s): {deleted} deleted, {pending} pending retry.'
            )
        )
