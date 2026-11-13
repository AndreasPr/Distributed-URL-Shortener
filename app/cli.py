"""Inspect DLQ envelopes or replay valid clicks without changing their event IDs."""

import argparse
import base64
import json
import time
from uuid import UUID, uuid4

from app.core.config import settings
from app.db.database import SessionLocal
from app.events import create_event_bus
from app.events.base import EventBus
from app.events.models import ClickEvent, DeadLetter
from app.models.identity import DEFAULT_WORKSPACE_ID
from app.services.api_keys import create_key, list_keys, revoke_key


def dead_letters(bus: EventBus, action: str, limit: int) -> int:
    # Listing uses an ephemeral group and never advances the replay group's cursor.
    group = (
        "dlq-inspect-" + uuid4().hex
        if action == "list"
        else settings.EVENT_CONSUMER_GROUP + "-dlq-replay"
    )
    bus.subscribe(settings.EVENT_DLQ_TOPIC, group)
    count = 0
    idle_deadline = time.monotonic() + 5
    while count < limit:
        messages = bus.poll(0.2, 1)
        if not messages:
            if time.monotonic() >= idle_deadline:
                break
            continue
        idle_deadline = time.monotonic() + 5
        for message in messages:
            envelope = DeadLetter.model_validate_json(message.payload)
            if action == "list":
                print(
                    json.dumps(
                        {
                            "event_id": str(envelope.event_id),
                            "error": envelope.error,
                            "attempts": envelope.attempts,
                            "source_topic": envelope.source_topic,
                        }
                    )
                )
            else:
                # Reject malformed/unsupported originals; preserve UUID for dedup.
                event = ClickEvent.from_wire(
                    base64.b64decode(envelope.payload_base64, validate=True)
                )
                bus.publish(settings.EVENT_TOPIC, event)
            bus.ack([message])
            count += 1
    return count


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    dlq = sub.add_parser("dlq")
    dlq.add_argument("action", choices=["list", "replay"])
    dlq.add_argument("--limit", type=int, default=100)
    sub.add_parser("purge", help="Purge accounts deleted at least 30 days ago")
    keys = sub.add_parser("keys", help="Local operator key management")
    actions = keys.add_subparsers(dest="action", required=True)
    create = actions.add_parser("create")
    create.add_argument("--name", required=True)
    create.add_argument(
        "--scopes",
        nargs="+",
        choices=["read", "write", "admin"],
        default=["read", "write"],
    )
    create.add_argument("--user", type=UUID, help="Verified human owner UUID")
    listing = actions.add_parser("list")
    revoke = actions.add_parser("revoke")
    revoke.add_argument("id", type=int)
    for key_command in (create, listing, revoke):
        key_command.add_argument(
            "--workspace", type=UUID, default=UUID(DEFAULT_WORKSPACE_ID)
        )
    args = parser.parse_args()
    if args.command == "purge":
        from app.services.data_rights import purge_due

        if SessionLocal is None:
            raise RuntimeError("Database not configured")
        with SessionLocal() as db:
            print(json.dumps({"purged": purge_due(db)}))
        return
    if args.command == "keys":
        if SessionLocal is None:
            raise RuntimeError("Database not configured")
        with SessionLocal() as db:
            if args.action == "create":
                key, raw = create_key(
                    db,
                    args.name,
                    args.scopes,
                    workspace_id=str(args.workspace),
                    created_by_user_id=str(args.user) if args.user else None,
                )
                print(
                    json.dumps(
                        {
                            "id": key.id,
                            "name": key.name,
                            "prefix": key.prefix,
                            "scopes": key.scopes,
                            "key": raw,
                        }
                    )
                )
            elif args.action == "list":
                print(json.dumps(list_keys(db, workspace_id=str(args.workspace))))
            elif not revoke_key(db, args.id, workspace_id=str(args.workspace)):
                parser.error("Key not found")
            else:
                print(json.dumps({"id": args.id, "revoked": True}))
        return
    bus = create_event_bus()
    try:
        dead_letters(bus, args.action, args.limit)
    finally:
        bus.close()


if __name__ == "__main__":
    main()
