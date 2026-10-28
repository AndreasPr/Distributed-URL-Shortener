"""Offline README checks; never execute stack, deployment or destructive commands."""

import ast
import json
import re
import shlex
import subprocess
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def check():
    readme = (ROOT / "README.md").read_text()
    errors = []
    lines = len(readme.splitlines())
    if lines >= 300:
        errors.append(f"README has {lines} lines; must be under 300")
    if "yourusername" in readme.lower():
        errors.append("Placeholder repository URL")
    anchors = set()
    for heading in re.findall(r"^#+ (.+)$", readme, re.M):
        anchors.add(re.sub(r"[^\w -]", "", heading.lower()).replace(" ", "-"))
    links = re.findall(r"\]\(([^)]+)\)", readme)
    external = set()
    for target in links:
        url = urlsplit(target)
        if url.scheme:
            if url.scheme != "https" or not url.netloc:
                errors.append(f"Invalid external URL: {target}")
            external.add(target)
            match = re.search(r"/actions/workflows/([^/]+)", url.path)
            if match and not (ROOT / ".github/workflows" / match[1]).is_file():
                errors.append(f"Missing workflow: {target}")
        elif not url.path:
            if unquote(url.fragment) not in anchors:
                errors.append(f"Missing anchor: {target}")
        elif not (ROOT / unquote(url.path)).exists():
            errors.append(f"Missing local link: {target}")

    targets = set(re.findall(r"^([\w-]+):", (ROOT / "Makefile").read_text(), re.M))
    npm = json.loads((ROOT / "frontend/package.json").read_text())["scripts"]
    cli = ast.parse((ROOT / "app/cli.py").read_text())
    subcommands = {
        node.args[0].value
        for node in ast.walk(cli)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "add_parser"
        and node.args
        and isinstance(node.args[0], ast.Constant)
    }
    compose = (ROOT / "docker-compose.yml").read_text()
    services = set(re.findall(r"^  ([\w-]+):", compose, re.M))
    commands = []
    for block in re.findall(r"```bash\n(.*?)```", readme, re.S):
        syntax = subprocess.run(
            ["bash", "-n"], input=block, text=True, capture_output=True
        )
        if syntax.returncode:
            errors.append("Invalid bash example: " + syntax.stderr.strip())
        commands.extend(block.replace("\\\n", " ").splitlines())
    commands += [
        value
        for value in re.findall(r"`([^`\n]+)`", readme)
        if value.startswith(("make ", "bash ", ".venv/bin/python "))
    ]
    count = 0
    for command in commands:
        tokens = shlex.split(command)
        if not tokens:
            continue
        count += 1
        while tokens and re.match(r"^\w+=", tokens[0]):
            tokens.pop(0)
        if tokens[0] == "make":
            for token in tokens[1:]:
                if "=" not in token and token not in targets:
                    errors.append(f"Unknown make target: {token}")
        elif tokens[0] == "docker":
            # README intentionally contains only scoped key-creation exec commands.
            if tokens[1:3] != ["compose", "--profile"] or tokens[3] not in (
                "kafka",
                "redis-streams",
            ):
                errors.append(f"Unsupported Compose command: {command}")
            elif tokens[4] != "exec" or tokens[5] not in services:
                errors.append(f"Unknown Compose service: {command}")
            elif tokens[6:9] != ["python", "-m", "app.cli"]:
                errors.append(f"Unknown CLI module: {command}")
            elif not {"keys", "create"} <= subcommands or tokens[9:11] != [
                "keys",
                "create",
            ]:
                errors.append(f"Unknown CLI subcommand: {command}")
        elif tokens[0] == "npm":
            if tokens[1] != "ci" and (tokens[1] != "run" or tokens[2] not in npm):
                errors.append(f"Unknown npm command: {command}")
        elif tokens[0] in ("bash", ".venv/bin/python"):
            if not (ROOT / tokens[1]).is_file():
                errors.append(f"Missing script: {tokens[1]}")
        elif tokens[0] == "cd":
            if not (ROOT / tokens[1]).is_dir():
                errors.append(f"Missing directory: {tokens[1]}")
        elif tokens[0] == "test":
            # Existing .env is preserved; validate source paths without reading secrets.
            source = tokens[-2]
            if not any((base / source).is_file() for base in (ROOT, ROOT / "frontend")):
                errors.append(f"Missing copy source: {source}")
        else:
            errors.append(f"Unchecked command: {command}")
    for error in errors:
        print("FAIL:", error)
    if errors:
        return 1
    print(f"PASS: README {lines} lines (<300)")
    print(
        f"PASS: {len(links)} Markdown links checked "
        "(local paths/anchors and URL syntax)"
    )
    print(
        f"PASS: {count} command examples checked "
        "against repository targets/scripts/config"
    )
    print("PASS: bash examples parse; no stack/deployment command was executed")
    print(
        f"NOTE: {len(external)} external URLs need online HTTP verification; "
        "localhost endpoints need running services"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(check())
