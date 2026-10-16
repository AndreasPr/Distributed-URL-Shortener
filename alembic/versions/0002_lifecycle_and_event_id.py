"""Prepare URL lifecycle/ownership and event deduplication storage."""

import sqlalchemy as sa

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    # 0001 already has the unique short_code constraint (and its PG index)
    # and the (short_code, clicked_at DESC) analytics index. Do not duplicate them.
    op.add_column("urls", sa.Column("expires_at", sa.TIMESTAMP(), nullable=True))
    op.add_column("urls", sa.Column("deleted_at", sa.TIMESTAMP(), nullable=True))
    op.add_column("urls", sa.Column("created_by", sa.String(), nullable=True))
    op.add_column("analytics", sa.Column("event_id", sa.String(), nullable=True))
    op.create_index(
        "uq_analytics_event_id",
        "analytics",
        ["event_id"],
        unique=True,
        postgresql_where=sa.text("event_id IS NOT NULL"),
        sqlite_where=sa.text("event_id IS NOT NULL"),
    )


def downgrade():
    op.drop_index("uq_analytics_event_id", table_name="analytics")
    op.drop_column("analytics", "event_id")
    op.drop_column("urls", "created_by")
    op.drop_column("urls", "deleted_at")
    op.drop_column("urls", "expires_at")
