from datetime import datetime, timezone

from sqlalchemy import and_, func, true
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.analytics import Analytics
from app.models.url import URL
from app.schemas.url_schema import RESERVED_CODES
from app.services.code_generator import CodeGenerator, RandomCodeGenerator

MAX_CODE_ATTEMPTS = 10


class AliasTakenError(ValueError):
    """The requested alias is already allocated, including deleted links."""


class CodeGenerationExhausted(RuntimeError):
    """No candidate could be reserved within the bounded attempt budget."""


class URLRepository:

    def __init__(self, generator: CodeGenerator | None = None):
        self.generator = generator if generator is not None else RandomCodeGenerator()

    def create_with_code(
        self,
        db: Session,
        long_url: str,
        custom_alias: str | None = None,
        expires_at: datetime | None = None,
        created_by: str | None = None,
        *,
        workspace_id: str,
        created_by_user_id: str | None = None,
    ) -> str:
        """Reserve a candidate atomically; the caller owns the transaction."""
        for _ in range(MAX_CODE_ATTEMPTS):
            code = (
                custom_alias if custom_alias is not None else self.generator.generate()
            )
            if code.lower() in RESERVED_CODES:
                continue
            statement = (
                insert(URL)
                .values(
                    long_url=long_url,
                    short_code=code,
                    expires_at=expires_at,
                    created_by=created_by,
                    workspace_id=workspace_id,
                    created_by_user_id=created_by_user_id,
                )
                .on_conflict_do_nothing(index_elements=[URL.short_code])
                .returning(URL.short_code)
            )
            if db.execute(statement).scalar_one_or_none() is not None:
                return code
            if custom_alias is not None:
                raise AliasTakenError("Alias is already taken")
        raise CodeGenerationExhausted("Short-code allocation attempts exhausted")

    def get_by_code(self, db: Session, code: str, *, workspace_id: str):
        return (
            db.query(URL)
            .populate_existing()
            .filter(URL.short_code == code, URL.workspace_id == workspace_id)
            .with_for_update(read=True)
            .first()
        )

    def get_public_lifecycle(self, db: Session, code: str):
        """Read only mutable lifecycle fields, holding the same deletion lock."""
        row = (
            db.query(URL.deleted_at, URL.expires_at)
            .filter(URL.short_code == code)
            .with_for_update(read=True)
            .first()
        )
        return None if row is None else (row.deleted_at, row.expires_at)

    def soft_delete(
        self,
        db: Session,
        code: str,
        *,
        workspace_id: str,
        user_id: str | None = None,
        api_key_id: int | None = None,
    ) -> bool:
        changed = (
            db.query(URL)
            .filter(
                URL.short_code == code,
                URL.deleted_at.is_(None),
                URL.workspace_id == workspace_id,
                (
                    URL.created_by_user_id == user_id
                    if user_id is not None
                    else (
                        URL.created_by == str(api_key_id)
                        if api_key_id is not None
                        else true()
                    )
                ),
            )
            .update(
                {URL.deleted_at: datetime.now(timezone.utc).replace(tzinfo=None)},
                synchronize_session=False,
            )
        )
        return bool(changed)

    def list_recent(self, db: Session, limit: int = 20, *, workspace_id: str):
        rows = (
            db.query(
                URL.short_code,
                URL.long_url,
                URL.created_at,
                func.count(Analytics.id).label("click_count"),
            )
            .outerjoin(
                Analytics,
                and_(
                    URL.short_code == Analytics.short_code,
                    Analytics.workspace_id == workspace_id,
                ),
            )
            .filter(URL.deleted_at.is_(None), URL.workspace_id == workspace_id)
            .group_by(URL.id)
            .order_by(URL.created_at.desc())
            .limit(limit)
            .all()
        )

        return [
            {
                "short_code": row.short_code,
                "long_url": row.long_url,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "click_count": int(row.click_count or 0),
            }
            for row in rows
        ]

    def get_public_by_code(self, db: Session, code: str):
        """Public redirect / trusted worker resolver; never use for tenant endpoints."""
        return (
            db.query(URL)
            .populate_existing()
            .filter(URL.short_code == code)
            .with_for_update(read=True)
            .first()
        )
