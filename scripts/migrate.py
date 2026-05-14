#!/usr/bin/env python3
"""Database migration script - reads and executes migrate.sql"""

import os
import sys
from pathlib import Path

import psycopg2

def migrate():
    """Execute migration SQL against the database"""
    db_url = os.environ.get("DB_URL", "postgresql://user:pass@localhost:5432/url_db")
    
    # Parse connection string
    # Expected format: postgresql://user:pass@host:port/db
    try:
        # Extract components from URL
        parts = db_url.replace("postgresql://", "").split("@")
        creds = parts[0].split(":")
        user, password = creds[0], creds[1]
        
        host_port_db = parts[1].split("/")
        host_port = host_port_db[0].split(":")
        host = host_port[0]
        port = int(host_port[1]) if len(host_port) > 1 else 5432
        database = host_port_db[1]
    except (IndexError, ValueError) as e:
        print(f"Error parsing DB_URL: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Read migration SQL
    migrate_sql_path = Path(__file__).parent / "migrate.sql"
    if not migrate_sql_path.exists():
        print(f"Migration file not found: {migrate_sql_path}", file=sys.stderr)
        sys.exit(1)
    
    migration_sql = migrate_sql_path.read_text()
    
    # Connect and execute
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database
        )
        cursor = conn.cursor()
        
        print(f"Connected to {database} on {host}:{port}")
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
