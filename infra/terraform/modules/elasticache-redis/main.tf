resource "aws_security_group" "redis" {
  name_prefix = "${var.name}-redis-"
  description = "TLS Redis reachable only from Fargate tasks"
  vpc_id      = var.vpc_id
}
resource "aws_vpc_security_group_ingress_rule" "redis" {
  security_group_id            = aws_security_group.redis.id
  referenced_security_group_id = var.application_sg_id
  ip_protocol                  = "tcp"
  from_port                    = 6379
  to_port                      = 6379
  description                  = "Redis TLS from Fargate"
}
resource "aws_vpc_security_group_egress_rule" "redis" {
  security_group_id            = var.application_sg_id
  referenced_security_group_id = aws_security_group.redis.id
  ip_protocol                  = "tcp"
  from_port                    = 6379
  to_port                      = 6379
  description                  = "Fargate to Redis TLS"
}
resource "aws_elasticache_subnet_group" "this" {
  name       = var.name
  subnet_ids = var.subnet_ids
}
resource "aws_elasticache_replication_group" "this" {
  replication_group_id       = var.name
  description                = "Redis cache, rate limits and Streams; not a durable Kafka replacement"
  engine                     = "redis"
  engine_version             = "7.1"
  node_type                  = "cache.t4g.small"
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled           = true
  subnet_group_name          = aws_elasticache_subnet_group.this.name
  security_group_ids         = [aws_security_group.redis.id]
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  transit_encryption_mode    = "required"
  kms_key_id                 = var.kms_key_arn
  auth_token                 = var.auth_token
  auth_token_update_strategy = "SET"
  snapshot_retention_limit   = 7
  snapshot_window            = "04:00-05:00"
  maintenance_window         = "sun:06:00-sun:07:00"
  auto_minor_version_upgrade = true
}
