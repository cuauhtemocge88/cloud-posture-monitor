# Cloud Posture Monitor (DevOps / DevSecOps Lab)

API ligera en Node.js + PostgreSQL diseñada para practicar y demostrar el stack estándar de DevOps/Cloud:
**Docker -> GitHub Actions (CI + Trivy + Gitleaks) -> Kubernetes (`kind` / NetworkPolicy / CronJob) -> Terraform + AWS (OIDC)**.

## Arquitectura

```mermaid
flowchart LR
    Dev[Git Push / PR] --> GHA[GitHub Actions CI/CD]
    GHA --> Tests[Unit Tests + Gitleaks]
    Tests --> Build[Docker Multi-Stage + Trivy]
    Build --> Reg[GHCR / AWS ECR]
    Reg --> K8s[Kubernetes Deployment + CronJob]
    K8s --> API[cloud-posture-monitor :8080]
    API --> DB[(PostgreSQL)]
    Prom[Prometheus] -->|/metrics| API
```

## Estructura del proyecto

```text
cloud-posture-monitor/
├── app/                                  # API Node.js + Express + PostgreSQL + Prometheus
│   ├── src/
│   │   ├── app.js                        # Endpoints, cabeceras defensivas y métricas
│   │   ├── db.js                         # Pool PostgreSQL e inicialización de tablas
│   │   ├── scanner.js                    # Validación anti-SSRF y escaneo de headers HTTP
│   │   └── server.js                     # Arranque y graceful shutdown (SIGTERM/SIGINT)
│   ├── test/app.test.js                  # Pruebas unitarias con node:test
│   ├── Dockerfile                        # Multi-stage alpine, usuario no-root (node)
│   └── .dockerignore
├── k8s/                                  # Manifiestos Kubernetes (local con kind / EKS / AKS)
│   ├── namespace.yaml
│   ├── secret.example.yaml               # Plantilla (copiar a secret.yaml local o usar kubectl)
│   ├── postgres.yaml                     # PostgreSQL + readinessProbe
│   ├── api.yaml                          # 2 réplicas, probes /healthz y /readyz, readOnlyRootFilesystem
│   ├── cronjob.yaml                      # Escaneo periódico automático cada 5 min
│   └── networkpolicy.yaml                # Aislamiento Zero-Trust hacia PostgreSQL
├── infra/terraform/                      # IaC en AWS (VPC sin NAT, ECR, OIDC, ECS Fargate)
│   ├── providers.tf
│   ├── variables.tf
│   ├── main.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
├── .github/workflows/
│   ├── ci.yml                            # Tests + Gitleaks + Docker Build + Trivy + GHCR
│   └── terraform-validate.yml            # terraform fmt/validate + Trivy IaC config scan
└── docker-compose.yml                    # Stack local completo (API + PostgreSQL)
```

## Endpoints principales

* `GET /healthz`: Liveness probe para Kubernetes.
* `GET /readyz`: Readiness probe (verifica conectividad real contra PostgreSQL).
* `GET /metrics`: Métricas en formato Prometheus (`http_requests_total`, `posture_scans_total`).
* `POST /api/targets` & `GET /api/targets`: Registro y listado de URLs a monitorear (bloquea hosts privados por defecto).
* `POST /api/scan`: Evalúa disponibilidad, latencia y cabeceras defensivas (`HSTS`, `CSP`, `X-Content-Type-Options`, `X-Frame-Options`).
* `GET /api/posture`: Resumen consolidado del último escaneo por objetivo.

## Ejecución local

### Opción A: Solo Node.js (modo en memoria)
```bash
cd app
npm install
npm test
npm start
```

### Opción B: Contenedor completo (API + PostgreSQL)
```bash
docker compose up --build
```

Probar endpoints:
```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/readyz
curl -X POST http://localhost:8080/api/targets -H "Content-Type: application/json" -d '{"name":"Example","url":"https://example.com"}'
curl -X POST http://localhost:8080/api/scan
curl http://localhost:8080/api/posture
```

## Despliegue local en Kubernetes (`kind`)

```bash
kind create cluster --name posture-lab
docker build -t cloud-posture-monitor:local ./app
kind load docker-image cloud-posture-monitor:local --name posture-lab

kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.example.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/cronjob.yaml
kubectl apply -f k8s/networkpolicy.yaml

kubectl -n posture-monitor port-forward svc/posture-api 8080:8080
```

## Validación de Terraform (sin gastar en AWS aún)

```bash
cd infra/terraform
terraform fmt -check
terraform init -backend=false
terraform validate
```
