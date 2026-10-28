variable "name" {
  type        = string
  description = "Name."

}
variable "cluster_arn" {
  type        = string
  description = "Cluster arn."

}
variable "cluster_name" {
  type        = string
  description = "Cluster name."

}
variable "image" {
  type        = string
  description = "Image."

}
variable "command" {
  type        = list(string)
  description = "Command."

}
variable "subnet_ids" {
  type        = list(string)
  description = "Subnet ids."

}
variable "security_group_id" {
  type        = string
  description = "Security group id."

}
variable "execution_role_arn" {
  type        = string
  description = "Execution role arn."

}
variable "task_role_arn" {
  type        = string
  description = "Task role arn."

}
variable "kms_key_arn" {
  type        = string
  description = "Kms key arn."

}
variable "region" {
  type        = string
  description = "Region."

}
variable "environment" {
  type        = map(string)
  description = "Environment."

}
variable "secret_arns" {
  type        = map(string)
  description = "Secret arns."

}
variable "target_group_arn" {
  type        = string
  description = "Target group arn."
  default     = null
}
variable "is_api" {
  type        = bool
  description = "Is api."
  default     = false
}

variable "start_services" {
  type        = bool
  description = "Keep false until secret values, schema migrations and application database role are ready."
  default     = false
}
