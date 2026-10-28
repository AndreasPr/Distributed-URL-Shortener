resource "aws_kms_key" "runtime" {
  description             = "Runtime secrets and log encryption"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  policy = jsonencode({
    Version = "2012-10-17", Statement = [
      {
        Sid = "AccountAdministration", Effect = "Allow", Principal = {
          AWS     = "arn:aws:iam::${var.account_id}:root"
        }, Action = "kms:*", Resource = "*"
      },
      {
        Sid = "EncryptedLogs", Effect = "Allow", Principal = {
          Service = "logs.${var.region}.amazonaws.com"
          }, Action = ["kms:Encrypt", "kms:Decrypt", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:DescribeKey"], Resource = "*", Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:aws:logs:${var.region}:${var.account_id}:log-group:/${var.name}*"
          }
        }
      }
    ]
  })
}
resource "aws_secretsmanager_secret" "runtime" {
  #checkov:skip=CKV2_AWS_57:Empty design-only entries have no rotation target; provision application-role credentials and a rotation Lambda before deployment. Never store secret values in Terraform.
  for_each                = toset(["db-url", "redis-url"])
  name                    = "${var.name}/${each.key}"
  description             = "Operator-populated ${each.key}; no secret version is managed by Terraform"
  kms_key_id              = aws_kms_key.runtime.arn
  recovery_window_in_days = 30
}
