output "address" {
  description = "Private database hostname."
  value       = aws_db_instance.this.address
}
output "identifier" {
  description = "Database identifier."
  value       = aws_db_instance.this.identifier
}
output "master_secret_arn" {
  description = "AWS-managed administrator credential ARN; not granted to tasks."
  value       = aws_db_instance.this.master_user_secret[0].secret_arn
}
