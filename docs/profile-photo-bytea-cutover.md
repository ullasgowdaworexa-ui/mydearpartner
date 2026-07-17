# Staged legacy profile-photo cutover

The `accounts.MemberPhoto` table is retired in two deployable phases so a
large image gallery is never converted inside a single database migration.
The backfill copies image content into compressed `profiles.ProfilePhoto`
BYTEA rows; it never removes the old media objects.

1. Take and verify a PostgreSQL backup plus a recoverable copy of the legacy
   media backend. Put profile-photo writes into a maintenance window (or run
   exactly one backfill worker) so new uploads cannot race the capacity check.
2. Deploy the code and run only the staging migration:

   ```sh
   python manage.py migrate profiles 0004_profilephotoauditlog_legacy_source_purged
   python manage.py migrate accounts 0014_migrate_member_photos_to_postgres_bytea
   ```

   With the root Compose deployment, explicitly select the one-way stage job:

   ```sh
   PROFILE_PHOTO_CUTOVER_PHASE=stage docker compose run --rm migrate true
   ```

   The job applies `profiles` 0004 and `accounts` 0014, then stops. Runtime web
   and worker containers never auto-run migrations. Stage mode refuses to run
   if 0015 or any later accounts/profiles migration is already applied, so it
   cannot rewind a finalized database.

   This keeps `member_photos` intact. The production `STORAGES['default']`
   setting must still point to the old ImageField objects for this phase.
3. Run a no-write preflight that also reads and processes every outstanding
   source file. It checks that no member would exceed six photos, that primary
   and status state can be preserved, and stops at the first unreadable or
   invalid image.

   ```sh
   python manage.py backfill_legacy_profile_photos --check-only --verify-files --batch-size 50
   ```

   Compose operators can run the same command against the direct PostgreSQL
   migration connection while `PROFILE_PHOTO_CUTOVER_PHASE=stage` remains set:

   ```sh
   PROFILE_PHOTO_CUTOVER_PHASE=stage docker compose run --rm migrate \
     python manage.py backfill_legacy_profile_photos --check-only --verify-files --batch-size 50
   ```

4. Backfill in bounded, resumable batches. Each successfully converted row is
   committed atomically, so rerunning the command skips its matching target
   UUID and continues after an interruption.

   ```sh
   python manage.py backfill_legacy_profile_photos --batch-size 50 --max-records 500
   python manage.py backfill_legacy_profile_photos --batch-size 50
   ```

   If the command reports a missing/corrupt source, an incompatible target, or
   a capacity conflict, it writes nothing for that failing row. Repair or
   explicitly reconcile that record, then rerun the same command.
5. Confirm the command reports zero pending records. Then run the mandatory
   no-write legacy-object purge rehearsal. It validates every WebP BYTEA
   counterpart again and only considers exact `member_photos/` source paths:

   ```sh
   python manage.py purge_legacy_profile_photo_files --batch-size 50
   ```

6. After the backup restore test has succeeded, explicitly purge the verified
   originals. The confirmation text and `--delete` flag are both required;
   the command is resumable and records one `LEGACY_SOURCE_PURGED` audit event
   per source row, including objects that were already absent.

   ```sh
   python manage.py purge_legacy_profile_photo_files \
     --delete \
     --confirm-backup-restore BACKUP_RESTORE_VERIFIED \
     --batch-size 50
   ```

7. Apply the guarded final migration:

   ```sh
   python manage.py backfill_legacy_profile_photos --check-only
   python manage.py migrate accounts 0015_finalize_legacy_profile_photo_cutover
   ```

   For Compose, switch phases explicitly only after the purge command reports
   success for every source row:

   ```sh
   PROFILE_PHOTO_CUTOVER_PHASE=final docker compose run --rm migrate true
   ```

   Migration 0015 verifies every legacy ID has a valid WebP BYTEA target with
   matching member/status/primary state, checksum and size metadata, exactly
   one primary photo per non-empty gallery, and a successful
   `LEGACY_SOURCE_PURGED` audit marker. It fails closed and leaves the old
   table in place if any validation fails.

The purge command never runs automatically and does not target anything
outside the exact legacy `member_photos/` path stored on each old row. Do not
perform broad filesystem or object-prefix deletion outside this audited flow.

## Real PostgreSQL contract test

The normal test suite uses SQLite. Before staging the cutover, run the opt-in
PostgreSQL test from an environment that can reach a disposable PostgreSQL
instance:

```sh
RUN_PROFILE_PHOTO_POSTGRES_TESTS=1 \
PROFILE_PHOTO_POSTGRES_TEST_DB=test_matiromony_profile_photos_ci \
python -m pytest apps/profiles/tests/test_postgresql_storage.py \
  --ds=config.settings.postgres_integration -q
```

Supply `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` through
the normal secret mechanism. `DB_NAME` is the existing maintenance database;
Django creates and drops the separate database named by
`PROFILE_PHOTO_POSTGRES_TEST_DB`. The role therefore needs temporary
`CREATEDB` permission. The dedicated name must begin with
`test_matiromony_profile_photos_`, and the settings module refuses to load
without the explicit opt-in flag.

The test queries PostgreSQL's catalogs and stored rows to prove both binary
columns are `bytea`. It also inserts multiple non-primary rows successfully,
then confirms PostgreSQL rejects a second primary row for the same member.
