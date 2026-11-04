"""Real PostgreSQL checks: backfill, RLS default-deny and owner serialization."""

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import inspect, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session
from test_migrations import assert_matches_models, config

from alembic import command
from app.api.principal import Principal
from app.api.workspaces import change_member
from app.models.identity import DEFAULT_WORKSPACE_ID, User, WorkspaceMember


@pytest.mark.docker
def test_tenant_backfill_rls_and_downgrade(postgres):
    with postgres.begin() as connection:
        cfg = config(connection)
        command.upgrade(cfg, "0005")
        connection.execute(
            text(
                "INSERT INTO urls (short_code, long_url) VALUES ('legacy', 'https://example.com')"
            )
        )
        connection.execute(text("INSERT INTO analytics (short_code) VALUES ('legacy')"))
        connection.execute(
            text(
                "INSERT INTO api_keys (name, key_hash, prefix, scopes) VALUES ('legacy', 'hash', 'prefix', '[\"read\"]')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO url_verdicts (short_code, verdict, score, reasons, source) VALUES ('legacy', 'clean', 0, '[]', 'heuristic')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO abuse_outbox (short_code, event_id, trace_context) VALUES ('legacy', 'event', '{}')"
            )
        )
        command.upgrade(cfg, "head")
        assert_matches_models(connection)
        for table in ["urls", "api_keys", "analytics", "url_verdicts", "abuse_outbox"]:
            row = connection.execute(
                text(f"SELECT workspace_id, created_by_user_id FROM {table}")
            ).one()
            assert str(row[0]) == DEFAULT_WORKSPACE_ID and row[1] is None
        assert connection.scalar(text("SELECT slug FROM workspaces")) == "legacy"
        tables = inspect(connection).get_table_names()
        protected = (
            connection.execute(
                text(
                    "SELECT relname FROM pg_class JOIN pg_namespace n ON n.oid=relnamespace WHERE n.nspname='public' AND relkind='r' AND relrowsecurity"
                )
            )
            .scalars()
            .all()
        )
        assert set(protected) == set(tables)
        assert (
            connection.scalar(
                text("SELECT count(*) FROM pg_policies WHERE schemaname='public'")
            )
            == 0
        )
        # Temporary, unprivileged role proves ENABLE RLS means default-deny;
        # application table-owner access is separately documented, not called RLS enforcement.
        connection.execute(text("CREATE ROLE tenancy_probe NOLOGIN"))
        connection.execute(text("GRANT USAGE ON SCHEMA public TO tenancy_probe"))
        connection.execute(
            text(
                "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tenancy_probe"
            )
        )
        with connection.begin_nested():
            connection.execute(text("SET LOCAL ROLE tenancy_probe"))
            assert connection.scalar(text("SELECT count(*) FROM urls")) == 0
            with pytest.raises(DBAPIError):
                with connection.begin_nested():
                    connection.execute(
                        text(
                            "INSERT INTO workspaces (id, name, slug) VALUES ('00000000-0000-0000-0000-000000000099', 'denied', 'denied')"
                        )
                    )
            connection.execute(text("RESET ROLE"))
        command.downgrade(cfg, "0005")
        assert connection.scalar(text("SELECT count(*) FROM urls")) == 1
        assert "workspace_id" not in {
            column["name"] for column in inspect(connection).get_columns("urls")
        }
        command.upgrade(cfg, "head")
        assert_matches_models(connection)


@pytest.mark.docker
def test_concurrent_last_owner_demotions_serialize(postgres):
    with postgres.begin() as connection:
        command.upgrade(config(connection), "head")
    ids = [str(uuid4()), str(uuid4())]
    with Session(postgres) as db:
        db.add_all(
            [
                User(id=value, email=f"owner{index}@example.test")
                for index, value in enumerate(ids)
            ]
        )
        db.flush()
        db.add_all(
            [
                WorkspaceMember(
                    workspace_id=DEFAULT_WORKSPACE_ID, user_id=value, role="owner"
                )
                for value in ids
            ]
        )
        db.commit()
    barrier = Barrier(2)

    def demote(user_id):
        from uuid import UUID

        principal = Principal(
            workspace_id=DEFAULT_WORKSPACE_ID,
            user_id=user_id,
            role="owner",
            scopes=frozenset(),
            auth_method="user",
        )
        with Session(postgres) as db:
            barrier.wait(timeout=5)
            try:
                change_member(
                    db, principal, UUID(DEFAULT_WORKSPACE_ID), UUID(user_id), "member"
                )
                return 204
            except HTTPException as exc:
                db.rollback()
                return exc.status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(demote, ids)) == [204, 409]
    with Session(postgres) as db:
        assert (
            db.query(WorkspaceMember)
            .filter_by(workspace_id=DEFAULT_WORKSPACE_ID, role="owner")
            .count()
            == 1
        )
