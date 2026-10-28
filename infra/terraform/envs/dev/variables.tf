variable "name" {
  type        = string
  description = "Name."
  default     = "shortener-design"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,19}$", var.name))
    error_message = "Use 3-20 lowercase letters/digits/hyphens, starting with a letter."
  }
}
variable "region" {
  type        = string
  description = "Region."
  default     = "us-east-1"
}
variable "account_id" {
  type        = string
  description = "Account id."
  default     = "000000000000"
  validation {
    condition     = can(regex("^[0-9]{12}$", var.account_id))
    error_message = "AWS account ID must contain 12 digits."
  }
}
variable "availability_zones" {
  type        = list(string)
  description = "Availability zones."
  default     = ["us-east-1a", "us-east-1b"]
  validation {
    condition     = length(var.availability_zones) == 2 && length(toset(var.availability_zones)) == 2
    error_message = "Provide exactly two distinct availability zones in the chosen region."
  }
}
variable "vpc_cidr" {
  type        = string
  description = "Vpc cidr."
  default     = "10.42.0.0/16"
}
variable "enable_nat_gateway" {
  type        = bool
  description = "COSTLY single NAT; false uses paid interface endpoints without general Internet egress."
  default     = false
}
variable "allow_paid_deployment" {
  type        = bool
  description = "Explicit manual opt-in; keep false for this validation-only design."
  default     = false
}
variable "image_digest" {
  type        = string
  description = "Image digest."
  default     = "sha256:0000000000000000000000000000000000000000000000000000000000000000"
  validation {
    condition     = can(regex("^sha256:[0-9a-f]{64}$", var.image_digest))
    error_message = "Provide an immutable sha256 image digest."
  }
}
variable "certificate_arn" {
  type        = string
  description = "Existing ACM certificate in the ALB region; placeholder is not deployable."
  default     = "arn:aws:acm:us-east-1:000000000000:certificate/00000000-0000-0000-0000-000000000000"
}
variable "frontend_origin" {
  type        = string
  description = "Frontend origin."
  default     = "https://shortener.example.com"
}
variable "redis_auth_token" {
  type        = string
  description = "Required only for a separately authorized deployment; sensitive but stored in Terraform state with provider auth_token. Never commit a value."
  sensitive   = true
  validation {
    condition     = length(var.redis_auth_token) >= 16 && length(var.redis_auth_token) <= 128 && can(regex("^[a-zA-Z0-9!&#$^<>-]+$", var.redis_auth_token))
    error_message = "Use a 16-128 character ElastiCache-compatible token."
  }
}
variable "alarm_actions" {
  type        = list(string)
  description = "Existing SNS notification topic ARNs; no delivery when empty."
  default     = []
}

variable "start_services" {
  type        = bool
  description = "Keep false until secret values, schema migrations and application database role are ready."
  default     = false
}
