# 0023: Evidence-oriented README and offline checks

## Context

The README had grown beyond a concise entry point and mixed older architecture claims with
current behavior. No repository license file exists, so an open-source license badge would
misrepresent the project's status.

## Decision

Keep README under 300 lines, link to detailed guides/evidence, distinguish durable abuse
outbox events from best-effort click publishing, and label the license as not specified.
Provide a standard-library offline checker for local links/anchors, command references and
shell syntax. Check public workflow/badge URLs separately over HTTP. Never execute deployment,
chaos or destructive commands merely to validate documentation.

## Consequences

The checker detects broken repository references and known command types but does not prove
that services will start or tools are installed. Runtime localhost endpoints require a running
stack. External URL availability can change. A future explicit license decision needs a real
license file and corresponding badge update.
