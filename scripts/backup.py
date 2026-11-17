#!/usr/bin/env python3
"""Compressed pg_dump -> age. Only authenticated ciphertext leaves temp storage."""
import argparse
import os
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import parse_qs, unquote, urlsplit


def database_env(value: str, local: bool = False) -> dict[str, str]:
    url = urlsplit(value)
    if url.scheme not in {"postgres", "postgresql"} or not url.hostname:
        raise ValueError("Invalid database connection configuration")
    if local:
        if url.hostname not in {"localhost", "127.0.0.1", "::1"}:
            raise ValueError("Local drill requires a loopback database")
    elif (
        url.port != 5432
        or not re.fullmatch(r"aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com", url.hostname)
        or parse_qs(url.query).get("sslmode") not in [["require"], ["verify-full"]]
    ):
        raise ValueError("Backup requires the Supabase SESSION pooler on 5432 with TLS")
    if not url.username or not url.path.strip("/"):
        raise ValueError("Database user and name required")
    return {
        **os.environ, "PGHOST": url.hostname, "PGPORT": str(url.port or 5432),
        "PGUSER": unquote(url.username), "PGPASSWORD": unquote(url.password or ""),
        "PGDATABASE": unquote(url.path.lstrip("/")), "PGCONNECT_TIMEOUT": "10",
        "PGSSLMODE": parse_qs(url.query).get("sslmode", ["disable" if local else "require"])[0],
    }


def create_backup(dsn: str, recipients: Path, output: Path, local=False) -> None:
    env = database_env(dsn, local)
    keys = [line.strip() for line in recipients.read_text().splitlines() if line.strip() and not line.startswith("#")]
    if not keys or any(not re.fullmatch(r"age1[0-9a-z]{58}", key) for key in keys):
        raise ValueError("A valid public age recipient file is required")
    if output.suffix != ".age" or output.exists():
        raise ValueError("Choose a new .age output file")
    output.parent.mkdir(parents=True, exist_ok=True)
    os.umask(0o077)
    partial = output.with_suffix(".age.partial")
    dump = encrypt = None
    try:
        with tempfile.TemporaryFile() as errors, partial.open("xb") as target:
            dump = subprocess.Popen(
                ["pg_dump", "--format=custom", "--compress=6", "--no-owner", "--no-acl"],
                env=env, stdout=subprocess.PIPE, stderr=errors,
            )
            encrypt = subprocess.Popen(
                ["age", "--encrypt", "--recipients-file", str(recipients)],
                stdin=dump.stdout, stdout=target, stderr=errors,
            )
            assert dump.stdout is not None
            dump.stdout.close()
            encrypt_code = encrypt.wait(timeout=900)
            dump_code = dump.wait(timeout=30)
            if encrypt_code or dump_code:
                raise RuntimeError("Backup pipeline failed; inspect connection/permissions/tool versions privately")
        if partial.stat().st_size < 100 or not partial.open("rb").read(22).startswith(b"age-encryption.org/v1"):
            raise RuntimeError("Encrypted output validation failed")
        partial.replace(output)
    finally:
        for process in (dump, encrypt):
            if process is not None and process.poll() is None:
                process.kill()
                process.wait()
        partial.unlink(missing_ok=True)


def restore_backup(dsn: str, identity: Path, source: Path) -> None:
    # Deliberately local-only: remote production restores require a separate review.
    env = database_env(dsn, local=True)
    os.umask(0o077)
    with tempfile.TemporaryDirectory(prefix="relaymark-restore-") as folder, tempfile.TemporaryFile() as errors:
        plain = Path(folder) / "restore.dump"
        with plain.open("xb") as target:
            subprocess.run(["age", "--decrypt", "--identity", str(identity), str(source)], stdout=target, stderr=errors, check=True, timeout=300)
        # Authenticate the entire encrypted file before executing any SQL.
        empty = subprocess.run(
            ["psql", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p','f') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%';"],
            env=env, capture_output=True, check=True, timeout=30,
        )
        if empty.stdout.strip() != b"0":
            raise ValueError("Restore target must be an empty local database")
        subprocess.run(["pg_restore", "--dbname", "", "--single-transaction", "--exit-on-error", "--no-owner", "--no-acl", str(plain)], env=env, stdout=subprocess.DEVNULL, stderr=errors, check=True, timeout=900)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["create", "restore"])
    parser.add_argument("--file", type=Path, required=True)
    parser.add_argument("--recipients", type=Path, default=Path("backups/recipients.txt"))
    parser.add_argument("--identity", type=Path)
    parser.add_argument("--local", action="store_true")
    args = parser.parse_args()
    try:
        if args.action == "create":
            create_backup(os.environ["BACKUP_DATABASE_URL"], args.recipients, args.file, args.local)
        else:
            if not args.identity:
                raise ValueError("Identity file required")
            restore_backup(os.environ["RESTORE_DATABASE_URL"], args.identity, args.file)
        print("PASS: " + args.action + " completed")
    except Exception as exc:
        # subprocess exceptions may contain DSNs/SQL; print only class, never details.
        print("FAIL: backup/restore (" + type(exc).__name__ + "); inspect configuration privately")
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
