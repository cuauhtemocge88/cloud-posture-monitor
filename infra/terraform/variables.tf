variable "aws_region" {
  description = "AWS region for infrastructure deployment"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Base name for all AWS resources"
  type        = string
  default     = "cloud-posture-monitor"
}

variable "environment" {
  description = "Target deployment environment (dev or prod)"
  type        = string
  default     = "dev"
}

variable "github_repo" {
  description = "GitHub repository in owner/repo format allowed to assume the OIDC deploy role"
  type        = string
  default     = "cuauhtemocge88/cloud-posture-monitor"
}

variable "image_tag" {
  description = "Container image tag deployed to ECS Fargate"
  type        = string
  default     = "latest"
}
