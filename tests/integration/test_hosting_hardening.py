"""Catalog audit and read-only enforcement on disposable PostgreSQL."""

import pytest
from sqlalchemy.exc import DBAPIError

from scripts.check_supabase_hardening import inspect

pytestmark = pytest.mark.integration


def test_catalog_audit_detects_grants_and_enforces_readonly(pg_engine):
    with pg_engine.begin() as admin:
        exists = admin.exec_driver_sql(
            "SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon')"
        ).scalar()
        if not exists:
            admin.exec_driver_sql("CREATE ROLE anon NOLOGIN")
        admin.exec_driver_sql("CREATE TABLE public.hosted_hardening_probe (id int)")
        admin.exec_driver_sql("GRANT SELECT ON public.hosted_hardening_probe TO anon")
    try:
        with pg_engine.connect() as connection:
            problems = inspect(connection)
            assert "hosted_hardening_probe: RLS disabled" in problems
            assert any(
                p.startswith("hosted_hardening_probe: anon has") for p in problems
            )
            assert (
                connection.exec_driver_sql("SHOW transaction_read_only").scalar()
                == "on"
            )
            with pytest.raises(DBAPIError):
                connection.exec_driver_sql(
                    "CREATE TABLE public.must_not_exist (id int)"
                )
            connection.rollback()
    finally:
        with pg_engine.begin() as admin:
            admin.exec_driver_sql("DROP TABLE public.hosted_hardening_probe")
            if not exists:
                admin.exec_driver_sql("DROP ROLE anon")
