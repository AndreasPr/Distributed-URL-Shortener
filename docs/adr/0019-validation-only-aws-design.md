# ADR 0019: Keep the AWS design separate from free local operation

## Context

The portfolio needs an AWS architecture artifact without account credentials,
automatic provisioning or charges. Existing application adapters support Kafka,
Redis Streams and memory; SQS is not implemented.

## Decision

Use local Terraform modules for a two-AZ VPC, ALB, private Fargate API/workers,
RDS, TLS ElastiCache Streams, scoped IAM, empty Secrets Manager entries and
CloudWatch alarms. Keep the local Docker/kind deployments unchanged. Explicit
user authorization covers writing the AWS design, not purchasing/deploying services.

Pin tools/provider, commit provider checksums, and run only formatting, init with
backend disabled, schema validation, TFLint and offline Checkov policies. CI has
read-only repository permissions and no AWS credential step. Deployment defaults
fail the manual opt-in precondition; services stay at zero until bootstrap is reviewed.
State, plans and private variable files are ignored and excluded from Docker context.

## Alternatives and consequences

SQS would reduce broker operations but needs a new adapter; MSK retains Kafka's
partition model at greater cost/complexity. Redis Streams matches existing code but
is not durable Kafka equivalence. Private endpoints avoid NAT for AWS APIs but also
cost money; optional single NAT adds Internet egress and a single-AZ dependency.
Multi-AZ data stores favor resilience rather than lowest cost. CloudWatch replaces
infrastructure-level visibility only, not existing application SLOs or tracing.

Sensitive Terraform inputs are not automatically absent from state. Application
secret values remain operator-managed; Redis auth provisioning still requires
protected state. No deployment, pricing estimate, production readiness, quotas or
runtime IAM correctness is inferred from static checks. Document resource-local
scanner exceptions, missing bootstrap/OTLP/CA-bundle work, cost and teardown limits.
