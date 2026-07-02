#!/usr/bin/env python3
"""Database migration script - reads and executes migrate.sql"""

import os
import sys
from pathlib import Path

import psycopg2


def migrate():
    """Execute migration SQL against the database."""
    db_url = os.environ.get("DATABASE_URL") or os.environ.get(
        "DB_URL", "postgresql://user:pass@localhost:5433/url_db"
    )

    migrate_sql_path = Path(__file__).parent / "migrate.sql"
    if not migrate_sql_path.exists():
        print(f"Migration file not found: {migrate_sql_path}", file=sys.stderr)
        sys.exit(1)

    migration_sql = migrate_sql_path.read_text()

    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()

        print("Connected to database")
        cursor.execute(migration_sql)
        conn.commit()

        print("Migration completed successfully")
        cursor.close()
        conn.close()
    except psycopg2.Error as e:
        print(f"Database error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    migrate()
