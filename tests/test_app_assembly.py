"""Exercise the assembled application, with no external services."""

from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from redis.exceptions import ConnectionError, TimeoutError
from starlette.middleware.cors import CORSMiddleware

import app.main as main
import app.api.routes as routes
import app.cache.redis_client as cache
import app.services.url_service as url_service
from app.core.config import settings
from app.db.database import get_db
from app.middleware.rate_limiter import rate_limit_middleware


@pytest.fixture
def client(monkeypatch, db_session, auth_key):
    from cache_fakes import FakeRedis
    fake = Mock()
    fake.eval.side_effect = FakeRedis().eval
    fake.get.return_value = None
    fake.ping.return_value = True
    fake.dbsize.return_value = 0
    monkeypatch.setattr(cache, "redis_client", fake)
    monkeypatch.setattr(routes, "redis_client", fake)
    monkeypatch.setattr(url_service, "publish_click_event", Mock())
    monkeypatch.setattr(main, "init_tracing", Mock())
    monkeypatch.setattr(main, "configure_logging_with_tracing", Mock())
    previous = main.app.dependency_overrides.copy()
    main.app.dependency_overrides[get_db] = lambda: db_session
    main.app.dependency_overrides[routes.get_health_db] = lambda: db_session
    try:
        with TestClient(main.app, headers={"X-API-Key": auth_key[1]}) as test_client:
            yield test_client
    finally:
        main.app.dependency_overrides = previous


def test_middleware_and_metrics(client):
    middleware = main.app.user_middleware
    assert {m.cls.__name__ for m in middleware} == {
        "CORSMiddleware",
        "PrometheusInstrumentatorMiddleware",
        "BaseHTTPMiddleware",
    }
    cors = next(m for m in middleware if m.cls is CORSMiddleware)
    assert cors.kwargs == dict(
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "cache_errors_total" in response.text


def test_cors_preflight(client):
    origin = settings.CORS_ORIGINS[0]
    response = client.options(
        "/shorten",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin


def test_rate_limiter_is_registered():
    assert any(
        m.kwargs.get("dispatch") is rate_limit_middleware
        for m in main.app.user_middleware
    )


def test_main_routes(client):
    response = client.post(
        "/shorten", json={"long_url": "https://example.com/private?token=secret"}
    )
    assert response.status_code == 200
    assert set(response.json()) == {"short_code"}
    code = response.json()["short_code"]
    response = client.get("/" + code, follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "https://example.com/private?token=secret"
    url_service.publish_click_event.assert_called_once_with(code)
    response = client.get("/urls")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert client.get("/analytics/" + code).json() == {
        "short_code": code,
        "total_clicks": 0,
        "timestamps": [],
    }
    assert client.get("/health").json() == {
        "status": "ok",
        "db": "reachable",
        "redis": "reachable",
        "total_urls": 1,
    }
    assert client.get("/health").status_code == 200
    assert client.get("/health/redis").status_code == 200
    assert client.get("/livez").json() == {"status": "ok"}
    assert client.get("/unknown").status_code == 404
    assert client.get("/analytics/unknown").status_code == 404


@pytest.mark.parametrize(
    "path,service,method",
    [
        ("/urls", routes.service, "list_recent_urls"),
        ("/analytics/code", routes.analytics_service, "get_analytics"),
    ],
)
def test_service_failures_are_503(client, monkeypatch, caplog, path, service, method):
    monkeypatch.setattr(
        service, method, Mock(side_effect=RuntimeError("sensitive connection details"))
    )
    response = client.get(path)
    assert response.status_code == 503
    assert set(response.json()) == {"detail"}
    assert "sensitive connection details" not in response.text
    assert any(record.exc_info for record in caplog.records)


@pytest.mark.parametrize("dependency", ["db", "redis", "both"])
def test_health_dependency_failures(client, db_session, monkeypatch, dependency):
    if dependency in ("db", "both"):
        monkeypatch.setattr(
            db_session, "execute", Mock(side_effect=RuntimeError("offline"))
        )
    if dependency in ("redis", "both"):
        routes.redis_client.ping.side_effect = ConnectionError("offline")
    response = client.get("/health")
    assert response.status_code == 503
    assert response.json() == {
        "status": "degraded",
        "db": "unreachable" if dependency in ("db", "both") else "reachable",
        "redis": "unreachable" if dependency in ("redis", "both") else "reachable",
        "total_urls": 0,
    }


def test_false_redis_ping_is_unhealthy(client):
    routes.redis_client.ping.return_value = False
    assert client.get("/health").status_code == 503


def test_livez_does_not_touch_dependencies(client):
    def forbidden():
        raise AssertionError("dependency used")

    main.app.dependency_overrides[get_db] = forbidden
    main.app.dependency_overrides[routes.get_health_db] = forbidden
    routes.redis_client.ping.side_effect = forbidden
    response = client.get("/livez")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    routes.redis_client.ping.assert_not_called()


@pytest.mark.parametrize("error", [ConnectionError, TimeoutError])
def test_redirect_falls_back_on_redis_read_failure(client, error):
    code = client.post("/shorten", json={"long_url": "https://example.com/"}).json()[
        "short_code"
    ]
    cache.redis_client.get.side_effect = error("offline")
    response = client.get("/" + code, follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "https://example.com/"
    assert client.get("/missing").status_code == 404


@pytest.mark.parametrize("method", ["ping", "dbsize"])
def test_redis_health_read_failures(client, method):
    getattr(cache.redis_client, method).side_effect = TimeoutError("offline")
    assert client.get("/health/redis").status_code == 503


def test_health_session_acquisition_failure(client, monkeypatch):
    def broken_db():
        raise RuntimeError("cannot create session")
        yield  # This dependency must have the same generator interface as get_db.

    monkeypatch.setattr(routes, "get_db", broken_db)
    del main.app.dependency_overrides[routes.get_health_db]
    response = client.get("/health")
    assert response.status_code == 503
    assert response.json()["db"] == "unreachable"
    assert response.json()["redis"] == "reachable"


def test_health_session_is_closed(client, monkeypatch, db_session):
    closed = []

    def fake_db():
        try:
            yield db_session
        finally:
            closed.append(True)

    monkeypatch.setattr(routes, "get_db", fake_db)
    del main.app.dependency_overrides[routes.get_health_db]
    assert client.get("/health").status_code == 200
    assert closed == [True]


def test_stopped_redis_never_makes_redirect_5xx_and_health_reports_breaker(
    client, monkeypatch
):
    from app.cache.circuit_breaker import CircuitBreaker
    from app.observability.metrics import cache_errors_total, circuit_breaker_state

    clock = [0.0]
    monkeypatch.setattr(cache, "breaker", CircuitBreaker(clock=lambda: clock[0]))
    code = client.post("/shorten", json={"long_url": "https://example.com/"}).json()[
        "short_code"
    ]
    fake = cache.redis_client
    for name in ("get", "set", "delete", "eval", "ping", "dbsize"):
        getattr(fake, name).reset_mock()
        getattr(fake, name).side_effect = ConnectionError("Redis stopped")
    before = cache_errors_total._value.get()
    for _ in range(10):
        assert client.get("/" + code, follow_redirects=False).status_code == 307
        assert client.get("/missing", follow_redirects=False).status_code == 404
    assert (
        sum(
            getattr(fake, name).call_count
            for name in ("get", "set", "delete", "eval", "ping", "dbsize")
        )
        == 3
    )
    response = client.get("/health")
    assert response.status_code == 503
    assert response.json()["redis"] == "unreachable"
    assert response.json()["db"] == "reachable"
    fake.ping.assert_not_called()
    assert circuit_breaker_state._value.get() == 1
    assert cache_errors_total._value.get() > before
    assert "circuit_breaker_state 1.0" in client.get("/metrics").text
    # The health endpoint itself can perform the one half-open recovery probe.
    clock[0] = 5
    fake.ping.side_effect = None
    fake.ping.return_value = True
    assert client.get("/health").status_code == 200
    assert circuit_breaker_state._value.get() == 0


@pytest.mark.docker
def test_actual_stopped_redis_keeps_redirects_available(client, monkeypatch):
    import os
    import subprocess
    import time
    import uuid

    if os.environ.get("RUN_DOCKER_TESTS") != "1":
        pytest.skip("Requires Docker: RUN_DOCKER_TESTS=1")
    name = "url-cache-test-" + uuid.uuid4().hex[:12]
    subprocess.run(
        [
            "docker",
            "run",
            "-d",
            "--rm",
            "--name",
            name,
            "-p",
            "127.0.0.1::6379",
            "redis:7.4.9-alpine",
        ],
        check=True,
        capture_output=True,
    )
    redis = None
    try:
        port = (
            subprocess.check_output(["docker", "port", name, "6379/tcp"], text=True)
            .strip()
            .rsplit(":", 1)[1]
        )
        monkeypatch.setattr(cache.settings, "REDIS_URL", f"redis://127.0.0.1:{port}/0")
        redis = cache._create_client()
        for _ in range(100):
            try:
                if redis.ping():
                    break
            except (ConnectionError, TimeoutError):
                time.sleep(0.02)
        else:
            pytest.fail("Test Redis did not start")
        monkeypatch.setattr(cache, "redis_client", redis)
        monkeypatch.setattr(routes, "redis_client", redis)
        code = client.post(
            "/shorten", json={"long_url": "https://example.com/"}
        ).json()["short_code"]
        assert client.get("/" + code, follow_redirects=False).status_code == 307
        assert '"kind": "url"' in redis.get(code)
        # Exercise real Lua fencing rather than only the fake's implementation.
        token, reachable = cache.acquire_lock("fence")
        assert token and reachable
        cache.invalidate_cache("fence")
        cache.set_cache("fence", "stale", lock_token=token)
        assert redis.get("fence") is None
        subprocess.run(
            ["docker", "stop", "-t", "0", name], check=True, capture_output=True
        )
        for _ in range(5):
            assert client.get("/" + code, follow_redirects=False).status_code == 307
            assert client.get("/missing", follow_redirects=False).status_code == 404
        response = client.get("/health")
        assert response.status_code == 503
        assert response.json()["redis"] == "unreachable"
        assert cache.breaker.state == 1
    finally:
        if redis is not None:
            redis.close()
        subprocess.run(["docker", "rm", "-f", name], check=False, capture_output=True)
