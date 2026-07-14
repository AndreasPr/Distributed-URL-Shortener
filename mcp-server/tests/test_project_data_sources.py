import datetime

import pytest

from mcp_server import sources
from mcp_server.errors import SourceError


def make_dt(seconds: int):
    return datetime.datetime.fromtimestamp(seconds, tz=datetime.timezone.utc)


class FakeDB:
    def __init__(self, rows=None, baseline_count=0, long_url=None):
        self._rows = rows or []
        self._baseline = baseline_count
        class URL:
            def __init__(self, long_url):
                self.long_url = long_url

        self._url = URL(long_url) if long_url else None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query, params=None):
        sql = str(query).lower()

        class Result:
            def __init__(self, rows=None, scalar=None):
                self._rows = rows or []
                self._scalar = scalar

            def fetchall(self):
                return self._rows

            def scalar(self):
                return self._scalar

        if "select clicked_at" in sql:
            # return rows as tuples with datetime
            return Result(rows=[(r,) for r in self._rows])
        if "select count(*)" in sql:
            return Result(scalar=self._baseline)

        return Result()


def test_get_click_stats_happy(monkeypatch):
    from mcp_server.sources import project_data

    # create two timestamps 10 seconds apart
    now = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
    rows = [make_dt(now - 10), make_dt(now)]

    monkeypatch.setattr(project_data, "SessionLocal", lambda: FakeDB(rows=rows, baseline_count=1, long_url="https://x"))
    monkeypatch.setattr(project_data, "url_repo", type("R", (), {"get_by_code": lambda self, db, code: type("U", (), {"long_url": "https://x"})})())

    result = project_data.get_click_stats(short_code="abc", window_minutes=60)

    assert result["short_code"] == "abc"
    assert result["click_count"] == 2
    assert "click_velocity" in result
    assert result["long_url"] == "https://x"


def test_get_click_stats_failure(monkeypatch):
    from mcp_server.sources import project_data

    def bad_session():
        raise RuntimeError("db down")

    monkeypatch.setattr(project_data, "SessionLocal", bad_session)

    with pytest.raises(SourceError) as exc:
        project_data.get_click_stats(short_code="abc", window_minutes=60)

    assert exc.value.message == "click_stats_failure"


def test_rate_limit_signals_and_cache_happy_and_failure(monkeypatch):
    from mcp_server.sources import project_data

    class FakeRedis:
        def __init__(self):
            self._now = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)

        def scan_iter(self, match=None):
            yield b"rate_limit:sw:/shorten:abc"

        def zcount(self, key, start, end):
            return 2

        def zrangebyscore(self, key, start, end):
            return [str(self._now - 1000), str(self._now)]

        def ping(self):
            return True

        def dbsize(self):
            return 42

        def exists(self, key):
            return 1

    monkeypatch.setattr(project_data, "redis_client", FakeRedis())

    rate = project_data.get_rate_limit_signals(short_code="abc", window_minutes=60)
    assert rate["trigger_count"] >= 0

    cache = project_data.get_cache_stats(short_code="abc")
    assert cache["redis_available"] is True

    # failure path: redis_client None
    monkeypatch.setattr(project_data, "redis_client", None)
    with pytest.raises(SourceError) as exc2:
        project_data.get_rate_limit_signals(short_code="abc", window_minutes=60)
    assert exc2.value.message == "rate_limit_failure"

    with pytest.raises(SourceError) as exc3:
        project_data.get_cache_stats(short_code="abc")
    assert exc3.value.message == "cache_stats_failure"
