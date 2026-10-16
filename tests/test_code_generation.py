import random
import re
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier
from unittest.mock import Mock

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from alembic import command
from alembic.config import Config
from app.models.url import URL
from app.repositories.url_repository import (
    MAX_CODE_ATTEMPTS,
    CodeGenerationExhausted,
    URLRepository,
)
from app.services.code_generator import RandomCodeGenerator
from app.services.url_service import URLService


def test_100000_candidates_are_unique_and_url_safe(monkeypatch):
    # Reproducible sample: random candidates can legitimately collide, so an
    # unseeded uniqueness assertion would intermittently fail (~0.14% of runs).
    rng = random.Random(20261016)
    monkeypatch.setattr("app.services.code_generator.secrets.choice", rng.choice)
    generator = RandomCodeGenerator()
    codes = [generator.generate() for _ in range(100_000)]
    assert len(set(codes)) == 100_000
    assert all(re.fullmatch(r"[a-zA-Z0-9]{7}", code) for code in codes)


def test_production_generator_uses_secrets_choice(monkeypatch):
    choice = Mock(return_value="Z")
    monkeypatch.setattr("app.services.code_generator.secrets.choice", choice)
    assert RandomCodeGenerator().generate() == "ZZZZZZZ"
    assert choice.call_count == 7
    assert len(set(choice.call_args.args[0])) == 62


def test_collision_retries_preserve_existing_destination(db_session):
    db_session.add(URL(short_code="AAAAAAA", long_url="https://original.example"))
    db_session.commit()
    generator = Mock()
    generator.generate.side_effect = ["AAAAAAA", "AAAAAAA", "BBBBBBB"]
    assert URLService(generator).shorten(db_session, "https://new.example") == "BBBBBBB"
    assert generator.generate.call_count == 3
    assert db_session.query(URL).count() == 2
    assert (
        db_session.scalar(select(URL.long_url).where(URL.short_code == "AAAAAAA"))
        == "https://original.example"
    )


def test_exhaustion_is_bounded_and_leaves_transaction_usable(db_session):
    db_session.add(URL(short_code="AAAAAAA", long_url="https://original.example"))
    db_session.commit()
    generator = Mock()
    generator.generate.return_value = "AAAAAAA"
    with pytest.raises(CodeGenerationExhausted):
        URLRepository(generator).create_with_code(db_session, "https://new.example")
    assert generator.generate.call_count == MAX_CODE_ATTEMPTS
    assert db_session.query(URL).count() == 1
    generator.generate.return_value = "BBBBBBB"
    assert (
        URLRepository(generator).create_with_code(db_session, "https://new.example")
        == "BBBBBBB"
    )
    db_session.commit()
    assert db_session.query(URL).count() == 2


def test_non_collision_integrity_error_is_not_retried(db_session):
    generator = Mock()
    generator.generate.return_value = "AAAAAAA"
    with pytest.raises(IntegrityError):
        URLRepository(generator).create_with_code(db_session, None)
    assert generator.generate.call_count == 1
    db_session.rollback()


@pytest.mark.docker
def test_concurrent_replicas_reserve_codes_in_postgresql(postgres):
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    with postgres.begin() as connection:
        cfg.attributes["connection"] = connection
        command.upgrade(cfg, "head")
    barrier = Barrier(8)

    class FirstCollisionGenerator:
        def __init__(self):
            self.calls = 0
            self.random = RandomCodeGenerator()

        def generate(self):
            self.calls += 1
            return "AAAAAAA" if self.calls == 1 else self.random.generate()

    def replica(number):
        generator = FirstCollisionGenerator()
        service = URLService(generator)
        barrier.wait(timeout=15)
        rows = []
        with Session(postgres) as session:
            for index in range(25):
                destination = f"https://example.com/{number}/{index}"
                rows.append((service.shorten(session, destination), destination))
        return rows, generator.calls

    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(replica, range(8)))
    rows = [row for batch, _ in results for row in batch]
    assert len({code for code, _ in rows}) == 200
    assert all(re.fullmatch(r"[a-zA-Z0-9]{7}", code) for code, _ in rows)
    assert sum(calls for _, calls in results) >= 207  # Seven forced losers retry.
    with Session(postgres) as session:
        assert session.scalar(select(func.count()).select_from(URL)) == 200
        assert set(session.execute(select(URL.short_code, URL.long_url)).all()) == set(
            rows
        )


def test_static_route_names_are_not_allocated(db_session):
    generator = Mock()
    generator.generate.side_effect = ["metrics", "shorten", "AAAAAAA"]
    assert URLService(generator).shorten(db_session, "https://example.com") == "AAAAAAA"
    assert generator.generate.call_count == 3
    assert db_session.query(URL).count() == 1
