locals {
  trust = jsonencode({
    Version = "2012-10-17", Statement = [{
      Effect = "Allow", Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }, Action = "sts:AssumeRole", Condition = { StringEquals = { "aws:SourceAccount" = var.account_id }, ArnLike = { "aws:SourceArn" = "arn:aws:ecs:${var.region}:${var.account_id}:*" } }
    }]
  })
}
resource "aws_iam_role" "execution" {
  name               = "${var.name}-execution"
  assume_role_policy = local.trust
}
resource "aws_iam_role" "task" {
  name               = "${var.name}-task"
  assume_role_policy = local.trust
  # No attached policy: application uses PostgreSQL/Redis, not AWS SDK APIs.
}
resource "aws_iam_role_policy" "execution" {
  role = aws_iam_role.execution.id
  policy = jsonencode({
    Version = "2012-10-17", Statement = [
      {
        Effect = "Allow", Action = ["ecr:GetAuthorizationToken"], Resource = "*"
      },
      {
        Effect = "Allow", Action = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"], Resource = var.ecr_repository_arn
      },
      {
        Effect = "Allow", Action = ["logs:CreateLogStream", "logs:PutLogEvents"], Resource = [for arn in var.log_group_arns : "${arn}:*"]
      },
      {
        Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = var.secret_arns
      },
      {
        Effect = "Allow", Action = ["kms:Decrypt"], Resource = var.kms_key_arn, Condition = {
          StringLike = {
            "kms:ViaService" = "secretsmanager.${var.region}.amazonaws.com"
          }
        }
      }
    ]
  })
}
