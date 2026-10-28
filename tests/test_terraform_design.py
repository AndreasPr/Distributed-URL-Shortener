"""Static guardrails for the intentionally undeployed AWS design."""

import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
TF = ROOT / "infra/terraform"


def compact(path):
    return re.sub(r"\s+", "", path.read_text())


def test_ci_has_no_deployment_or_credential_steps():
    workflow = yaml.safe_load(
        (ROOT / ".github/workflows/terraform-checks.yml").read_text()
    )
    assert workflow["permissions"] == {"contents": "read"}
    steps = workflow["jobs"]["validate"]["steps"]
    commands = "\n".join(s.get("run", "") for s in steps)
    assert not re.search(r"\b(apply|destroy|plan)\b", commands)
    assert "configure-aws-credentials" not in str(steps)
    assert "secrets." not in str(steps)
    for target in ["tf-fmt", "tf-validate", "tf-lint", "tf-sec"]:
        assert f"make {target}" in commands
    makefile = (ROOT / "Makefile").read_text()
    assert "init -backend=false -input=false -lockfile=readonly" in makefile


def test_design_defaults_cannot_start_paid_services():
    variables = compact(TF / "envs/dev/variables.tf")
    for name in ["allow_paid_deployment", "enable_nat_gateway", "start_services"]:
        block = variables.split(f'variable"{name}"{{', 1)[1].split("}", 1)[0]
        assert "default=false" in block
    assert "var.allow_paid_deployment&&" in compact(TF / "envs/dev/main.tf")
    assert "desired_count=var.start_services?2:0" in compact(
        TF / "modules/ecs-service/main.tf"
    )
    assert "min_capacity=var.start_services?2:0" in compact(
        TF / "modules/ecs-service/main.tf"
    )
    for path in TF.rglob("*.tf"):
        if ".terraform" not in path.parts:
            assert (
                'resource "aws_secretsmanager_secret_version"' not in path.read_text()
            )


def test_task_network_attachment_and_private_data_services():
    env = compact(TF / "envs/dev/main.tf")
    service = compact(TF / "modules/ecs-service/main.tf")
    # This verifies the cross-module attachment Checkov's graph cannot resolve.
    assert "for_each=local.services" in env
    assert "security_group_id=module.network.application_sg_id" in env
    assert "security_groups=[var.security_group_id]" in service
    assert "assign_public_ip=false" in service
    assert "readonlyRootFilesystem=true" in service
    assert "publicly_accessible=false" in compact(TF / "modules/rds-postgres/main.tf")
    assert "transit_encryption_enabled=true" in compact(
        TF / "modules/elasticache-redis/main.tf"
    )
    assert 'values=["/metrics","/metrics/*"]' in compact(TF / "modules/alb/main.tf")
