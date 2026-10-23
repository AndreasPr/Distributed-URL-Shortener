from typing import Any, Protocol, cast
from uuid import uuid4

from redis import Redis
from redis.backoff import NoBackoff
from redis.exceptions import ResponseError
from redis.retry import Retry

from app.core.config import settings
from app.events.base import Delivery
from app.events.models import Event


class StreamClient(Protocol):
    """Synchronous subset; redis-py stubs also include async command return types."""

    def xadd(self, name: str, fields: dict[str, str]) -> object: ...

    def xgroup_create(
        self, name: str, groupname: str, id: str, mkstream: bool
    ) -> object: ...

    def xautoclaim(
        self,
        name: str,
        groupname: str,
        consumername: str,
        min_idle_time: int,
        start_id: str,
        count: int,
    ) -> Any: ...

    def xreadgroup(
        self,
        groupname: str,
        consumername: str,
        streams: dict[str, str],
        count: int,
        block: int,
    ) -> Any: ...

    def xack(self, name: str, groupname: str, *ids: str) -> object: ...

    def xpending(self, name: str, groupname: str) -> dict[str, Any]: ...

    def xlen(self, name: str) -> int: ...

    def xgroup_destroy(self, name: str, groupname: str) -> object: ...

    def close(self) -> None: ...


class RedisStreamsEventBus:

    def __init__(self, client: StreamClient | None = None) -> None:
        self.client = (
            client
            if client is not None
            else cast(
                StreamClient,
                Redis.from_url(
                    settings.REDIS_URL,
                    socket_connect_timeout=0.2,
                    retry=Retry(NoBackoff(), 0),
                    socket_timeout=1.0,
                ),
            )
        )
        self.topic = ""
        self.group = ""
        self.consumer = uuid4().hex
        self.cursor = "0-0"

    def publish(self, topic: str, event: Event) -> None:
        # No automatic trim: trimming pending records can lose unprocessed events.
        self.client.xadd(topic, {"event": event.model_dump_json()})

    def subscribe(self, topic: str, group: str) -> None:
        self.topic, self.group = topic, group
        try:
            self.client.xgroup_create(topic, group, id="0-0", mkstream=True)
        except ResponseError as exc:
            if not str(exc).startswith("BUSYGROUP"):
                raise

    def _decode(self, records: Any) -> list[Delivery]:
        return [
            Delivery(self.topic, fields.get(b"event", b""), receipt.decode())
            for receipt, fields in records
        ]

    def poll(self, timeout: float, limit: int) -> list[Delivery]:
        claimed = self.client.xautoclaim(
            self.topic,
            self.group,
            self.consumer,
            min_idle_time=settings.EVENT_CLAIM_IDLE_MS,
            start_id=self.cursor,
            count=limit,
        )
        self.cursor = claimed[0].decode()
        if claimed[1]:
            return self._decode(claimed[1])
        records = self.client.xreadgroup(
            self.group,
            self.consumer,
            {self.topic: ">"},
            count=limit,
            block=max(1, min(200, int(timeout * 1000))),
        )
        return [message for _, batch in records for message in self._decode(batch)]

    def ack(self, messages: list[Delivery]) -> None:
        if messages:
            self.client.xack(self.topic, self.group, *(m.receipt for m in messages))

    def lag(self) -> dict[str, float]:
        pending = self.client.xpending(self.topic, self.group)
        return {
            "stream_length": self.client.xlen(self.topic),
            "pending": pending["pending"],
        }

    def close(self) -> None:
        if self.group.startswith("dlq-inspect-"):
            self.client.xgroup_destroy(self.topic, self.group)
        self.client.close()
