import json
from dataclasses import replace
from pathlib import Path
from unittest.mock import Mock

import pytest
import requests

from app.abuse.classifier import Classifier
from app.core.config import settings
from app.llm.base import Metadata
from eval.abuse.loader import Example, fingerprint, load, select, split
from eval.abuse.metrics import summarize
from eval.abuse.run import HERE, TrackedProvider, evaluate, main, markdown


@pytest.fixture(autouse=True)
def offline(monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("Evaluation tests must not contact HTTP or Redis")

    monkeypatch.setattr(requests.Session, "send", forbidden)
    monkeypatch.setattr("app.abuse.classifier.cache.read_cache", forbidden)
    monkeypatch.setattr(settings, "LLM_DAILY_BUDGET", 100)


def test_combined_fake_regression():
    config = json.loads((HERE / "config.json").read_text())
    report = evaluate("combined", "fake", seed=config["regression"]["seed"])
    m = report["metrics"]
    assert m["precision"] >= config["regression"]["precision_min"]
    assert m["recall"] >= config["regression"]["recall_min"]
    assert not m["llm_errors"]
    assert report["injection"]["correct"] == report["injection"]["n"]
    assert report["sizes"]["evaluated"] == report["sizes"]["test"]
    assert report["split"] == "test"


def test_fixture_provenance_and_counts():
    from urllib.parse import urlsplit

    rows = load(list((HERE / "data").glob("*.csv")))
    assert sum(r.label == "benign" for r in rows) >= 60
    assert sum(r.label == "malicious" for r in rows) >= 60
    for row in rows + load([HERE / "injection.csv"]):
        host = urlsplit(row.url).hostname
        assert any(
            host.endswith("." + suffix) or host == suffix
            for suffix in ("example.com", "example.org", "example.net")
        )


def test_splits_stable_grouped_and_limit_does_not_change_membership():
    rows = load([HERE / "data/sample.csv"])
    rows.append(Example(rows[0].url + "/other", rows[0].label))
    first = split(rows, 42, 0.7)
    second = split(list(reversed(rows)), 42, 0.7)
    assert {r.url for r in first["test"]} == {r.url for r in second["test"]}
    assert not {r.group for r in first["dev"]} & {r.group for r in first["test"]}
    assert len(first["dev"]) + len(first["test"]) == len(rows)
    assert select(first["test"], 42, 5) == select(second["test"], 42, 5)
    assert fingerprint(rows) == fingerprint(list(reversed(rows)))
    assert split(rows, 43, 0.7) != first


@pytest.mark.parametrize(
    "content",
    [
        "url,label\nhttps://example.com,unknown\n",
        "label,url\nbenign,https://example.com\n",
        "url,label\nhttps://user:secret@example.com,benign\n",
        "url,label\nhttps://example.com,benign\nhttps://example.com,malicious\n",
        "url,label\nhttps://example.com\n",
        "url,label\nfile:///tmp/private,benign\n",
    ],
)
def test_loader_rejects_bad_rows_without_echo(tmp_path, content):
    file = tmp_path / "sample.csv"
    file.write_text(content)
    with pytest.raises(ValueError) as exc:
        load([file])
    assert "secret" not in str(exc.value)
    assert "https://" not in str(exc.value)


def test_loader_deduplicates_and_does_not_recurse(tmp_path):
    (tmp_path / "a.csv").write_text("url,label\nhttps://example.com,benign\n" * 1)
    (tmp_path / "b.csv").write_text("url,label\nhttps://example.com,benign\n")
    (tmp_path / "raw").mkdir()
    (tmp_path / "raw/ignored.csv").write_text("invalid")
    assert len(load(list(tmp_path.glob("*.csv")))) == 1


def test_metric_arithmetic_and_undefined_values():
    m = summarize(
        ["malicious", "malicious", "benign", "benign"],
        ["malicious", "clean", "suspicious", "clean"],
        [1, 2, 3, 4],
    )
    assert m["confusion_matrix"] == dict(tp=1, fp=1, tn=1, fn=1)
    assert m["precision"] == m["recall"] == m["f1"] == m["false_positive_rate"] == 0.5
    assert m["median_latency_ms"] == 2.5 and m["p95_latency_ms"] == 4
    assert summarize([], [], [])["precision"] is None
    assert summarize(["benign"], ["clean"], [0])["recall"] is None


def test_variants_and_constant_fake_have_no_label_access():
    factory = Mock(side_effect=AssertionError("Heuristics must not invoke inference"))
    result = Classifier(factory, variant="heuristics", use_cache=False).classify(
        "https://example.com/login"
    )
    assert result.verdict == "suspicious"
    fake = TrackedProvider("fake")
    low = "https://example.com/"
    assert Classifier(lambda: fake, use_cache=False).classify(low).verdict == "clean"
    assert fake.calls == 0
    assert (
        Classifier(lambda: fake, variant="llm", use_cache=False).classify(low).verdict
        == "suspicious"
    )
    assert fake.calls == fake.limits.used == 1


def test_budget_failures_are_reported_not_hidden(monkeypatch):
    monkeypatch.setattr(settings, "LLM_DAILY_BUDGET", 0)
    report = evaluate("llm", "fake", limit=2)
    assert report["metrics"]["llm_errors"] == {"BudgetExceeded": 2}
    assert report["metrics"]["llm_calls_made"] == 2
    assert report["metrics"]["llm_attempts"] == 0
    assert report["metrics"]["input_tokens"] is None


def test_reported_tokens_and_missing_metadata(monkeypatch):
    from app.llm.providers import FakeProvider

    original = FakeProvider.classify_json

    def counted(self, *args):
        result = original(self, *args)
        return replace(result, metadata=Metadata("fake", "deterministic", 1, 7, 3))

    monkeypatch.setattr(FakeProvider, "classify_json", counted)
    report = evaluate("llm", "fake", limit=3)
    assert report["metrics"]["input_tokens"] == 21
    assert report["metrics"]["output_tokens"] == 9
    assert report["metrics"]["input_known"] == 3
    assert report["injection"]["input_tokens"] == 21


def test_runner_writes_both_formats_without_urls(tmp_path, monkeypatch):
    monkeypatch.setattr(
        "sys.argv",
        [
            "run",
            "--variant",
            "combined",
            "--provider",
            "fake",
            "--limit",
            "4",
            "--seed",
            "42",
            "--output-dir",
            str(tmp_path),
        ],
    )
    main()
    report = json.loads((tmp_path / "combined-fake-test.json").read_text())
    assert report["sizes"]["evaluated"] == 4
    assert report["sizes"]["injection_evaluated"] == 4
    assert "--seed 42" in report["command"]
    assert "https://" not in json.dumps(report)
    assert (tmp_path / "combined-fake-test.md").read_text() == markdown(report)


def test_dev_run_is_explicitly_marked():
    report = evaluate("heuristics", "fake", selected_split="dev")
    assert report["split"] == "dev"
    assert report["sizes"]["evaluated"] == 84
    assert report["metrics"]["llm_calls_made"] == 0
