"""Build the aggregate report from completed runner artifacts; no inference."""

import argparse
import json

from eval.abuse.run import HERE, ROOT, markdown


def cell(value):
    if value is None:
        return "N/A"
    return f"{value:.4f}" if isinstance(value, float) else str(value)


def table_row(values):
    return "| " + " | ".join(cell(value) for value in values) + " |"


def update_report(path, generated):
    """Replace only the synthetic block; preserve reviewed public measurements."""
    start, end = "<!-- synthetic-eval:start -->", "<!-- synthetic-eval:end -->"
    previous = path.read_text() if path.exists() else "# Abuse evaluation results\n"
    block = start + "\n" + generated + "\n" + end
    if start in previous and end in previous:
        before, tail = previous.split(start, 1)
        _, after = tail.split(end, 1)
        path.write_text(before + block + after)
    else:
        path.write_text(previous.rstrip() + "\n\n" + block + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--provider", choices=["fake", "gemini", "ollama"], default="fake"
    )
    args = parser.parse_args()
    reports = [
        json.loads(
            (HERE / "results" / f"{variant}-{args.provider}-test.json").read_text()
        )
        for variant in ("heuristics", "combined")
    ]
    if any(
        reports[0][key] != reports[1][key]
        for key in (
            "dataset_sha256",
            "selected_sha256",
            "injection_sha256",
            "config",
            "seed",
            "sizes",
        )
    ):
        raise ValueError("Refusing to compare mismatched evaluation runs")
    columns = [
        "Variant",
        "Provider / model",
        "Precision",
        "Recall",
        "F1",
        "FPR",
        "Median / P95 ms",
        "LLM calls / attempts",
        "Input / output tokens",
        "Injection correct",
    ]
    lines = [
        "# Abuse evaluation results",
        "",
        "Synthetic regression fixtures, not real-world accuracy. "
        "Fake always returns suspicious and does not reason about URLs.",
        "Flagged means suspicious OR malicious, not blocked. "
        "Cache disabled; dev examples are excluded from held-out results.",
        "",
        table_row(columns),
        table_row(["---"] * len(columns)),
    ]
    for report in reports:
        m, i = report["metrics"], report["injection"]
        lines.append(
            table_row(
                [
                    report["variant"],
                    report["provider"] + " / " + report["model"],
                    *[
                        m[k]
                        for k in ("precision", "recall", "f1", "false_positive_rate")
                    ],
                    cell(m["median_latency_ms"]) + " / " + cell(m["p95_latency_ms"]),
                    f"{m['llm_calls_made']} / {m['llm_attempts']}",
                    cell(m["input_tokens"]) + " / " + cell(m["output_tokens"]),
                    f"{i['correct']}/{i['n']}",
                ]
            )
        )
    for report in reports:
        lines.extend(
            [
                "",
                markdown(report).replace("# Abuse evaluation:", "## Detail:"),
                f"Source SHA-256: `{report['source_sha256']}`",
                f"Config: `{json.dumps(report['config'], sort_keys=True)}`",
                f"Runtime: `{json.dumps(report['runtime'], sort_keys=True)}`",
            ]
        )
    lines.extend(
        [
            "",
            "Tune only with `--split dev`; do not tune on held-out scores. "
            "See [evaluation instructions](../eval/abuse/README.md).",
        ]
    )
    update_report(
        ROOT / "docs/eval-results.md",
        "\n".join(lines).replace(
            "# Abuse evaluation results", "## Current synthetic regression", 1
        ),
    )


if __name__ == "__main__":
    main()
