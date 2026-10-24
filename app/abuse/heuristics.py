import ipaddress
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import unquote, urlsplit

import tldextract

from app.abuse.schemas import Reason

# Bundled PSL only; no HTTP, disk cache, DNS, or page requests. Private suffixes
# separate tenants such as alice.github.io and bob.github.io.
extract = tldextract.TLDExtract(
    suffix_list_urls=(), cache_dir=None, include_psl_private_domains=True
)
TLDS = {
    line.strip()
    for line in Path(__file__).with_name("suspicious_tlds.txt").read_text().splitlines()
    if line.strip() and not line.startswith("#")
}
SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "is.gd", "ow.ly", "buff.ly"}
BRANDS = {"paypal", "google", "microsoft", "apple", "amazon", "facebook"}


@dataclass(frozen=True)
class Features:
    domain: str
    host: str
    path: str
    score: float
    reasons: list[Reason]
    length: int
    digits: int
    specials: int


def analyze(url: str) -> Features:
    parsed = urlsplit(url)
    host = (parsed.hostname or "").lower().rstrip(".")
    path = parsed.path or "/"
    decoded = unquote(path).lower()
    parts = extract(host)
    domain = parts.top_domain_under_public_suffix or host
    reasons: list[Reason] = []
    weights: list[float] = []

    def add(reason: Reason, weight: float, matches: bool) -> None:
        if matches:
            reasons.append(reason)
            weights.append(weight)

    try:
        ipaddress.ip_address(host)
        literal = True
    except ValueError:
        literal = False
    add("ip_literal", 0.35, literal)
    punycode = any(label.startswith("xn--") for label in host.split("."))
    add("punycode", 0.2, punycode)
    try:
        unicode_host = host.encode("ascii").decode("idna")
    except (ValueError, UnicodeError):
        unicode_host = host
    scripts = {
        script
        for char in unicode_host
        for script in ("LATIN", "CYRILLIC", "GREEK")
        if script in unicodedata.name(char, "")
    }
    add("mixed_script", 0.3, len(scripts) > 1)
    add("deep_subdomains", 0.2, len(parts.subdomain.split(".")) >= 4)
    add("suspicious_tld", 0.2, host.rsplit(".", 1)[-1] in TLDS)
    digits = sum(char.isdigit() for char in url)
    specials = sum(not char.isalnum() and char not in ":/." for char in url)
    add("long_url", 0.15, len(url) > 180)
    add("many_digits", 0.15, digits >= 12)
    add("many_specials", 0.15, specials >= 15)
    tokens = set(re.split(r"[.\-_]", parts.subdomain))
    add("brand_subdomain", 0.3, bool(tokens & BRANDS) and parts.domain not in BRANDS)
    add("shortener_chain", 0.3, domain in SHORTENERS)
    add(
        "credential_path",
        0.25,
        bool(
            re.search(r"(?:^|[^a-z])(login|verify|secure|update)(?:$|[^a-z])", decoded)
        ),
    )
    return Features(
        domain,
        host,
        path,
        min(1.0, round(sum(weights), 4)),
        reasons,
        len(url),
        digits,
        specials,
    )
