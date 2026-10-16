import ipaddress
import re
from datetime import datetime, timezone
from urllib.parse import urlsplit, urlunsplit

from pydantic import BaseModel, Field, HttpUrl, field_validator

RESERVED_CODES = frozenset(
    {
        "api",
        "health",
        "metrics",
        "docs",
        "admin",
        "shorten",
        "urls",
        "analytics",
        "livez",
        "redoc",
        "openapi",
    }
)


class URLCreate(BaseModel):
    long_url: HttpUrl = Field(
        max_length=2048,
        description="Public HTTP(S) URL without credentials; maximum 2048 characters.",
    )
    custom_alias: str | None = Field(
        default=None,
        min_length=3,
        max_length=32,
        pattern=r"^[A-Za-z0-9_-]+$",
        description=(
            "Optional case-sensitive alias. Reserved route names are "
            "rejected case-insensitively."
        ),
    )
    expires_at: datetime | None = Field(
        default=None,
        description="Optional future ISO 8601 timestamp with timezone. Stored in UTC.",
    )

    @field_validator("long_url", mode="before")
    @classmethod
    def check_raw_url(cls, value):
        raw = str(value)
        if len(raw) > 2048:
            raise ValueError("URL must not exceed 2048 characters")
        if re.search(r"[\x00-\x20\x7f\\]", raw):
            raise ValueError(
                "URL must not contain whitespace, control characters, or backslashes"
            )
        if not re.match(r"^https?://", raw, re.IGNORECASE):
            raise ValueError("URL must use http or https and include a hostname")
        if not urlsplit(raw).hostname:
            raise ValueError("URL must include a hostname")
        if "@" in urlsplit(raw).netloc:
            raise ValueError("URL credentials are not allowed")
        return value

    @field_validator("long_url")
    @classmethod
    def public_host(cls, value: HttpUrl) -> HttpUrl:
        parsed = urlsplit(str(value))
        host = (parsed.hostname or "").lower().rstrip(".")
        if not host or host == "localhost" or host.endswith((".localhost", ".local")):
            raise ValueError(
                "A public hostname is required; localhost/local hosts are not allowed"
            )
        if "%" in host:
            raise ValueError("Scoped or encoded IP addresses are not allowed")
        try:
            address = ipaddress.ip_address(host)
        except ValueError:
            if any(
                not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label)
                for label in host.split(".")
            ):
                raise ValueError("Invalid hostname")
        else:
            mapped = getattr(address, "ipv4_mapped", None)
            if (
                not address.is_global
                or address.is_multicast
                or (mapped is not None and not mapped.is_global)
            ):
                raise ValueError(
                    "Private, loopback, link-local, and other non-public "
                    "IP addresses are not allowed"
                )
        authority = f"[{host}]" if ":" in host else host
        if parsed.port is not None:
            authority += f":{parsed.port}"
        return HttpUrl(
            urlunsplit(
                (parsed.scheme, authority, parsed.path, parsed.query, parsed.fragment)
            )
        )

    @field_validator("custom_alias")
    @classmethod
    def alias_not_reserved(cls, value: str | None) -> str | None:
        if value is not None and value.lower() in RESERVED_CODES:
            raise ValueError("This alias is reserved")
        return value

    @field_validator("expires_at", mode="before")
    @classmethod
    def iso_expiry(cls, value):
        if value is not None and not isinstance(value, (str, datetime)):
            raise ValueError("Expiry must be an ISO timestamp with timezone")
        if isinstance(value, str) and not re.match(r"^\d{4}-\d{2}-\d{2}[Tt]", value):
            raise ValueError("Expiry must be an ISO timestamp with timezone")
        return value

    @field_validator("expires_at")
    @classmethod
    def future_expiry(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Expiry must include a timezone")
        value = value.astimezone(timezone.utc)
        if value <= datetime.now(timezone.utc):
            raise ValueError("Expiry must be in the future")
        return value


class URLResponse(BaseModel):
    short_code: str
