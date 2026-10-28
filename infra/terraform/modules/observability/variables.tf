variable "name" {
  type        = string
  description = "Name."

}
variable "alb_arn_suffix" {
  type        = string
  description = "Alb arn suffix."

}
variable "cluster_name" {
  type        = string
  description = "Cluster name."

}
variable "service_names" {
  type        = map(string)
  description = "Service names."

}
variable "alarm_actions" {
  type        = list(string)
  description = "Existing operator-owned SNS topic ARNs; empty means alarms have no notification delivery."
  default     = []
}
