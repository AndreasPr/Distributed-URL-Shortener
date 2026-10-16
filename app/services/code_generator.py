"""Replaceable short-code candidate generation; the database owns uniqueness."""

import secrets
from typing import Protocol

from app.utils.base62 import charset

CODE_LENGTH = 7


class CodeGenerator(Protocol):
    def generate(self) -> str:
        """Return a URL-safe candidate, not a uniqueness guarantee."""
        ...


class RandomCodeGenerator:
    def generate(self) -> str:
        return "".join(secrets.choice(charset) for _ in range(CODE_LENGTH))
