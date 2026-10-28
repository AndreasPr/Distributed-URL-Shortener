resource "aws_cloudwatch_log_group" "this" {
  name              = "/${var.name}"
  retention_in_days = 365
  kms_key_id        = var.kms_key_arn
}
resource "aws_ecs_task_definition" "this" {
  family                   = var.name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }
  container_definitions = jsonencode([{
    name                   = "application"
    image                  = var.image
    essential              = true
    command                = var.command
    user                   = "10001:10001"
    readonlyRootFilesystem = true
    linuxParameters        = { capabilities = { drop = ["ALL"] } }
    stopTimeout            = 120
    environment            = [for name, value in var.environment : { name = name, value = value }]
    secrets                = [for name, arn in var.secret_arns : { name = name, valueFrom = arn }]
    portMappings           = var.is_api ? [{ containerPort = 8000, hostPort = 8000, protocol = "tcp" }] : []
    healthCheck = {
      command     = ["CMD", "python", "-c", var.is_api ? "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/livez',timeout=3)" : "import os; os.kill(1,0)"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 30
    }
    logConfiguration = { logDriver = "awslogs", options = { awslogs-group = aws_cloudwatch_log_group.this.name, awslogs-region = var.region, awslogs-stream-prefix = "app" } }
  }])
}
resource "aws_ecs_service" "this" {
  name                               = var.name
  cluster                            = var.cluster_arn
  task_definition                    = aws_ecs_task_definition.this.arn
  desired_count                      = var.start_services ? 2 : 0
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  enable_execute_command             = false
  health_check_grace_period_seconds  = var.is_api ? 60 : null
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [var.security_group_id]
    assign_public_ip = false
  }
  dynamic "load_balancer" {
    for_each = var.is_api ? [var.target_group_arn] : []
    content {
      target_group_arn = load_balancer.value
      container_name   = "application"
      container_port   = 8000
    }

  }
  lifecycle {
    ignore_changes = [desired_count]
  }
}
resource "aws_appautoscaling_target" "this" {
  min_capacity       = var.start_services ? 2 : 0
  max_capacity       = 4
  resource_id        = "service/${var.cluster_name}/${aws_ecs_service.this.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}
resource "aws_appautoscaling_policy" "cpu" {
  name               = "${var.name}-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.this.resource_id
  scalable_dimension = aws_appautoscaling_target.this.scalable_dimension
  service_namespace  = aws_appautoscaling_target.this.service_namespace
  target_tracking_scaling_policy_configuration {
    target_value       = 60
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

  }
}
