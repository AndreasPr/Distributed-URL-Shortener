import importlib.util
import json

import pytest

spec = importlib.util.spec_from_file_location("readme_check", "scripts/check_readme.py")
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


@pytest.fixture
def root(tmp_path, monkeypatch):
    for directory in ("frontend", "app"):
        (tmp_path / directory).mkdir()
    (tmp_path / "frontend/package.json").write_text(
        json.dumps({"scripts": {"dev": "next dev"}})
    )
    (tmp_path / "app/cli.py").write_text(
        'parser.add_parser("keys")\nparser.add_parser("create")'
    )
    (tmp_path / "Makefile").write_text("check:\n\ttrue\n")
    (tmp_path / "docker-compose.yml").write_text(
        "services:\n  api:\n    image: example\n"
    )
    monkeypatch.setattr(checker, "ROOT", tmp_path)
    return tmp_path


def test_repository_readme():
    assert checker.check() == 0


@pytest.mark.parametrize(
    "text",
    [
        "[missing](docs/not-here.md)",
        "`make nonexistent`",
        "[bad anchor](#missing)",
        "```bash\nnpm run missing\n```",
        "```bash\nbash scripts/missing.sh\n```",
        "\n" * 300,
    ],
)
def test_invalid_reference_fails(root, text):
    (root / "README.md").write_text(text)
    assert checker.check() == 1


def test_valid_local_anchor_and_target(root):
    (root / "README.md").write_text("# Example\n[here](#example)\n`make check`\n")
    assert checker.check() == 0
