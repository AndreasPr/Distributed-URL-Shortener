from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Verdict = Literal["clean", "suspicious", "malicious"]
Reason = Literal[
    "ip_literal",
    "punycode",
    "mixed_script",
    "deep_subdomains",
    "suspicious_tld",
    "long_url",
    "many_digits",
    "many_specials",
    "brand_subdomain",
    "shortener_chain",
    "credential_path",
    "llm_uncertain",
    "llm_invalid_output",
    "llm_unavailable",
]


class ModelVerdict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    verdict: Verdict
    confidence: float = Field(ge=0, le=1, allow_inf_nan=False)
    reasons: list[Reason] = Field(min_length=1, max_length=8)


class Assessment(BaseModel):
    model_config = ConfigDict(extra="forbid")
    verdict: Verdict
    score: float = Field(ge=0, le=1, allow_inf_nan=False)
    reasons: list[Reason]
    source: Literal["heuristic", "llm", "combined"]
    model: str | None = None


class ReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: Literal["allow", "block"]
