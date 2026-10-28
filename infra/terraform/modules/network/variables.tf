variable "name" {
  type        = string
  description = "Name."

}
variable "cidr" {
  type        = string
  description = "Cidr."

}
variable "availability_zones" {
  type        = list(string)
  description = "Availability zones."

}
variable "enable_nat_gateway" {
  type        = bool
  description = "Costly single NAT gateway; creates a single-AZ egress dependency."

}
variable "kms_key_arn" {
  type        = string
  description = "Kms key arn."

}
variable "region" {
  type        = string
  description = "Region."

}

variable "account_id" {
  type        = string
  description = "Account owning the service role; constrains service trust."
}
