"""URL verdicts and durable creation-event outbox."""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "url_verdicts",
        sa.Column(
            "short_code",
            sa.String(32),
            sa.ForeignKey("urls.short_code", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("verdict", sa.String(16), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("reasons", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(16), nullable=False),
        sa.Column("model", sa.String(), nullable=True),
        sa.Column(
            "created_at", sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("reviewed_by", sa.String(), nullable=True),
        sa.Column("reviewed_at", sa.TIMESTAMP(), nullable=True),
        sa.Column("review_decision", sa.String(8), nullable=True),
        sa.CheckConstraint(
            "verdict IN ('clean', 'suspicious', 'malicious')", name="ck_verdict"
        ),
        sa.CheckConstraint("score >= 0 AND score <= 1", name="ck_verdict_score"),
        sa.CheckConstraint(
            "source IN ('heuristic', 'llm', 'combined')", name="ck_verdict_source"
        ),
        sa.CheckConstraint(
            "review_decision IS NULL OR review_decision IN ('allow', 'block')",
            name="ck_review_decision",
        ),
    )
    op.create_table(
        "abuse_outbox",
        sa.Column(
            "short_code",
            sa.String(32),
            sa.ForeignKey("urls.short_code", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("event_id", sa.String(36), nullable=False, unique=True),
        sa.Column("trace_context", sa.JSON(), nullable=False),
        sa.Column(
            "created_at", sa.TIMESTAMP(), server_default=sa.func.now(), nullable=False
        ),
    )


def downgrade():
    op.drop_table("abuse_outbox")
    op.drop_table("url_verdicts")
