# Encrypted nightly backup and local restore

The workflow is **off until explicitly enabled**. Only public age recipients are
committed in `backups/recipients.txt`; keep the private identity on your own
machine/offline storage, never GitHub, Render or this repository. Losing that
private identity makes backups unrecoverable. A public recipient is safe to commit.

## Configure (operator only)

1. Supabase → project → **Connect → Session pooler**. Copy its actual connection
   details. The IPv4 endpoint is `aws-[INDEX]-[REGION].pooler.supabase.com:5432`;
   user `postgres.[PROJECT-REF]` (or a qualified custom role). Do not guess INDEX
   from region. **6543 is transaction mode and is refused by this script.** Add
   `sslmode=require` or verified TLS. The free direct endpoint is IPv6; the shared
   session pooler is the appropriate IPv4 path for these GitHub-hosted runners.
   [Official endpoint table](https://supabase.com/docs/guides/database/connecting-to-postgres).
2. Save the connection privately as **production environment secret**
   `BACKUP_DATABASE_URL` in GitHub. The account must be able to dump all intended
   schemas/rows, including RLS-protected data; insufficient privileges fail rather
   than silently claiming success. Never paste it into logs/issues/commands.
3. Verify `backups/recipients.txt` matches your private age identity's public
   recipient (`age-keygen -y /private/path/identity.txt`). Do not send the private
   file anywhere. Keep a separate private recovery copy.
4. Set repository variable `BACKUPS_ENABLED=true`. Merge the workflow to the
   default branch; **Encrypted nightly backup → Run workflow**. Confirm the run
   succeeds and the only artifact is `encrypted-database-RUN_ID` containing
   `relaymark.dump.age`. Download/decrypt privately as an operator to prove your
   actual key matches. We did not run a hosted backup or read your private key.
5. The schedule is 03:23 UTC nightly. GitHub schedules can be delayed/disabled;
   inspect the last successful artifact date. Retention is **14 days**. Ensure
   environment protection permits trusted scheduled runs; required reviewers may
   leave nightly jobs awaiting approval. Respect account artifact-storage limits.

The job uses `postgres:18.7-bookworm` client tools and installs age with apt. Check
that pg_dump's major version is at least your Supabase server major; incompatible
versions fail the job. A PostgreSQL 19 server would need a reviewed tool update.
No paid resources are provisioned. Treat public-repository artifacts as publicly
exposed: **only age-encrypted files are uploaded**, never logs containing DSNs,
plain dumps, private keys, or a wildcard temporary directory.

## What is backed up

`pg_dump --format=custom --compress=6 --no-owner --no-acl` streams a compressed
logical database archive directly into age. It includes accessible schemas/data
(including auth if the role can read it), not role definitions, grants/ownership,
Supabase project configuration, storage object files, Redis/Streams, or signing
secrets. pg_dump is snapshot-consistent but cannot preserve later transactions.
Worst-case loss is at least the time since the last successful nightly dump.
A failed dump/encryption never produces a final uploadable file. The private
connection is passed using libpq environment variables, not process arguments.
No stdout/stderr containing SQL or credentials is printed.

A real Supabase archive may require Supabase roles/extensions/platform services;
a plain local restore of synthetic application data does not prove full Supabase
service recovery. Keep schema migrations and platform setup instructions too.

## Restore to an empty local database

Install `age`, PostgreSQL client tools compatible with the dump, and Python 3.9+.
Prepare a **new empty loopback PostgreSQL database**. Set `RESTORE_DATABASE_URL`
privately in your shell, then:

```bash
bash scripts/restore_backup.sh /private/path/relaymark.dump.age /private/path/age-identity.txt
```

This script refuses a non-loopback target and any target with user tables. It
fully authenticates/decrypts the archive into a mode-0700 temporary directory
before running SQL. `pg_restore` uses one transaction, exits on error, and does
not restore original owners/ACLs. Temporary plaintext is deleted on normal exit
or exceptions; a forcibly killed process or machine failure still requires local
cleanup. Use an encrypted local disk. No automatic remote/production restore or
`--clean` destructive mode is provided. Review roles, privileges and RLS before
promoting a recovered database; re-run the hardening audit on Supabase afterward.

## Reproducible synthetic drill

```bash
bash scripts/backup_restore_drill.sh
```

Needs Docker and the project's `.venv`. It builds local age/Python tools, starts
an isolated PostgreSQL 16.13 container with a loopback ephemeral port, applies the
real Alembic head, seeds synthetic user/membership/link/click records, generates a
**disposable** private age identity, encrypts/restores, checks row counts and RLS,
and rejects a second restore into the nonempty target. The EXIT trap removes the
container (including keys and dumps) and temporary build directory. Existing
Compose services/volumes are untouched. The reusable tools image is left cached;
remove it with `docker image rm relaymark-backup-drill:local` if desired.

[Recorded drill results](backup-restore-verification.md).

## Rotation

Add a new public recipient alongside the old one, run a backup and prove decryption
with the new private key, then remove the old recipient for future backups.
Retain the old private key until its retained archives are gone. Rotate the
Supabase password/role credential in GitHub privately and run a manual backup;
never commit it. Disabling this workflow does not delete retained ciphertext.
