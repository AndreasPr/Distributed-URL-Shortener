"""Only SHA-256 digests of cryptographically random keys are persisted."""

import hashlib
import hmac
import secrets
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.api_key import APIKey

SCOPES = {"read", "write", "admin"}


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def create_key(db: Session, name: str, scopes: list[str]) -> tuple[APIKey, str]:
    if not name.strip() or len(name) > 100:
        raise ValueError("Key name must contain 1–100 characters")
    if not scopes or not set(scopes) <= SCOPES:
        raise ValueError("Choose at least one scope: read, write, admin")
    raw = secrets.token_urlsafe(32)
    key = APIKey(
        name=name.strip(),
        key_hash=hash_key(raw),
        prefix=raw[:8],
        scopes=sorted(set(scopes)),
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    return key, raw


def authenticate(db: Session, raw: str) -> APIKey | None:
    digest = hash_key(raw)
    key = db.scalar(select(APIKey).where(APIKey.key_hash == digest))
    # Always compare a fixed-length digest, including the unknown-key path.
    valid = hmac.compare_digest(digest, key.key_hash if key is not None else "0" * 64)
    if not valid or key is None or key.revoked_at is not None:
        return None
    now = utcnow()
    # Conditional update prevents a concurrent revocation from being overwritten.
    changed = db.execute(
        update(APIKey)
        .where(APIKey.id == key.id, APIKey.revoked_at.is_(None))
        .values(last_used_at=now)
        .returning(APIKey.id)
    ).scalar_one_or_none()
    db.commit()
    return key if changed is not None else None


def list_keys(db: Session) -> list[dict]:
    return [
        {
            "id": key.id,
            "name": key.name,
            "prefix": key.prefix,
            "scopes": key.scopes,
            "created_at": key.created_at.isoformat(),
            "revoked_at": key.revoked_at.isoformat() if key.revoked_at else None,
            "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None,
        }
        for key in db.scalars(select(APIKey).order_by(APIKey.id))
    ]


def revoke_key(db: Session, key_id: int) -> bool:
    key = db.get(APIKey, key_id)
    if key is None:
        return False
    if key.revoked_at is None:
        key.revoked_at = utcnow()
        db.commit()
    return True
