"""Versioned wire envelopes; W3C traceparent is carried without baggage."""

from datetime import datetime, timezone
from typing import Literal
from uuid import UUID, uuid4

from pydantic import AwareDatetime, BaseModel, Field


class Event(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    event_type: str
    occurred_at: AwareDatetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    schema_version: Literal[1] = 1
    trace_context: dict[str, str] = Field(default_factory=dict)


class ClickEvent(Event):
    event_type: Literal["url.clicked"] = "url.clicked"
    short_code: str = Field(min_length=1, max_length=32, pattern=r"^[A-Za-z0-9_-]+$")

    @classmethod
    def from_wire(cls, payload: bytes) -> "ClickEvent":
        event = cls.model_validate_json(payload)
        required = {
            "event_id",
            "event_type",
            "occurred_at",
            "schema_version",
            "trace_context",
            "short_code",
        }
        if not required <= event.model_fields_set:
            # Never generate a new UUID on redelivery of an incomplete envelope.
            raise ValueError("Incomplete event envelope")
        return event


class DeadLetter(Event):
    event_type: Literal["event.failed"] = "event.failed"
    source_topic: str
    payload_base64: str
    error: str
    attempts: int = 3


class URLCreatedEvent(Event):
    event_type: Literal["url.created"] = "url.created"
    short_code: str = Field(min_length=1, max_length=32, pattern=r"^[A-Za-z0-9_-]+$")

    @classmethod
    def from_wire(cls, payload: bytes) -> "URLCreatedEvent":
        event = cls.model_validate_json(payload)
        if (
            not {
                "event_id",
                "event_type",
                "occurred_at",
                "schema_version",
                "short_code",
                "trace_context",
            }
            <= event.model_fields_set
        ):
            raise ValueError("Incomplete creation event")
        return event
