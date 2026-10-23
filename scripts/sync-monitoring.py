"""Generate Kubernetes copies from canonical rules and dashboard sources."""

from pathlib import Path
import yaml


class MonitoringDumper(yaml.SafeDumper):
    pass


def represent_text(dumper, value):
    return dumper.represent_scalar(
        "tag:yaml.org,2002:str", value, style="|" if "\n" in value else None
    )


MonitoringDumper.add_representer(str, represent_text)

ROOT = Path(__file__).resolve().parents[1]
rules = (ROOT / "prometheus/rules/slo.yml").read_text()
config = {
    "apiVersion": "v1",
    "kind": "ConfigMap",
    "metadata": {"name": "prometheus-rules", "namespace": "url-shortener"},
    "data": {"slo.yml": rules},
}
(ROOT / "k8s/prometheus/rules-configmap.yaml").write_text(
    yaml.dump(config, Dumper=MonitoringDumper, sort_keys=False)
)
p = ROOT / "k8s/grafana/deployment.yaml"
s = p.read_text()
start = s.index("  url-shortener-dashboard.json: |")
end = s.index("\n---", start)
content = (ROOT / "grafana/dashboards/url-shortener-dashboard.json").read_text()
s = (
    s[:start]
    + "  url-shortener-dashboard.json: |\n"
    + "".join("    " + line + "\n" for line in content.splitlines())
    + s[end:]
)
p.write_text(s)
