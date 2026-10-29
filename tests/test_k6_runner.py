import os
import subprocess
from pathlib import Path


def test_runner_requires_key_and_uses_current_health(tmp_path):
    script = Path("scripts/run_k6_tests.sh").resolve()
    env = {**os.environ}
    env.pop("API_KEY", None)
    result = subprocess.run(
        ["bash", str(script), "load"], env=env, capture_output=True, text=True
    )
    assert result.returncode != 0
    assert "Set API_KEY" in result.stderr
    (tmp_path / "curl").write_text(
        '#!/bin/sh\ncase "$*" in *"/health/redis"*) exit 9;; '
        '*"/health"*) exit 0;; *) exit 8;; esac\n'
    )
    (tmp_path / "k6").write_text(
        '#!/bin/sh\ntest "$BASE_URL" = "http://example.test" && '
        'test "$API_KEY" = "placeholder_for_config_test"\n'
    )
    for executable in ("curl", "k6"):
        (tmp_path / executable).chmod(0o755)
    env.update(
        PATH=str(tmp_path) + os.pathsep + env["PATH"],
        API_KEY="placeholder_for_config_test",
        BASE_URL="http://example.test",
    )
    result = subprocess.run(
        ["bash", str(script), "load"], env=env, capture_output=True, text=True
    )
    assert result.returncode == 0, result.stderr
