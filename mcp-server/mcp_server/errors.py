from typing import Any


class SourceError(Exception):
    def __init__(self, source: str, message: str, details: Any | None = None):
        self.source = source
        self.message = message
        self.details = details
        super().__init__(message)

    def to_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "message": self.message,
            "details": self.details,
        }
