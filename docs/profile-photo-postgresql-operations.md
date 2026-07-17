# PostgreSQL profile-photo backup and recovery operations

`ProfilePhoto.image_data` and `ProfilePhoto.thumbnail_data` are PostgreSQL
`BYTEA` values. They are protected by the database backup; no profile-photo
backup should read `/media/`, object storage, or a Base64 export.

## Daily encrypted off-site backup

Use a dedicated backup runner (not the web container) with `pg_dump`,
`pg_restore`, `psql`, `age`, `rclone`, `curl`, and access only to the PostgreSQL
primary and one dedicated remote prefix. Copy
[`ops/postgres-backup.env.example`](../ops/postgres-backup.env.example) outside
the repository, replace the placeholders, and keep it mode `0600`.

The runner's PostgreSQL role needs `CONNECT` plus read access sufficient for
`pg_dump`; it must not be the Django application owner. Use `PGPASSFILE` or a
secret manager. Keep the age *identity* separate from the runner: the runner
only receives the public recipient key, while recovery staff access the
identity through the incident process.

Schedule the helper daily, for example at 01:15 UTC:

```cron
15 1 * * * backup /usr/local/bin/run-matiromony-backup
```

`/usr/local/bin/run-matiromony-backup` should load the protected environment
file and invoke the checked-out script without printing secrets:

```sh
#!/bin/sh
set -a
. /etc/matiromony/postgres-backup.env
set +a
exec /usr/bin/env bash /srv/matiromony/ops/postgres-backup.sh
```

The script makes a custom-format `pg_dump`, verifies it with `pg_restore
--list`, encrypts it with `age`, calculates a SHA-256 sidecar, then copies all
three files (archive, checksum, manifest) with `rclone copyto`. It never uses
`sync`, so a failed local job cannot remove an off-site copy. It keeps 30 days
locally and remotely when `BACKUP_PRUNE_REMOTE=1`. The temporary unencrypted
dump is mode-restricted and removed at job exit; retained local copies are
`age` encrypted.

Configure the remote store independently as the final safeguard:

- Restrict the backup credential to the exact `BACKUP_REMOTE_URL` prefix.
- Enable server-side encryption, versioning/object lock where supported, and a
  lifecycle rule that retains backup objects for at least 30 days.
- Alert if no new manifest is present by 02:30 UTC. The script can additionally
  send warnings/failures to `BACKUP_ALERT_WEBHOOK_URL`.
- Test that an operator without the recovery identity cannot decrypt an object.

## Restore verification and WAL/PITR

Run a restore verification at least weekly against an isolated PostgreSQL
server, not the primary and not the production Docker volume. Download one
off-site `postgres-*.dump.age` plus its `.sha256` file, then use a recovery-only
age identity:

```sh
export BACKUP_FILE=/secure/download/postgres-matiromony-20260717T011500Z.dump.age
export BACKUP_AGE_IDENTITY_FILE=/run/secrets/postgres-backup.agekey
export RESTORE_PGHOST=restore-postgres.internal
export RESTORE_PGUSER=restore_operator
/usr/bin/env bash /srv/matiromony/ops/verify-postgres-restore.sh
```

The verifier refuses database names outside the `restore_verify_*` namespace,
checks the archive checksum when available, restores with `--exit-on-error`,
and confirms both `django_migrations` and bytes in `profile_photos`. Record the
backup timestamp, restore duration, photo-row count, byte totals, and reviewer
in the operations log. Drop the disposable verification database only after
recording the result.

Logical daily dumps are not point-in-time recovery. For a production recovery
point between daily dumps, configure continuous WAL archiving with a supported
tool such as pgBackRest or WAL-G, encrypt its repository, and retain its base
backups/WAL on the same approved off-site storage. At least quarterly, perform
an isolated PITR drill:

1. Restore a base backup to a disposable PostgreSQL instance.
2. Configure the tool's `restore_command`, add `recovery.signal`, and set a
   `recovery_target_time` between two known writes.
3. Start PostgreSQL and verify recovery reaches the requested time without WAL
   gaps (`pg_last_wal_replay_lsn()` and the tool's archive verification).
4. Query `profile_photos`, including `octet_length(image_data)`, and compare
   against the recorded expected state. Record the measured RTO/RPO.

Do not enable `archive_mode` without a tested archive command and alerting.
Monitor `pg_stat_archiver.failed_count`, `last_failed_time`, and archive age;
any failure or a stale archive is a paging event.

The repository includes [`ops/check-postgres-wal-archive.sh`](../ops/check-postgres-wal-archive.sh)
for the daily health check after continuous archiving is configured. Load the
same protected PostgreSQL connection environment, set
`WAL_ARCHIVE_MAX_AGE_MINUTES` for the expected write rate, configure
`archive_timeout` below that threshold so idle databases still archive, and
make a non-zero result page the on-call operator. Send the cumulative
`failed_count` as a metric too, alerting when it increases. This health check
complements, not replaces, the quarterly isolated PITR drill above.

## Capacity, alerts, and release checks

The backup helper checks the local backup filesystem and the configured
database-volume filesystem before creating a dump. It warns at 70%, sends a
high-severity alert at 80%, and fails/pages at 85% by default; set
`BACKUP_DATABASE_DISK_PATH` to the host
mount behind the `db_data` Docker volume rather than the container path. Alert
separately on:

Before writing a dump, the helper also compares `pg_database_size()` with
absolute free bytes. It reserves space for three peak copies (custom dump,
encrypted working copy, and retained encrypted copy) plus whichever is larger:
the 85% emergency headroom or 5 GiB. An otherwise-low percentage cannot hide
an undersized filesystem.

- no successful off-site manifest in 25 hours;
- backup/restore job failure, checksum mismatch, or age decryption failure;
- PostgreSQL database size growth and `pg_stat_archiver` failures;
- remote storage lifecycle/object-lock configuration drift.

For planning, 30,000 members with up to 180,000 compressed photos means roughly
54-90 GB of primary photo bytes at the 300-500 KB planning assumption per stored image, before
PostgreSQL indexes, free space, WAL, and backup retention. Size the primary
volume with at least 30% headroom and size the off-site repository for the
retention window plus versions/WAL. `BACKUP_LOCAL_DIR` retains 30 encrypted
daily snapshots too, so provision it for the chosen retention window (and at
least two full-database sizes for staging) on a dedicated encrypted volume.
Measure the actual value with:

```sql
SELECT pg_size_pretty(pg_database_size(current_database()));
SELECT pg_size_pretty(pg_total_relation_size('profile_photos'));
SELECT count(*) AS photos,
       avg(compressed_size_bytes + thumbnail_size_bytes)::bigint AS average_bytes,
       percentile_cont(ARRAY[0.50, 0.95, 0.99]) WITHIN GROUP (
           ORDER BY compressed_size_bytes + thumbnail_size_bytes
       ) AS p50_p95_p99_bytes
FROM profile_photos;
```

The 300-500 KB value is a capacity assumption, not a measured application
average. Record the query result above after backfill and alert when the
observed average or upper percentiles materially exceed the plan.

## Permanent-account deletion recovery

Permanent member deletion removes all `ProfilePhoto` BYTEA rows in the same
database transaction and enqueues each private verification-document storage
key in `stored_file_deletion_tasks` before its metadata row is cascaded. Celery
Beat retries due tasks every five minutes, verifies the object is absent, and
removes the temporary storage key only after success. Alert whenever queued
tasks are overdue or their attempt count grows. Operators can also run a
bounded recovery batch manually:

```sh
python manage.py retry_stored_file_deletions --limit 100
```

The durable task is operational cleanup state, not a legal audit record. It
contains no file bytes and disappears after confirmed deletion; permanent
audit records retain no path, filename, checksum, or image binary.

Before enabling the profile-photo cutover in production, take and verify a
fresh backup and follow the mandatory staged procedure in
[`profile-photo-bytea-cutover.md`](profile-photo-bytea-cutover.md). Upload and
retrieve a test image through the authenticated endpoint, then perform one
restore verification from the new backup. Legacy originals are removed only
by that procedure's dry-run-first, audited purge command.
