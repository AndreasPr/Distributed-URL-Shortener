"""Token-bucket contract with a fake Redis; real Lua coverage is step 5.1."""

from concurrent.futures import ThreadPoolExecutor

import pytest
from starlette.requests import Request

from app.core.config import settings
from app.middleware.rate_limiter import check_bucket, client_ip


def test_bucket_burst_refill_and_identity_isolation(isolated_cache):
    clock = [100.0]
    isolated_cache.clock = lambda: clock[0]
    for remaining in (2, 1, 0):
        result = check_bucket("/shorten", "key:1", 3, 0.5)
        assert result.allowed and result.remaining == remaining
    denied = check_bucket("/shorten", "key:1", 3, 0.5)
    assert not denied.allowed
    assert denied.headers() == {
        "RateLimit-Limit": "3",
        "RateLimit-Remaining": "0",
        "RateLimit-Reset": "6",
        "Retry-After": "2",
    }
    assert check_bucket("/shorten", "key:2", 3, 0.5).allowed
    clock[0] += 1
    assert not check_bucket("/shorten", "key:1", 3, 0.5).allowed
    clock[0] += 1
    assert check_bucket("/shorten", "key:1", 3, 0.5).allowed
    clock[0] += 1000
    assert check_bucket("/shorten", "key:1", 3, 0.5).remaining == 2


def test_bucket_concurrent_burst(isolated_cache):
    isolated_cache.clock = lambda: 100.0
    with ThreadPoolExecutor(max_workers=16) as pool:
        results = list(
            pool.map(lambda _: check_bucket("/{code}", "ip:127.0.0.1", 5, 1), range(30))
        )
    assert sum(result.allowed for result in results) == 5


def test_bucket_error_and_clock_regression(isolated_cache):
    isolated_cache.clock = lambda: 100.0
    assert check_bucket("/shorten", "key:1", 1, 1).allowed
    isolated_cache.clock = lambda: 99.0
    assert not check_bucket("/shorten", "key:1", 1, 1).allowed
    isolated_cache.down = True
    with pytest.raises(ConnectionError):
        check_bucket("/shorten", "key:1", 1, 1)


@pytest.mark.parametrize(
    "peer,forwarded,trusted,expected",
    [
        ("198.51.100.5", "1.2.3.4", [], "198.51.100.5"),
        ("198.51.100.5", "1.2.3.4", ["10.0.0.0/8"], "198.51.100.5"),
        ("10.0.0.1", "198.51.100.5", ["10.0.0.0/8"], "198.51.100.5"),
        ("10.0.0.1", "1.2.3.4, 198.51.100.5", ["10.0.0.0/8"], "198.51.100.5"),
        ("10.0.0.1", "198.51.100.5, 10.0.0.2", ["10.0.0.0/8"], "198.51.100.5"),
        ("::1", "2001:db8::1", ["::1/128"], "2001:db8::1"),
        ("10.0.0.1", "garbage", ["10.0.0.0/8"], "10.0.0.1"),
    ],
)
def test_forwarded_headers_only_from_trusted_peers(
    monkeypatch, peer, forwarded, trusted, expected
):
    monkeypatch.setattr(settings, "TRUSTED_PROXIES", trusted)
    request = Request(
        {
            "type": "http",
            "client": (peer, 1234),
            "headers": [(b"x-forwarded-for", forwarded.encode())],
        }
    )
    assert client_ip(request) == expected
