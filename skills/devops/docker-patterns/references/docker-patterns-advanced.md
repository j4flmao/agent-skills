# Docker Patterns Advanced Topics

## Introduction
Advanced Docker patterns cover slim CI patterns for multi-stage builds, production-grade Compose, Kubernetes migration patterns, and advanced image optimization techniques.

## Advanced Multi-Stage Builds
Conditional stages with build args for env-specific builds. Multi-architecture stages for amd64/arm64. Caching with buildx --cache-from and --cache-to. Inline cache in registry for distributed builds. Separate dev, test, and production stages. Distroless base images for production Go, Java, Python, and Node.

## Production-Grade Docker Compose
Deploy section with resource limits, restart policies, health checks. Multiple compose files (docker-compose.yml + docker-compose.prod.yml). Environment-specific overrides with --env-file and profiles. Logging configuration with max-size, max-file, and log driver. Secrets management with Docker secrets or bind mounts. Init containers for database migration and setup. DNS configuration and network aliases.

## Migration from Docker Compose to Kubernetes
Kubernetes resources: Deployment, Service, Ingress, ConfigMap, Secret. Use kompose or compose-on-kubernetes for migration. Helm charts for parameterized deployments. Differences: networking model, service discovery, storage, scaling. Gradual migration: move simplest services first.

## Advanced Image Optimization
Image size minimization: multi-stage, distroless, scratch. Dependency pruning: npm prune --production, pip install --no-cache-dir. SBOM generation in Dockerfile. Layer squashing (--squash, experimental). BuildKit features: --link copy, cache mounts, SSH mounts. SlimToolkit: automatically analyze and minimize images. Distroless base images from Google.

## Init Containers and Sidecars
Database migration init container runs before app starts. Sidecar pattern: logging, metrics, proxy, sync containers. Init containers run to completion before app container starts. Shared volumes between init, sidecar, and main containers. Resource allocation for sidecars alongside main.

## Docker Compose Profiles
Profile-based service selection: docker compose --profile dev up. Define profiles per environment or feature set. Avoid monolithic compose files with conditional includes. Development profile: source mounts, dev tools, mock services. Production profile: optimized images, resource limits, health checks.

## References
- docker-patterns-fundamentals.md -- Fundamentals
- dockerfile-guide.md -- Dockerfile Best Practices
- docker-compose-production.md -- Compose in Production
- image-optimization.md -- Image Optimization
- container-security.md -- Container Security
