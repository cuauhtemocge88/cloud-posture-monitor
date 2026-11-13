terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }

  # Para produccion o equipos: configurar backend remoto en S3 + bloqueo nativo/DynamoDB.
  # backend "s3" {
  #   bucket       = "cuauhtemoc-tf-state-<tu-id>"
  #   key          = "cloud-posture-monitor/dev/terraform.tfstate"
  #   region       = "us-east-1"
  #   encrypt      = true
  #   use_lockfile = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
