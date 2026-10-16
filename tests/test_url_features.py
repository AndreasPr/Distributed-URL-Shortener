from datetime import datetime, timedelta, timezone
from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from redis.exceptions import ConnectionError

import app.api.routes as routes
import app.cache.redis_client as cache
import app.main as main
import app.services.url_service as service_module
from app.db.database import get_db
from app.models.url import URL
from app.schemas.url_schema import URLCreate


@pytest.mark.parametrize(
    "url",
    [
        "ftp://example.com",
        "javascript:alert(1)",
        "https:///path",
        "https://",
        "http://user:pass@example.com",
        "http://user@example.com",
        "http://@example.com",
        "http://localhost",
        "http://LOCALHOST.",
        "http://sub.localhost",
        "http://server.local",
        "http://127.0.0.1",
        "http://127.9.2.1",
        "http://10.1.2.3",
        "http://172.16.2.3",
        "http://192.168.1.1",
        "http://169.254.169.254",
        "http://0.0.0.0",
        "http://[::1]",
        "http://[::]",
        "http://[fc00::1]",
        "http://[fd00::1]",
        "http://[fe80::1]",
        "http://[::ffff:127.0.0.1]",
        "http://[::ffff:192.168.0.1]",
        "http://[fe80::1%25eth0]",
        "http://2130706433",
        "http://0x7f000001",
        "http://0177.0.0.1",
        "http://127.1",
        "http://127.0.0.1.",
        "http://%6cocalhost",
        "http://localHOST\u3002",
        "http://example.com\\@127.0.0.1",
        "http://exam\nple.com",
        "http://bad_host.com",
        "http://-bad.example",
        "https://example.com/" + "x" * 2048,
    ],
)
def test_reject_unsafe_urls(url):
    with pytest.raises(ValidationError):
        URLCreate(long_url=url)


@pytest.mark.parametrize(
    "url,host",
    [
        ("https://EXAMPLE.COM./a?b=1", "example.com"),
        ("http://bücher.de/a", "xn--bcher-kva.de"),
        ("https://8.8.8.8/a", "8.8.8.8"),
        ("http://[2606:4700:4700::1111]/", "[2606:4700:4700::1111]"),
        ("https://localhost.example.com/", "localhost.example.com"),
    ],
)
def test_normalize_public_hosts(url, host):
    assert URLCreate(long_url=url).long_url.host == host


def test_maximum_url_length():
    url = "https://example.com/" + "x" * (2048 - len("https://example.com/"))
    assert len(str(URLCreate(long_url=url).long_url)) == 2048
    with pytest.raises(ValidationError):
        URLCreate(long_url=url + "x")


@pytest.mark.parametrize(
    "alias",
    [
        "ab",
        "a" * 33,
        "",
        "a/b",
        "a.b",
        "a b",
        "ééé",
        "api",
        "Health",
        "METRICS",
        "docs",
        "admin",
        "shorten",
        "livez",
        "urls",
        "analytics",
        "redoc",
    ],
)
def test_invalid_alias(alias):
    with pytest.raises(ValidationError):
        URLCreate(long_url="https://example.com", custom_alias=alias)


@pytest.mark.parametrize("alias", ["abc", "A_9-x", "a" * 32])
def test_valid_alias(alias):
    assert (
        URLCreate(long_url="https://example.com", custom_alias=alias).custom_alias
        == alias
    )


@pytest.mark.parametrize(
    "expiry", ["2020-01-01T00:00:00Z", "2099-01-01T00:00:00", "nonsense", 9999999999]
)
def test_invalid_expiry(expiry):
    with pytest.raises(ValidationError):
        URLCreate(long_url="https://example.com", expires_at=expiry)


def test_expiry_normalized_to_utc():
    value = URLCreate(
        long_url="https://example.com", expires_at="2099-01-01T05:00:00+05:00"
    )
    assert value.expires_at == datetime(2099, 1, 1, tzinfo=timezone.utc)


@pytest.fixture
def client(db_session, monkeypatch):
    fake = Mock()
    fake.get.return_value = None
    monkeypatch.setattr(cache, "redis_client", fake)
    monkeypatch.setattr(service_module, "publish_click_event", Mock())
    monkeypatch.setattr(main, "init_tracing", Mock())
    monkeypatch.setattr(main, "configure_logging_with_tracing", Mock())
    previous = main.app.dependency_overrides.copy()
    main.app.dependency_overrides[get_db] = lambda: db_session
    try:
        with TestClient(main.app) as client:
            yield client
    finally:
        main.app.dependency_overrides = previous


def create(client, **kwargs):
    return client.post(
        "/shorten", json={"long_url": "https://EXAMPLE.COM./path", **kwargs}
    )


def test_alias_create_conflict_delete_and_list(client, db_session):
    alias = "x" * 32
    assert create(client, custom_alias=alias).json() == {"short_code": alias}
    assert create(client, custom_alias=alias).status_code == 409
    assert client.get("/" + alias, follow_redirects=False).status_code == 307
    assert len(client.get("/urls").json()) == 1
    # Simulate stale cache and failed eviction: DB remains authoritative.
    cache.redis_client.get.return_value = "https://example.com/path"
    cache.redis_client.delete.side_effect = ConnectionError("offline")
    response = client.delete("/urls/" + alias)
    assert response.status_code == 204 and response.content == b""
    cache.redis_client.delete.assert_called_with(alias, "url-lock:" + alias)
    assert db_session.query(URL).one().deleted_at is not None
    assert client.get("/" + alias, follow_redirects=False).status_code == 404
    assert client.get("/urls").json() == []
    assert client.delete("/urls/" + alias).status_code == 404
    assert create(client, custom_alias=alias).status_code == 409


def test_expired_cache_hit_returns_410(client, db_session):
    expiry = datetime.now(timezone.utc) + timedelta(seconds=120)
    code = create(client, expires_at=expiry.isoformat()).json()["short_code"]
    assert client.get("/" + code, follow_redirects=False).status_code == 307
    publication = next(
        call for call in cache.redis_client.eval.call_args_list if call.args[1] == 2
    )
    deadline = publication.args[-1]
    assert deadline <= int(expiry.timestamp() * 1000)
    assert deadline > int(datetime.now(timezone.utc).timestamp() * 1000)
    cache.redis_client.get.return_value = "https://example.com/path"
    row = db_session.query(URL).one()
    row.expires_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
        seconds=1
    )
    db_session.commit()
    assert client.get("/" + code, follow_redirects=False).status_code == 410
    assert client.delete("/urls/" + code).status_code == 204
    assert client.get("/" + code, follow_redirects=False).status_code == 404


@pytest.mark.parametrize(
    "payload",
    [
        {"long_url": "http://[::1]"},
        {"custom_alias": "admin"},
        {"expires_at": "2020-01-01T00:00:00Z"},
        {"custom_alias": "x" * 33},
    ],
)
def test_api_validation_is_422(client, payload):
    response = create(client, **payload)
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"]


def test_missing_delete_and_redirect(client):
    assert client.delete("/urls/missing").status_code == 404
    assert client.get("/missing").status_code == 404


def test_openapi_documents_fields_and_statuses(client):
    spec = client.get("/openapi.json").json()
    fields = spec["components"]["schemas"]["URLCreate"]["properties"]
    assert {"long_url", "custom_alias", "expires_at"} <= fields.keys()
    assert {"409", "422"} <= spec["paths"]["/shorten"]["post"]["responses"].keys()
    assert "410" in spec["paths"]["/{code}"]["get"]["responses"]
    assert "200" not in spec["paths"]["/{code}"]["get"]["responses"]
    assert "204" in spec["paths"]["/urls/{code}"]["delete"]["responses"]


def test_cache_absolute_deadline_and_eviction(monkeypatch):
    fake = Mock()
    monkeypatch.setattr(cache, "redis_client", fake)
    monkeypatch.setattr(cache.time, "time", lambda: 1000)
    cache.set_cache("abc", "https://example.com", ttl=10, expires_at_ms=1005500)
    fake.set.assert_called_once_with("abc", "https://example.com", pxat=1005500)
    cache.delete_cache("abc")
    fake.delete.assert_called_once_with("abc")


@pytest.mark.parametrize("url", ["http://224.0.0.1", "http://[ff02::1]"])
def test_multicast_rejected(url):
    with pytest.raises(ValidationError):
        URLCreate(long_url=url)


def test_numeric_string_expiry_rejected():
    with pytest.raises(ValidationError):
        URLCreate(long_url="https://example.com", expires_at="9999999999")


def test_no_redirect_if_expiry_passes_during_click_publication(
    client, db_session, monkeypatch
):
    code = create(client, expires_at="2099-01-01T00:00:00Z").json()["short_code"]

    class AfterExpiry(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2099, 1, 2, tzinfo=timezone.utc)

    def expire_during_publish(_):
        monkeypatch.setattr(service_module, "datetime", AfterExpiry)

    monkeypatch.setattr(service_module, "publish_click_event", expire_during_publish)
    assert client.get("/" + code, follow_redirects=False).status_code == 410


def test_cache_not_used_when_database_fails(client, monkeypatch):
    cache.redis_client.get.return_value = "https://example.com/path"
    monkeypatch.setattr(
        routes.service.repo,
        "get_by_code",
        Mock(side_effect=RuntimeError("database offline")),
    )
    with pytest.raises(RuntimeError, match="database offline"):
        client.get("/abc", follow_redirects=False)
    # A cache read must not bypass the failed database validation.


def test_far_expiry_cache_is_capped_at_jittered_ttl(monkeypatch):
    fake = Mock()
    monkeypatch.setattr(cache, "redis_client", fake)
    monkeypatch.setattr(cache.time, "time", lambda: 1000)
    cache.set_cache("abc", "https://example.com", expires_at_ms=9999999999999)
    ttl = fake.set.call_args.kwargs["pxat"] / 1000 - 1000
    assert 86400 * 0.9 <= ttl <= 86400 * 1.1


@pytest.mark.docker
def test_postgresql_alias_races_and_delete_lock(postgres, monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    from pathlib import Path
    from threading import Barrier, Event

    from sqlalchemy import select
    from sqlalchemy.orm import Session

    from alembic import command
    from alembic.config import Config
    from app.models.analytics import Analytics
    from app.repositories.url_repository import AliasTakenError, URLRepository
    from app.services.url_service import URLService

    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    with postgres.begin() as connection:
        cfg.attributes["connection"] = connection
        command.upgrade(cfg, "head")
    alias = "A" * 32
    barrier = Barrier(4)

    def writer(_):
        with Session(postgres) as session:
            barrier.wait(timeout=10)
            try:
                return URLService().shorten(session, "https://example.com/", alias)
            except AliasTakenError:
                return "conflict"

    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(writer, range(4)))
    assert results.count(alias) == 1
    assert results.count("conflict") == 3
    with Session(postgres) as session:
        session.add(Analytics(short_code=alias))
        session.commit()
    monkeypatch.setattr(service_module, "delete_cache", Mock())
    started, finished = Event(), Event()

    def delete():
        with Session(postgres) as session:
            started.set()
            result = URLService().delete(session, alias)
            finished.set()
            return result

    with ThreadPoolExecutor(max_workers=1) as executor:
        with Session(postgres) as reader:
            assert URLRepository().get_by_code(reader, alias) is not None
            future = executor.submit(delete)
            assert started.wait(5)
            assert not finished.wait(0.1)
            reader.rollback()  # Release redirect's shared lock.
        assert future.result(timeout=10)
    monkeypatch.setattr(
        service_module, "get_cache", Mock(return_value="https://example.com/")
    )
    with Session(postgres) as session:
        assert URLService().resolve(session, alias) is None
        # Cached data was read but could not override the database tombstone.
        assert session.scalar(select(Analytics.short_code)) == alias
    with postgres.begin() as connection:
        cfg.attributes["connection"] = connection
        with pytest.raises(RuntimeError, match="longer than 10"):
            command.downgrade(cfg, "0002")


def test_alias_is_case_sensitive(client):
    assert create(client, custom_alias="My_Link").status_code == 200
    assert create(client, custom_alias="my_link").status_code == 200


def test_expiry_equal_to_now_is_rejected(monkeypatch):
    import app.schemas.url_schema as schema

    class FrozenDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2030, 1, 1, tzinfo=timezone.utc)

    monkeypatch.setattr(schema, "datetime", FrozenDateTime)
    with pytest.raises(ValidationError, match="future"):
        URLCreate(long_url="https://example.com", expires_at="2030-01-01T00:00:00Z")


def test_subsecond_remaining_lifetime_does_not_populate_cache(db_session, monkeypatch):
    class FrozenDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2030, 1, 1, tzinfo=timezone.utc)

    monkeypatch.setattr(service_module, "datetime", FrozenDateTime)
    monkeypatch.setattr(
        service_module.time,
        "time",
        lambda: datetime(2030, 1, 1, tzinfo=timezone.utc).timestamp(),
    )
    monkeypatch.setattr(service_module, "get_cache", Mock(return_value=None))
    monkeypatch.setattr(service_module, "set_cache", Mock())
    monkeypatch.setattr(service_module, "publish_click_event", Mock())
    db_session.add(
        URL(
            short_code="abc",
            long_url="https://example.com/",
            expires_at=datetime(2030, 1, 1, microsecond=500000),
        )
    )
    db_session.commit()
    assert (
        service_module.URLService().resolve(db_session, "abc") == "https://example.com/"
    )
    service_module.set_cache.assert_not_called()
