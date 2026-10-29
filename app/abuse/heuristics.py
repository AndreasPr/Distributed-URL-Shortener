from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

import tldextract

from app.abuse import features as lexical
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
# Transparent additive weights; deliberately not a probability estimate.
WEIGHTS: dict[Reason, float] = {
    "ip_literal": 0.35,
    "punycode": 0.2,
    "mixed_script": 0.3,
    "homoglyph": 0.2,
    "deep_subdomains": 0.2,
    "suspicious_tld": 0.2,
    "long_url": 0.15,
    "many_digits": 0.15,
    "many_specials": 0.15,
    "brand_subdomain": 0.3,
    "shortener_chain": 0.3,
    "credential_path": 0.25,
    "random_label": 0.25,
    "base64_query": 0.2,
}


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
    parts = extract(host)
    domain = parts.top_domain_under_public_suffix or host
    digits = sum(char.isdigit() for char in url)
    specials = sum(not char.isalnum() and char not in ":/." for char in url)
    indicators: dict[Reason, bool] = {
        "ip_literal": lexical.ip_literal(host),
        "punycode": lexical.punycode(host),
        "mixed_script": lexical.mixed_script(host),
        "homoglyph": lexical.homoglyph(host),
        "deep_subdomains": lexical.excessive_subdomains(parts.subdomain),
        "suspicious_tld": lexical.suspicious_tld(host, frozenset(TLDS)),
        "long_url": len(url) > 180,
        "many_digits": digits >= 12,
        "many_specials": specials >= 15,
        "brand_subdomain": lexical.brand_subdomain(parts.subdomain, parts.domain),
        "shortener_chain": lexical.shortener_chain(domain, path, parsed.query),
        "credential_path": lexical.credential_path(path),
        "random_label": lexical.random_label(host),
        "base64_query": lexical.base64_query(parsed.query),
    }
    reasons = [reason for reason, matches in indicators.items() if matches]
    weights = [WEIGHTS[reason] for reason in reasons]
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
