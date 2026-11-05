"""Persist per-user email-check attempts across API replicas."""

import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("email_verification_checked_at", sa.TIMESTAMP()))


def downgrade():
    op.drop_column("users", "email_verification_checked_at")
