output "target_group_arn" {
  description = "API target group ARN."
  value       = aws_lb_target_group.api.arn
}
output "arn_suffix" {
  description = "CloudWatch ALB dimension."
  value       = aws_lb.this.arn_suffix
}
output "dns_name" {
  description = "ALB hostname; certificate must match application DNS."
  value       = aws_lb.this.dns_name
}
