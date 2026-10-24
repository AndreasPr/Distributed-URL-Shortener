import math
import statistics


def summarize(labels: list[str], verdicts: list[str], latencies: list[float]) -> dict:
    if not len(labels) == len(verdicts) == len(latencies):
        raise ValueError("Mismatched evaluation lengths")
    # Detection includes reviewable suspicious links; it is not blocking recall.
    positive = [v != "clean" for v in verdicts]
    tp = sum(y == "malicious" and p for y, p in zip(labels, positive))
    fp = sum(y == "benign" and p for y, p in zip(labels, positive))
    tn = sum(y == "benign" and not p for y, p in zip(labels, positive))
    fn = sum(y == "malicious" and not p for y, p in zip(labels, positive))

    def ratio(a: int, b: int):
        return a / b if b else None

    return {
        "n": len(labels),
        "correct": tp + tn,
        "precision": ratio(tp, tp + fp),
        "recall": ratio(tp, tp + fn),
        "f1": ratio(2 * tp, 2 * tp + fp + fn),
        "false_positive_rate": ratio(fp, fp + tn),
        "confusion_matrix": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
        "median_latency_ms": statistics.median(latencies) if latencies else None,
        "p95_latency_ms": (
            sorted(latencies)[math.ceil(len(latencies) * 0.95) - 1]
            if latencies
            else None
        ),
        "blocked_malicious": sum(
            y == "malicious" and v == "malicious" for y, v in zip(labels, verdicts)
        ),
        "blocked_benign": sum(
            y == "benign" and v == "malicious" for y, v in zip(labels, verdicts)
        ),
        "verdict_counts": {
            v: verdicts.count(v) for v in ("clean", "suspicious", "malicious")
        },
    }
