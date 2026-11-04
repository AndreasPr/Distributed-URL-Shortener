from sqlalchemy import ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column

# Import registers identity tables before metadata.create_all in local tools/tests.
from app.models.identity import DEFAULT_WORKSPACE_ID


class TenantRecord:
    workspace_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("workspaces.id"),
        nullable=False,
        default=DEFAULT_WORKSPACE_ID,
        server_default=DEFAULT_WORKSPACE_ID.replace("-", ""),
    )
    created_by_user_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("users.id"),
        nullable=True,
    )
