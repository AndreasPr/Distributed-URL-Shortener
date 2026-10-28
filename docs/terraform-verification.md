# Terraform design verification — 2026-10-28

Branch: `step-6-1-terraform`. **Designed and validated, not deployed.** No AWS
credentials, AWS account queries, Terraform plan/apply/destroy or cloud resources
were used. These results establish syntax/schema/static-policy consistency, not
AWS runtime behavior, prices, quota availability or production readiness.

## Actual results

| Command/check | Exit | Result |
| --- | --- | --- |
| `make tf-fmt` | 0 | All Terraform formatting compliant |
| `make tf-validate` | 0 | Backend-disabled, read-only-lock init; configuration valid |
| `make tf-lint` | 0 | Pinned AWS/ Terraform rules; no findings across modules |
| `make tf-sec` | 0 | 185 passed, 0 failed, 7 resource-local skipped checks |
| Offline direct fmt/validate/lint/Checkov | 0 | Same 185/0/7 policy result with credential files disabled and outbound HTTP rejected |
| Full `make tf-validate` with blocked network | 2 (make) | Init still queries public registry despite cached provider; this is documented, not hidden |
| `make check` | 0 | 376 tests passed, 23 deselected; Black/isort/Flake8/mypy and promtool passed |
| `make frontend-check` | 0 | npm ci, ESLint, 5 tests and tsc passed |
| `make mcp-test` | 0 | 35 tests plus MCP lint/types passed |
| `actionlint` | 0 | No workflow diagnostics |
| Changed-test Black/isort/Flake8 | 0 | Passed |

Tool versions: Terraform 1.17.0, AWS provider 6.70.0, TFLint 0.65.0, AWS TFLint
rules 0.50.0, Checkov 3.3.30, Python 3.11.14. Terraform/TFLint archives were checked
against official SHA256 manifests. Checkov was installed in an isolated temporary
venv. Terraform 1.5.7 also validated an earlier draft; CI pins the final tested
1.17.0. Provider lock checksums cover Linux amd64 and macOS arm64.

Local Make overrides used temporary executable paths:

```bash
make tf-fmt tf-validate tf-lint tf-sec   TERRAFORM=/tmp/shortener-terraform/terraform   TFLINT=/tmp/shortener-tflint/tflint   CHECKOV=/tmp/shortener-tf-tools/bin/checkov
```

The first tool/provider/plugin downloads used the Internet. An offline trial of the
whole target stopped at `init` with `Could not retrieve the list of available
versions for provider hashicorp/aws` and a connection-refused registry request.
Then formatting, direct `terraform validate`, TFLint **without init**, and Checkov
ran successfully with AWS access/session/profile variables unset,
`AWS_SHARED_CREDENTIALS_FILE=/dev/null`, `AWS_CONFIG_FILE=/dev/null`,
`AWS_EC2_METADATA_DISABLED=true`, and HTTP/HTTPS proxies pointed at closed localhost
port 9. No fake AWS keys or real secrets were supplied.

The seven exceptions are enumerated in [aws-design.md](aws-design.md): ALB access
logs, two WAF policies, RDS Enhanced Monitoring, two empty-secret rotation checks,
and the cross-module security-group graph false positive. No encryption or IAM
wildcard policies are skipped. `tests/test_terraform_design.py` checks the default
deployment guard, zero-task bootstrap, no CI apply/credentials, private networking,
secret-value exclusion and the actual cross-module SG attachment. Terraform schema
validation and TFLint supplement these static regression checks.

Application code, cloud state and private input files were not changed. GitHub's
new workflow has not run on this branch yet. The existing local application checks
passed; no AWS migration, runtime, load, IAM or failover test was attempted.

## Complete command output

ANSI colors and trailing whitespace are removed for readability. The successful
Make run below used public registry access for initialization; the separate offline
run produced the same validation/policy result after initialization.

<details>
<summary>Terraform Make targets — exit 0</summary>

```text
/tmp/shortener-terraform/terraform fmt -check -recursive infra/terraform
/tmp/shortener-terraform/terraform -chdir=infra/terraform/envs/dev init -backend=false -input=false -lockfile=readonly
Initializing modules...

Initializing provider plugins...
- terraform.io/builtin/terraform is built in to Terraform
- Reusing version 6.70.0 of hashicorp/aws from the dependency lock file
- Using previously-installed hashicorp/aws v6.70.0

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
/tmp/shortener-terraform/terraform -chdir=infra/terraform/envs/dev validate -no-color
Success! The configuration is valid.

/tmp/shortener-tflint/tflint --init --config "/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/infra/terraform/.tflint.hcl"
All plugins are already installed
/tmp/shortener-tflint/tflint --recursive --chdir infra/terraform --config "/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/infra/terraform/.tflint.hcl"
/tmp/shortener-tf-tools/bin/checkov -d infra/terraform/envs/dev --framework terraform --download-external-modules false --skip-download --compact
2026-10-28 00:58:08,234 [MainThread  ] [WARNI]  Failed to find context for resource.aws_vpc_endpoint.interface["ecr.api"]

       _               _
   ___| |__   ___  ___| | _______   __
  / __| '_ \ / _ \/ __| |/ / _ \ \ / /
 | (__| | | |  __/ (__|   < (_) \ V /
  \___|_| |_|\___|\___|_|\_\___/ \_/

By Prisma Cloud | version: 3.3.30

terraform scan results:

Passed checks: 185, Failed checks: 0, Skipped checks: 7

Check: CKV_AWS_65: "Ensure container insights are enabled on ECS cluster"
	PASSED for resource: aws_ecs_cluster.this
	File: /main.tf:62-69
Check: CKV_AWS_223: "Ensure ECS Cluster enables logging of ECS Exec"
	PASSED for resource: aws_ecs_cluster.this
	File: /main.tf:62-69
Check: CKV_AWS_41: "Ensure no hard coded AWS access key and secret key exists in provider"
	PASSED for resource: aws.default
	File: /versions.tf:17-24
Check: CKV_AWS_260: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 80"
	PASSED for resource: module.alb.aws_security_group.alb
	File: /../../modules/alb/main.tf:1-5
	Calling File: /main.tf:54-61
Check: CKV_AWS_24: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 22"
	PASSED for resource: module.alb.aws_security_group.alb
	File: /../../modules/alb/main.tf:1-5
	Calling File: /main.tf:54-61
Check: CKV_AWS_23: "Ensure every security group and rule has a description"
	PASSED for resource: module.alb.aws_security_group.alb
	File: /../../modules/alb/main.tf:1-5
	Calling File: /main.tf:54-61
Check: CKV_AWS_277: "Ensure no security groups allow ingress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.alb.aws_security_group.alb
	File: /../../modules/alb/main.tf:1-5
	Calling File: /main.tf:54-61
Check: CKV_AWS_25: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 3389"
	PASSED for resource: module.alb.aws_security_group.alb
	File: /../../modules/alb/main.tf:1-5
	Calling File: /main.tf:54-61
Check: CKV_AWS_382: "Ensure no security groups allow egress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.alb.aws_security_group.alb
	File: /../../modules/alb/main.tf:1-5
	Calling File: /main.tf:54-61
Check: CKV_AWS_260: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 80"
	PASSED for resource: module.alb.aws_vpc_security_group_ingress_rule.web["443"]
	File: /../../modules/alb/main.tf:6-14
	Calling File: /main.tf:54-61
Check: CKV_AWS_24: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 22"
	PASSED for resource: module.alb.aws_vpc_security_group_ingress_rule.web["443"]
	File: /../../modules/alb/main.tf:6-14
	Calling File: /main.tf:54-61
Check: CKV_AWS_23: "Ensure every security group and rule has a description"
	PASSED for resource: module.alb.aws_vpc_security_group_ingress_rule.web["443"]
	File: /../../modules/alb/main.tf:6-14
	Calling File: /main.tf:54-61
Check: CKV_AWS_277: "Ensure no security groups allow ingress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.alb.aws_vpc_security_group_ingress_rule.web["443"]
	File: /../../modules/alb/main.tf:6-14
	Calling File: /main.tf:54-61
Check: CKV_AWS_25: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 3389"
	PASSED for resource: module.alb.aws_vpc_security_group_ingress_rule.web["443"]
	File: /../../modules/alb/main.tf:6-14
	Calling File: /main.tf:54-61
Check: CKV_AWS_23: "Ensure every security group and rule has a description"
	PASSED for resource: module.alb.aws_vpc_security_group_egress_rule.api
	File: /../../modules/alb/main.tf:15-22
	Calling File: /main.tf:54-61
Check: CKV_AWS_382: "Ensure no security groups allow egress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.alb.aws_vpc_security_group_egress_rule.api
	File: /../../modules/alb/main.tf:15-22
	Calling File: /main.tf:54-61
Check: CKV_AWS_260: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 80"
	PASSED for resource: module.alb.aws_vpc_security_group_ingress_rule.api
	File: /../../modules/alb/main.tf:23-30
	Calling File: /main.tf:54-61
Check: CKV_AWS_24: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 22"
	PASSED for resource: module.alb.aws_vpc_security_group_ingress_rule.api
	File: /../../modules/alb/main.tf:23-30
	Calling File: /main.tf:54-61
Check: CKV_AWS_23: "Ensure every security group and rule has a description"
	PASSED for resource: module.alb.aws_vpc_security_group_ingress_rule.api
	File: /../../modules/alb/main.tf:23-30
	Calling File: /main.tf:54-61
Check: CKV_AWS_277: "Ensure no security groups allow ingress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.alb.aws_vpc_security_group_ingress_rule.api
	File: /../../modules/alb/main.tf:23-30
	Calling File: /main.tf:54-61
Check: CKV_AWS_25: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 3389"
	PASSED for resource: module.alb.aws_vpc_security_group_ingress_rule.api
	File: /../../modules/alb/main.tf:23-30
	Calling File: /main.tf:54-61
Check: CKV_AWS_150: "Ensure that Load Balancer has deletion protection enabled"
	PASSED for resource: module.alb.aws_lb.this
	File: /../../modules/alb/main.tf:31-43
	Calling File: /main.tf:54-61
Check: CKV_AWS_328: "Ensure that ALB is configured with defensive or strictest desync mitigation mode"
	PASSED for resource: module.alb.aws_lb.this
	File: /../../modules/alb/main.tf:31-43
	Calling File: /main.tf:54-61
Check: CKV_AWS_131: "Ensure that ALB drops HTTP headers"
	PASSED for resource: module.alb.aws_lb.this
	File: /../../modules/alb/main.tf:31-43
	Calling File: /main.tf:54-61
Check: CKV_AWS_261: "Ensure HTTP HTTPS Target group defines Healthcheck"
	PASSED for resource: module.alb.aws_lb_target_group.api
	File: /../../modules/alb/main.tf:44-60
	Calling File: /main.tf:54-61
Check: CKV_AWS_2: "Ensure ALB protocol is HTTPS"
	PASSED for resource: module.alb.aws_lb_listener.https
	File: /../../modules/alb/main.tf:61-71
	Calling File: /main.tf:54-61
Check: CKV_AWS_66: "Ensure that CloudWatch Log Group specifies retention days"
	PASSED for resource: module.service["abuse"].aws_cloudwatch_log_group.this
	File: /../../modules/ecs-service/main.tf:1-5
	Calling File: /main.tf:81-110
Check: CKV_AWS_338: "Ensure CloudWatch log groups retains logs for at least 1 year"
	PASSED for resource: module.service["abuse"].aws_cloudwatch_log_group.this
	File: /../../modules/ecs-service/main.tf:1-5
	Calling File: /main.tf:81-110
Check: CKV_AWS_158: "Ensure that CloudWatch Log Group is encrypted by KMS"
	PASSED for resource: module.service["abuse"].aws_cloudwatch_log_group.this
	File: /../../modules/ecs-service/main.tf:1-5
	Calling File: /main.tf:81-110
Check: CKV_AWS_336: "Ensure ECS containers are limited to read-only access to root filesystems"
	PASSED for resource: module.service["abuse"].aws_ecs_task_definition.this
	File: /../../modules/ecs-service/main.tf:6-39
	Calling File: /main.tf:81-110
Check: CKV_AWS_249: "Ensure that the Execution Role ARN and the Task Role ARN are different in ECS Task definitions"
	PASSED for resource: module.service["abuse"].aws_ecs_task_definition.this
	File: /../../modules/ecs-service/main.tf:6-39
	Calling File: /main.tf:81-110
Check: CKV_AWS_97: "Ensure Encryption in transit is enabled for EFS volumes in ECS Task definitions"
	PASSED for resource: module.service["abuse"].aws_ecs_task_definition.this
	File: /../../modules/ecs-service/main.tf:6-39
	Calling File: /main.tf:81-110
Check: CKV_AWS_333: "Ensure ECS services do not have public IP addresses assigned to them automatically"
	PASSED for resource: module.service["abuse"].aws_ecs_service.this
	File: /../../modules/ecs-service/main.tf:40-72
	Calling File: /main.tf:81-110
Check: CKV_AWS_332: "Ensure ECS Fargate services run on the latest Fargate platform version"
	PASSED for resource: module.service["abuse"].aws_ecs_service.this
	File: /../../modules/ecs-service/main.tf:40-72
	Calling File: /main.tf:81-110
Check: CKV_AWS_260: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 80"
	PASSED for resource: module.redis.aws_security_group.redis
	File: /../../modules/elasticache-redis/main.tf:1-5
	Calling File: /main.tf:45-53
Check: CKV_AWS_24: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 22"
	PASSED for resource: module.redis.aws_security_group.redis
	File: /../../modules/elasticache-redis/main.tf:1-5
	Calling File: /main.tf:45-53
Check: CKV_AWS_23: "Ensure every security group and rule has a description"
	PASSED for resource: module.redis.aws_security_group.redis
	File: /../../modules/elasticache-redis/main.tf:1-5
	Calling File: /main.tf:45-53
Check: CKV_AWS_277: "Ensure no security groups allow ingress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.redis.aws_security_group.redis
	File: /../../modules/elasticache-redis/main.tf:1-5
	Calling File: /main.tf:45-53
Check: CKV_AWS_25: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 3389"
	PASSED for resource: module.redis.aws_security_group.redis
	File: /../../modules/elasticache-redis/main.tf:1-5
	Calling File: /main.tf:45-53
Check: CKV_AWS_382: "Ensure no security groups allow egress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.redis.aws_security_group.redis
	File: /../../modules/elasticache-redis/main.tf:1-5
	Calling File: /main.tf:45-53
Check: CKV_AWS_260: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 80"
	PASSED for resource: module.redis.aws_vpc_security_group_ingress_rule.redis
	File: /../../modules/elasticache-redis/main.tf:6-13
	Calling File: /main.tf:45-53
Check: CKV_AWS_24: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 22"
	PASSED for resource: module.redis.aws_vpc_security_group_ingress_rule.redis
	File: /../../modules/elasticache-redis/main.tf:6-13
	Calling File: /main.tf:45-53
Check: CKV_AWS_23: "Ensure every security group and rule has a description"
	PASSED for resource: module.redis.aws_vpc_security_group_ingress_rule.redis
	File: /../../modules/elasticache-redis/main.tf:6-13
	Calling File: /main.tf:45-53
Check: CKV_AWS_277: "Ensure no security groups allow ingress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.redis.aws_vpc_security_group_ingress_rule.redis
	File: /../../modules/elasticache-redis/main.tf:6-13
	Calling File: /main.tf:45-53
Check: CKV_AWS_25: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 3389"
	PASSED for resource: module.redis.aws_vpc_security_group_ingress_rule.redis
	File: /../../modules/elasticache-redis/main.tf:6-13
	Calling File: /main.tf:45-53
Check: CKV_AWS_23: "Ensure every security group and rule has a description"
	PASSED for resource: module.redis.aws_vpc_security_group_egress_rule.redis
	File: /../../modules/elasticache-redis/main.tf:14-21
	Calling File: /main.tf:45-53
Check: CKV_AWS_382: "Ensure no security groups allow egress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.redis.aws_vpc_security_group_egress_rule.redis
	File: /../../modules/elasticache-redis/main.tf:14-21
	Calling File: /main.tf:45-53
Check: CKV_AWS_31: "Ensure all data stored in the ElastiCache Replication Group is securely encrypted at transit and has auth token"
	PASSED for resource: module.redis.aws_elasticache_replication_group.this
	File: /../../modules/elasticache-redis/main.tf:26-47
	Calling File: /main.tf:45-53
Check: CKV_AWS_29: "Ensure all data stored in the ElastiCache Replication Group is securely encrypted at rest"
	PASSED for resource: module.redis.aws_elasticache_replication_group.this
	File: /../../modules/elasticache-redis/main.tf:26-47
	Calling File: /main.tf:45-53
Check: CKV_AWS_191: "Ensure ElastiCache replication group is encrypted by KMS using a customer managed Key (CMK)"
	PASSED for resource: module.redis.aws_elasticache_replication_group.this
	File: /../../modules/elasticache-redis/main.tf:26-47
	Calling File: /main.tf:45-53
Check: CKV_AWS_30: "Ensure all data stored in the ElastiCache Replication Group is securely encrypted at transit"
	PASSED for resource: module.redis.aws_elasticache_replication_group.this
	File: /../../modules/elasticache-redis/main.tf:26-47
	Calling File: /main.tf:45-53
Check: CKV_AWS_274: "Disallow IAM roles, users, and groups from using the AWS AdministratorAccess policy"
	PASSED for resource: module.iam.aws_iam_role.execution
	File: /../../modules/iam/main.tf:10-13
	Calling File: /main.tf:70-80
Check: CKV_AWS_393: "Ensure AWS GitHub Actions OIDC authorization policies only allow safe claims and claim order on IAM role"
	PASSED for resource: module.iam.aws_iam_role.execution
	File: /../../modules/iam/main.tf:10-13
	Calling File: /main.tf:70-80
Check: CKV_AWS_61: "Ensure AWS IAM policy does not allow assume role permission across all services"
	PASSED for resource: module.iam.aws_iam_role.execution
	File: /../../modules/iam/main.tf:10-13
	Calling File: /main.tf:70-80
Check: CKV_AWS_60: "Ensure IAM role allows only specific services or principals to assume it"
	PASSED for resource: module.iam.aws_iam_role.execution
	File: /../../modules/iam/main.tf:10-13
	Calling File: /main.tf:70-80
Check: CKV_AWS_274: "Disallow IAM roles, users, and groups from using the AWS AdministratorAccess policy"
	PASSED for resource: module.iam.aws_iam_role.task
	File: /../../modules/iam/main.tf:14-18
	Calling File: /main.tf:70-80
Check: CKV_AWS_393: "Ensure AWS GitHub Actions OIDC authorization policies only allow safe claims and claim order on IAM role"
	PASSED for resource: module.iam.aws_iam_role.task
	File: /../../modules/iam/main.tf:14-18
	Calling File: /main.tf:70-80
Check: CKV_AWS_61: "Ensure AWS IAM policy does not allow assume role permission across all services"
	PASSED for resource: module.iam.aws_iam_role.task
	File: /../../modules/iam/main.tf:14-18
	Calling File: /main.tf:70-80
Check: CKV_AWS_60: "Ensure IAM role allows only specific services or principals to assume it"
	PASSED for resource: module.iam.aws_iam_role.task
	File: /../../modules/iam/main.tf:14-18
	Calling File: /main.tf:70-80
Check: CKV_AWS_288: "Ensure IAM policies does not allow data exfiltration"
	PASSED for resource: module.iam.aws_iam_role_policy.execution
	File: /../../modules/iam/main.tf:19-44
	Calling File: /main.tf:70-80
Check: CKV_AWS_290: "Ensure IAM policies does not allow write access without constraints"
	PASSED for resource: module.iam.aws_iam_role_policy.execution
	File: /../../modules/iam/main.tf:19-44
	Calling File: /main.tf:70-80
Check: CKV_AWS_287: "Ensure IAM policies does not allow credentials exposure"
	PASSED for resource: module.iam.aws_iam_role_policy.execution
	File: /../../modules/iam/main.tf:19-44
	Calling File: /main.tf:70-80
Check: CKV_AWS_63: "Ensure no IAM policies documents allow "*" as a statement's actions"
	PASSED for resource: module.iam.aws_iam_role_policy.execution
	File: /../../modules/iam/main.tf:19-44
	Calling File: /main.tf:70-80
Check: CKV_AWS_289: "Ensure IAM policies does not allow permissions management / resource exposure without constraints"
	PASSED for resource: module.iam.aws_iam_role_policy.execution
	File: /../../modules/iam/main.tf:19-44
	Calling File: /main.tf:70-80
Check: CKV_AWS_62: "Ensure IAM policies that allow full "*-*" administrative privileges are not created"
	PASSED for resource: module.iam.aws_iam_role_policy.execution
	File: /../../modules/iam/main.tf:19-44
	Calling File: /main.tf:70-80
Check: CKV_AWS_355: "Ensure no IAM policies documents allow "*" as a statement's resource for restrictable actions"
	PASSED for resource: module.iam.aws_iam_role_policy.execution
	File: /../../modules/iam/main.tf:19-44
	Calling File: /main.tf:70-80
Check: CKV_AWS_286: "Ensure IAM policies does not allow privilege escalation"
	PASSED for resource: module.iam.aws_iam_role_policy.execution
	File: /../../modules/iam/main.tf:19-44
	Calling File: /main.tf:70-80
Check: CKV_AWS_130: "Ensure VPC subnets do not assign public IP by default"
	PASSED for resource: module.network.aws_subnet.public[0]
	File: /../../modules/network/main.tf:15-24
	Calling File: /main.tf:27-36
Check: CKV_AWS_130: "Ensure VPC subnets do not assign public IP by default"
	PASSED for resource: module.network.aws_subnet.private[0]
	File: /../../modules/network/main.tf:25-34
	Calling File: /main.tf:27-36
Check: CKV_AWS_260: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 80"
	PASSED for resource: module.network.aws_security_group.application
	File: /../../modules/network/main.tf:73-78
	Calling File: /main.tf:27-36
Check: CKV_AWS_24: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 22"
	PASSED for resource: module.network.aws_security_group.application
	File: /../../modules/network/main.tf:73-78
	Calling File: /main.tf:27-36
Check: CKV_AWS_23: "Ensure every security group and rule has a description"
	PASSED for resource: module.network.aws_security_group.application
	File: /../../modules/network/main.tf:73-78
	Calling File: /main.tf:27-36
Check: CKV_AWS_277: "Ensure no security groups allow ingress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.network.aws_security_group.application
	File: /../../modules/network/main.tf:73-78
	Calling File: /main.tf:27-36
Check: CKV_AWS_25: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 3389"
	PASSED for resource: module.network.aws_security_group.application
	File: /../../modules/network/main.tf:73-78
	Calling File: /main.tf:27-36
Check: CKV_AWS_382: "Ensure no security groups allow egress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.network.aws_security_group.application
	File: /../../modules/network/main.tf:73-78
	Calling File: /main.tf:27-36
Check: CKV_AWS_260: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 80"
	PASSED for resource: module.network.aws_security_group.endpoints
	File: /../../modules/network/main.tf:79-83
	Calling File: /main.tf:27-36
Check: CKV_AWS_24: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 22"
	PASSED for resource: module.network.aws_security_group.endpoints
	File: /../../modules/network/main.tf:79-83
	Calling File: /main.tf:27-36
Check: CKV_AWS_23: "Ensure every security group and rule has a description"
	PASSED for resource: module.network.aws_security_group.endpoints
	File: /../../modules/network/main.tf:79-83
	Calling File: /main.tf:27-36
Check: CKV_AWS_277: "Ensure no security groups allow ingress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.network.aws_security_group.endpoints
	File: /../../modules/network/main.tf:79-83
	Calling File: /main.tf:27-36
Check: CKV_AWS_25: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 3389"
	PASSED for resource: module.network.aws_security_group.endpoints
	File: /../../modules/network/main.tf:79-83
	Calling File: /main.tf:27-36
Check: CKV_AWS_382: "Ensure no security groups allow egress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.network.aws_security_group.endpoints
	File: /../../modules/network/main.tf:79-83
	Calling File: /main.tf:27-36
Check: CKV_AWS_260: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 80"
	PASSED for resource: module.network.aws_vpc_security_group_ingress_rule.endpoint_tls
	File: /../../modules/network/main.tf:84-91
	Calling File: /main.tf:27-36
Check: CKV_AWS_24: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 22"
	PASSED for resource: module.network.aws_vpc_security_group_ingress_rule.endpoint_tls
	File: /../../modules/network/main.tf:84-91
	Calling File: /main.tf:27-36
Check: CKV_AWS_23: "Ensure every security group and rule has a description"
	PASSED for resource: module.network.aws_vpc_security_group_ingress_rule.endpoint_tls
	File: /../../modules/network/main.tf:84-91
	Calling File: /main.tf:27-36
Check: CKV_AWS_277: "Ensure no security groups allow ingress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.network.aws_vpc_security_group_ingress_rule.endpoint_tls
	File: /../../modules/network/main.tf:84-91
	Calling File: /main.tf:27-36
Check: CKV_AWS_25: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 3389"
	PASSED for resource: module.network.aws_vpc_security_group_ingress_rule.endpoint_tls
	File: /../../modules/network/main.tf:84-91
	Calling File: /main.tf:27-36
Check: CKV_AWS_23: "Ensure every security group and rule has a description"
	PASSED for resource: module.network.aws_vpc_security_group_egress_rule.https
	File: /../../modules/network/main.tf:92-99
	Calling File: /main.tf:27-36
Check: CKV_AWS_382: "Ensure no security groups allow egress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.network.aws_vpc_security_group_egress_rule.https
	File: /../../modules/network/main.tf:92-99
	Calling File: /main.tf:27-36
Check: CKV_AWS_66: "Ensure that CloudWatch Log Group specifies retention days"
	PASSED for resource: module.network.aws_cloudwatch_log_group.flow
	File: /../../modules/network/main.tf:115-119
	Calling File: /main.tf:27-36
Check: CKV_AWS_338: "Ensure CloudWatch log groups retains logs for at least 1 year"
	PASSED for resource: module.network.aws_cloudwatch_log_group.flow
	File: /../../modules/network/main.tf:115-119
	Calling File: /main.tf:27-36
Check: CKV_AWS_158: "Ensure that CloudWatch Log Group is encrypted by KMS"
	PASSED for resource: module.network.aws_cloudwatch_log_group.flow
	File: /../../modules/network/main.tf:115-119
	Calling File: /main.tf:27-36
Check: CKV_AWS_274: "Disallow IAM roles, users, and groups from using the AWS AdministratorAccess policy"
	PASSED for resource: module.network.aws_iam_role.flow
	File: /../../modules/network/main.tf:120-129
	Calling File: /main.tf:27-36
Check: CKV_AWS_393: "Ensure AWS GitHub Actions OIDC authorization policies only allow safe claims and claim order on IAM role"
	PASSED for resource: module.network.aws_iam_role.flow
	File: /../../modules/network/main.tf:120-129
	Calling File: /main.tf:27-36
Check: CKV_AWS_61: "Ensure AWS IAM policy does not allow assume role permission across all services"
	PASSED for resource: module.network.aws_iam_role.flow
	File: /../../modules/network/main.tf:120-129
	Calling File: /main.tf:27-36
Check: CKV_AWS_60: "Ensure IAM role allows only specific services or principals to assume it"
	PASSED for resource: module.network.aws_iam_role.flow
	File: /../../modules/network/main.tf:120-129
	Calling File: /main.tf:27-36
Check: CKV_AWS_288: "Ensure IAM policies does not allow data exfiltration"
	PASSED for resource: module.network.aws_iam_role_policy.flow
	File: /../../modules/network/main.tf:130-137
	Calling File: /main.tf:27-36
Check: CKV_AWS_290: "Ensure IAM policies does not allow write access without constraints"
	PASSED for resource: module.network.aws_iam_role_policy.flow
	File: /../../modules/network/main.tf:130-137
	Calling File: /main.tf:27-36
Check: CKV_AWS_287: "Ensure IAM policies does not allow credentials exposure"
	PASSED for resource: module.network.aws_iam_role_policy.flow
	File: /../../modules/network/main.tf:130-137
	Calling File: /main.tf:27-36
Check: CKV_AWS_63: "Ensure no IAM policies documents allow "*" as a statement's actions"
	PASSED for resource: module.network.aws_iam_role_policy.flow
	File: /../../modules/network/main.tf:130-137
	Calling File: /main.tf:27-36
Check: CKV_AWS_289: "Ensure IAM policies does not allow permissions management / resource exposure without constraints"
	PASSED for resource: module.network.aws_iam_role_policy.flow
	File: /../../modules/network/main.tf:130-137
	Calling File: /main.tf:27-36
Check: CKV_AWS_62: "Ensure IAM policies that allow full "*-*" administrative privileges are not created"
	PASSED for resource: module.network.aws_iam_role_policy.flow
	File: /../../modules/network/main.tf:130-137
	Calling File: /main.tf:27-36
Check: CKV_AWS_355: "Ensure no IAM policies documents allow "*" as a statement's resource for restrictable actions"
	PASSED for resource: module.network.aws_iam_role_policy.flow
	File: /../../modules/network/main.tf:130-137
	Calling File: /main.tf:27-36
Check: CKV_AWS_286: "Ensure IAM policies does not allow privilege escalation"
	PASSED for resource: module.network.aws_iam_role_policy.flow
	File: /../../modules/network/main.tf:130-137
	Calling File: /main.tf:27-36
Check: CKV_AWS_130: "Ensure VPC subnets do not assign public IP by default"
	PASSED for resource: module.network.aws_subnet.public[1]
	File: /../../modules/network/main.tf:15-24
	Calling File: /main.tf:27-36
Check: CKV_AWS_130: "Ensure VPC subnets do not assign public IP by default"
	PASSED for resource: module.network.aws_subnet.private[1]
	File: /../../modules/network/main.tf:25-34
	Calling File: /main.tf:27-36
Check: CKV_AWS_319: "Ensure that CloudWatch alarm actions are enabled"
	PASSED for resource: module.observability.aws_cloudwatch_metric_alarm.errors
	File: /../../modules/observability/main.tf:1-53
	Calling File: /main.tf:111-120
Check: CKV_AWS_319: "Ensure that CloudWatch alarm actions are enabled"
	PASSED for resource: module.observability.aws_cloudwatch_metric_alarm.latency
	File: /../../modules/observability/main.tf:54-71
	Calling File: /main.tf:111-120
Check: CKV_AWS_319: "Ensure that CloudWatch alarm actions are enabled"
	PASSED for resource: module.observability.aws_cloudwatch_metric_alarm.cpu
	File: /../../modules/observability/main.tf:72-89
	Calling File: /main.tf:111-120
Check: CKV_AWS_260: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 80"
	PASSED for resource: module.database.aws_security_group.database
	File: /../../modules/rds-postgres/main.tf:1-5
	Calling File: /main.tf:37-44
Check: CKV_AWS_24: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 22"
	PASSED for resource: module.database.aws_security_group.database
	File: /../../modules/rds-postgres/main.tf:1-5
	Calling File: /main.tf:37-44
Check: CKV_AWS_23: "Ensure every security group and rule has a description"
	PASSED for resource: module.database.aws_security_group.database
	File: /../../modules/rds-postgres/main.tf:1-5
	Calling File: /main.tf:37-44
Check: CKV_AWS_277: "Ensure no security groups allow ingress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.database.aws_security_group.database
	File: /../../modules/rds-postgres/main.tf:1-5
	Calling File: /main.tf:37-44
Check: CKV_AWS_25: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 3389"
	PASSED for resource: module.database.aws_security_group.database
	File: /../../modules/rds-postgres/main.tf:1-5
	Calling File: /main.tf:37-44
Check: CKV_AWS_382: "Ensure no security groups allow egress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.database.aws_security_group.database
	File: /../../modules/rds-postgres/main.tf:1-5
	Calling File: /main.tf:37-44
Check: CKV_AWS_260: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 80"
	PASSED for resource: module.database.aws_vpc_security_group_ingress_rule.database
	File: /../../modules/rds-postgres/main.tf:6-13
	Calling File: /main.tf:37-44
Check: CKV_AWS_24: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 22"
	PASSED for resource: module.database.aws_vpc_security_group_ingress_rule.database
	File: /../../modules/rds-postgres/main.tf:6-13
	Calling File: /main.tf:37-44
Check: CKV_AWS_23: "Ensure every security group and rule has a description"
	PASSED for resource: module.database.aws_vpc_security_group_ingress_rule.database
	File: /../../modules/rds-postgres/main.tf:6-13
	Calling File: /main.tf:37-44
Check: CKV_AWS_277: "Ensure no security groups allow ingress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.database.aws_vpc_security_group_ingress_rule.database
	File: /../../modules/rds-postgres/main.tf:6-13
	Calling File: /main.tf:37-44
Check: CKV_AWS_25: "Ensure no security groups allow ingress from 0.0.0.0:0 to port 3389"
	PASSED for resource: module.database.aws_vpc_security_group_ingress_rule.database
	File: /../../modules/rds-postgres/main.tf:6-13
	Calling File: /main.tf:37-44
Check: CKV_AWS_23: "Ensure every security group and rule has a description"
	PASSED for resource: module.database.aws_vpc_security_group_egress_rule.database
	File: /../../modules/rds-postgres/main.tf:14-21
	Calling File: /main.tf:37-44
Check: CKV_AWS_382: "Ensure no security groups allow egress from 0.0.0.0:0 to port -1"
	PASSED for resource: module.database.aws_vpc_security_group_egress_rule.database
	File: /../../modules/rds-postgres/main.tf:14-21
	Calling File: /main.tf:37-44
Check: CKV_AWS_161: "Ensure RDS database has IAM authentication enabled"
	PASSED for resource: module.database.aws_db_instance.this
	File: /../../modules/rds-postgres/main.tf:38-71
	Calling File: /main.tf:37-44
Check: CKV_AWS_354: "Ensure RDS Performance Insights are encrypted using KMS CMKs"
	PASSED for resource: module.database.aws_db_instance.this
	File: /../../modules/rds-postgres/main.tf:38-71
	Calling File: /main.tf:37-44
Check: CKV_AWS_293: "Ensure that AWS database instances have deletion protection enabled"
	PASSED for resource: module.database.aws_db_instance.this
	File: /../../modules/rds-postgres/main.tf:38-71
	Calling File: /main.tf:37-44
Check: CKV_AWS_353: "Ensure that RDS instances have performance insights enabled"
	PASSED for resource: module.database.aws_db_instance.this
	File: /../../modules/rds-postgres/main.tf:38-71
	Calling File: /main.tf:37-44
Check: CKV_AWS_388: "Ensure AWS Aurora PostgreSQL is not exposed to local file read vulnerability"
	PASSED for resource: module.database.aws_db_instance.this
	File: /../../modules/rds-postgres/main.tf:38-71
	Calling File: /main.tf:37-44
Check: CKV_AWS_157: "Ensure that RDS instances have Multi-AZ enabled"
	PASSED for resource: module.database.aws_db_instance.this
	File: /../../modules/rds-postgres/main.tf:38-71
	Calling File: /main.tf:37-44
Check: CKV_AWS_129: "Ensure that respective logs of Amazon Relational Database Service (Amazon RDS) are enabled"
	PASSED for resource: module.database.aws_db_instance.this
	File: /../../modules/rds-postgres/main.tf:38-71
	Calling File: /main.tf:37-44
Check: CKV_AWS_133: "Ensure that RDS instances has backup policy"
	PASSED for resource: module.database.aws_db_instance.this
	File: /../../modules/rds-postgres/main.tf:38-71
	Calling File: /main.tf:37-44
Check: CKV_AWS_226: "Ensure DB instance gets all minor upgrades automatically"
	PASSED for resource: module.database.aws_db_instance.this
	File: /../../modules/rds-postgres/main.tf:38-71
	Calling File: /main.tf:37-44
Check: CKV_AWS_17: "Ensure all data stored in RDS is not publicly accessible"
	PASSED for resource: module.database.aws_db_instance.this
	File: /../../modules/rds-postgres/main.tf:38-71
	Calling File: /main.tf:37-44
Check: CKV_AWS_211: "Ensure RDS uses a modern CaCert"
	PASSED for resource: module.database.aws_db_instance.this
	File: /../../modules/rds-postgres/main.tf:38-71
	Calling File: /main.tf:37-44
Check: CKV_AWS_16: "Ensure all data stored in the RDS is securely encrypted at rest"
	PASSED for resource: module.database.aws_db_instance.this
	File: /../../modules/rds-postgres/main.tf:38-71
	Calling File: /main.tf:37-44
Check: CKV_AWS_227: "Ensure KMS key is enabled"
	PASSED for resource: module.secrets.aws_kms_key.runtime
	File: /../../modules/secrets/main.tf:1-23
	Calling File: /main.tf:20-26
Check: CKV_AWS_33: "Ensure KMS key policy does not contain wildcard (*) principal"
	PASSED for resource: module.secrets.aws_kms_key.runtime
	File: /../../modules/secrets/main.tf:1-23
	Calling File: /main.tf:20-26
Check: CKV_AWS_7: "Ensure rotation for customer created CMKs is enabled"
	PASSED for resource: module.secrets.aws_kms_key.runtime
	File: /../../modules/secrets/main.tf:1-23
	Calling File: /main.tf:20-26
Check: CKV_AWS_149: "Ensure that Secrets Manager secret is encrypted using KMS CMK"
	PASSED for resource: module.secrets.aws_secretsmanager_secret.runtime["db-url"]
	File: /../../modules/secrets/main.tf:24-31
	Calling File: /main.tf:20-26
Check: CKV_AWS_149: "Ensure that Secrets Manager secret is encrypted using KMS CMK"
	PASSED for resource: module.secrets.aws_secretsmanager_secret.runtime["redis-url"]
	File: /../../modules/secrets/main.tf:24-31
	Calling File: /main.tf:20-26
Check: CKV_AWS_66: "Ensure that CloudWatch Log Group specifies retention days"
	PASSED for resource: module.service["api"].aws_cloudwatch_log_group.this
	File: /../../modules/ecs-service/main.tf:1-5
	Calling File: /main.tf:81-110
Check: CKV_AWS_338: "Ensure CloudWatch log groups retains logs for at least 1 year"
	PASSED for resource: module.service["api"].aws_cloudwatch_log_group.this
	File: /../../modules/ecs-service/main.tf:1-5
	Calling File: /main.tf:81-110
Check: CKV_AWS_158: "Ensure that CloudWatch Log Group is encrypted by KMS"
	PASSED for resource: module.service["api"].aws_cloudwatch_log_group.this
	File: /../../modules/ecs-service/main.tf:1-5
	Calling File: /main.tf:81-110
Check: CKV_AWS_336: "Ensure ECS containers are limited to read-only access to root filesystems"
	PASSED for resource: module.service["api"].aws_ecs_task_definition.this
	File: /../../modules/ecs-service/main.tf:6-39
	Calling File: /main.tf:81-110
Check: CKV_AWS_249: "Ensure that the Execution Role ARN and the Task Role ARN are different in ECS Task definitions"
	PASSED for resource: module.service["api"].aws_ecs_task_definition.this
	File: /../../modules/ecs-service/main.tf:6-39
	Calling File: /main.tf:81-110
Check: CKV_AWS_97: "Ensure Encryption in transit is enabled for EFS volumes in ECS Task definitions"
	PASSED for resource: module.service["api"].aws_ecs_task_definition.this
	File: /../../modules/ecs-service/main.tf:6-39
	Calling File: /main.tf:81-110
Check: CKV_AWS_333: "Ensure ECS services do not have public IP addresses assigned to them automatically"
	PASSED for resource: module.service["api"].aws_ecs_service.this
	File: /../../modules/ecs-service/main.tf:40-72
	Calling File: /main.tf:81-110
Check: CKV_AWS_332: "Ensure ECS Fargate services run on the latest Fargate platform version"
	PASSED for resource: module.service["api"].aws_ecs_service.this
	File: /../../modules/ecs-service/main.tf:40-72
	Calling File: /main.tf:81-110
Check: CKV_AWS_66: "Ensure that CloudWatch Log Group specifies retention days"
	PASSED for resource: module.service["worker"].aws_cloudwatch_log_group.this
	File: /../../modules/ecs-service/main.tf:1-5
	Calling File: /main.tf:81-110
Check: CKV_AWS_338: "Ensure CloudWatch log groups retains logs for at least 1 year"
	PASSED for resource: module.service["worker"].aws_cloudwatch_log_group.this
	File: /../../modules/ecs-service/main.tf:1-5
	Calling File: /main.tf:81-110
Check: CKV_AWS_158: "Ensure that CloudWatch Log Group is encrypted by KMS"
	PASSED for resource: module.service["worker"].aws_cloudwatch_log_group.this
	File: /../../modules/ecs-service/main.tf:1-5
	Calling File: /main.tf:81-110
Check: CKV_AWS_336: "Ensure ECS containers are limited to read-only access to root filesystems"
	PASSED for resource: module.service["worker"].aws_ecs_task_definition.this
	File: /../../modules/ecs-service/main.tf:6-39
	Calling File: /main.tf:81-110
Check: CKV_AWS_249: "Ensure that the Execution Role ARN and the Task Role ARN are different in ECS Task definitions"
	PASSED for resource: module.service["worker"].aws_ecs_task_definition.this
	File: /../../modules/ecs-service/main.tf:6-39
	Calling File: /main.tf:81-110
Check: CKV_AWS_97: "Ensure Encryption in transit is enabled for EFS volumes in ECS Task definitions"
	PASSED for resource: module.service["worker"].aws_ecs_task_definition.this
	File: /../../modules/ecs-service/main.tf:6-39
	Calling File: /main.tf:81-110
Check: CKV_AWS_333: "Ensure ECS services do not have public IP addresses assigned to them automatically"
	PASSED for resource: module.service["worker"].aws_ecs_service.this
	File: /../../modules/ecs-service/main.tf:40-72
	Calling File: /main.tf:81-110
Check: CKV_AWS_332: "Ensure ECS Fargate services run on the latest Fargate platform version"
	PASSED for resource: module.service["worker"].aws_ecs_service.this
	File: /../../modules/ecs-service/main.tf:40-72
	Calling File: /main.tf:81-110
Check: CKV2_AWS_60: "Ensure RDS instance with copy tags to snapshots is enabled"
	PASSED for resource: module.database.aws_db_instance.this
	File: /../../modules/rds-postgres/main.tf:38-71
Check: CKV2_AWS_44: "Ensure AWS route table with VPC peering does not contain routes overly permissive to all traffic"
	PASSED for resource: module.network.aws_route_table.public
	File: /../../modules/network/main.tf:35-37
Check: CKV2_AWS_44: "Ensure AWS route table with VPC peering does not contain routes overly permissive to all traffic"
	PASSED for resource: module.network.aws_route.internet
	File: /../../modules/network/main.tf:38-42
Check: CKV2_AWS_44: "Ensure AWS route table with VPC peering does not contain routes overly permissive to all traffic"
	PASSED for resource: module.network.aws_route_table.private[0]
	File: /../../modules/network/main.tf:58-61
Check: CKV2_AWS_44: "Ensure AWS route table with VPC peering does not contain routes overly permissive to all traffic"
	PASSED for resource: module.network.aws_route.nat
	File: /../../modules/network/main.tf:62-67
Check: CKV2_AWS_44: "Ensure AWS route table with VPC peering does not contain routes overly permissive to all traffic"
	PASSED for resource: module.network.aws_route_table.private[1]
	File: /../../modules/network/main.tf:58-61
Check: CKV2_AWS_5: "Ensure that Security Groups are attached to another resource"
	PASSED for resource: module.alb.aws_security_group.alb
	File: /../../modules/alb/main.tf:1-5
Check: CKV2_AWS_5: "Ensure that Security Groups are attached to another resource"
	PASSED for resource: module.redis.aws_security_group.redis
	File: /../../modules/elasticache-redis/main.tf:1-5
Check: CKV2_AWS_5: "Ensure that Security Groups are attached to another resource"
	PASSED for resource: module.network.aws_security_group.endpoints
	File: /../../modules/network/main.tf:79-83
Check: CKV2_AWS_5: "Ensure that Security Groups are attached to another resource"
	PASSED for resource: module.database.aws_security_group.database
	File: /../../modules/rds-postgres/main.tf:1-5
Check: CKV2_AWS_20: "Ensure that ALB redirects HTTP requests into HTTPS ones"
	PASSED for resource: module.alb.aws_lb.this
	File: /../../modules/alb/main.tf:31-43
Check: CKV2_AWS_56: "Ensure AWS Managed IAMFullAccess IAM policy is not used."
	PASSED for resource: module.iam.aws_iam_role.execution
	File: /../../modules/iam/main.tf:10-13
Check: CKV2_AWS_56: "Ensure AWS Managed IAMFullAccess IAM policy is not used."
	PASSED for resource: module.iam.aws_iam_role.task
	File: /../../modules/iam/main.tf:14-18
Check: CKV2_AWS_56: "Ensure AWS Managed IAMFullAccess IAM policy is not used."
	PASSED for resource: module.network.aws_iam_role.flow
	File: /../../modules/network/main.tf:120-129
Check: CKV2_AWS_35: "AWS NAT Gateways should be utilized for the default route"
	PASSED for resource: module.network.aws_route_table.public
	File: /../../modules/network/main.tf:35-37
Check: CKV2_AWS_35: "AWS NAT Gateways should be utilized for the default route"
	PASSED for resource: module.network.aws_route.internet
	File: /../../modules/network/main.tf:38-42
Check: CKV2_AWS_35: "AWS NAT Gateways should be utilized for the default route"
	PASSED for resource: module.network.aws_route_table.private[0]
	File: /../../modules/network/main.tf:58-61
Check: CKV2_AWS_35: "AWS NAT Gateways should be utilized for the default route"
	PASSED for resource: module.network.aws_route.nat
	File: /../../modules/network/main.tf:62-67
Check: CKV2_AWS_35: "AWS NAT Gateways should be utilized for the default route"
	PASSED for resource: module.network.aws_route_table.private[1]
	File: /../../modules/network/main.tf:58-61
Check: CKV2_AWS_11: "Ensure VPC flow logging is enabled in all VPCs"
	PASSED for resource: module.network.aws_vpc.this
	File: /../../modules/network/main.tf:1-8
Check: CKV2_AWS_74: "Ensure AWS Load Balancers use strong ciphers"
	PASSED for resource: module.alb.aws_lb_listener.https
	File: /../../modules/alb/main.tf:61-71
Check: CKV2_AWS_40: "Ensure AWS IAM policy does not allow full IAM privileges"
	PASSED for resource: module.iam.aws_iam_role_policy.execution
	File: /../../modules/iam/main.tf:19-44
Check: CKV2_AWS_40: "Ensure AWS IAM policy does not allow full IAM privileges"
	PASSED for resource: module.network.aws_iam_role_policy.flow
	File: /../../modules/network/main.tf:130-137
Check: CKV2_AWS_19: "Ensure that all EIP addresses allocated to a VPC are attached to EC2 instances"
	PASSED for resource: module.network.aws_eip.nat
	File: /../../modules/network/main.tf:48-51
Check: CKV2_AWS_69: "Ensure AWS RDS database instance configured with encryption in transit"
	PASSED for resource: module.database.aws_db_instance.this
	File: /../../modules/rds-postgres/main.tf:38-71
Check: CKV2_AWS_64: "Ensure KMS key Policy is defined"
	PASSED for resource: module.secrets.aws_kms_key.runtime
	File: /../../modules/secrets/main.tf:1-23
Check: CKV2_AWS_50: "Ensure AWS ElastiCache Redis cluster with Multi-AZ Automatic Failover feature set to enabled"
	PASSED for resource: module.redis.aws_elasticache_replication_group.this
	File: /../../modules/elasticache-redis/main.tf:26-47
Check: CKV_AWS_103: "Ensure that load balancer is using at least TLS 1.2"
	PASSED for resource: module.alb.aws_lb_listener.https
	File: /../../modules/alb/main.tf:61-71
Check: CKV2_AWS_30: "Ensure Postgres RDS as aws_db_instance has Query Logging enabled"
	PASSED for resource: module.database.aws_db_instance.this
	File: /../../modules/rds-postgres/main.tf:38-71
Check: CKV_AWS_378: "Ensure AWS Load Balancer doesn't use HTTP protocol"
	PASSED for resource: module.alb.aws_lb_target_group.api
	File: /../../modules/alb/main.tf:44-60
Check: CKV2_AWS_12: "Ensure the default security group of every VPC restricts all traffic"
	PASSED for resource: module.network.aws_vpc.this
	File: /../../modules/network/main.tf:1-8
Check: CKV_AWS_91: "Ensure the ELBv2 (Application/Network) has access logging enabled"
	SKIPPED for resource: module.alb.aws_lb.this
	Suppress comment: ALB access-log S3 storage is omitted to limit dev costs. CloudWatch request/error/latency metrics remain; enable an encrypted log bucket before production deployment.
	File: /../../modules/alb/main.tf:31-43
	Calling File: /main.tf:54-61
Check: CKV_AWS_118: "Ensure that enhanced monitoring is enabled for Amazon RDS instances"
	SKIPPED for resource: module.database.aws_db_instance.this
	Suppress comment: Enhanced Monitoring adds per-instance monitoring cost; Standard RDS CloudWatch metrics and database logs remain available in this dev design.
	File: /../../modules/rds-postgres/main.tf:38-71
	Calling File: /main.tf:37-44
Check: CKV2_AWS_5: "Ensure that Security Groups are attached to another resource"
	SKIPPED for resource: module.network.aws_security_group.application
	Suppress comment: False positive across for_each service module boundary; application_sg_id is passed to all three ECS service network_configuration blocks. Contract tests verify the attachment.
	File: /../../modules/network/main.tf:73-78
Check: CKV2_AWS_57: "Ensure Secrets Manager secrets should have automatic rotation enabled"
	SKIPPED for resource: module.secrets.aws_secretsmanager_secret.runtime["db-url"]
	Suppress comment: Empty design-only entries have no rotation target; provision application-role credentials and a rotation Lambda before deployment. Never store secret values in Terraform.
	File: /../../modules/secrets/main.tf:24-31
Check: CKV2_AWS_57: "Ensure Secrets Manager secrets should have automatic rotation enabled"
	SKIPPED for resource: module.secrets.aws_secretsmanager_secret.runtime["redis-url"]
	Suppress comment: Empty design-only entries have no rotation target; provision application-role credentials and a rotation Lambda before deployment. Never store secret values in Terraform.
	File: /../../modules/secrets/main.tf:24-31
Check: CKV2_AWS_76: "Ensure AWS ALB attached WAFv2 WebACL is configured with AMR for Log4j Vulnerability"
	SKIPPED for resource: module.alb.aws_lb.this
	Suppress comment: No WAF ACL is purchased in the dev design; attach a reviewed managed-rule ACL before public production traffic.
	File: /../../modules/alb/main.tf:31-43
Check: CKV2_AWS_28: "Ensure public facing ALB are protected by WAF"
	SKIPPED for resource: module.alb.aws_lb.this
	Suppress comment: AWS WAF adds recurring per-ACL/rule/request charges; omitted in this undeployed dev design. Application validation/auth/rate limits do not replace WAF protection.
	File: /../../modules/alb/main.tf:31-43

```

</details>

<details>
<summary>make check — exit 0</summary>

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m black --check app/ eval/ tests/integration/
All done! ✨ 🍰 ✨
71 files would be left unchanged.
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m isort --check-only app/ eval/ tests/integration/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m flake8 app/ eval/ tests/integration/
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m mypy app/ eval/
Success: no issues found in 67 source files
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest -m "not integration and not docker" --cov=app --cov-fail-under=0 --cov-report=term-missing --cov-report=xml
============================= test session starts ==============================
platform darwin -- Python 3.11.14, pytest-9.0.3, pluggy-1.7.0 -- /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python
cachedir: .pytest_cache
rootdir: /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener
configfile: pytest.ini
testpaths: tests
plugins: platformdirs-4.13.0, cov-7.1.0, anyio-4.15.1
collecting ... collected 399 items / 23 deselected / 376 selected

tests/test_abuse.py::test_each_heuristic[https://8.8.8.8/-ip_literal] PASSED [  0%]
tests/test_abuse.py::test_each_heuristic[https://[2606:4700:4700::1111]/-ip_literal] PASSED [  0%]
tests/test_abuse.py::test_each_heuristic[https://xn--bcher-kva.de/-punycode] PASSED [  0%]
tests/test_abuse.py::test_each_heuristic[https://p\u0430ypal.com/-mixed_script] PASSED [  1%]
tests/test_abuse.py::test_each_heuristic[https://a.b.c.d.example.com/-deep_subdomains] PASSED [  1%]
tests/test_abuse.py::test_each_heuristic[https://example.zip/-suspicious_tld] PASSED [  1%]
tests/test_abuse.py::test_each_heuristic[https://example.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-long_url] PASSED [  1%]
tests/test_abuse.py::test_each_heuristic[https://example.com/123456789012-many_digits] PASSED [  2%]
tests/test_abuse.py::test_each_heuristic[https://example.com/----------------many_specials] PASSED [  2%]
tests/test_abuse.py::test_each_heuristic[https://paypal.attacker.com/-brand_subdomain] PASSED [  2%]
tests/test_abuse.py::test_each_heuristic[https://bit.ly/abc-shortener_chain] PASSED [  2%]
tests/test_abuse.py::test_each_heuristic[https://example.com/%6Cogin-credential_path] PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://example.com/verify-credential_path] PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://example.com/secure-credential_path] PASSED [  3%]
tests/test_abuse.py::test_each_heuristic[https://example.com/update-credential_path] PASSED [  3%]
tests/test_abuse.py::test_registered_domains_and_counts PASSED           [  4%]
tests/test_abuse.py::test_low_high_skip_model PASSED                     [  4%]
tests/test_abuse.py::test_gray_zone_and_domain_cache PASSED              [  4%]
tests/test_abuse.py::test_invalid_schema_suspicious[oops] PASSED         [  5%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":1,"reasons":["anything"]}] PASSED [  5%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":2,"reasons":["llm_uncertain"]}] PASSED [  5%]
tests/test_abuse.py::test_invalid_schema_suspicious[{"verdict":"clean","confidence":1,"reasons":["llm_uncertain"],"tool":"fetch"}] PASSED [  5%]
tests/test_abuse.py::test_budget_unavailable_is_reviewable PASSED        [  6%]
tests/test_abuse.py::test_injection_quoted_capped_and_cannot_clear_heuristic PASSED [  6%]
tests/test_abuse.py::test_outbox_publish_duplicate_and_commit_before_ack PASSED [  6%]
tests/test_abuse.py::test_outbox_rollback_when_commit_fails PASSED       [  6%]
tests/test_abuse.py::test_relay_failure_retains_outbox PASSED            [  7%]
tests/test_abuse.py::test_failed_verdict_commit_is_not_acked PASSED      [  7%]
tests/test_abuse.py::test_malformed_goes_to_dlq_before_ack PASSED        [  7%]
tests/test_abuse.py::test_enforcement_on_warm_cache_and_review PASSED    [  7%]
tests/test_abuse.py::test_suspicious_redirect_and_deleted_precedence PASSED [  8%]
tests/test_abuse.py::test_redis_failure_does_not_skip_analysis PASSED    [  8%]
tests/test_abuse.py::test_invalid_cached_result_recomputed PASSED        [  8%]
tests/test_abuse.py::test_worker_run_metrics_and_shutdown PASSED         [  9%]
tests/test_abuse.py::test_store_does_not_replace_review PASSED           [  9%]
tests/test_abuse.py::test_missing_deleted_events_ack_without_classification PASSED [  9%]
tests/test_abuse.py::test_schema_and_new_services PASSED                 [  9%]
tests/test_abuse_eval.py::test_combined_fake_regression PASSED           [ 10%]
tests/test_abuse_eval.py::test_fixture_provenance_and_counts PASSED      [ 10%]
tests/test_abuse_eval.py::test_splits_stable_grouped_and_limit_does_not_change_membership PASSED [ 10%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com,unknown\n] PASSED [ 10%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[label,url\nbenign,https://example.com\n] PASSED [ 11%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://user:secret@example.com,benign\n] PASSED [ 11%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com,benign\nhttps://example.com,malicious\n] PASSED [ 11%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nhttps://example.com\n] PASSED [ 11%]
tests/test_abuse_eval.py::test_loader_rejects_bad_rows_without_echo[url,label\nfile:///tmp/private,benign\n] PASSED [ 12%]
tests/test_abuse_eval.py::test_loader_deduplicates_and_does_not_recurse PASSED [ 12%]
tests/test_abuse_eval.py::test_metric_arithmetic_and_undefined_values PASSED [ 12%]
tests/test_abuse_eval.py::test_variants_and_constant_fake_have_no_label_access PASSED [ 13%]
tests/test_abuse_eval.py::test_budget_failures_are_reported_not_hidden PASSED [ 13%]
tests/test_abuse_eval.py::test_reported_tokens_and_missing_metadata PASSED [ 13%]
tests/test_abuse_eval.py::test_runner_writes_both_formats_without_urls PASSED [ 13%]
tests/test_abuse_eval.py::test_dev_run_is_explicitly_marked PASSED       [ 14%]
tests/test_analytics_repository.py::test_batch_create_clicks_uses_single_execute_call PASSED [ 14%]
tests/test_analytics_repository.py::test_batch_create_clicks_returns_zero_for_empty_list PASSED [ 14%]
tests/test_analytics_repository.py::test_analytics_repository_count_and_timestamps PASSED [ 14%]
tests/test_analytics_service.py::test_get_analytics_uses_repository_results PASSED [ 15%]
tests/test_app_assembly.py::test_middleware_and_metrics PASSED           [ 15%]
tests/test_app_assembly.py::test_cors_preflight PASSED                   [ 15%]
tests/test_app_assembly.py::test_rate_limiter_is_registered PASSED       [ 15%]
tests/test_app_assembly.py::test_main_routes PASSED                      [ 16%]
tests/test_app_assembly.py::test_service_failures_are_503[/urls-service0-list_recent_urls] PASSED [ 16%]
tests/test_app_assembly.py::test_service_failures_are_503[/analytics/code-service1-get_analytics] PASSED [ 16%]
tests/test_app_assembly.py::test_health_dependency_failures[db] PASSED   [ 17%]
tests/test_app_assembly.py::test_health_dependency_failures[redis] PASSED [ 17%]
tests/test_app_assembly.py::test_health_dependency_failures[both] PASSED [ 17%]
tests/test_app_assembly.py::test_false_redis_ping_is_unhealthy PASSED    [ 17%]
tests/test_app_assembly.py::test_livez_does_not_touch_dependencies PASSED [ 18%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[ConnectionError] PASSED [ 18%]
tests/test_app_assembly.py::test_redirect_falls_back_on_redis_read_failure[TimeoutError] PASSED [ 18%]
tests/test_app_assembly.py::test_redis_health_read_failures[ping] PASSED [ 18%]
tests/test_app_assembly.py::test_redis_health_read_failures[dbsize] PASSED [ 19%]
tests/test_app_assembly.py::test_health_session_acquisition_failure PASSED [ 19%]
tests/test_app_assembly.py::test_health_session_is_closed PASSED         [ 19%]
tests/test_app_assembly.py::test_stopped_redis_never_makes_redirect_5xx_and_health_reports_breaker PASSED [ 19%]
tests/test_auth.py::test_key_hashing_metadata_and_revocation PASSED      [ 20%]
tests/test_auth.py::test_key_invalid_creation[-scopes0] PASSED           [ 20%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes1] PASSED         [ 20%]
tests/test_auth.py::test_key_invalid_creation[ok-scopes2] PASSED         [ 21%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-POST-/shorten] PASSED [ 21%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/urls/code] PASSED [ 21%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/urls] PASSED [ 21%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/analytics/code] PASSED [ 22%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-GET-/admin/keys] PASSED [ 22%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[None-DELETE-/admin/keys/1] PASSED [ 22%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-POST-/shorten] PASSED [ 22%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/urls/code] PASSED [ 23%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/urls] PASSED [ 23%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/analytics/code] PASSED [ 23%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-GET-/admin/keys] PASSED [ 23%]
tests/test_auth.py::test_missing_and_invalid_keys_are_401[invalid-DELETE-/admin/keys/1] PASSED [ 24%]
tests/test_auth.py::test_scope_enforcement_and_creator PASSED            [ 24%]
tests/test_auth.py::test_public_endpoints_and_openapi PASSED             [ 24%]
tests/test_auth.py::test_auth_database_failure_is_503 PASSED             [ 25%]
tests/test_auth.py::test_write_limits_and_key_isolation PASSED           [ 25%]
tests/test_auth.py::test_delete_uses_template_bucket_not_code PASSED     [ 25%]
tests/test_auth.py::test_redirects_share_ip_bucket_and_ignore_spoofed_headers PASSED [ 25%]
tests/test_auth.py::test_redis_failure_closes_writes_but_not_redirects PASSED [ 26%]
tests/test_auth.py::test_internal_metrics_not_exposed_on_api_port PASSED [ 26%]
tests/test_auth.py::test_cli_prints_key_once_and_never_lists_hash PASSED [ 26%]
tests/test_base62.py::test_encode_base62_zero_returns_empty_string PASSED [ 26%]
tests/test_base62.py::test_encode_base62_small_numbers PASSED            [ 27%]
tests/test_base62.py::test_encode_base62_larger_number PASSED            [ 27%]
tests/test_cache_strategy.py::test_circuit_open_half_open_closed_and_failed_probe PASSED [ 27%]
tests/test_cache_strategy.py::test_only_one_half_open_probe_and_stale_success_cannot_close PASSED [ 27%]
tests/test_cache_strategy.py::test_success_resets_consecutive_failures PASSED [ 28%]
tests/test_cache_strategy.py::test_client_timeout_and_retry_configuration PASSED [ 28%]
tests/test_cache_strategy.py::test_ttl_jitter_bounds_and_absolute_expiry PASSED [ 28%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[False] PASSED [ 28%]
tests/test_cache_strategy.py::test_many_cold_requests_share_one_database_read[True] PASSED [ 29%]
tests/test_cache_strategy.py::test_cross_process_lock_wait_rechecks_cache PASSED [ 29%]
tests/test_cache_strategy.py::test_negative_caching_and_alias_creation_invalidation PASSED [ 29%]
tests/test_cache_strategy.py::test_alias_creation_fences_an_inflight_negative_fill PASSED [ 30%]
tests/test_cache_strategy.py::test_lock_release_and_publication_require_owner PASSED [ 30%]
tests/test_cache_strategy.py::test_negative_cache_expiry PASSED          [ 30%]
tests/test_cache_strategy.py::test_redis_down_falls_back_and_counts_metric PASSED [ 30%]
tests/test_cache_strategy.py::test_singleflight_timeout_and_exception_cleanup PASSED [ 31%]
tests/test_cache_strategy.py::test_positive_cache_still_checks_deletion_and_database_failure PASSED [ 31%]
tests/test_ci_workflows.py::test_release_only_publishes_after_ci_and_scanning PASSED [ 31%]
tests/test_ci_workflows.py::test_ci_checks_are_independent_and_actions_are_immutable PASSED [ 31%]
tests/test_ci_workflows.py::test_runtime_image_uses_allowlisted_sources_and_removes_build_tools PASSED [ 32%]
tests/test_code_generation.py::test_100000_candidates_are_unique_and_url_safe PASSED [ 32%]
tests/test_code_generation.py::test_production_generator_uses_secrets_choice PASSED [ 32%]
tests/test_code_generation.py::test_collision_retries_preserve_existing_destination PASSED [ 32%]
tests/test_code_generation.py::test_exhaustion_is_bounded_and_leaves_transaction_usable PASSED [ 33%]
tests/test_code_generation.py::test_non_collision_integrity_error_is_not_retried PASSED [ 33%]
tests/test_code_generation.py::test_static_route_names_are_not_allocated PASSED [ 33%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_USER] PASSED [ 34%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_PASSWORD] PASSED [ 34%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[POSTGRES_DB] PASSED [ 34%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_USER] PASSED [ 34%]
tests/test_deployment_config.py::test_compose_rejects_empty_required_credentials[GRAFANA_ADMIN_PASSWORD] PASSED [ 35%]
tests/test_deployment_config.py::test_compose_uses_same_database_credentials_for_all_clients PASSED [ 35%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[kafka] PASSED [ 35%]
tests/test_deployment_config.py::test_profile_selects_matching_brokers[redis-streams] PASSED [ 35%]
tests/test_deployment_config.py::test_kubernetes_metrics_use_internal_port_and_network_policy PASSED [ 36%]
tests/test_event_bus.py::test_duplicate_delivery_one_row_and_commit_before_ack PASSED [ 36%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{broken] PASSED [ 36%]
tests/test_event_bus.py::test_malformed_or_unknown_version_dlq_after_three_attempts[{"schema_version":99,"short_code":"abc123"}] PASSED [ 36%]
tests/test_event_bus.py::test_poison_row_does_not_discard_healthy_batch_rows PASSED [ 37%]
tests/test_event_bus.py::test_database_error_never_acknowledges_or_deadletters PASSED [ 37%]
tests/test_event_bus.py::test_commit_failure_does_not_ack PASSED         [ 37%]
tests/test_event_bus.py::test_dlq_publish_failure_does_not_advance_offset PASSED [ 38%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[False] PASSED [ 38%]
tests/test_event_bus.py::test_idle_timer_and_shutdown_flush[True] PASSED [ 38%]
tests/test_event_bus.py::test_slow_broker_and_full_queue_do_not_block_redirects PASSED [ 38%]
tests/test_event_bus.py::test_kafka_raw_poll_and_explicit_offsets PASSED [ 39%]
tests/test_event_bus.py::test_redis_groups_recover_pending_before_new_reads PASSED [ 39%]
tests/test_event_bus.py::test_memory_groups_and_unacknowledged_recovery PASSED [ 39%]
tests/test_event_bus.py::test_dlq_list_and_replay_preserve_event_id PASSED [ 39%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[memory-InMemoryEventBus] PASSED [ 40%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[kafka-KafkaEventBus] PASSED [ 40%]
tests/test_event_bus.py::test_adapter_selection_without_connecting[redis_streams-RedisStreamsEventBus] PASSED [ 40%]
tests/test_event_bus.py::test_legacy_event_without_id_goes_to_dlq PASSED [ 40%]
tests/test_event_bus.py::test_memory_recovers_more_than_one_batch PASSED [ 41%]
tests/test_event_bus.py::test_idle_timer_flushes_even_when_later_polls_fail PASSED [ 41%]
tests/test_hardening.py::test_body_limit_and_safe_errors PASSED          [ 41%]
tests/test_hardening.py::test_chunked_body_cannot_bypass_limit PASSED    [ 42%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[*] PASSED   [ 42%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://*.example.com] PASSED [ 42%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://user:pass@example.com] PASSED [ 42%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[https://example.com/path] PASSED [ 43%]
tests/test_hardening.py::test_production_rejects_unsafe_cors[] PASSED    [ 43%]
tests/test_hardening.py::test_production_accepts_exact_origin PASSED     [ 43%]
tests/test_hardening.py::test_all_kubernetes_containers_have_security_and_resources PASSED [ 43%]
tests/test_hardening.py::test_network_policy_default_deny_and_exact_dependency_ports PASSED [ 44%]
tests/test_hardening.py::test_slow_request_body_returns_408 PASSED       [ 44%]
tests/test_hardening.py::test_kafka_constructor_uses_supported_bounded_timeouts PASSED [ 44%]
tests/test_hardening.py::test_cors_setting_is_configmap_data_not_object_metadata PASSED [ 44%]
tests/test_hardening.py::test_frontend_build_excludes_local_secrets_and_artifacts PASSED [ 45%]
tests/test_health_route.py::test_health_endpoint_includes_total_urls PASSED [ 45%]
tests/test_kustomize.py::test_overlay_contract[ci] PASSED                [ 45%]
tests/test_kustomize.py::test_overlay_contract[local] PASSED             [ 46%]
tests/test_kustomize.py::test_scripts_are_strict_and_syntax_valid PASSED [ 46%]
tests/test_kustomize.py::test_deploy_stops_before_final_apply_on_wait_failure[rollout status statefulset/postgres] PASSED [ 46%]
tests/test_kustomize.py::test_deploy_stops_before_final_apply_on_wait_failure[wait --for=condition=complete job/db-migrate] PASSED [ 46%]
tests/test_kustomize.py::test_migration_deadline_starts_after_dependencies PASSED [ 47%]
tests/test_llm.py::test_fake_deterministic_and_factory PASSED            [ 47%]
tests/test_llm.py::test_recorded_contracts[GeminiProvider-reply0] PASSED [ 47%]
tests/test_llm.py::test_recorded_contracts[OllamaProvider-reply1] PASSED [ 47%]
tests/test_llm.py::test_recorded_contracts[ClaudeProvider-reply2] PASSED [ 48%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[429] PASSED [ 48%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[500] PASSED [ 48%]
tests/test_llm.py::test_backoff_jitter_and_budget_per_attempt[503] PASSED [ 48%]
tests/test_llm.py::test_single_schema_repair[not JSON] PASSED            [ 49%]
tests/test_llm.py::test_single_schema_repair[{"safe":"true"}] PASSED     [ 49%]
tests/test_llm.py::test_single_schema_repair[{"safe":true,"extra":1}] PASSED [ 49%]
tests/test_llm.py::test_bad_envelope_repaired_once PASSED                [ 50%]
tests/test_llm.py::test_invalid_output_does_not_leak PASSED              [ 50%]
tests/test_llm.py::test_transport_errors_sanitized_no_retry[failure0] PASSED [ 50%]
tests/test_llm.py::test_transport_errors_sanitized_no_retry[failure1] PASSED [ 50%]
tests/test_llm.py::test_bounded_failures[400-1] PASSED                   [ 51%]
tests/test_llm.py::test_bounded_failures[401-1] PASSED                   [ 51%]
tests/test_llm.py::test_bounded_failures[302-1] PASSED                   [ 51%]
tests/test_llm.py::test_bounded_failures[429-3] PASSED                   [ 51%]
tests/test_llm.py::test_bounded_failures[503-3] PASSED                   [ 52%]
tests/test_llm.py::test_budget_includes_repairs_and_is_shared PASSED     [ 52%]
tests/test_llm.py::test_budget_resets_next_utc_day_and_zero_disables PASSED [ 52%]
tests/test_llm.py::test_global_concurrency_across_instances PASSED       [ 52%]
tests/test_llm.py::test_capacity_timeout_does_not_spend_budget PASSED    [ 53%]
tests/test_llm.py::test_missing_configuration[GeminiProvider-GEMINI_API_KEY] PASSED [ 53%]
tests/test_llm.py::test_missing_configuration[ClaudeProvider-ANTHROPIC_API_KEY] PASSED [ 53%]
tests/test_llm.py::test_missing_configuration[OllamaProvider-OLLAMA_MODEL] PASSED [ 53%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[https://ollama.com] PASSED [ 54%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[http://user:secret@localhost:11434] PASSED [ 54%]
tests/test_llm.py::test_ollama_remote_or_credential_url_rejected[http://localhost:11434?key=secret] PASSED [ 54%]
tests/test_llm.py::test_attempt_metrics PASSED                           [ 55%]
tests/test_llm.py::test_http_privacy_suppresses_instrumentation PASSED   [ 55%]
tests/test_llm.py::test_oversized_response_rejected PASSED               [ 55%]
tests/test_llm.py::test_deadline_checked_between_chunks PASSED           [ 55%]
tests/test_llm.py::test_cloud_model_rejected PASSED                      [ 56%]
tests/test_llm.py::test_budget_reservations_atomic PASSED                [ 56%]
tests/test_llm.py::test_gemini_paces_retries_repairs_and_shared_instances PASSED [ 56%]
tests/test_llm.py::test_evaluation_retains_only_safe_http_status PASSED  [ 56%]
tests/test_mcp_api_contract.py::test_recorded_api_contract PASSED        [ 57%]
tests/test_mcp_api_contract.py::test_activity_partial_failure PASSED     [ 57%]
tests/test_mcp_api_contract.py::test_signal_code_isolation_and_window PASSED [ 57%]
tests/test_mcp_api_contract.py::test_status_has_no_redirect_side_effect PASSED [ 57%]
tests/test_mcp_api_contract.py::test_admin_auth_required PASSED          [ 58%]
tests/test_mcp_api_contract.py::test_actual_429_only_and_per_code PASSED [ 58%]
tests/test_mcp_api_contract.py::test_rejection_storage_is_independent_and_bounded PASSED [ 58%]
tests/test_mcp_api_contract.py::test_admin_read_scope_is_insufficient PASSED [ 59%]
tests/test_mcp_api_contract.py::test_signal_queries_only_requested_code_and_completed_minutes PASSED [ 59%]
tests/test_mcp_api_contract.py::test_database_failure_not_empty_activity PASSED [ 59%]
tests/test_mcp_api_contract.py::test_status_block_allow_expiry_precedence PASSED [ 59%]
tests/test_migrations.py::test_migrations_on_empty_sqlite PASSED         [ 60%]
tests/test_migrations.py::test_offline_sql_uses_postgresql_settings PASSED [ 60%]
tests/test_observability.py::test_w3c_event_roundtrip_and_invalid_context_isolation PASSED [ 60%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[api] PASSED [ 60%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[worker] PASSED [ 61%]
tests/test_observability.py::test_json_log_has_active_trace_and_no_secrets[abuse-worker] PASSED [ 61%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[api] PASSED [ 61%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[worker] PASSED [ 61%]
tests/test_observability.py::test_privacy_export_boundary_for_every_process[abuse-worker] PASSED [ 62%]
tests/test_observability.py::test_redirect_publish_consume_sql_share_one_trace PASSED [ 62%]
tests/test_observability.py::test_init_instruments_existing_engine_and_uses_configured_otlp PASSED [ 62%]
tests/test_rate_limiter.py::test_bucket_burst_refill_and_identity_isolation PASSED [ 63%]
tests/test_rate_limiter.py::test_bucket_concurrent_burst PASSED          [ 63%]
tests/test_rate_limiter.py::test_bucket_error_and_clock_regression PASSED [ 63%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted0-198.51.100.5] PASSED [ 63%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[198.51.100.5-1.2.3.4-trusted1-198.51.100.5] PASSED [ 64%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5-trusted2-198.51.100.5] PASSED [ 64%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-1.2.3.4, 198.51.100.5-trusted3-198.51.100.5] PASSED [ 64%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-198.51.100.5, 10.0.0.2-trusted4-198.51.100.5] PASSED [ 64%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[::1-2001:db8::1-trusted5-2001:db8::1] PASSED [ 65%]
tests/test_rate_limiter.py::test_forwarded_headers_only_from_trusted_peers[10.0.0.1-garbage-trusted6-10.0.0.1] PASSED [ 65%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-ConnectionError] PASSED [ 65%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[get-TimeoutError] PASSED [ 65%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-ConnectionError] PASSED [ 66%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[ping-TimeoutError] PASSED [ 66%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-ConnectionError] PASSED [ 66%]
tests/test_redis_client.py::test_read_errors_are_logged_and_counted[dbsize-TimeoutError] PASSED [ 67%]
tests/test_redis_client.py::test_programming_errors_are_not_hidden PASSED [ 67%]
tests/test_redis_client.py::test_normal_cache_reads[https://example.com/-counter0] PASSED [ 67%]
tests/test_redis_client.py::test_normal_cache_reads[None-counter1] PASSED [ 67%]
tests/test_routes.py::test_create_short_url_returns_service_code PASSED  [ 68%]
tests/test_routes.py::test_redirect_returns_redirect_response PASSED     [ 68%]
tests/test_routes.py::test_redirect_raises_404_for_missing_code PASSED   [ 68%]
tests/test_routes.py::test_analytics_route_uses_service PASSED           [ 68%]
tests/test_routes.py::test_redis_health_success PASSED                   [ 69%]
tests/test_routes.py::test_redis_health_failure PASSED                   [ 69%]
tests/test_slo.py::test_redis_lag_excludes_acknowledged_history_and_reports_retained_dlq PASSED [ 69%]
tests/test_slo.py::test_unknown_redis_lag_does_not_look_healthy PASSED   [ 69%]
tests/test_slo.py::test_kafka_retained_dlq_size_accounts_for_retention PASSED [ 70%]
tests/test_slo.py::test_worker_exports_current_dlq_size PASSED           [ 70%]
tests/test_slo.py::test_provisioned_configmaps_match_canonical_sources PASSED [ 70%]
tests/test_slo.py::test_redirect_slo_selector_captures_5xx_and_excludes_health PASSED [ 71%]
tests/test_slo.py::test_new_kafka_group_lag_starts_at_retained_offset PASSED [ 71%]
tests/test_slo.py::test_headless_metrics_services_include_unready_replicas PASSED [ 71%]
tests/test_slo.py::test_grafana_upgrade_preserves_existing_datasource_identity PASSED [ 71%]
tests/test_smoke_script.py::test_smoke_checks_auth_and_throttling[False-False-True] PASSED [ 72%]
tests/test_smoke_script.py::test_smoke_checks_auth_and_throttling[True-False-False] PASSED [ 72%]
tests/test_smoke_script.py::test_smoke_checks_auth_and_throttling[False-True-False] PASSED [ 72%]
tests/test_terraform_design.py::test_ci_has_no_deployment_or_credential_steps PASSED [ 72%]
tests/test_terraform_design.py::test_design_defaults_cannot_start_paid_services PASSED [ 73%]
tests/test_terraform_design.py::test_task_network_attachment_and_private_data_services PASSED [ 73%]
tests/test_tooling_regressions.py::test_typed_models_preserve_column_types_and_nullability PASSED [ 73%]
tests/test_tooling_regressions.py::test_trace_logging_preserves_message_for_default_formatter PASSED [ 73%]
tests/test_tooling_regressions.py::test_worker_reports_unconfigured_database PASSED [ 74%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[False] PASSED [ 74%]
tests/test_trace_privacy.py::test_url_spans_only_include_origin_and_code[True] PASSED [ 74%]
tests/test_trace_privacy.py::test_auto_instrumented_redis_does_not_export_cached_url PASSED [ 75%]
tests/test_trace_privacy.py::test_auto_instrumented_http_does_not_export_path_or_query PASSED [ 75%]
tests/test_trace_privacy.py::test_privacy_hooks_redact_instrumentation_attributes PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[ftp://example.com] PASSED [ 75%]
tests/test_url_features.py::test_reject_unsafe_urls[javascript:alert(1)] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[https:///path] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[https://] PASSED     [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user:pass@example.com] PASSED [ 76%]
tests/test_url_features.py::test_reject_unsafe_urls[http://user@example.com] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://@example.com] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localhost] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://LOCALHOST.] PASSED [ 77%]
tests/test_url_features.py::test_reject_unsafe_urls[http://sub.localhost] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://server.local] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.9.2.1] PASSED [ 78%]
tests/test_url_features.py::test_reject_unsafe_urls[http://10.1.2.3] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://172.16.2.3] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://192.168.1.1] PASSED [ 79%]
tests/test_url_features.py::test_reject_unsafe_urls[http://169.254.169.254] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0.0.0.0] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::1]] PASSED [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::]] PASSED  [ 80%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fc00::1]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fd00::1]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:127.0.0.1]] PASSED [ 81%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[::ffff:192.168.0.1]] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://[fe80::1%25eth0]] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://2130706433] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0x7f000001] PASSED [ 82%]
tests/test_url_features.py::test_reject_unsafe_urls[http://0177.0.0.1] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.1] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://127.0.0.1.] PASSED [ 83%]
tests/test_url_features.py::test_reject_unsafe_urls[http://%6cocalhost] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://localHOST\u3002] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://example.com\\@127.0.0.1] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://exam\nple.com] PASSED [ 84%]
tests/test_url_features.py::test_reject_unsafe_urls[http://bad_host.com] PASSED [ 85%]
tests/test_url_features.py::test_reject_unsafe_urls[http://-bad.example] PASSED [ 85%]
tests/test_url_features.py::test_reject_unsafe_urls[https://example.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx] PASSED [ 85%]
tests/test_url_features.py::test_normalize_public_hosts[https://EXAMPLE.COM./a?b=1-example.com] PASSED [ 85%]
tests/test_url_features.py::test_normalize_public_hosts[http://b\xfccher.de/a-xn--bcher-kva.de] PASSED [ 86%]
tests/test_url_features.py::test_normalize_public_hosts[https://8.8.8.8/a-8.8.8.8] PASSED [ 86%]
tests/test_url_features.py::test_normalize_public_hosts[http://[2606:4700:4700::1111]/-[2606:4700:4700::1111]] PASSED [ 86%]
tests/test_url_features.py::test_normalize_public_hosts[https://localhost.example.com/-localhost.example.com] PASSED [ 86%]
tests/test_url_features.py::test_maximum_url_length PASSED               [ 87%]
tests/test_url_features.py::test_invalid_alias[ab] PASSED                [ 87%]
tests/test_url_features.py::test_invalid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 87%]
tests/test_url_features.py::test_invalid_alias[] PASSED                  [ 88%]
tests/test_url_features.py::test_invalid_alias[a/b] PASSED               [ 88%]
tests/test_url_features.py::test_invalid_alias[a.b] PASSED               [ 88%]
tests/test_url_features.py::test_invalid_alias[a b] PASSED               [ 88%]
tests/test_url_features.py::test_invalid_alias[\xe9\xe9\xe9] PASSED      [ 89%]
tests/test_url_features.py::test_invalid_alias[api] PASSED               [ 89%]
tests/test_url_features.py::test_invalid_alias[Health] PASSED            [ 89%]
tests/test_url_features.py::test_invalid_alias[METRICS] PASSED           [ 89%]
tests/test_url_features.py::test_invalid_alias[docs] PASSED              [ 90%]
tests/test_url_features.py::test_invalid_alias[admin] PASSED             [ 90%]
tests/test_url_features.py::test_invalid_alias[shorten] PASSED           [ 90%]
tests/test_url_features.py::test_invalid_alias[livez] PASSED             [ 90%]
tests/test_url_features.py::test_invalid_alias[urls] PASSED              [ 91%]
tests/test_url_features.py::test_invalid_alias[analytics] PASSED         [ 91%]
tests/test_url_features.py::test_invalid_alias[redoc] PASSED             [ 91%]
tests/test_url_features.py::test_valid_alias[abc] PASSED                 [ 92%]
tests/test_url_features.py::test_valid_alias[A_9-x] PASSED               [ 92%]
tests/test_url_features.py::test_valid_alias[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa] PASSED [ 92%]
tests/test_url_features.py::test_invalid_expiry[2020-01-01T00:00:00Z] PASSED [ 92%]
tests/test_url_features.py::test_invalid_expiry[2099-01-01T00:00:00] PASSED [ 93%]
tests/test_url_features.py::test_invalid_expiry[nonsense] PASSED         [ 93%]
tests/test_url_features.py::test_invalid_expiry[9999999999] PASSED       [ 93%]
tests/test_url_features.py::test_expiry_normalized_to_utc PASSED         [ 93%]
tests/test_url_features.py::test_alias_create_conflict_delete_and_list PASSED [ 94%]
tests/test_url_features.py::test_expired_cache_hit_returns_410 PASSED    [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload0] PASSED  [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload1] PASSED  [ 94%]
tests/test_url_features.py::test_api_validation_is_422[payload2] PASSED  [ 95%]
tests/test_url_features.py::test_api_validation_is_422[payload3] PASSED  [ 95%]
tests/test_url_features.py::test_missing_delete_and_redirect PASSED      [ 95%]
tests/test_url_features.py::test_openapi_documents_fields_and_statuses PASSED [ 96%]
tests/test_url_features.py::test_cache_absolute_deadline_and_eviction PASSED [ 96%]
tests/test_url_features.py::test_multicast_rejected[http://224.0.0.1] PASSED [ 96%]
tests/test_url_features.py::test_multicast_rejected[http://[ff02::1]] PASSED [ 96%]
tests/test_url_features.py::test_numeric_string_expiry_rejected PASSED   [ 97%]
tests/test_url_features.py::test_no_redirect_if_expiry_passes_during_click_publication PASSED [ 97%]
tests/test_url_features.py::test_cache_not_used_when_database_fails PASSED [ 97%]
tests/test_url_features.py::test_far_expiry_cache_is_capped_at_jittered_ttl PASSED [ 97%]
tests/test_url_features.py::test_alias_is_case_sensitive PASSED          [ 98%]
tests/test_url_features.py::test_expiry_equal_to_now_is_rejected PASSED  [ 98%]
tests/test_url_features.py::test_subsecond_remaining_lifetime_does_not_populate_cache PASSED [ 98%]
tests/test_url_repository.py::test_url_repository_create_with_code_and_lookup PASSED [ 98%]
tests/test_url_service.py::test_shorten_creates_code_and_commits PASSED  [ 99%]
tests/test_url_service.py::test_resolve_returns_cached_value_and_records_click PASSED [ 99%]
tests/test_url_service.py::test_resolve_caches_database_value_on_miss PASSED [ 99%]
tests/test_url_service.py::test_resolve_returns_none_when_code_missing PASSED [100%]

=============================== warnings summary ===============================
.venv/lib/python3.11/site-packages/fastapi/testclient.py:1
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/lib/python3.11/site-packages/fastapi/testclient.py:1: StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
    from starlette.testclient import TestClient as TestClient  # noqa

.venv/lib/python3.11/site-packages/starlette/testclient.py:53
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/lib/python3.11/site-packages/starlette/testclient.py:53: DeprecationWarning: The anyio.abc.BlockingPortal alias is deprecated, use anyio.from_thread.BlockingPortal instead.
    _PortalFactoryType = Callable[[], AbstractContextManager[anyio.abc.BlockingPortal]]

app/main.py:50
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/app/main.py:50: DeprecationWarning:
          on_event is deprecated, use lifespan event handlers instead.

          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).

    @app.on_event("startup")

.venv/lib/python3.11/site-packages/fastapi/applications.py:4598
.venv/lib/python3.11/site-packages/fastapi/applications.py:4598
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/lib/python3.11/site-packages/fastapi/applications.py:4598: DeprecationWarning:
          on_event is deprecated, use lifespan event handlers instead.

          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).

    return self.router.on_event(event_type)  # ty: ignore[deprecated]

app/main.py:79
  /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/app/main.py:79: DeprecationWarning:
          on_event is deprecated, use lifespan event handlers instead.

          Read more about it in the
          [FastAPI docs for Lifespan Events](https://fastapi.tiangolo.com/advanced/events/).

    @app.on_event("shutdown")

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
================================ tests coverage ================================
______________ coverage: platform darwin, python 3.11.14-final-0 _______________

Name                                       Stmts   Miss   Cover   Missing
-------------------------------------------------------------------------
app/__init__.py                                0      0 100.00%
app/abuse/__init__.py                          0      0 100.00%
app/abuse/classifier.py                       57      2  96.49%   42, 47
app/abuse/heuristics.py                       61      0 100.00%
app/abuse/persistence.py                      47      3  93.62%   46-47, 68
app/abuse/schemas.py                          19      0 100.00%
app/api/__init__.py                            0      0 100.00%
app/api/auth.py                               33      0 100.00%
app/api/routes.py                            145      4  97.24%   112-113, 178, 215
app/cache/__init__.py                          0      0 100.00%
app/cache/circuit_breaker.py                  49      1  97.96%   57
app/cache/redis_client.py                     94     16  82.98%   30, 33, 36, 39, 42, 47-48, 57-59, 145-146, 153-154, 161-162
app/cache/singleflight.py                     37      1  97.30%   34
app/cli.py                                    66     10  84.85%   30-32, 80, 98, 102-106, 110
app/core/__init__.py                           0      0 100.00%
app/core/config.py                            85     15  82.35%   17, 19, 35, 42, 49, 56, 74, 85, 89, 91, 103, 111, 136, 138, 141
app/db/__init__.py                             0      0 100.00%
app/db/database.py                            17      6  64.71%   33-39
app/events/__init__.py                        13      1  92.31%   18
app/events/base.py                            12      0 100.00%
app/events/kafka.py                           58      9  84.48%   17-20, 27, 39, 51, 64, 67, 77
app/events/memory.py                          49      0 100.00%
app/events/models.py                          35      1  97.14%   67
app/events/publisher.py                       78      5  93.59%   52, 60-61, 104-105
app/events/redis_streams.py                   52      4  92.31%   86, 141-143
app/kafka/__init__.py                          0      0 100.00%
app/kafka/consumer.py                          4      0 100.00%
app/kafka/producer.py                          7      1  85.71%   9
app/llm/__init__.py                            5      0 100.00%
app/llm/base.py                               30      0 100.00%
app/llm/limits.py                             37      1  97.30%   15
app/llm/providers.py                         155     10  93.55%   84, 112, 117, 158, 165, 179, 211-212, 297-298
app/main.py                                   48      8  83.33%   46-47, 62-63, 66, 84-86
app/middleware/hardening.py                   47      2  95.74%   30, 50
app/middleware/rate_limiter.py                88      1  98.86%   90
app/models/__init__.py                         0      0 100.00%
app/models/analytics.py                       11      0 100.00%
app/models/api_key.py                         14      0 100.00%
app/models/url.py                             14      0 100.00%
app/models/url_verdict.py                     23      0 100.00%
app/observability/context.py                  27      0 100.00%
app/observability/logging.py                  46      5  89.13%   60, 73-76
app/observability/metrics.py                  51      0 100.00%
app/observability/privacy.py                  27      1  96.30%   93
app/observability/tracing.py                  47      3  93.62%   72-73, 77
app/repositories/__init__.py                   0      0 100.00%
app/repositories/analytics_repository.py      23      1  95.65%   28
app/repositories/url_repository.py            36      0 100.00%
app/schemas/__init__.py                        0      0 100.00%
app/schemas/url_schema.py                     73      3  95.89%   73, 95, 122
app/services/__init__.py                       0      0 100.00%
app/services/activity_signals.py              39      0 100.00%
app/services/analytics_service.py             13      0 100.00%
app/services/api_keys.py                      43      0 100.00%
app/services/code_generator.py                 9      0 100.00%
app/services/url_service.py                  151      9  94.04%   36-37, 64, 69, 74, 157, 165, 235-236
app/utils/__init__.py                          0      0 100.00%
app/utils/base62.py                            9      0 100.00%
app/workers/__init__.py                        0      0 100.00%
app/workers/abuse_worker.py                  107     16  85.05%   136-142, 150-161, 165
app/workers/analytics_worker.py              122     10  91.80%   184-193, 197
-------------------------------------------------------------------------
TOTAL                                       2313    149  93.56%
Coverage XML written to file coverage.xml
=============== 376 passed, 23 deselected, 6 warnings in 19.78s ================
sh scripts/check-prometheus.sh
Checking rules/slo.yml
  SUCCESS: 22 rules found

  SUCCESS


```
</details>

<details>
<summary>make frontend-check — exit 0</summary>

```text
cd frontend && npm ci --no-audit --no-fund
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: 'eslint-visitor-keys@5.0.1',
npm warn EBADENGINE   required: { node: '^20.19.0 || ^22.13.0 || >=24' },
npm warn EBADENGINE   current: { node: 'v23.9.0', npm: '10.9.2' }
npm warn EBADENGINE }
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
npm warn deprecated glob@10.3.10: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support for other options.

added 782 packages in 11s
cd frontend && npm run lint -- --max-warnings=0

> url-shortener-frontend@0.1.0 lint
> next lint --max-warnings=0

✔ No ESLint warnings or errors
cd frontend && npm test

> url-shortener-frontend@0.1.0 test
> node --test tests/*.test.cjs

✔ protected reads and writes send only the in-memory key (44.818375ms)
✔ public health omits the key and forgetting removes it from requests (10.16525ms)
✔ a fresh client has no persisted key (12.96ms)
✔ flagged list and review use admin key, encoded code and bounded fetch (6.772042ms)
✔ production security headers cover every route without eval or wildcard origins (1.237292ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 229.262625
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false

```
</details>

<details>
<summary>make mcp-test — exit 0</summary>

```text
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m black --check mcp-server/mcp_server
All done! ✨ 🍰 ✨
14 files would be left unchanged.
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m isort --check-only mcp-server/mcp_server
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m flake8 mcp-server/mcp_server
/Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m mypy mcp-server/mcp_server
Success: no issues found in 14 source files
cd mcp-server && /Users/andreaspriftis/Desktop/projects/distributed-URL-Shortener/.venv/bin/python -m pytest
...................................                                      [100%]
35 passed in 1.11s

```
</details>
