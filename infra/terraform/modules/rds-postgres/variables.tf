variable "name" {
  type        = string
  description = "Name."

}
variable "vpc_id" {
  type        = string
  description = "Vpc id."

}
variable "subnet_ids" {
  type        = list(string)
  description = "Subnet ids."

}
variable "application_sg_id" {
  type        = string
  description = "Application sg id."

}
variable "kms_key_arn" {
  type        = string
  description = "Kms key arn."

}
