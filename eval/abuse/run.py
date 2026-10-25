"""Run offline fixtures, or explicitly selected live inference; never fetch URLs."""

import argparse
import hashlib
import importlib.metadata
import json
import platform
import shlex
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from app.abuse.classifier import Classifier
from app.core.config import settings
from app.llm.base import Classification, HTTPError, LLMError, T
from app.llm.limits import Limits
from app.llm.providers import FakeProvider, GeminiProvider, OllamaProvider, Provider
from eval.abuse.loader import Example, fingerprint, load, select, split
from eval.abuse.metrics import summarize

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
Variant = Literal["heuristics", "llm", "combined"]


class TrackedProvider:
    def __init__(self, name: str):
        self.name = name
        self.limits = Limits(settings.LLM_CONCURRENCY, settings.LLM_DAILY_BUDGET)
        self.instance: Provider | None = None
        self.calls = self.input_tokens = self.output_tokens = 0
        self.input_known = self.output_known = 0
        self.errors: dict[str, int] = {}
        self.model = {
            "fake": "deterministic",
            "gemini": settings.GEMINI_MODEL,
            "ollama": settings.OLLAMA_MODEL,
        }[name] or "not_configured"

    def classify_json(
        self, system_prompt: str, user_content: str, schema: type[T]
    ) -> Classification[T]:
        self.calls += 1
        try:
            if self.instance is None:
                if self.name == "fake":
                    # Constant response, no labels/heuristics consulted by the fake.
                    self.instance = FakeProvider(
                        '{"verdict":"suspicious","confidence":0.5,'
                        '"reasons":["llm_uncertain"]}',
                        limits=self.limits,
                    )
                elif self.name == "gemini":
                    self.instance = GeminiProvider(limits=self.limits)
                else:
                    self.instance = OllamaProvider(limits=self.limits)
            result = self.instance.classify_json(system_prompt, user_content, schema)
        except LLMError as exc:
            key = (
                f"HTTP_{exc.status_code}"
                if isinstance(exc, HTTPError)
                else type(exc).__name__
            )
            self.errors[key] = self.errors.get(key, 0) + 1
            raise
        if result.metadata.input_tokens is not None:
            self.input_tokens += result.metadata.input_tokens
            self.input_known += 1
        if result.metadata.output_tokens is not None:
            self.output_tokens += result.metadata.output_tokens
            self.output_known += 1
        return result

    def snapshot(self) -> dict:
        return {
            "llm_calls_made": self.calls,
            "llm_attempts": self.limits.used,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "input_known": self.input_known,
            "output_known": self.output_known,
            "errors": dict(self.errors),
        }


def measure(
    rows: list[Example], classifier: Classifier, tracker: TrackedProvider
) -> dict:
    before = tracker.snapshot()
    verdicts: list[str] = []
    latencies: list[float] = []
    for row in rows:
        start = time.perf_counter()
        assessment = classifier.classify(row.url)
        latencies.append((time.perf_counter() - start) * 1000)
        verdicts.append(assessment.verdict)
    result = summarize([r.label for r in rows], verdicts, latencies)
    after = tracker.snapshot()
    for key in ("llm_calls_made", "llm_attempts", "input_known", "output_known"):
        result[key] = after[key] - before[key]
    for key, known in (
        ("input_tokens", "input_known"),
        ("output_tokens", "output_known"),
    ):
        result[key] = after[key] - before[key] if result[known] else None
    result["llm_errors"] = {
        key: count - before["errors"].get(key, 0)
        for key, count in after["errors"].items()
        if count > before["errors"].get(key, 0)
    }
    return result


def evaluate(
    variant: Variant,
    provider: str,
    limit: int = 0,
    seed: int = 42,
    selected_split: str = "test",
    data_dir: Path = HERE / "data",
    config_path: Path = HERE / "config.json",
    injection_path: Path = HERE / "injection.csv",
    command: str = "",
) -> dict:
    config = json.loads(config_path.read_text())
    rows = load(list(data_dir.glob("*.csv")))
    partitions = split(rows, seed, config["dev_fraction"])
    chosen = select(partitions[selected_split], seed, limit)
    injections = load([injection_path])
    # Reject accidental train/test/challenge overlap rather than double-count it.
    if {r.group for r in rows} & {r.group for r in injections}:
        raise ValueError("Injection hosts must be separate from main dataset hosts")
    challenges = select(injections, seed, limit)
    tracker = TrackedProvider(provider)
    classifier = Classifier(
        lambda: tracker,
        variant=variant,
        use_cache=False,
        gray_low=config["gray_low"],
        gray_high=config["gray_high"],
        input_limit=config["input_limit"],
    )
    metrics = measure(chosen, classifier, tracker)
    injection_metrics = measure(challenges, classifier, tracker)
    try:
        revision = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        revision = "unknown"
    source_files = (
        sorted((ROOT / "app/abuse").glob("*.py"))
        + sorted((ROOT / "app/llm").glob("*.py"))
        + sorted(HERE.glob("*.py"))
        + [ROOT / "app/abuse/suspicious_tlds.txt"]
    )
    source_hash = hashlib.sha256(
        b"".join(p.read_bytes() for p in source_files)
    ).hexdigest()
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "variant": variant,
        "provider": provider,
        "model": tracker.model if tracker.calls else "not_called",
        "seed": seed,
        "limit_per_split_and_injection": limit,
        "split": selected_split,
        "command": command,
        "git_revision": revision,
        "source_sha256": source_hash,
        "config": config,
        "runtime": {
            "python": platform.python_version(),
            "packages": {
                name: importlib.metadata.version(name)
                for name in ("tldextract", "pydantic", "requests")
            },
            "daily_budget": settings.LLM_DAILY_BUDGET,
            "gemini_min_interval_seconds": settings.GEMINI_MIN_INTERVAL_SECONDS,
            "timeout_seconds": settings.LLM_TIMEOUT_SECONDS,
            "max_retries": settings.LLM_MAX_RETRIES,
            "backoff_seconds": settings.LLM_BACKOFF_SECONDS,
            "concurrency": settings.LLM_CONCURRENCY,
            "max_output_tokens": settings.LLM_MAX_OUTPUT_TOKENS,
        },
        "dataset_sha256": fingerprint(rows),
        "selected_sha256": fingerprint(chosen),
        "injection_sha256": fingerprint(injections),
        "sizes": {
            "total": len(rows),
            "benign": sum(r.label == "benign" for r in rows),
            "malicious": sum(r.label == "malicious" for r in rows),
            "dev": len(partitions["dev"]),
            "test": len(partitions["test"]),
            "evaluated": len(chosen),
            "injection_evaluated": len(challenges),
        },
        "metrics": metrics,
        "injection": injection_metrics,
        "policy": (
            "flagged = suspicious or malicious; " "cache disabled; host-grouped holdout"
        ),
        "warning": (
            "Synthetic fixtures and constant fake responses are regression checks, "
            "not real-world accuracy or injection immunity."
        ),
    }


def markdown(report: dict) -> str:
    result = report["metrics"]

    def number(value):
        return "N/A" if value is None else f"{value:.4f}"

    lines = [
        f"# Abuse evaluation: {report['variant']} / {report['provider']}",
        "",
        report["warning"],
        "",
        f"UTC: {report['generated_at']}",
        f"Model: `{report['model']}`; split: **{report['split']}**; "
        f"seed: {report['seed']}",
        f"Sizes: `{json.dumps(report['sizes'], sort_keys=True)}`",
        f"Dataset SHA-256: `{report['dataset_sha256']}`",
        f"Command: `{report['command']}`",
        "",
        report["policy"],
        "",
        "| Metric | Value |",
        "| --- | ---: |",
    ]
    for key in (
        "precision",
        "recall",
        "f1",
        "false_positive_rate",
        "median_latency_ms",
        "p95_latency_ms",
    ):
        lines.append(f"| {key} | {number(result[key])} |")
    for key in (
        "llm_calls_made",
        "llm_attempts",
        "input_tokens",
        "output_tokens",
        "input_known",
        "output_known",
    ):
        lines.append(f"| {key} | {result[key] if result[key] is not None else 'N/A'} |")
    lines += [
        "",
        f"Confusion matrix: `{json.dumps(result['confusion_matrix'])}`",
        f"Actual blocks: malicious={result['blocked_malicious']}, "
        f"benign={result['blocked_benign']}",
        f"LLM errors: `{json.dumps(result['llm_errors'])}`",
        f"Injection correct: **{report['injection']['correct']}/"
        f"{report['injection']['n']}**",
        "",
        "Injection metrics (reported separately from held-out metrics):",
        "```json",
        json.dumps(report["injection"], indent=2),
        "```",
        "",
        "Tokens include only reported usage; known counts identify "
        "calls with metadata. "
        "Retries with no usage are unaccounted for.",
        "Undefined ratios are N/A; P95 uses nearest rank. "
        "Timing is measured, not deterministic.",
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--variant", choices=["heuristics", "llm", "combined"], required=True
    )
    parser.add_argument(
        "--provider", choices=["fake", "gemini", "ollama"], default="fake"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="max examples per chosen split AND injection set; 0=all",
    )
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--split", choices=["dev", "test"], default="test")
    parser.add_argument("--data-dir", type=Path, default=HERE / "data")
    parser.add_argument("--config", type=Path, default=HERE / "config.json")
    parser.add_argument("--output-dir", type=Path, default=HERE / "results")
    args = parser.parse_args()
    command = shlex.join([sys.executable, "-m", "eval.abuse.run", *sys.argv[1:]])
    try:
        report = evaluate(
            args.variant,
            args.provider,
            args.limit,
            args.seed,
            args.split,
            args.data_dir,
            args.config,
            command=command,
        )
    except (ValueError, OSError, KeyError) as exc:
        # Don't emit a CSV's content or JSONDecodeError document on failure.
        parser.exit(2, f"Evaluation input/configuration error ({type(exc).__name__})\n")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{args.variant}-{args.provider}-{args.split}"
    (args.output_dir / (stem + ".json")).write_text(
        json.dumps(report, indent=2, allow_nan=False) + "\n"
    )
    (args.output_dir / (stem + ".md")).write_text(markdown(report))
    print(markdown(report))


if __name__ == "__main__":
    main()
