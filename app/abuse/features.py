"""Pure lexical indicators: no DNS, URL following, or remote lookups."""

import base64
import binascii
import ipaddress
import math
import re
import unicodedata
from collections import Counter
from urllib.parse import parse_qsl, unquote, urlsplit

BRANDS = frozenset({"paypal", "google", "microsoft", "apple", "amazon", "facebook"})
SHORTENERS = frozenset({"bit.ly", "tinyurl.com", "t.co", "is.gd", "ow.ly", "buff.ly"})
# Deliberately small confusable skeleton, not a complete Unicode security library.
CONFUSABLES = str.maketrans(
    dict(zip("аеросхуіјӏΑΒΕΖΗΙΚΜΝΟΡΤΥΧ", "aepocxyijlABEZHIKMNOPTYX"))
)


def unicode_host(host: str) -> str:
    try:
        return host.encode("ascii").decode("idna")
    except UnicodeError:
        return host


def ip_literal(host: str) -> bool:
    try:
        ipaddress.ip_address(host.strip("[]"))
        return True
    except ValueError:
        return False


def punycode(host: str) -> bool:
    return any(label.lower().startswith("xn--") for label in host.split("."))


def mixed_script(host: str) -> bool:
    scripts = {
        s
        for c in unicode_host(host)
        for s in ("LATIN", "CYRILLIC", "GREEK")
        if s in unicodedata.name(c, "")
    }
    return len(scripts) > 1


def homoglyph(host: str) -> bool:
    value = unicode_host(host)
    return value.translate(CONFUSABLES) != value


def brand_subdomain(subdomain: str, domain_label: str) -> bool:
    tokens = set(re.split(r"[.\-_]", unicode_host(subdomain).lower()))
    return bool(tokens & BRANDS) and domain_label.lower() not in BRANDS


def excessive_subdomains(subdomain: str) -> bool:
    return len([s for s in subdomain.split(".") if s]) >= 4


def entropy(label: str) -> float:
    if not label:
        return 0.0
    return -sum(
        (n / len(label)) * math.log2(n / len(label))
        for n in Counter(label.lower()).values()
    )


def random_label(host: str) -> bool:
    for label in host.lower().rstrip(".").split(".")[:-1]:
        if label.startswith("xn--"):
            continue
        if (
            len(label) >= 12
            and re.fullmatch(r"[a-f0-9]+", label)
            and any(c.isdigit() for c in label)
            and any(c.isalpha() for c in label)
        ):
            return True
        if (
            len(label) >= 16
            and entropy(label) >= 3.5
            and any(c.isdigit() for c in label)
            and any(c.isalpha() for c in label)
        ):
            return True
    return False


def shortener_chain(domain: str, path: str, query: str) -> bool:
    # A shortener host is only a risk signal, not proof of a resolved chain.
    if domain in SHORTENERS:
        return True
    # Recognize explicit nested URLs without following or fetching them.
    for value in re.findall(r'https?://[^\s<>"\']+', unquote(path + "?" + query)):
        try:
            if (urlsplit(value).hostname or "").lower().rstrip(".") in SHORTENERS:
                return True
        except ValueError:
            continue
    return False


def base64_query(query: str) -> bool:
    if len(query) < 128:
        return False
    for _, value in parse_qsl(query, keep_blank_values=True):
        if len(value) < 64 or not re.fullmatch(r"[A-Za-z0-9+/_-]+={0,2}", value):
            continue
        try:
            decoded = base64.b64decode(
                value + "=" * (-len(value) % 4), altchars=b"-_", validate=True
            )
            if len(decoded) >= 32:
                return True
        except (ValueError, binascii.Error):
            continue
    return False


def suspicious_tld(host: str, tlds: frozenset[str]) -> bool:
    return host.lower().rstrip(".").rsplit(".", 1)[-1] in tlds


def credential_path(path: str) -> bool:
    return bool(
        re.search(
            r"(?:^|[^a-z])(login|verify|secure|update)(?:$|[^a-z])",
            unquote(path).lower(),
        )
    )
