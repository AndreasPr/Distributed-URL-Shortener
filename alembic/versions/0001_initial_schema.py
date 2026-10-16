"""Reproduce the schema previously installed by scripts/migrate.sql."""

import sqlalchemy as sa

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "urls",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("short_code", sa.String(10), nullable=True),
        sa.Column("long_url", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.TIMESTAMP(), server_default=sa.func.now(), nullable=True
        ),
        sa.UniqueConstraint("short_code", name="urls_short_code_key"),
    )
    op.create_table(
        "analytics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("short_code", sa.String(10), nullable=False),
        sa.Column(
            "clicked_at", sa.TIMESTAMP(), server_default=sa.func.now(), nullable=True
        ),
        sa.ForeignKeyConstraint(
            ["short_code"],
            ["urls.short_code"],
            name="fk_analytics_short_code",
            ondelete="CASCADE",
        ),
    )
    op.create_index(
        "idx_analytics_short_code_clicked_at",
        "analytics",
        ["short_code", sa.text("clicked_at DESC")],
    )


def downgrade():
    op.drop_index("idx_analytics_short_code_clicked_at", table_name="analytics")
    op.drop_table("analytics")
    op.drop_table("urls")
