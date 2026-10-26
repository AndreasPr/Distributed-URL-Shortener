PROFILE ?= kafka

PYTHON := $(CURDIR)/.venv/bin/python
UV := $(CURDIR)/.venv/bin/uv
PYTHON_VERSION := $(shell cat .python-version)

.PHONY: up down logs test lint typecheck check fmt frontend-check mcp-test demo lock

up:
	docker compose --profile $(PROFILE) up --build -d

down:
	docker compose --profile $(PROFILE) down

logs:
	docker compose --profile $(PROFILE) logs --follow --tail=100

# Normal pytest capture is enabled. Recreate .venv with the pinned interpreter
# instead of using the broken Anaconda readline build documented in developer.md.
test:
	$(PYTHON) -m pytest -m "not integration and not docker" --cov=app --cov-fail-under=0 --cov-report=term-missing --cov-report=xml

.PHONY: test-integration test-integration-slow
test-integration:
	$(PYTHON) -m pytest --run-integration -m "not slow and not docker" --cov=app --cov-report=term-missing --cov-report=xml --cov-report=json:coverage.json

test-integration-slow:
	$(PYTHON) -m pytest --run-integration -m "not docker" --cov=app --cov-report=term-missing --cov-report=xml --cov-report=json:coverage.json

lint:
	$(PYTHON) -m black --check app/ eval/ tests/integration/
	$(PYTHON) -m isort --check-only app/ eval/ tests/integration/
	$(PYTHON) -m flake8 app/ eval/ tests/integration/

typecheck:
	$(PYTHON) -m mypy app/ eval/

check: lint typecheck test prometheus-check

fmt:
	$(PYTHON) -m isort app/ eval/ tests/integration/
	$(PYTHON) -m black app/ eval/ tests/integration/

frontend-check:
	cd frontend && npm ci --no-audit --no-fund
	cd frontend && npm run lint -- --max-warnings=0
	cd frontend && npm test
	cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false

mcp-test:
	$(PYTHON) -m black --check mcp-server/mcp_server
	$(PYTHON) -m isort --check-only mcp-server/mcp_server
	$(PYTHON) -m flake8 mcp-server/mcp_server
	$(PYTHON) -m mypy mcp-server/mcp_server
	cd mcp-server && $(PYTHON) -m pytest

demo:
	@echo 'demo seeding is added in step 8.3'

# Generate a shared resolution first, then constrain deployment locks to it.
lock:
	$(UV) pip compile requirements-dev.in --python-version $(PYTHON_VERSION) --universal --generate-hashes --custom-compile-command "make lock" -q -o requirements-dev.txt
	$(UV) pip compile requirements.in -c requirements-dev.txt --python-version $(PYTHON_VERSION) --universal --generate-hashes --custom-compile-command "make lock" -q -o requirements.txt
	$(UV) pip compile mcp-server/requirements.in -c requirements-dev.txt --python-version $(PYTHON_VERSION) --universal --generate-hashes --custom-compile-command "make lock" -q -o mcp-server/requirements.txt

.PHONY: audit
audit:
	$(PYTHON) -m pip_audit --disable-pip --no-deps -r requirements.txt -r mcp-server/requirements.txt

.PHONY: prometheus-check
prometheus-check:
	sh scripts/check-prometheus.sh

# Deliberate provider choice; .env is not sourced. Default is entirely offline.
EVAL_PROVIDER ?= $(if $(LLM_PROVIDER),$(LLM_PROVIDER),fake)
EVAL_LIMIT ?= 0
EVAL_SEED ?= 42
.PHONY: eval
eval:
	$(PYTHON) -m eval.abuse.run --variant heuristics --provider $(EVAL_PROVIDER) --limit $(EVAL_LIMIT) --seed $(EVAL_SEED)
	$(PYTHON) -m eval.abuse.run --variant combined --provider $(EVAL_PROVIDER) --limit $(EVAL_LIMIT) --seed $(EVAL_SEED)
	$(PYTHON) -m eval.abuse.report --provider $(EVAL_PROVIDER)
