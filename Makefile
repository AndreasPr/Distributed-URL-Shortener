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
	$(PYTHON) -m pytest --cov=app --cov-report=term-missing --cov-report=xml

lint:
	$(PYTHON) -m black --check app/
	$(PYTHON) -m isort --check-only app/
	$(PYTHON) -m flake8 app/

typecheck:
	$(PYTHON) -m mypy app/

check: lint typecheck test

fmt:
	$(PYTHON) -m isort app/
	$(PYTHON) -m black app/

frontend-check:
	cd frontend && npm ci --no-audit --no-fund
	cd frontend && npm run lint -- --max-warnings=0
	cd frontend && npm test
	cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false

mcp-test:
	cd mcp-server && $(PYTHON) -m pytest

demo:
	@echo 'demo seeding is added in step 8.3'

# Generate a shared resolution first, then constrain deployment locks to it.
lock:
	$(UV) pip compile requirements-dev.in --python-version $(PYTHON_VERSION) --universal --generate-hashes --custom-compile-command "make lock" -q -o requirements-dev.txt
	$(UV) pip compile requirements.in -c requirements-dev.txt --python-version $(PYTHON_VERSION) --universal --generate-hashes --custom-compile-command "make lock" -q -o requirements.txt
	$(UV) pip compile mcp-server/requirements.in -c requirements-dev.txt --python-version $(PYTHON_VERSION) --universal --generate-hashes --custom-compile-command "make lock" -q -o mcp-server/requirements.txt
