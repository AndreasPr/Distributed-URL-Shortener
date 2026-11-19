"""Build boundaries for inert design source; secret scanning must remain enabled."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_reference_has_no_server_database_environment_or_run_scripts():
    import json
    reference = ROOT / 'docs/design-reference'
    assert not [p for p in reference.rglob('*') if p.is_file() and
                (p.name in {'server.ts', 'server.js', 'db.json'} or p.name.startswith('.env'))]
    assert 'scripts' not in json.loads((reference / 'package.json').read_text())


def test_build_and_quality_boundaries_keep_secret_scanning():
    for filename in ('.dockerignore', '.vercelignore', '.flake8', 'pytest.ini', 'pyproject.toml'):
        assert 'docs/design-reference' in (ROOT / filename).read_text()
    for filename in ('.gitleaks.toml', '.pre-commit-config.yaml'):
        assert 'design-reference' not in (ROOT / filename).read_text()
    make = (ROOT / 'Makefile').read_text()
    assert 'cd frontend &&' in make
    assert 'testpaths = tests' in (ROOT / 'pytest.ini').read_text()


def test_every_reference_component_and_dataset_is_in_plan():
    import re
    reference = ROOT / 'docs/design-reference/src'
    plan = (ROOT / 'docs/design-port-plan.md').read_text()
    for folder in ('pages', 'components', 'context', 'layouts', 'design-system'):
        for path in (reference / folder).rglob('*'):
            if path.is_file():
                assert str(path.relative_to(reference)) in plan
    for name in re.findall(r'export const (\w+)', (reference / 'mock/index.ts').read_text()):
        assert name in plan
