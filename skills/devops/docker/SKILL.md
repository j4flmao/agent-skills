---
name: devops-docker
description: >
  Trigger: "Docker", "container", "docker run", "docker compose", "Dockerfile",
  "containerize", "docker build", "docker network", "docker volume", "registry",
  "docker swarm", "container runtime", "OCI", "container security".
  Covers: Docker Engine, Docker Compose, multi-stage builds, registries, networking,
  volumes, security, CI/CD integration, Swarm orchestration, image optimization.
  Do NOT use for: Kubernetes (use kubernetes-patterns), CI pipeline design (use cicd-pipeline).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  cli: true
  core: true
  editor: true
  api: true
tags: [devops, docker, containers, phase-5]
---

# Docker

## Purpose
Build, ship, and run containerized applications using Docker Engine, Compose, and ecosystem tools with security, optimization, and production-grade patterns.

## Agent Protocol

### Trigger
Any user message referencing Docker, containerization, Dockerfiles, Compose, registries, container networking, or image building.

### Input Context
- Application stack (language, runtime, dependencies).
- Build requirements (multi-stage needs, base image choice).
- Deployment target (single host, Swarm, K8s, cloud run).
- Security requirements (non-root, image scanning, secrets).
- Registry destination (Docker Hub, ECR, GCR, ACR, private).

### Output Artifact
Dockerfile, .dockerignore, docker-compose.yml, registry config, CI integration.

### Response Format
Dockerfile, YAML, CLI commands. No preamble. No postamble.

### Completion Criteria
- Dockerfile with multi-stage build and non-root user
- .dockerignore configured
- docker-compose.yml for dev and production profiles
- Image pushed to registry with tags
- Health check configured
- Resource limits set

## Core Concepts

### Container Lifecycle
```
Dockerfile -> docker build -> image -> docker push -> registry
                                                         |
                                                    docker pull
                                                         |
                                                    docker run -> container (running)
                                                         |
                                                    docker stop -> container (stopped)
                                                         |
                                                    docker rm -> container (removed)
```

### Image Layers
Each Dockerfile instruction creates a layer. Layers are cached and reused. Order matters: copy dependency files first (rarely changes), source code last (frequently changes). Each layer is an immutable diff. Layers are shared across images — base images are downloaded once.

### Container vs Image
- Image: read-only template with layers, metadata, and CMD/ENTRYPOINT.
- Container: writable ephemeral instance of an image with its own filesystem, network, and process namespace.

## Architecture / Decision Trees

### Base Image Selection

| Base Image | Size | Security | Use Case |
|---|---|---|---|
| alpine | ~5MB | Small surface, musl libc | Minimal runtime, Go/static binaries |
| slim (debian) | ~80MB | Reduced surface, glibc | Node, Python, Ruby |
| distroless | ~15MB | Minimal, no shell, no pkg mgr | Production, security-hardened |
| ubuntu/debian | ~200MB | Full surface | Development, complex deps |
| scratch | 0MB | Empty image | Static Go binaries |
| windows | ~5GB | Large surface | Windows containers |

### Build Strategy Decision Tree
- Static binary (Go, Rust): scratch or distroless (smallest, most secure)
- Interpreted (Node, Python, Ruby): slim or distroless (balance size/convenience)
- Compile-to-binary (Java, .NET): multi-stage with JDK builder -> JRE/distroless runner
- System dependencies needed: alpine with apk or slim with apt
- Development: full image with dev tools, mounted source code

### Runtime Selection

| Runtime | Description | Best For |
|---|---|---|
| Docker Engine | Single host, full features | Dev, test, single-node prod |
| Docker Compose | Multi-container on single host | Dev environments, small deployments |
| Docker Swarm | Built-in orchestration, simple | Small/medium production, simple scheduling |
| Kubernetes | Full orchestration, complex | Large-scale, HA, complex scheduling |

### Registry Decision

| Registry | Features | Best For |
|---|---|---|
| Docker Hub | Public/private, automated builds | Open source, small teams |
| GitHub Container Registry | Integrated with GH packages, free for public | GitHub-centric workflows |
| Amazon ECR | IAM integration, image scanning | AWS deployments |
| Google Artifact Registry | Cloud Build integration, vulnerability scanning | GCP deployments |
| Azure Container Registry | ACR tasks, Helm repo | Azure deployments |
| Self-hosted (Harbor) | Air-gapped, compliance, RBAC, replication | Regulated industries, on-prem |

## Core Workflow

### Step 1: Optimized Multi-Stage Dockerfile
```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build && npm prune --production

# Stage 2: Production
FROM node:22-alpine AS runner
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER appuser
EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

### Step 2: .dockerignore
```
node_modules
.git
.gitignore
.env
.env.*
*.md
Dockerfile
.dockerignore
.gitlab-ci.yml
.github
dist
.cache
coverage
test-results
*.log
npm-debug.log*
.vscode
.idea
```

### Step 3: Docker Compose with Profiles
```yaml
services:
  app:
    build:
      context: .
      target: runner
      args:
        NODE_ENV: ${NODE_ENV:-production}
    image: myapp:${TAG:-latest}
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - DATABASE_URL=postgres://user:pass@db:5432/app
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: ${DB_PASSWORD:?error}
      POSTGRES_DB: app
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d app"]
      interval: 5s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 1G
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 256M

volumes:
  pgdata:
  redisdata:
```

### Step 4: Development Docker Compose Profile
```yaml
# docker-compose.override.yml
services:
  app:
    build:
      target: builder
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev
```

### Step 5: CI/CD Build and Push
```yaml
# .github/workflows/docker.yml
name: Build and Push Docker Image
on:
  push:
    branches: [main]
    tags: ['v*.*.*']
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,format=long
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Step 6: Networks and Communication
```yaml
services:
  app:
    networks:
      - frontend
      - backend
  db:
    networks:
      - backend
  redis:
    networks:
      - backend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access
```

### Step 7: Secrets Management
```yaml
services:
  app:
    secrets:
      - db_password
      - api_key

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    environment: API_KEY
```

### Step 8: Docker Swarm Stack
```yaml
version: '3.8'
services:
  app:
    image: myapp:latest
    ports:
      - target: 3000
        published: 3000
    deploy:
      mode: replicated
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
      rollback_config:
        parallelism: 0
        order: stop-first
      restart_policy:
        condition: any
        delay: 5s
        max_attempts: 3
      placement:
        constraints:
          - node.role == worker
          - node.labels.zone == app
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 15s
      timeout: 3s
      retries: 3
      start_period: 40s
    secrets:
      - db_password
    networks:
      - overlay-net

secrets:
  db_password:
    external: true

networks:
  overlay-net:
    driver: overlay
    attachable: true
```

## Tool Comparison

### Docker vs Alternatives

| Feature | Docker | Podman | containerd | nerdctl |
|---|---|---|---|---|
| Daemon | Docker Engine | Daemonless (rootless) | Via CRI | Via containerd |
| Rootless | Experimental | Native | Via K8s | Via containerd |
| K8s CRI | Via cri-dockerd | Via CRI-O | Native CRI | Native CRI |
| Compose | docker compose | podman-compose | -- | nerdctl compose |
| Build | BuildKit | Buildah | Via nerdctl | BuildKit |
| Swarm | Built-in | -- | -- | -- |
| macOS/Windows | Docker Desktop | Podman Machine | -- | -- |
| Systemd integration | Manual | Native socket activation | Native | Native |

### Image Build Tools

| Tool | Description | Build Strategy |
|---|---|---|
| docker build | Standard, BuildKit mode | Layer caching, inline cache |
| docker buildx | Multi-arch, multiple builders | QEMU emulation, cross-compile |
| kaniko | Rootless, in-cluster builds | No daemon needed, K8s native |
| buildah | Daemonless OCI builds | Rootless, scriptable |
| packer | VM + Docker images | HashiCorp ecosystem |

## Anti-Patterns

### Anti-Pattern 1: Running as Root
Running containers as root creates a privilege escalation path. If the container is compromised, the attacker gains root access to the host kernel namespace. Always create and use a non-root user. Distroless images run as non-root by default.

### Anti-Pattern 2: Fat Images with Build Tools in Production
Including compilers, package managers, and dev dependencies in production images increases attack surface by 5-10x and image size by 200-500MB. Use multi-stage builds: builder stage with full toolchain, runner stage with only runtime artifacts.

### Anti-Pattern 3: Ignoring Layer Caching
Copying source code before dependency files invalidates the cache on every code change, forcing dependency reinstallation every build. Copy dependency manifests first (`package*.json`, `go.mod`, `Cargo.toml`), install dependencies, then copy source code.

### Anti-Pattern 4: Using `latest` Tag
The `latest` tag is ambiguous and mutable. It could refer to different images at different times, making rollback impossible. Always tag with semantic version, git SHA, or timestamp. Use `latest` only as an additional convenience tag alongside specific tags.

### Anti-Pattern 5: No Health Checks
Without health checks, Docker has no way to know if your application is actually running and responsive. The container appears "up" even if the process is hung or unhealthy. Always configure HEALTHCHECK with appropriate interval, timeout, and start period.

### Anti-Pattern 6: Storing Secrets in Images
Secrets baked into images persist in every layer, visible to anyone with image pull access. Registry security doesn't help if the image is shared or published. Use Docker secrets (Swarm), build args (non-persistent), or external secret stores.

### Anti-Pattern 7: Single Network for All Services
Using the default bridge network for all services means every container can communicate with every other container, violating least-privilege networking. Use multiple networks: frontend (app + LB) and backend (app + DB). Make backend networks internal.

### Anti-Pattern 8: Overly Large Context
When no .dockerignore exists or it's too permissive, the entire project directory (including node_modules, .git, build artifacts) is sent to the Docker daemon. This causes slow builds and cache misses. Always include a strict .dockerignore.

### Anti-Pattern 9: Pinning No Version or `:latest`
Using `FROM node:latest` means builds are non-reproducible. A new Node major version could break your application. Always pin to a specific minor version tag (`node:22.3-alpine`). Use automated update tools (Renovate, Dependabot) to manage updates.

### Anti-Pattern 10: Ignoring Resource Limits
Without `--memory` and `--cpus` limits, a single container can consume all host resources, starving other containers or the host OS. Always set resource limits and reservations. Use Docker Compose `deploy.resources` or `docker run --memory --cpus`.

## Production Considerations

### Security Hardening
- Use distroless or scratch base images for production
- Run as non-root user (USER directive)
- Enable Content Trust (Docker Content Trust / Notary)
- Scan images for vulnerabilities (Trivy, Snyk, Grype)
- Sign images with cosign before push
- Use read-only root filesystem (`--read-only`)
- Drop all capabilities, add only needed ones (`--cap-drop=ALL --cap-add=NET_BIND_SERVICE`)
- Enable seccomp and AppArmor profiles
- Use user namespaces (`--userns-remap`)
- Never store secrets in images (build args are not persisted in final image)

### Logging and Monitoring
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```
- Use structured logging (JSON format)
- Configure log rotation to prevent disk full
- Use docker logs or logging drivers (syslog, Splunk, fluentd, AWS CloudWatch)
- Monitor container metrics: CPU, memory, disk I/O, network
- Set up Docker event monitoring (docker events -> webhook)

### Resource Management
```bash
docker run -d \
  --memory="512M" \
  --memory-reservation="256M" \
  --memory-swap="1G" \
  --cpus="1.5" \
  --cpuset-cpus="0-1" \
  --pids-limit="100" \
  --restart=unless-stopped \
  myapp:1.2.3
```

### Docker Daemon Security
- Configure TLS for Docker daemon remote access
- Use socket proxy for access control (docker-socket-proxy)
- Enable live-restore (containers survive daemon restart)
- Set storage driver to overlay2 (modern, performant)
- Configure registry mirrors for rate-limit avoidance
- Enable user namespace remapping

## Troubleshooting

### Container Won't Start
1. `docker logs <container>` — check application logs
2. `docker inspect <container>` — check exit code, error state
3. `docker run -it <image> sh` — override entrypoint for debugging
4. Check resource limits: `docker stats <container>`
5. Check port conflicts: `netstat -tulpn | grep <port>`
6. Check volume mounts: `docker inspect --format='{{json .Mounts}}' <container>`

### Image Build Fails
1. `docker build --no-cache .` — fresh build bypasses cache
2. `docker build --progress=plain .` — verbose build output
3. Check Dockerfile syntax (each instruction must be valid)
4. Check network access (registry, package repositories)
5. Check disk space: `docker system df`
6. Try smaller base image if memory limited during build

### Networking Issues
1. `docker network ls` — list networks
2. `docker network inspect <network>` — check connected containers
3. `docker exec <container> ping <other-container>` — test connectivity
4. Check DNS: `docker exec <container> cat /etc/resolv.conf`
5. Check iptables rules: `iptables -L -n`
6. Verify port mapping: `docker port <container>`

### Performance Issues
1. `docker stats` — live resource usage per container
2. Check disk I/O: `docker run --rm alpine sh -c "time dd if=/dev/zero of=/tmp/test bs=1M count=1000"`
3. Check network throughput between containers
4. Verify storage driver is overlay2: `docker info | grep Storage`
5. Check for log file growth: `ls -lah /var/lib/docker/containers/*/*-json.log`

### Disk Space Issues
```bash
docker system df                    # Show disk usage
docker system prune -a --volumes    # Remove all unused
docker image prune -a               # Remove unused images
docker container prune              # Remove stopped containers
docker volume prune                 # Remove unused volumes
ls -lah /var/lib/docker/containers/*/*-json.log  # Check log files
```

## Rules
- Always use multi-stage builds for production images
- Never run containers as root — create and use non-root user
- Always include .dockerignore with strict patterns
- Pin base image versions — never use `:latest`
- Configure HEALTHCHECK on every service
- Set resource limits (memory, CPU) on every container
- Use .env files for environment-specific variables
- Never store secrets in images or environment variables in Dockerfile
- Use specific network topologies — never default bridge for multi-service apps
- Tag images with semantic version + git SHA — never just `latest`
- Scan images for vulnerabilities before pushing to production
- Use read-only root filesystem for production containers
- Drop unnecessary capabilities (`--cap-drop=ALL`)
- Configure log rotation to prevent disk exhaustion
- Use Docker Content Trust for image signing in production
- Enable live-restore for production Docker daemons
- Use explicit restart policies (`unless-stopped` or `always`)
- Never use `docker exec` for production changes — rebuild and redeploy
- Use Docker Compose with profiles for dev/prod separation
- Pin base image digests in production for supply chain security

## References
- references/docker-fundamentals.md — Docker Fundamentals
- references/docker-advanced.md — Docker Advanced Topics
- references/compose-networking.md — Compose and Networking
- references/security-best-practices.md — Security Best Practices

## Handoff
Hand off to docker for containerization. Hand off to kubernetes-patterns if orchestration is needed. Hand off to cicd-pipeline for CI/CD integration.
