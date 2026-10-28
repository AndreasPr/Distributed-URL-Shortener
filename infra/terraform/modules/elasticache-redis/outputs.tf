output "endpoint" {
  description = "Private TLS endpoint."
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
}
output "id" {
  description = "Replication group ID."
  value       = aws_elasticache_replication_group.this.id
}
