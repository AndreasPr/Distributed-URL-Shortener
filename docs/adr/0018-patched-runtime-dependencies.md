# ADR 0018: Patch dependencies without weakening release gates

## Context

The new release gates correctly rejected vulnerable Python locks and Debian image
packages. A second image scan identified PCRE bundled inside psycopg2-binary, and
setuptools included vulnerable vendored packaging libraries. Local tooling worktrees
could also enter the image through `COPY .`.

## Decision

Pin patched certifi, filelock, kafka-python, MCP, Starlette and psycopg2-binary
versions and regenerate all three hashed locks together. Upgrade the Prometheus
instrumentator to 8.1.0 because 7.1.0 requires Starlette below 1.0. Preserve the
application's API and verify compatibility with the existing suites.

The updated driver wheel still bundles vulnerable PCRE, so compile its hashed
source distribution in the builder against Debian libpq rather than ship bundled
wheel libraries. Local development retains wheel installation.

Upgrade Debian packages at image build time, remove pip/setuptools/wheel from both
runtime Python environments after installation, and copy only app/, alembic/ and
alembic.ini into the runtime. Exclude local tooling worktrees from build context.
The release workflow pulls the base and disables build cache so old apt layers
cannot silently preserve already-fixed vulnerabilities. Security thresholds and
ignore files remain unchanged.

## Consequences

Fresh security packages make release builds slower and dependent on repository
availability; the resulting image is still scanned and published as the same
artifact. Runtime dependency installation is intentionally unavailable; changes
require rebuilding. An exact Debian snapshot would be more reproducible but would
need a separate update process to avoid freezing vulnerable packages. Suppressing
findings or updating standalone wheel alone would not repair bundled libraries.
