output "vpc_id" {
  description = "VPC identifier."
  value       = aws_vpc.this.id
}
output "public_subnet_ids" {
  description = "Two public subnets."
  value       = aws_subnet.public[*].id
}
output "private_subnet_ids" {
  description = "Two private subnets."
  value       = aws_subnet.private[*].id
}
output "application_sg_id" {
  description = "Shared task security group."
  value       = aws_security_group.application.id
}

output "public_subnet_cidrs" {
  description = "Only these ALB subnet peers are trusted for forwarded client addresses."
  value       = aws_subnet.public[*].cidr_block
}
