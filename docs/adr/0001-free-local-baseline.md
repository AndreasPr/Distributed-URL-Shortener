# ADR 0001: Establish a free, local baseline before behavior changes

Date: 2026-10-14
Status: Accepted

## Context

The project has several runtime components and deployment options, but documentation and automation do not consistently reflect current behavior. The portfolio work must use only free tools and introduce no cloud credentials.

## Decision

Record current behavior, checks, and known gaps before changing application code. Use existing local tools and mocked tests without external service credentials. Keep Docker Compose as the documented local stack and Kubernetes as an optional deployment path whose health must be verified separately. Do not repair baseline defects in this documentation step.

## Consequences

Passing unit tests do not establish production readiness or successful end-to-end operation. Existing lint, typing, deployment, and integration gaps remain visible for later scoped changes with tests. Future architectural and tooling decisions receive separate ADRs.
