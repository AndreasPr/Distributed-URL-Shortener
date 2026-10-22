"""API keys; existing URL ownership remains nullable for legacy links."""

from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "api_keys",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("key_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("prefix", sa.String(8), nullable=False),
        sa.Column("scopes", sa.JSON(), nullable=False),
        sa.Column(
            "created_at", sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("revoked_at", sa.TIMESTAMP(), nullable=True),
        sa.Column("last_used_at", sa.TIMESTAMP(), nullable=True),
    )


def downgrade():
    op.drop_table("api_keys")
