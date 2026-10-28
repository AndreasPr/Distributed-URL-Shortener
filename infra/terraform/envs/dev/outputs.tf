output "alb_dns_name" {
  description = "Design output; available only after an explicitly authorized deployment."
  value       = module.alb.dns_name
}
output "database_address" {
  description = "Private PostgreSQL endpoint."
  value       = module.database.address
}
output "redis_endpoint" {
  description = "Private TLS Redis endpoint."
  value       = module.redis.endpoint
}
output "secret_arns" {
  description = "Empty app secret entries; no values are emitted."
  value       = module.secrets.arns
}
output "task_definitions" {
  description = "Separate API, analytics and abuse task definitions."
  value = {
    for name, service in module.service : name => service.task_definition_arn
  }
}
output "alarm_arns" {
  description = "Alarms have no notification delivery unless SNS ARNs are supplied."
  value       = module.observability.alarm_arns
}
