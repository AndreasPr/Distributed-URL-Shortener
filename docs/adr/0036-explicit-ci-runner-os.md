# 0036: Explicit Ubuntu version for hosted checks

## Context

Reported GitHub jobs resolved `ubuntu-latest` to Ubuntu 26.04. Python environment
setup failed before tests because actions/setup-python could not obtain CPython
3.11.14 for that OS. The frontend likewise failed installing Chromium dependencies
with Playwright 1.56.1. These are host-toolchain compatibility failures, not evidence
of application failures or leftover test containers. The punycode warning is not
the fatal error.

## Decision

Pin all hosted jobs to `ubuntu-24.04`, including the reusable CI workflow and the
Docker, kind, CodeQL and Terraform workflows, to share a reviewed OS baseline.
Keep existing Python and Playwright pins and every blocking check. A workflow
regression test rejects floating or inconsistent runner labels.

Evidence: the [official Python manifest](https://raw.githubusercontent.com/actions/python-versions/main/versions-manifest.json)
lists CPython 3.11.14 Linux x64 builds for 22.04 and 24.04, not 26.04. The installed
Playwright 1.56.1 `playwright-core/lib/server/registry/nativeDeps.js` includes the
`ubuntu24.04-x64` dependency set.

## Consequences

This prevents an automatic major OS transition while allowing normal updates to
the 24.04 runner image; it is not a frozen VM image. Upgrading the runner now requires
reviewing Python distributions, browser support, and the regression test together.
Upgrading Python and Playwright to support 26.04 is an alternative, but would expand
this repair into interpreter/dependency upgrades across local development and Docker.
Hosted installation must still be confirmed by a fresh GitHub run of the fix commit.
