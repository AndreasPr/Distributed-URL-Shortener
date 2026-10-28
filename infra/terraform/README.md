# AWS design artifact

Start with [envs/dev/README.md](envs/dev/README.md) for costs, prerequisites,
validation commands, explicit deployment safeguards and teardown limitations.
The stack is **designed and validated, not deployed**. No cloud credentials are
needed for validation. Initial provider/plugin downloads require Internet access.

The eight local modules are network, ecs-service, rds-postgres, elasticache-redis,
alb, secrets, iam and observability. The [architecture and local-stack mapping](../../docs/aws-design.md)
explain what is implemented versus a future alternative. [Verification outputs](../../docs/terraform-verification.md)
record actual checks, including the limits of offline initialization.
