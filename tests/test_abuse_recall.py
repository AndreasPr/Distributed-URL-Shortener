import json

import pytest

from eval.abuse.loader import Example
from eval.abuse.recall import (
    evaluate_test,
    freeze,
    group,
    partition,
    prepare,
    read_partition,
    tune,
)
from eval.abuse.report import update_report


def rows():
    return [
        Example(
            f"https://host{i}.com/" + ("login" if i % 2 else ""),
            "malicious" if i % 2 else "benign",
        )
        for i in range(100)
    ]


def test_domain_grouped_split_and_historical_exclusion(tmp_path):
    data = rows() + [Example("https://a.host1.com/verify", "malicious")]
    parts = partition(data)
    reversed_parts = partition(list(reversed(data)))
    assert {k: set(v) for k, v in parts.items()} == {
        k: set(v) for k, v in reversed_parts.items()
    }
    groups = [{group(r) for r in part} for part in parts.values()]
    assert all(not a & b for i, a in enumerate(groups) for b in groups[i + 1 :])
    prepare(data, tmp_path, 42)
    manifest = json.loads((tmp_path / "manifest.json").read_text())
    assert set(manifest["historical_test_ids"]) <= set(manifest["splits"]["test"])
    assert "https://" not in (tmp_path / "manifest.json").read_text()
    assert set(read_partition(data, tmp_path, "dev")) == set(parts["dev"])
    with pytest.raises(FileExistsError):
        prepare(data, tmp_path, 42)
    with pytest.raises(ValueError, match="fingerprint"):
        read_partition(data[:-1], tmp_path, "dev")


def test_tuning_only_reads_dev(monkeypatch, tmp_path):
    data = rows()
    prepare(data, tmp_path, 42)
    import eval.abuse.recall as module

    original = module.read_partition
    seen = []

    def dev_only(rows, path, name):
        assert name == "dev"
        seen.append(name)
        return original(rows, path, name)

    monkeypatch.setattr(module, "read_partition", dev_only)
    freeze(data, tmp_path)
    assert seen == ["dev"]
    with pytest.raises(FileExistsError):
        freeze(data, tmp_path)
    policy = json.loads((tmp_path / "policy.json").read_text())
    assert policy["gray_low"] == 0.25
    assert policy["dev_metrics"]["recall"] == 1


def test_test_phase_requires_frozen_unchanged_scorer(tmp_path, monkeypatch):
    data = rows()
    prepare(data, tmp_path, 42)
    with pytest.raises(FileNotFoundError):
        evaluate_test(data, tmp_path)
    freeze(data, tmp_path)
    result = evaluate_test(data, tmp_path)
    assert result["combined_fake"]["recall"] == 1
    monkeypatch.setattr("eval.abuse.recall.source_hash", lambda: "changed")
    with pytest.raises(ValueError, match="changed"):
        evaluate_test(data, tmp_path)


def test_no_feasible_policy_is_not_silently_relaxed():
    with pytest.raises(ValueError, match="constraints"):
        tune(
            [
                Example("https://example.com/", "malicious"),
                Example("https://example.org/login", "benign"),
            ]
        )


def test_synthetic_report_preserves_public_results(tmp_path):
    path = tmp_path / "results.md"
    path.write_text("# Public results\nRecall 9.375%; keep this baseline.\n")
    update_report(path, "first synthetic result")
    update_report(path, "second synthetic result")
    result = path.read_text()
    assert "Recall 9.375%" in result
    assert "first synthetic" not in result and "second synthetic" in result
    assert result.count("<!-- synthetic-eval:start -->") == 1
