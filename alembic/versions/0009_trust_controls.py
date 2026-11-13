"""Trust records, quota accounting and abuse reports."""

import sqlalchemy as sa

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "daily_creations",
        sa.Column(
            "user_id",
            sa.Uuid(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("day", sa.Date(), primary_key=True),
        sa.Column("count", sa.Integer(), nullable=False),
    )
    op.create_table(
        "denied_domains",
        sa.Column("domain", sa.String(253), primary_key=True),
        sa.Column(
            "created_at", sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_table(
        "deleted_identities", sa.Column("subject_hash", sa.String(64), primary_key=True)
    )
    op.create_table(
        "abuse_reports",
        sa.Column("id", sa.Uuid(as_uuid=False), primary_key=True),
        sa.Column(
            "workspace_id",
            sa.Uuid(as_uuid=False),
            sa.ForeignKey("workspaces.id"),
            nullable=False,
            server_default="00000000000000000000000000000001",
        ),
        sa.Column(
            "created_by_user_id", sa.Uuid(as_uuid=False), sa.ForeignKey("users.id")
        ),
        sa.Column(
            "short_code",
            sa.String(32),
            sa.ForeignKey("urls.short_code", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column(
            "created_at", sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Uuid(as_uuid=False), primary_key=True),
        sa.Column(
            "workspace_id",
            sa.Uuid(as_uuid=False),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("actor_id", sa.String(64)),
        sa.Column("subject_user_id", sa.Uuid(as_uuid=False)),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("target", sa.String(100)),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column(
            "created_at", sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()
        ),
    )
    if op.get_context().dialect.name == "postgresql":
        for table in (
            "daily_creations",
            "denied_domains",
            "deleted_identities",
            "abuse_reports",
            "audit_log",
        ):
            op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')
            op.execute(f'REVOKE ALL ON TABLE "{table}" FROM PUBLIC')
            for role in ("anon", "authenticated"):
                op.execute(
                    f"DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}') THEN REVOKE ALL ON TABLE {table} FROM {role}; END IF; END $$"
                )


def downgrade():
    for table in (
        "audit_log",
        "abuse_reports",
        "deleted_identities",
        "denied_domains",
        "daily_creations",
    ):
        op.drop_table(table)
