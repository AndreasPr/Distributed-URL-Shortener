"""Local CSV validation and host-grouped reproducible holdout selection."""

import csv
import hashlib
import json
import random
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit


@dataclass(frozen=True)
class Example:
    url: str
    label: str

    @property
    def group(self) -> str:
        return (
            (urlsplit(self.url).hostname or "")
            .encode("idna")
            .decode()
            .lower()
            .rstrip(".")
        )


def load(paths: list[Path]) -> list[Example]:
    rows: dict[str, Example] = {}
    for path in sorted(paths):
        with path.open(newline="", encoding="utf-8-sig") as handle:
            reader = csv.DictReader(handle)
            if reader.fieldnames != ["url", "label"]:
                raise ValueError(f"Expected url,label columns in {path.name}")
            for number, row in enumerate(reader, 2):
                # Errors expose row numbers, never public URLs or tokens.
                try:
                    url, label = row["url"], row["label"]
                    parsed = urlsplit(url)
                    if (
                        set(row) != {"url", "label"}
                        or not url
                        or url != url.strip()
                        or label not in {"benign", "malicious"}
                        or len(url) > 2048
                        or parsed.scheme not in {"http", "https"}
                        or not parsed.hostname
                        or parsed.username
                        or parsed.password
                        or any(ord(c) < 32 for c in url)
                    ):
                        raise ValueError
                    example = Example(url, label)
                    _ = example.group
                    if url in rows and rows[url].label != label:
                        raise ValueError
                    rows[url] = example
                except (TypeError, ValueError, UnicodeError):
                    raise ValueError(
                        f"Invalid or conflicting row {number} in {path.name}"
                    ) from None
    if not rows:
        raise ValueError("No labeled CSV examples found")
    return sorted(rows.values(), key=lambda row: (row.url, row.label))


def fingerprint(rows: list[Example]) -> str:
    payload = json.dumps(sorted((r.url, r.label) for r in rows), ensure_ascii=True)
    return hashlib.sha256(payload.encode()).hexdigest()


def split(
    rows: list[Example], seed: int, dev_fraction: float
) -> dict[str, list[Example]]:
    if not 0 < dev_fraction < 1:
        raise ValueError("dev_fraction must be between zero and one")
    groups = sorted({r.group for r in rows})
    if len(groups) < 2:
        raise ValueError("At least two distinct hosts are required for a holdout")
    random.Random(seed).shuffle(groups)
    size = max(1, min(len(groups) - 1, int(len(groups) * dev_fraction)))
    dev = set(groups[:size])
    return {
        "dev": [r for r in rows if r.group in dev],
        "test": [r for r in rows if r.group not in dev],
    }


def select(rows: list[Example], seed: int, limit: int) -> list[Example]:
    if limit < 0:
        raise ValueError("limit must be nonnegative (zero means all)")
    chosen = sorted(rows, key=lambda r: r.url)
    random.Random(seed).shuffle(chosen)
    return chosen[:limit] if limit else chosen
