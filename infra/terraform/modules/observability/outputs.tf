output "alarm_arns" {
  description = "CloudWatch alarm ARNs; notification targets must be configured separately."
  value       = concat([aws_cloudwatch_metric_alarm.errors.arn, aws_cloudwatch_metric_alarm.latency.arn], [for alarm in aws_cloudwatch_metric_alarm.cpu : alarm.arn])
}
