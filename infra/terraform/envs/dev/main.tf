resource "terraform_data" "manual_guard" {
  lifecycle {
    precondition {
      condition     = var.allow_paid_deployment && var.account_id != "000000000000" && var.image_digest != "sha256:0000000000000000000000000000000000000000000000000000000000000000" && !strcontains(var.certificate_arn, "000000000000")
      error_message = "Design-only: paid deployment is disabled. Real account/image/certificate and explicit manual review are required. CI must never plan/apply."

    }

  }
}
locals {
  image_repository = "${var.account_id}.dkr.ecr.${var.region}.amazonaws.com/${var.name}"
  services = {
    api    = ["uvicorn", "app.main:app", "--no-proxy-headers", "--host", "0.0.0.0", "--port", "8000"]
    worker = ["python", "-m", "app.workers.analytics_worker"]
    abuse  = ["python", "-m", "app.workers.abuse_worker"]

  }
}
module "secrets" {
  source     = "../../modules/secrets"
  name       = var.name
  region     = var.region
  account_id = var.account_id
  depends_on = [terraform_data.manual_guard]
}
module "network" {
  account_id         = var.account_id
  source             = "../../modules/network"
  name               = var.name
  cidr               = var.vpc_cidr
  availability_zones = var.availability_zones
  region             = var.region
  enable_nat_gateway = var.enable_nat_gateway
  kms_key_arn        = module.secrets.kms_key_arn
}
module "database" {
  source            = "../../modules/rds-postgres"
  name              = var.name
  vpc_id            = module.network.vpc_id
  subnet_ids        = module.network.private_subnet_ids
  application_sg_id = module.network.application_sg_id
  kms_key_arn       = module.secrets.kms_key_arn
}
module "redis" {
  source            = "../../modules/elasticache-redis"
  name              = var.name
  vpc_id            = module.network.vpc_id
  subnet_ids        = module.network.private_subnet_ids
  application_sg_id = module.network.application_sg_id
  kms_key_arn       = module.secrets.kms_key_arn
  auth_token        = var.redis_auth_token
}
module "alb" {
  source            = "../../modules/alb"
  name              = var.name
  vpc_id            = module.network.vpc_id
  subnet_ids        = module.network.public_subnet_ids
  application_sg_id = module.network.application_sg_id
  certificate_arn   = var.certificate_arn
}
resource "aws_ecs_cluster" "this" {
  name = var.name
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  depends_on = [terraform_data.manual_guard]
}
module "iam" {
  account_id         = var.account_id
  region             = var.region
  source             = "../../modules/iam"
  name               = var.name
  secret_arns        = values(module.secrets.arns)
  kms_key_arn        = module.secrets.kms_key_arn
  ecr_repository_arn = "arn:aws:ecr:${var.region}:${var.account_id}:repository/${var.name}"
  # Construct ARNs to avoid a task-role/log-group dependency cycle.
  log_group_arns = [for name in keys(local.services) : "arn:aws:logs:${var.region}:${var.account_id}:log-group:/${var.name}-${name}"]
}
module "service" {
  start_services     = var.start_services
  for_each           = local.services
  source             = "../../modules/ecs-service"
  name               = "${var.name}-${each.key}"
  cluster_arn        = aws_ecs_cluster.this.arn
  cluster_name       = aws_ecs_cluster.this.name
  image              = "${local.image_repository}@${var.image_digest}"
  command            = each.value
  subnet_ids         = module.network.private_subnet_ids
  security_group_id  = module.network.application_sg_id
  execution_role_arn = module.iam.execution_role_arn
  task_role_arn      = module.iam.task_role_arn
  kms_key_arn        = module.secrets.kms_key_arn
  region             = var.region
  environment = {
    TRUSTED_PROXIES = join(",", module.network.public_subnet_cidrs)
    ENVIRONMENT     = "production"
    CORS_ORIGINS    = var.frontend_origin
    EVENT_BUS       = "redis_streams"
    LLM_PROVIDER    = "fake"

  }
  secret_arns = {
    DB_URL = module.secrets.arns["db-url"], REDIS_URL = module.secrets.arns["redis-url"]
  }
  is_api           = each.key == "api"
  target_group_arn = each.key == "api" ? module.alb.target_group_arn : null
  depends_on       = [module.database, module.redis, module.alb]
}
module "observability" {
  source         = "../../modules/observability"
  name           = var.name
  alb_arn_suffix = module.alb.arn_suffix
  cluster_name   = aws_ecs_cluster.this.name
  service_names = {
    for name, service in module.service : name => service.service_name
  }
  alarm_actions = var.alarm_actions
}
