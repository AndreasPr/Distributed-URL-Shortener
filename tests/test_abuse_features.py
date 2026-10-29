import base64
from unittest.mock import Mock

import pytest

from app.abuse import features as f
from app.abuse.classifier import Classifier
from app.abuse.heuristics import WEIGHTS, analyze
from eval.abuse.run import TrackedProvider


@pytest.mark.parametrize(
    "host,expected",
    [("8.8.8.8", True), ("2001:db8::1", True), ("[::1]", True), ("example.com", False)],
)
def test_ip(host, expected):
    assert f.ip_literal(host) is expected


def test_idn_and_homoglyphs():
    assert f.punycode("XN--BCHER-KVA.de")
    assert f.unicode_host("xn--bcher-kva.de") == "bücher.de"
    assert not f.homoglyph("bücher.de")
    assert not f.mixed_script("bücher.de")
    assert f.homoglyph("pаypal.example")  # Cyrillic a
    assert f.homoglyph("pаypal.example".encode("idna").decode())
    assert f.mixed_script("pаypal.example")
    assert not f.homoglyph("paypal.example")
    assert f.unicode_host("xn--invalid-.example") == "xn--invalid-.example"


def test_brand_and_depth():
    assert f.brand_subdomain("paypal-login.accounts", "example")
    assert not f.brand_subdomain("login", "paypal")
    assert not f.brand_subdomain("notpaypal", "example")
    assert f.excessive_subdomains("a.b.c.d")
    assert not f.excessive_subdomains("a.b.c")
    assert not f.excessive_subdomains("")


def test_entropy_and_hex():
    assert f.entropy("") == f.entropy("aaaa") == 0
    assert f.entropy("abcd") == 2
    assert f.random_label("a8c3e9f0b2d4.example.com")
    assert f.random_label("Q7x9K2m5R8z1V4w6.example.com")
    assert not f.random_label("www.example.com")
    assert not f.random_label("aaaaaaaaaaaaaaaa.example.com")
    assert not f.random_label("internationalization.example.com")
    assert not f.random_label("xn--bcher-kva.example.com")


def test_shorteners_are_text_only():
    assert f.shortener_chain("bit.ly", "/abc", "")
    assert f.shortener_chain("example.com", "/", "next=https%3A%2F%2Ft.co%2Fabc")
    assert f.shortener_chain("example.com", "/https://tinyurl.com/abc", "")
    assert not f.shortener_chain("example.com", "/bit.ly", "")
    assert not f.shortener_chain(
        "example.com", "/", "next=https://bit.ly.evil.example/x"
    )


def test_base64_query_boundaries():
    token = base64.urlsafe_b64encode(b"non-sensitive fixture " * 8).decode()
    assert f.base64_query("state=" + token)
    assert not f.base64_query("state=YWJjZA==")
    assert not f.base64_query("state=" + "!" * 150)
    assert not f.base64_query("state=" + "a" * 129)  # Invalid padding/length.


@pytest.mark.parametrize("word", ["login", "verify", "secure", "update", "%6Cogin"])
def test_path_words(word):
    assert f.credential_path("/" + word)
    assert not f.credential_path("/loginfoo")


def test_tlds_and_weight_explanations():
    assert f.suspicious_tld("example.ZIP.", frozenset({"zip"}))
    assert not f.suspicious_tld("zip.example.com", frozenset({"zip"}))
    result = analyze("https://paypal.a.b.c.d.example.zip/login")
    assert result.score == min(1, sum(WEIGHTS[r] for r in result.reasons))
    assert "brand_subdomain" in result.reasons


def test_gray_zone_only_and_query_privacy(monkeypatch):
    factory = Mock(side_effect=AssertionError("no inference outside gray zone"))
    classifier = Classifier(factory, use_cache=False, gray_low=0.15, gray_high=0.65)
    assert classifier.classify("https://example.com/").verdict == "clean"
    assert (
        classifier.classify("https://paypal.a.b.c.d.example.zip/login").verdict
        == "malicious"
    )
    tracker = TrackedProvider("fake")
    provider = Mock(wraps=tracker)
    classifier = Classifier(
        lambda: provider, use_cache=False, gray_low=0.15, gray_high=1
    )
    # Query affects local score only; it is never part of provider input.
    token = base64.urlsafe_b64encode(b"private-query-fixture " * 8).decode()
    first = classifier.classify("https://example.com/?state=" + token)
    second = classifier.classify("https://example.com/?state=" + token)
    assert first == second
    assert "base64_query" in first.reasons
    prompt = provider.classify_json.call_args.args[1]
    assert token not in prompt and "state" not in prompt
