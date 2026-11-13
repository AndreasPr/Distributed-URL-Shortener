"""Read-only catalog audit; never changes grants, policies, or application rows."""

import os
import sys

from sqlalchemy import create_engine

TABLES = """
SELECT c.relname, c.relrowsecurity,
       has_table_privilege('anon', c.oid,
         'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
       OR has_any_column_privilege('anon', c.oid,
         'SELECT,INSERT,UPDATE,REFERENCES') AS anon_access
FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
WHERE n.nspname='public' AND c.relkind IN ('r','p','f')
ORDER BY c.relname
"""


def inspect(connection):
    connection.execution_options(postgresql_readonly=True)
    transaction = connection.begin()
    try:
        connection.exec_driver_sql("SET LOCAL statement_timeout = '5000ms'")
        exists = connection.exec_driver_sql(
            "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon')"
        ).scalar()
        if not exists:
            return ["anon role missing: this is not a validated Supabase target"]
        rows = connection.exec_driver_sql(TABLES).fetchall()
        problems = [] if rows else ["No public tables found: wrong/empty database"]
        for name, rls, access in rows:
            if not rls:
                problems.append(f"{name}: RLS disabled")
            if access:
                problems.append(f"{name}: anon has effective table/column privileges")
        return problems
    finally:
        transaction.rollback()


def main():
    engine = None
    try:
        dsn = os.environ.get("HARDENING_DATABASE_URL", "")
        if not dsn:
            raise ValueError("missing DSN")
        engine = create_engine(
            dsn, connect_args={"connect_timeout": 5, "sslmode": "require"}
        )
        with engine.connect() as connection:
            problems = inspect(connection)
        for problem in problems:
            print("FAIL: " + problem)
        if not problems:
            print("PASS: public tables have RLS; anon has no table/column privileges")
        return int(bool(problems))
    except Exception:
        print("FAIL: catalog audit unavailable; check connection/access privately")
        return 1
    finally:
        if engine is not None:
            engine.dispose()


if __name__ == "__main__":
    sys.exit(main())
