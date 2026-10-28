# AWS dev design — NOT DEPLOYED

This stack was **designed and validated but not deployed**. It is a design artifact,
not an offer of free AWS hosting. No AWS credentials are needed for the checks.
Neither the Makefile nor CI contains a plan/apply/destroy automation step.
`allow_paid_deployment=false` rejects a normal deployment plan; `start_services=false`
keeps service desired/minimum counts at zero until a separately reviewed bootstrap.
These safeguards do not substitute for reviewing Terraform before any paid operation.

## Costs and boundaries

**NAT gateways, RDS, ElastiCache and the ALB cost money while running**, even when
there is no user traffic. Fargate tasks, four interface endpoints across two AZs
(eight endpoint interfaces), public IPv4 addresses, CloudWatch, KMS, Secrets Manager,
storage, backups and data transfer can also incur charges. Zero ECS tasks does NOT
make the surrounding infrastructure free. Check current regional pricing and AWS
Pricing Calculator before any separate deployment decision; no monthly price is
promised here. The single NAT gateway option is off by default and is both costly
and a single-AZ failure dependency. Enabling it does not remove interface endpoints.

RDS is Multi-AZ, Redis has two nodes, and enabled services have a minimum of two
replicas (maximum four). These favor availability over a cheap single-node dev stack.
ALB deletion protection and database deletion protection/final snapshots are enabled.
The existing local Compose/kind setup remains the free runnable deployment.

## Validate without credentials

Tool versions tested in CI configuration: Terraform 1.17.0, TFLint 0.65.0 with AWS
rules 0.50.0, Checkov 3.3.30. The AWS provider is pinned at 6.70.0 with a committed
lock file for Linux amd64 and macOS arm64. Install Terraform/TFLint from their
[official](https://developer.hashicorp.com/terraform/install)
[releases](https://github.com/terraform-linters/tflint/releases) and verify checksums.
Checkov can be isolated from application dependencies:

```bash
python3 -m venv /tmp/shortener-terraform-checks
/tmp/shortener-terraform-checks/bin/pip install checkov==3.3.30
# From the repository root:
make tf-fmt
make tf-validate
make tf-lint
make tf-sec CHECKOV=/tmp/shortener-terraform-checks/bin/checkov
```

`tf-fmt` checks formatting without editing; use `terraform fmt -recursive infra/terraform`
for edits. `tf-validate` performs `init -backend=false -input=false -lockfile=readonly`
then `validate`. Provider/plugin/tool installation needs Internet access. Terraform init can still
contact the public registry even when the provider binary is cached, so the whole
`make tf-validate` target is not guaranteed offline. After initialization, direct
`terraform -chdir=infra/terraform/envs/dev validate`, formatting, TFLint without
`--init`, and Checkov run locally.
Checkov uses bundled policies and does not download external modules or platform
policies. No account discovery data sources, AWS login action, secret input, plan or
apply is needed. `TF_IN_AUTOMATION=true` is not a deployment permission.

CI uses `.github/workflows/terraform-checks.yml` on infra changes with read-only
repository permissions. Read the [verification record](../../../../docs/terraform-verification.md)
for actual outputs and limitations. Static validation does not prove AWS quotas,
regional availability, IAM runtime behavior, instance sizing or application readiness.

## Inputs and operator prerequisites (not performed)

Defaults use a placeholder account, image digest, certificate and example frontend
origin. The ECR repository/image, ACM certificate and application DNS must already
exist in a separately authorized deployment. An actual backend image must be mirrored
to **private ECR in this region**, since the default private subnets cannot pull from
GHCR or Docker Hub over the Internet. The frontend and MCP client remain outside this
stack. Set exact CORS origin and use HTTPS; there is no public HTTP listener.

For a future manual deployment review, before enabling services:

1. Review costs, region/AZs, quotas, image digest, certificate, deletion policies,
   Checkov exceptions and the missing production integrations in [aws-design.md](../../../../docs/aws-design.md).
2. Protect state in a reviewed encrypted backend. `versions.tf` contains a commented
   S3/DynamoDB example only; that backend is not provisioned here. Real `.tfvars`,
   plans, state and crash logs are ignored and must never be committed.
3. Supply an ElastiCache auth token through private operator input. It is `sensitive`
   but the provider's `auth_token` **is stored in state**; sensitivity only redacts CLI
   output. No token or secret value is included in this repository.
4. Create the application database role and populate the two empty Secrets Manager
   entries outside Terraform: `db-url` with a PostgreSQL URL and `redis-url` with
   `rediss://:<URL-encoded-token>@<private-endpoint>:6379/0?ssl_cert_reqs=required`.
   Require PostgreSQL TLS, preferably `sslmode=verify-full`; a current AWS RDS CA
   bundle must be added to the deployment image and referenced by `sslrootcert` for
   hostname/certificate verification. That cloud-specific image extension is not
   supplied by these modules. Tasks are not granted the RDS master secret.
5. Use a manually invoked one-off ECS task, the same private networking, and the
   command override `alembic upgrade head` before enabling API/workers. Database
   bootstrap permissions should be separated from the application's runtime role.
   No Terraform provisioner or CI migration runs against AWS.
6. Only after bootstrap, secrets and readiness checks, explicitly set
   `start_services=true` in the reviewed deployment input. Autoscaling's minimum
   increases from zero to two; after that it owns desired counts. Review/configure
   alarm notification SNS ARNs, OTLP collector, WAF, access logs and secret rotation.

## Teardown — command documented, never executed here

For a separately authorized stack that someone actually deployed:

```bash
terraform -chdir=infra/terraform/envs/dev destroy -var-file=/absolute/private/dev.tfvars
```

Do not run this against another environment. First deliberately disable ALB/RDS
**deletion protection** in a separately reviewed change; destroy otherwise fails.
Use a unique final snapshot identifier if the default `${name}-final` already exists.
Keep the encryption key available for as long as retained snapshots/secrets need it;
blindly deleting that KMS key makes retained encrypted data unusable. Snapshots,
recovery-window secrets and manually created ECR/DNS/certificates/backend resources
may remain and incur cost after destroy. Inventory the account rather than assuming
that one command removes every billable resource.
