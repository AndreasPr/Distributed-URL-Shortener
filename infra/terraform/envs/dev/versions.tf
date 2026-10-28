terraform {
  required_version = ">= 1.5.7, < 2.0.0"
  required_providers {
    aws = {
      source = "hashicorp/aws", version = "6.70.0"
    }
  }
  # Local state only for this un-applied design. Do not uncomment without review.
  # backend "s3" {
  #   bucket = "REPLACE-reviewed-private-state-bucket"
  #   key = "shortener/dev/terraform.tfstate"
  #   region = "us-east-1"
  #   encrypt = true
  #   dynamodb_table = "REPLACE-state-lock-table"
  # }
}
provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project = var.name, Environment = "design-dev", ManagedBy = "Terraform"
    }
  }
}
