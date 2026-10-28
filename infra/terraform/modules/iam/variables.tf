variable "name" {
  type        = string
  description = "Name."

}
variable "secret_arns" {
  type        = list(string)
  description = "Secret arns."

}
variable "kms_key_arn" {
  type        = string
  description = "Kms key arn."

}
variable "ecr_repository_arn" {
  type        = string
  description = "Ecr repository arn."

}
variable "log_group_arns" {
  type        = list(string)
  description = "Log group arns."

}

variable "account_id" {
  type        = string
  description = "Account owning the service role; constrains service trust."
}

variable "region" {
  type        = string
  description = "Region owning ECS tasks and Secrets Manager."
}
