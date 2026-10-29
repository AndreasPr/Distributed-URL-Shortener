"""Prepare hashed splits, freeze dev-only policy, then evaluate once offline."""

import argparse
import hashlib
import json
import random
from pathlib import Path
from typing import TypedDict

from app.abuse.classifier import Classifier
from app.abuse.heuristics import WEIGHTS, analyze, extract
from eval.abuse.legacy import analyze as legacy_analyze
from eval.abuse.loader import Example, fingerprint, load, split
from eval.abuse.metrics import summarize
from eval.abuse.run import TrackedProvider, measure

ROOT = Path(__file__).resolve().parents[2]
DEFAULT = ROOT / "eval/splits"


def row_id(row: Example) -> str:
    return fingerprint([row])


def group(row: Example) -> str:
    parts = extract(row.group)
    return parts.top_domain_under_public_suffix or row.group


def partition(rows: list[Example], seed: int = 42) -> dict[str, list[Example]]:
    # Never move any previously reported test host into tuning data.
    historical = split(rows, 42, 0.7)["test"]
    test_groups = {group(row) for row in historical}
    remaining = sorted({group(row) for row in rows} - test_groups)
    if len(remaining) < 2:
        raise ValueError("Need at least two remaining registered domains")
    random.Random(seed).shuffle(remaining)
    size = max(1, min(len(remaining) - 1, int(len(remaining) * 0.7)))
    train_groups = set(remaining[:size])
    return {
        "train": [r for r in rows if group(r) in train_groups],
        "dev": [r for r in rows if group(r) not in test_groups | train_groups],
        "test": [r for r in rows if group(r) in test_groups],
    }


def write_once(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x") as handle:
        handle.write(json.dumps(data, indent=2, sort_keys=True, allow_nan=False) + "\n")


def source_hash() -> str:
    files = [
        "app/abuse/features.py",
        "app/abuse/heuristics.py",
        "app/abuse/classifier.py",
        "app/abuse/schemas.py",
        "app/abuse/suspicious_tlds.txt",
    ]
    return hashlib.sha256(b"".join((ROOT / f).read_bytes() for f in files)).hexdigest()


def prepare(rows: list[Example], directory: Path, seed: int) -> None:
    partitions = partition(rows, seed)
    manifest = {
        "version": 1,
        "seed": seed,
        "dataset_sha256": fingerprint(rows),
        "grouping": "registered domain including private PSL; historical test closure",
        "historical_test_ids": sorted(row_id(r) for r in split(rows, 42, 0.7)["test"]),
        "splits": {k: sorted(row_id(r) for r in v) for k, v in partitions.items()},
        "counts": {
            k: {
                label: sum(r.label == label for r in v)
                for label in ("benign", "malicious")
            }
            for k, v in partitions.items()
        },
        "warning": (
            "Reused, previously reported snapshot; " "not a fresh independent test."
        ),
    }
    write_once(directory / "manifest.json", manifest)


def read_partition(rows: list[Example], directory: Path, name: str) -> list[Example]:
    manifest = json.loads((directory / "manifest.json").read_text())
    if manifest["dataset_sha256"] != fingerprint(rows):
        raise ValueError("Dataset fingerprint changed")
    lookup = {row_id(r): r for r in rows}
    ids = [x for values in manifest["splits"].values() for x in values]
    if len(ids) != len(set(ids)) or set(ids) != set(lookup):
        raise ValueError("Split membership is incomplete or overlapping")
    groups = [
        {group(lookup[x]) for x in values} for values in manifest["splits"].values()
    ]
    if any(a & b for i, a in enumerate(groups) for b in groups[i + 1 :]):
        raise ValueError("Registered domains overlap")
    if not set(manifest["historical_test_ids"]) <= set(manifest["splits"]["test"]):
        raise ValueError("Historical test data moved into tuning partitions")
    return [lookup[x] for x in manifest["splits"][name]]


def scored(rows: list[Example], scores: list[float], low: float, high: float) -> dict:
    verdicts = [
        "clean" if s < low else "malicious" if s >= high else "suspicious"
        for s in scores
    ]
    result = summarize([r.label for r in rows], verdicts, [0.0] * len(rows))
    result["median_latency_ms"] = result["p95_latency_ms"] = None
    return result


class Candidate(TypedDict):
    gray_low: float
    metrics: dict


def tune(dev: list[Example]) -> dict:
    if {r.label for r in dev} != {"benign", "malicious"}:
        raise ValueError("Development data must contain both labels")
    scores = [analyze(r.url).score for r in dev]
    # Predeclared grid/objective: maximize detection F1 with FPR <= 5% and
    # precision >= 90%; ties prefer recall, then the higher review threshold.
    candidates: list[Candidate] = []
    for low in (0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40):
        metric = scored(dev, scores, low, 1.0)
        candidates.append({"gray_low": low, "metrics": metric})
    feasible = [
        c
        for c in candidates
        if (c["metrics"]["precision"] or 0) >= 0.90
        and c["metrics"]["false_positive_rate"] <= 0.05
    ]
    if not feasible:
        raise ValueError(
            "No dev policy satisfies predeclared precision/FPR constraints"
        )
    chosen = max(
        feasible,
        key=lambda c: (c["metrics"]["f1"], c["metrics"]["recall"], c["gray_low"]),
    )
    # Auto-block threshold selected separately: no benign blocks on dev.
    high = next(
        h
        for h in (0.65, 0.75, 0.85, 1.0)
        if not scored(dev, scores, chosen["gray_low"], h)["blocked_benign"]
    )
    return {
        "gray_low": chosen["gray_low"],
        "gray_high": high,
        "input_limit": 512,
        "candidates": candidates,
        "dev_metrics": scored(dev, scores, chosen["gray_low"], high),
        "weights": WEIGHTS,
        "dev_sha256": fingerprint(dev),
    }


def freeze(rows: list[Example], directory: Path) -> None:
    # Only this partition is scored here; train is reserved for future weight fitting.
    policy = tune(read_partition(rows, directory, "dev"))
    policy["source_sha256"] = source_hash()
    policy["manifest_sha256"] = hashlib.sha256(
        (directory / "manifest.json").read_bytes()
    ).hexdigest()
    write_once(directory / "policy.json", policy)


def evaluate_test(rows: list[Example], directory: Path) -> dict:
    policy = json.loads((directory / "policy.json").read_text())
    if policy["source_sha256"] != source_hash():
        raise ValueError("Scorer changed after policy freeze")
    if (
        policy["manifest_sha256"]
        != hashlib.sha256((directory / "manifest.json").read_bytes()).hexdigest()
    ):
        raise ValueError("Splits changed after policy freeze")
    test = read_partition(rows, directory, "test")
    tracker = TrackedProvider("fake")
    classifier = Classifier(
        lambda: tracker,
        variant="combined",
        use_cache=False,
        gray_low=policy["gray_low"],
        gray_high=policy["gray_high"],
    )
    baseline = scored(test, [legacy_analyze(r.url).score for r in test], 0.15, 0.65)
    old_ids = set(
        json.loads((directory / "manifest.json").read_text())["historical_test_ids"]
    )
    historical = [r for r in test if row_id(r) in old_ids]
    historical_pair = {
        "baseline": scored(
            historical, [legacy_analyze(r.url).score for r in historical], 0.15, 0.65
        ),
        "current": scored(
            historical,
            [analyze(r.url).score for r in historical],
            policy["gray_low"],
            policy["gray_high"],
        ),
    }
    current = measure(test, classifier, tracker)
    return {
        "dataset_sha256": fingerprint(rows),
        "test_sha256": fingerprint(test),
        "policy_sha256": hashlib.sha256(
            (directory / "policy.json").read_bytes()
        ).hexdigest(),
        "source_sha256": source_hash(),
        "baseline": baseline,
        "historical_61_comparison": historical_pair,
        "combined_fake": current,
        "heuristics": scored(
            test,
            [analyze(r.url).score for r in test],
            policy["gray_low"],
            policy["gray_high"],
        ),
        "warning": (
            "Paired reused holdout, not fresh validation. "
            "Scored summaries have no latency measurement; "
            "use combined_fake timings."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=["prepare", "tune", "test"])
    parser.add_argument(
        "--data-dir", type=Path, default=ROOT / "eval/abuse/data/local/public"
    )
    parser.add_argument("--splits-dir", type=Path, default=DEFAULT)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    rows = load(list(args.data_dir.glob("*.csv")))
    if args.phase == "prepare":
        prepare(rows, args.splits_dir, args.seed)
    elif args.phase == "tune":
        freeze(rows, args.splits_dir)
    else:
        if (args.splits_dir / "test-results.json").exists():
            raise FileExistsError("Test report already exists; preserve it")
        result = evaluate_test(rows, args.splits_dir)
        write_once(args.splits_dir / "test-results.json", result)
        print(json.dumps(result, indent=2))
    print(f"{args.phase}: complete; output={args.splits_dir}")


if __name__ == "__main__":
    main()
