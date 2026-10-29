"""Disposable demo fixtures. Run inside the demo API, never on an existing DB."""

import json
import os
from datetime import datetime, timedelta, timezone
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.abuse.classifier import Classifier
from app.models.analytics import Analytics
from app.models.api_key import APIKey
from app.models.url import URL
from app.models.url_verdict import URLVerdict
from app.services.api_keys import create_key

NAMES = (
    "docs",
    "handbook",
    "release-notes",
    "onboarding",
    "roadmap",
    "status",
    "support",
    "pricing",
    "webinar",
    "newsletter",
    "launch",
    "careers",
    "tutorial",
    "api-guide",
    "design",
    "community",
    "changelog",
    "feedback",
    "conference",
    "blog",
    "team",
    "help",
    "partners",
    "contact",
)


def fixtures() -> list[tuple[str, str]]:
    rows = [("demo-" + name, "https://example.com/" + name) for name in NAMES]
    rows += [
        (f"demo-review-{i}", f"https://example.org/login/demo-{i}") for i in range(1, 5)
    ]
    rows += [
        (f"demo-blocked-{i}", f"https://paypal.a.b.c.d.example.net/login/demo-{i}")
        for i in range(1, 3)
    ]
    return rows


def seed(db: Session, anchor: datetime) -> dict:
    # Refuse reuse rather than deleting user data or silently issuing more keys.
    if (
        db.scalar(select(URL.id).limit(1)) is not None
        or db.scalar(select(APIKey.id).limit(1)) is not None
    ):
        raise ValueError(
            "Demo seed requires an empty database; run make demo-down first"
        )
    admin, admin_raw = create_key(db, "demo-admin", ["admin"])
    writer, writer_raw = create_key(db, "demo-read-write", ["read", "write"])
    classifier = Classifier(
        variant="heuristics", use_cache=False, gray_low=0.15, gray_high=0.65
    )
    total = 0
    for index, (code, destination) in enumerate(fixtures()):
        created = anchor - timedelta(days=7, minutes=index)
        db.add(
            URL(
                short_code=code,
                long_url=destination,
                created_at=created,
                created_by=str(writer.id),
            )
        )
        db.flush()
        assessment = classifier.classify(destination)
        db.add(
            URLVerdict(
                short_code=code,
                **assessment.model_dump(),
                created_at=anchor - timedelta(minutes=index),
            )
        )
        for click in range(index % 7 + 1):
            # Stable identity/counts, relative timestamps anchored to this recording.
            db.add(
                Analytics(
                    short_code=code,
                    event_id=str(uuid5(NAMESPACE_URL, f"demo:{code}:{click}")),
                    clicked_at=anchor - timedelta(hours=click + 1, minutes=index),
                )
            )
            total += 1
    db.commit()
    return {
        "admin_key": admin_raw,
        "read_write_key": writer_raw,
        "urls": len(fixtures()),
        "history_rows": total,
        "flagged": 6,
    }


def main() -> None:
    from app.db.database import SessionLocal, engine

    if (
        os.getenv("DEMO_MODE") != "1"
        or engine is None
        or engine.url.database != "shortener_demo"
    ):
        raise RuntimeError("Refusing to seed outside the isolated demo database")
    if SessionLocal is None:
        raise RuntimeError("Demo database unavailable")
    anchor = datetime.now(timezone.utc).replace(tzinfo=None, second=0, microsecond=0)
    with SessionLocal() as db:
        print(json.dumps(seed(db, anchor)))


if __name__ == "__main__":
    main()
