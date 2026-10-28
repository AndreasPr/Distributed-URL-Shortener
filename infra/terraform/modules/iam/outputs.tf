output "execution_role_arn" {
  description = "Execution role with scoped secrets/log/image access."
  value       = aws_iam_role.execution.arn
}
output "task_role_arn" {
  description = "Application task role with no AWS permissions."
  value       = aws_iam_role.task.arn
}
