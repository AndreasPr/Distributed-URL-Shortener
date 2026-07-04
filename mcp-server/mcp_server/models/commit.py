from pydantic import BaseModel


class CommitSummary(BaseModel):
    sha: str
    message: str
    author: str | None = None
    timestamp: str
    html_url: str | None = None
    files_changed: list[str] = []
