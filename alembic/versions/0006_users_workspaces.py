"""Workspace tenancy and identity; preserve global short-code uniqueness."""

import sqlalchemy as sa

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None
DEFAULT = "00000000000000000000000000000001"
TENANTS = ("urls", "api_keys", "analytics", "url_verdicts", "abuse_outbox")
ROLES = "role IN ('owner', 'admin', 'member', 'viewer')"


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(as_uuid=False), primary_key=True),
        sa.Column(
            "email_verified", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("display_name", sa.String(200)),
        sa.Column("avatar_url", sa.String(2048)),
        sa.Column(
            "created_at", sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("last_login_at", sa.TIMESTAMP()),
        sa.Column("suspended_at", sa.TIMESTAMP()),
        sa.Column("deleted_at", sa.TIMESTAMP()),
    )
    op.create_table(
        "workspaces",
        sa.Column("id", sa.Uuid(as_uuid=False), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("plan", sa.String(32), nullable=False, server_default="free"),
        sa.Column(
            "created_at", sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()
        ),
    )
    op.execute(
        sa.text(
            f"INSERT INTO workspaces (id, name, slug) VALUES ('{DEFAULT}', 'Legacy workspace', 'legacy')"
        )
    )
    op.create_table(
        "workspace_members",
        sa.Column(
            "workspace_id",
            sa.Uuid(as_uuid=False),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            sa.Uuid(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column(
            "created_at", sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(ROLES, name="ck_workspace_member_role"),
    )
    op.create_table(
        "workspace_invites",
        sa.Column(
            "workspace_id",
            sa.Uuid(as_uuid=False),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("email", sa.String(320), primary_key=True),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column(
            "created_at", sa.TIMESTAMP(), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "created_by_user_id", sa.Uuid(as_uuid=False), sa.ForeignKey("users.id")
        ),
        sa.CheckConstraint(ROLES, name="ck_workspace_invite_role"),
    )
    for table in TENANTS:
        # ADD with a constant default backfills legacy rows without guessing owners.
        with op.batch_alter_table(table) as batch:
            batch.add_column(
                sa.Column(
                    "workspace_id",
                    sa.Uuid(as_uuid=False),
                    nullable=False,
                    server_default=DEFAULT,
                )
            )
            batch.add_column(sa.Column("created_by_user_id", sa.Uuid(as_uuid=False)))
            batch.create_foreign_key(
                f"fk_{table}_workspace", "workspaces", ["workspace_id"], ["id"]
            )
            batch.create_foreign_key(
                f"fk_{table}_user", "users", ["created_by_user_id"], ["id"]
            )

    if op.get_context().dialect.name == "postgresql":
        # No policies until verified user JWT context is added in step 15.3.
        for table in (
            *TENANTS,
            "users",
            "workspaces",
            "workspace_members",
            "workspace_invites",
            "alembic_version",
        ):
            op.execute(sa.text(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY'))


def downgrade():
    if op.get_context().dialect.name == "postgresql":
        for table in (*TENANTS, "alembic_version"):
            op.execute(sa.text(f'ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY'))

    for table in reversed(TENANTS):
        with op.batch_alter_table(table) as batch:
            batch.drop_constraint(f"fk_{table}_user", type_="foreignkey")
            batch.drop_constraint(f"fk_{table}_workspace", type_="foreignkey")
            batch.drop_column("created_by_user_id")
            batch.drop_column("workspace_id")
    op.drop_table("workspace_invites")
    op.drop_table("workspace_members")
    op.drop_table("workspaces")
    op.drop_table("users")
