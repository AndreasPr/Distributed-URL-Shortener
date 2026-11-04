from app.models.url import URL
from app.repositories.url_repository import URLRepository
from app.models.identity import DEFAULT_WORKSPACE_ID


def test_url_repository_create_with_code_and_lookup(db_session):
    repo = URLRepository()

    code = repo.create_with_code(db_session, "https://example.com", workspace_id=DEFAULT_WORKSPACE_ID)
    assert code is not None
    db_session.commit()

    found = repo.get_by_code(db_session, code, workspace_id=DEFAULT_WORKSPACE_ID)

    assert isinstance(found, URL)
    assert found.short_code == code
    assert found.long_url == "https://example.com"
