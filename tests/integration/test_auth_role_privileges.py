"""Real ACL checks; SQLite cannot prove database-role isolation."""

from pathlib import Path

import pytest
from sqlalchemy import text

from alembic import command
from alembic.config import Config

pytestmark = pytest.mark.integration


def migration_config(connection):
    cfg = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    cfg.attributes["connection"] = connection
    return cfg


def test_hardening_is_noop_without_supabase_roles(pg_engine):
    with pg_engine.connect() as connection:
        transaction = connection.begin()
        try:
            assert (
                connection.scalar(
                    text(
                        "SELECT count(*) FROM pg_roles WHERE rolname IN "
                        "('anon','authenticated')"
                    )
                )
                == 0
            )
            cfg = migration_config(connection)
            command.downgrade(cfg, "0007")
            before = connection.execute(
                text(
                    "SELECT defaclrole, defaclnamespace, defaclobjtype, "
                    "defaclacl::text FROM pg_default_acl"
                )
            ).all()
            command.upgrade(cfg, "head")
            assert (
                connection.execute(
                    text(
                        "SELECT defaclrole, defaclnamespace, defaclobjtype, "
                        "defaclacl::text FROM pg_default_acl"
                    )
                ).all()
                == before
            )
        finally:
            transaction.rollback()


def test_hardening_revokes_existing_and_default_privileges(pg_engine):
    with pg_engine.connect() as connection:
        transaction = connection.begin()
        try:
            cfg = migration_config(connection)
            command.downgrade(cfg, "0007")
            for role in ("anon", "authenticated"):
                connection.execute(text(f"CREATE ROLE {role} NOLOGIN"))
                connection.execute(
                    text(f"GRANT ALL ON ALL TABLES IN SCHEMA public TO {role}")
                )
                connection.execute(
                    text(f"GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO {role}")
                )
                for kind in ("TABLES", "SEQUENCES", "FUNCTIONS"):
                    connection.execute(
                        text(
                            f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT "
                            f"ALL ON {kind} TO {role}"
                        )
                    )
            connection.execute(text("GRANT SELECT ON urls TO PUBLIC"))
            connection.execute(
                text(
                    "CREATE FUNCTION public.alignment_probe() RETURNS int "
                    "LANGUAGE sql AS 'SELECT 1'"
                )
            )
            command.upgrade(cfg, "head")
            connection.execute(
                text("CREATE TABLE public.alignment_future (id serial PRIMARY KEY)")
            )
            connection.execute(
                text(
                    "CREATE FUNCTION public.alignment_future_probe() RETURNS int "
                    "LANGUAGE sql AS 'SELECT 1'"
                )
            )
            for role in ("anon", "authenticated"):
                for table in (
                    "urls",
                    "users",
                    "api_keys",
                    "alembic_version",
                    "alignment_future",
                ):
                    assert not connection.scalar(
                        text(
                            "SELECT has_table_privilege(:role, :object, "
                            "'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')"
                        ),
                        {"role": role, "object": table},
                    )
                for sequence in ("urls_id_seq", "alignment_future_id_seq"):
                    assert not connection.scalar(
                        text(
                            "SELECT has_sequence_privilege(:role, :object, "
                            "'USAGE,SELECT,UPDATE')"
                        ),
                        {"role": role, "object": sequence},
                    )
                for function in ("alignment_probe()", "alignment_future_probe()"):
                    assert not connection.scalar(
                        text(
                            "SELECT has_function_privilege(:role, :object, 'EXECUTE')"
                        ),
                        {"role": role, "object": function},
                    )
            assert connection.scalar(
                text(
                    "SELECT relrowsecurity FROM pg_class WHERE oid = 'users'::regclass"
                )
            )
            assert connection.scalar(
                text("SELECT relrowsecurity FROM pg_class WHERE oid = 'urls'::regclass")
            )
            command.downgrade(cfg, "0007")
            assert not connection.scalar(
                text("SELECT has_table_privilege('anon', 'urls', 'SELECT')")
            )
        finally:
            transaction.rollback()
