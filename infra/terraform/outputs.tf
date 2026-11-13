output "ecr_repository_url" {
  description = "ECR URL for pushing container images"
  value       = aws_ecr_repository.api.repository_url
}

output "github_oidc_role_arn" {
  description = "IAM Role ARN to configure in GitHub Actions AWS_ROLE_ARN secret/variable"
  value       = aws_iam_role.github_deploy.arn
}

output "ecs_cluster_name" {
  description = "ECS Cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS Service name"
  value       = aws_ecs_service.api.name
}
