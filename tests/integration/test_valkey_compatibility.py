"""Local Valkey 8 protocol check; never uses configured service URLs."""

import time

import docker
import pytest
import redis

from app.middleware.rate_limiter import TOKEN_BUCKET_LUA

pytestmark = pytest.mark.integration
IMAGE = "valkey/valkey:8.0.2-alpine"


def test_valkey_streams_and_actual_rate_limit_lua():
    engine = docker.from_env()
    container = engine.containers.run(
        IMAGE,
        detach=True,
        ports={"6379/tcp": ("127.0.0.1", 0)},
        command=["valkey-server", "--save", "", "--appendonly", "no"],
        labels={"relaymark.purpose": "valkey-compatibility"},
    )
    client = None
    try:
        container.reload()
        port = int(
            container.attrs["NetworkSettings"]["Ports"]["6379/tcp"][0]["HostPort"]
        )
        client = redis.Redis(
            host="127.0.0.1",
            port=port,
            decode_responses=True,
            socket_timeout=1,
            socket_connect_timeout=1,
        )
        deadline = time.monotonic() + 20
        while True:
            try:
                client.ping()
                break
            except redis.ConnectionError:
                if time.monotonic() >= deadline:
                    raise
                time.sleep(0.1)
        assert client.info("server")["valkey_version"].startswith("8.")
        event_id = client.xadd("compat-stream", {"event": "fixture"})
        assert client.xgroup_create("compat-stream", "compat-group", id="0")
        messages = client.xreadgroup(
            "compat-group",
            "consumer-a",
            {"compat-stream": ">"},
            count=1,
        )
        assert messages[0][1][0][0] == event_id
        claimed = client.xautoclaim(
            "compat-stream",
            "compat-group",
            "consumer-b",
            0,
            "0-0",
            count=1,
        )
        assert claimed[1][0][0] == event_id
        assert client.xack("compat-stream", "compat-group", event_id) == 1
        assert client.xpending("compat-stream", "compat-group")["pending"] == 0
        results = [
            client.eval(TOKEN_BUCKET_LUA, 1, "compat-bucket", 2, 0.01) for _ in range(3)
        ]
        assert [result[0] for result in results] == [1, 1, 0]
        print("Valkey 8: XADD XGROUP CREATE XREADGROUP XAUTOCLAIM XACK EVAL PASS")
    finally:
        if client is not None:
            client.close()
        container.remove(force=True, v=True)
        engine.close()
