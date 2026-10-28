output "kms_key_arn" {
  description = "Runtime encryption key."
  value       = aws_kms_key.runtime.arn
}
output "arns" {
  description = "Empty secret entry ARNs; values are not managed."
  value = {
    for name, secret in aws_secretsmanager_secret.runtime : name => secret.arn
  }
}
