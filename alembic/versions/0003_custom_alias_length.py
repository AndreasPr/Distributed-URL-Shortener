"""Allow aliases up to 32 characters in both sides of the analytics FK."""

import sqlalchemy as sa

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def resize(length):
    with op.batch_alter_table("analytics") as batch:
        batch.drop_constraint("fk_analytics_short_code", type_="foreignkey")
    with op.batch_alter_table("urls") as batch:
        batch.alter_column(
            "short_code",
            type_=sa.String(length),
            existing_type=sa.String(10 if length == 32 else 32),
            existing_nullable=True,
        )
    with op.batch_alter_table("analytics") as batch:
        batch.alter_column(
            "short_code",
            type_=sa.String(length),
            existing_type=sa.String(10 if length == 32 else 32),
            existing_nullable=False,
        )
        batch.create_foreign_key(
            "fk_analytics_short_code",
            "urls",
            ["short_code"],
            ["short_code"],
            ondelete="CASCADE",
        )


def upgrade():
    resize(32)


def downgrade():
    # Never silently truncate aliases or break their mappings on downgrade.
    for name in ("urls", "analytics"):
        table = sa.table(name, sa.column("short_code", sa.String()))
        count = op.get_bind().scalar(
            sa.select(sa.func.count())
            .select_from(table)
            .where(sa.func.length(table.c.short_code) > 10)
        )
        if count:
            raise RuntimeError(
                "Cannot downgrade: short codes longer than 10 characters exist"
            )
    resize(10)
