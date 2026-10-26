import os
import shutil
import subprocess
import sys
import time
import uuid

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import app.models.api_key
import app.models.analytics  # register Analytics model on shared Base
from app.models.url import Base


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def postgres():
    if os.environ.get("RUN_DOCKER_TESTS") != "1":
        pytest.skip("Requires Docker: run RUN_DOCKER_TESTS=1 pytest -m docker")
    if not shutil.which("docker"):
        pytest.fail("RUN_DOCKER_TESTS=1 but docker is not installed")
    name = "url-shortener-migrations-" + uuid.uuid4().hex[:12]
    # Disposable local container, no persistent volume or real credentials.
    subprocess.run(
        [
            "docker",
            "run",
            "--detach",
            "--rm",
            "--name",
            name,
            "-e",
            "POSTGRES_HOST_AUTH_METHOD=trust",
            "-p",
            "127.0.0.1::5432",
            "postgres:16.13-alpine",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    engine = None
    try:
        port = (
            subprocess.check_output(["docker", "port", name, "5432/tcp"], text=True)
            .strip()
            .rsplit(":", 1)[1]
        )
        engine = create_engine(
            "postgresql+psycopg2://postgres@127.0.0.1:" + port + "/postgres",
            connect_args={"connect_timeout": 1},
        )
        for _ in range(60):
            try:
                with engine.connect() as connection:
                    connection.execute(text("SELECT 1"))
                break
            except OperationalError:
                time.sleep(0.5)
        else:
            pytest.fail("Disposable PostgreSQL did not become ready in 30 seconds")
        yield engine
    finally:
        if engine is not None:
            engine.dispose()
        subprocess.run(["docker", "rm", "-f", name], check=True, capture_output=True)


@pytest.fixture(autouse=True)
def isolated_cache(monkeypatch):
    # Prevent global breaker/flight state leaking between tests or real Redis I/O.
    from cache_fakes import FakeRedis
    import app.cache.redis_client as cache
    import app.api.routes as routes
    import app.services.url_service as service
    from app.cache.circuit_breaker import CircuitBreaker
    from app.cache.singleflight import SingleFlight
    from app.observability.metrics import circuit_breaker_state

    fake = FakeRedis()
    monkeypatch.setattr(cache, 'redis_client', fake)
    monkeypatch.setattr(routes, 'redis_client', fake)
    monkeypatch.setattr(cache, 'breaker', CircuitBreaker())
    monkeypatch.setattr(service, 'loads', SingleFlight())
    circuit_breaker_state.set(0)
    return fake


@pytest.fixture
def auth_key(db_session):
    from app.services.api_keys import create_key
    return create_key(db_session, "test client", ["read", "write"])


def pytest_addoption(parser):
    parser.addoption(
        "--run-integration",
        action="store_true",
        default=False,
        help="Start disposable Docker services for integration tests",
    )


def pytest_collection_modifyitems(config, items):
    if not config.getoption("--run-integration"):
        skip = pytest.mark.skip(reason="Use make test-integration (Docker required)")
        for item in items:
            if "integration" in item.keywords:
                item.add_marker(skip)
