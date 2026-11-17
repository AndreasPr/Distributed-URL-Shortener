# Local backup and restore verification

Date: 2026-11-16. Branch: step-15-8-free-tier-reliability.

Command: `bash scripts/backup_restore_drill.sh` (exit 0).
Docker 27.4.0; PostgreSQL 16.13 Alpine; age and Python installed in the disposable tooling image. Applied the real Alembic head, then seeded one synthetic user, workspace membership, link and click. Generated a separate disposable encryption identity; the supplied production public recipient was not used for this drill and its private key was not accessed.

Actual output excerpt:

```text
PASS: Alembic head and synthetic tenant/link/click fixture created
PASS: create completed
PASS: restore completed
PASS: restored users=1 links=1 clicks=1 memberships=1; all public tables retain RLS
FAIL: backup/restore (ValueError); inspect configuration privately
PASS: nonempty target refused; disposable container, keys and dumps removed on exit
```

The `FAIL` line is the expected negative test: a second restore into the already populated database is refused. The outer drill exited 0. Its EXIT trap removed the container and temporary files; the reusable tooling image remains, without database data or keys.

An initial drill exited 1 because the libpq database argument was incorrectly encoded; the script now passes parsed PGHOST/PGPORT/PGUSER/PGDATABASE/PGPASSWORD environment fields. The corrected drill above passed.

This proves local dump/compression/encryption/decryption/restore and RLS preservation for the application fixture. It does not prove hosted credentials, Supabase system-schema portability, GitHub artifact upload, or recovery of storage objects, provider settings, roles and grants. The nightly workflow uses the newer PostgreSQL 18.7 client; that hosted workflow has not run here. Perform a real encrypted backup and a separate local restore drill before relying on it. See [backup instructions](backups.md).
