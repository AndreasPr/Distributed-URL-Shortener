output "service_name" {
  description = "ECS service name."
  value       = aws_ecs_service.this.name
}
output "task_definition_arn" {
  description = "Versioned task definition; migrations require an operator-run one-off task."
  value       = aws_ecs_task_definition.this.arn
}
output "log_group_arn" {
  description = "Log group ARN."
  value       = aws_cloudwatch_log_group.this.arn
}
