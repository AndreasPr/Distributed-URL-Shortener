resource "aws_security_group" "database" {
  name_prefix = "${var.name}-postgres-"
  description = "PostgreSQL reachable only from application tasks"
  vpc_id      = var.vpc_id
}
resource "aws_vpc_security_group_ingress_rule" "database" {
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = var.application_sg_id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  description                  = "PostgreSQL from Fargate"
}
resource "aws_vpc_security_group_egress_rule" "database" {
  security_group_id            = var.application_sg_id
  referenced_security_group_id = aws_security_group.database.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  description                  = "Fargate to PostgreSQL"
}
resource "aws_db_subnet_group" "this" {
  name       = var.name
  subnet_ids = var.subnet_ids
}
resource "aws_db_parameter_group" "this" {
  name_prefix = "${var.name}-"
  family      = "postgres16"
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
  parameter {
    name  = "log_connections"
    value = "1"
  }
}
resource "aws_db_instance" "this" {
  #checkov:skip=CKV_AWS_118:Enhanced Monitoring adds per-instance monitoring cost; Standard RDS CloudWatch metrics and database logs remain available in this dev design.
  identifier                            = var.name
  engine                                = "postgres"
  engine_version                        = "16"
  instance_class                        = "db.t4g.micro"
  allocated_storage                     = 20
  max_allocated_storage                 = 100
  storage_type                          = "gp3"
  storage_encrypted                     = true
  kms_key_id                            = var.kms_key_arn
  db_name                               = "url_db"
  username                              = "shortener_admin"
  manage_master_user_password           = true
  master_user_secret_kms_key_id         = var.kms_key_arn
  db_subnet_group_name                  = aws_db_subnet_group.this.name
  parameter_group_name                  = aws_db_parameter_group.this.name
  vpc_security_group_ids                = [aws_security_group.database.id]
  publicly_accessible                   = false
  multi_az                              = true
  backup_retention_period               = 7
  backup_window                         = "03:00-04:00"
  maintenance_window                    = "sun:05:00-sun:06:00"
  auto_minor_version_upgrade            = true
  deletion_protection                   = true
  skip_final_snapshot                   = false
  final_snapshot_identifier             = "${var.name}-final"
  copy_tags_to_snapshot                 = true
  enabled_cloudwatch_logs_exports       = ["postgresql", "upgrade"]
  iam_database_authentication_enabled   = true
  performance_insights_enabled          = true
  performance_insights_kms_key_id       = var.kms_key_arn
  performance_insights_retention_period = 7
}
