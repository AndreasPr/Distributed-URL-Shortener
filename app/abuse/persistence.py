from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.abuse.schemas import Assessment
from app.cache.redis_client import invalidate_cache
from app.events.models import URLCreatedEvent
from app.models.url import URL
from app.models.url_verdict import AbuseOutbox, URLVerdict
from app.observability.context import inject_context
from app.observability.metrics import abuse_checks_total


class LinkBlockedError(ValueError):
    pass


def enqueue_created(db: Session, code: str) -> None:
    event = URLCreatedEvent(short_code=code, trace_context=inject_context())
    db.add(
        AbuseOutbox(
            short_code=code,
            event_id=str(event.event_id),
            trace_context=event.trace_context,
        )
    )


def enforce(db: Session, code: str) -> None:
    # Query every redirect, including Redis hits and single-flight waiters.
    # Never authorize a redirect based on a stale cached verdict.
    row = db.query(URLVerdict).populate_existing().filter_by(short_code=code).first()
    if row is not None and (
        row.review_decision == "block"
        or (row.review_decision != "allow" and row.verdict == "malicious")
    ):
        invalidate_cache(code)
        raise LinkBlockedError("Link blocked by abuse review")


def store(db: Session, code: str, result: Assessment) -> bool:
    # Serialize with admin reviews, deletion and redirect lifecycle locks.
    url = db.query(URL).filter_by(short_code=code).with_for_update().first()
    if url is None or url.deleted_at is not None:
        db.commit()
        return False
    changed = db.execute(
        insert(URLVerdict)
        .values(short_code=code, **result.model_dump())
        .on_conflict_do_nothing(index_elements=[URLVerdict.short_code])
        .returning(URLVerdict.short_code)
    ).scalar_one_or_none()
    db.commit()
    # Repeated deliveries never overwrite human review or prior inference.
    invalidate_cache(code)
    if changed is not None:
        abuse_checks_total.labels(result.verdict, result.source).inc()
    return changed is not None


def review(db: Session, code: str, decision: str, reviewer: str) -> bool:
    url = db.query(URL).filter_by(short_code=code).with_for_update().first()
    if url is None or url.deleted_at is not None:
        return False
    row = db.query(URLVerdict).populate_existing().filter_by(short_code=code).first()
    if row is None:
        return False
    row.reviewed_by = reviewer
    row.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    row.review_decision = decision
    db.commit()
    invalidate_cache(code)
    return True


def flagged(db: Session, limit: int, offset: int):
    rows = (
        db.query(URLVerdict, URL.long_url)
        .join(URL, URL.short_code == URLVerdict.short_code)
        .filter(
            URL.deleted_at.is_(None),
            URLVerdict.verdict.in_(["suspicious", "malicious"]),
            URLVerdict.review_decision.is_(None),
        )
        .order_by(URLVerdict.created_at, URLVerdict.short_code)
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        {
            "short_code": row.short_code,
            "long_url": long_url,
            "verdict": row.verdict,
            "score": row.score,
            "reasons": row.reasons,
            "source": row.source,
            "model": row.model,
            "created_at": row.created_at,
        }
        for row, long_url in rows
    ]
