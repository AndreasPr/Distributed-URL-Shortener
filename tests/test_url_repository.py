from app.models.url import URL
from app.repositories.url_repository import URLRepository


def test_url_repository_create_update_and_lookup(db_session):
    repo = URLRepository()

    url = repo.create(db_session, "https://example.com")
    assert url.id is not None
    assert url.long_url == "https://example.com"

    repo.update_code(db_session, url, "abc")
    db_session.commit()

    found = repo.get_by_code(db_session, "abc")

    assert isinstance(found, URL)
    assert found.short_code == "abc"
    assert found.long_url == "https://example.com"
