---
name: docker-patterns
description: >
  Use this skill when the user says 'Dockerfile', 'Docker', 'Docker Compose',
  'containerize', 'container', 'docker build', 'multi-stage build',
  'docker-compose.yml', or when containerizing an application. Covers: multi-stage
  builds, non-root users, .dockerignore, layer caching, health checks, Docker
  Compose for development, and production vs development separation. Works with
  any language/stack. Do NOT use this for: Kubernetes (use kubernetes-patterns),
  CI/CD pipeline design, or infrastructure provisioning.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, docker, phase-5]
---

# Docker Patterns

## Purpose
Containerize applications following Docker best practices for development and production.

## Agent Protocol

### Trigger
Exact user phrases: "Dockerfile", "Docker", "Docker Compose", "containerize", "container", "docker build", "multi-stage build", "docker-compose.yml".

### Input Context
- Application stack (for base image selection).
- Build tooling (for layer caching strategy).
- Deployment target (for production vs dev separation).
- Language-specific build requirements (compilers, system deps).

### Output Artifact
Writes to Dockerfile, .dockerignore, and/or docker-compose.yml.

### Response Format
Dockerfile or docker-compose.yml with comments explaining each section.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- Multi-stage build is implemented (builder + runner).
- Non-root user is configured.
- .dockerignore exists.
- Layer caching is optimized (dependency files copied first).
- Health check is configured.
- Production vs development separation is handled.

## Architecture / Decision Trees

### Base Image Selection

| Base Image | Size | Security Surface | Use Case |
|---|---|---|---|
| alpine | ~5MB | Minimal (musl libc) | Go, Rust, static binaries |
| slim (debian) | ~80MB | Reduced (glibc) | Node, Python, Ruby |
| distroless | ~15MB | Minimal (no shell) | Production, security-hardened |
| ubuntu/debian | ~200MB | Full (apt, tools) | Development, complex deps |
| scratch | 0MB | Empty | Static Go binaries |
| windows | ~5GB | Large | Windows containers |

### Build Strategy Decision Tree
- Static binary (Go, Rust): scratch or distroless for smallest size.
- Interpreted (Node, Python, Ruby): slim or distroless.
- Compile-to-binary (Java, .NET): multi-stage JDK builder -> JRE runner.
- System dependencies needed: alpine with apk or slim with apt.
- Development: full image with dev tools + mounted source as volume.
- Production: minimal image, no shell, no package manager.
- Security audit required: distroless (no shell, no apt)

### Docker Compose Profile Decision Tree

| Profile | Build Target | Volumes | Environment | Best For |
|---|---|---|---|---|
| development | builder | Source mount | NODE_ENV=development | Active development |
| testing | builder | Source mount | NODE_ENV=test | CI pipeline |
| staging | runner | None | NODE_ENV=staging | Pre-production validation |
| production | runner | None | NODE_ENV=production | Production deployment |

### Language-Specific Patterns

| Language | Base Image | Multi-Stage | Non-Root | Caching |
|---|---|---|---|---|
| Node.js | node:22-alpine | npm ci in builder, copy dist to runner | adduser -D nodeuser | COPY package*.json first |
| Python | python:3.12-slim | pip install in builder, copy site-packages | adduser --disabled-password | COPY requirements.txt first |
| Go | golang:1.22-alpine | go build in builder, copy binary to scratch | USER 65534 | COPY go.mod go.sum first |
| Rust | rust:1.77-slim | cargo build in builder, copy binary to distroless | USER 1000 | COPY Cargo.toml Cargo.lock first |
| Java | eclipse-temurin:21-jdk-alpine | mvn package in builder, copy jar to jre | addgroup -S appgroup | COPY pom.xml first |

## Core Workflow

### Step 1: Multi-Stage Dockerfile (Node.js)
```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build && npm prune --production

# Stage 2: Production
FROM gcr.io/distroless/nodejs22-debian12 AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER nonroot
EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode !== 200 ? 1 : 0))"]
CMD ["dist/main.js"]
```

### Step 1b: Multi-Stage Dockerfile (Go)
```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .

FROM scratch AS runner
COPY --from=builder /app/server /server
EXPOSE 8080
USER 65534
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/server", "health"]
CMD ["/server"]
```

### Step 2: Layer Caching Optimization
```dockerfile
# WRONG: Source code copied first -- cache invalidated on every change
COPY . .
RUN npm ci           # runs every time

# RIGHT: Dependency files copied first -- cached unless package.json changes
COPY package*.json ./
RUN npm ci           # cached unless package.json changes
COPY . .             # only invalidates after this line
RUN npm run build
```

### Step 3: .dockerignore
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
.vscode
.idea
```

### Step 4: Docker Compose with Profiles
```yaml
services:
  app:
    build:
      context: .
      target: runner
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
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
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

volumes:
  pgdata:
  redisdata:
```

### Step 5: Development Override
```yaml
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

### Step 6: Non-Root User Patterns
```dockerfile
# Alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Debian/Ubuntu
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

# Distroless
USER nonroot

# Go scratch -- user 65534 (nobody)
USER 65534
```

### Step 7: Health Check Patterns
```dockerfile
# HTTP health check (Node, Python, Go web servers)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# MySQL/Postgres
HEALTHCHECK --interval=5s --timeout=5s --retries=5 \
  CMD pg_isready -U user -d app || exit 1

# Redis
HEALTHCHECK --interval=5s --timeout=3s --retries=5 \
  CMD redis-cli ping || exit 1

# Custom binary
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD /app/health-check.sh || exit 1
```

## Anti-Patterns

### Anti-Pattern 1: Running as Root
Running containers as root creates a privilege escalation path from container to host kernel. Always use a non-root user.

### Anti-Pattern 2: Fat Images in Production
Including compilers, package managers, and dev dependencies in production images increases attack surface by 5-10x and image size by 200-500MB. Use multi-stage builds.

### Anti-Pattern 3: Wrong Layer Order
Copying source code before dependency files invalidates the cache on every code change, forcing dependency reinstallation every build. Copy dependency manifests first.

### Anti-Pattern 4: Using latest Tag
The latest tag is ambiguous and mutable, making rollback impossible. Always tag with semver + git SHA. Use latest only as additional convenience tag.

### Anti-Pattern 5: No Health Checks
Without health checks, Docker cannot determine if the application is responsive. The container appears up even if the process is hung. Always configure HEALTHCHECK.

### Anti-Pattern 6: Secrets in Images
Secrets baked into images persist in every layer and are visible to anyone with image pull access. Use Docker secrets (Swarm), build args (non-persistent), or external stores.

### Anti-Pattern 7: No .dockerignore
Without .dockerignore, the entire build context (including node_modules, .git) is sent to the Docker daemon, causing slow builds and cache misses.

### Anti-Pattern 8: Pinning No Version
Using FROM node:latest makes builds non-reproducible. Pin to specific version tag (node:22.3-alpine). Use Renovate/Dependabot for updates.

### Anti-Pattern 9: No Resource Limits
Without --memory and --cpus limits, a single container can consume all host resources, starving other containers. Always set limits.

## Production Considerations

### Image Optimization
- Use distroless or scratch for production images.
- Multi-stage builds to separate build and runtime.
- Minimize layers by combining RUN commands.
- Remove package manager caches (npm cache, apt lists, pip cache).
- Use --no-install-recommends for apt.
- Compress with --squash if supported (experimental).
- Export SBOM with each image build.

### Security Hardening
- Run as non-root user.
- Use read-only root filesystem (--read-only).
- Drop all capabilities, add only needed (--cap-drop=ALL --cap-add=NET_BIND_SERVICE).
- Enable seccomp and AppArmor profiles.
- Use user namespaces (--userns-remap).
- Scan images with Trivy/Grype before push.
- Sign images with cosign.
- Pin base image digests for supply chain security.

### Logging Configuration
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```
- Use structured logging (JSON format).
- Configure log rotation to prevent disk exhaustion.
- Use docker logs or logging drivers (syslog, fluentd, Splunk, CloudWatch).

### CI/CD Integration
- Build and tag images in CI (never docker build on production).
- Cache layers using GitHub Actions cache or registry cache.
- Run vulnerability scan before push.
- Sign images with cosign in CI.
- Use docker buildx for multi-architecture builds (amd64 + arm64).

## Troubleshooting

### Build Failures
1. docker build --no-cache . -- fresh build
2. docker build --progress=plain . -- verbose output
3. Check Dockerfile syntax (each instruction)
4. Check network access (registry, package repos)
5. Check disk space: docker system df

### Container Start Failures
1. docker logs <container> -- check application output
2. docker inspect <container> -- check exit code, state
3. docker run -it <image> sh -- override entrypoint for debugging
4. Check port conflicts: netstat -tulpn
5. Check volume mounts: docker inspect --format='{{json .Mounts}}'

### Runtime Issues
1. docker stats -- live resource usage
2. docker exec -it <container> sh -- interactive shell
3. Check application health endpoint
4. Verify environment variables: docker inspect --format='{{json .Config.Env}}'

## Rules
- Always use multi-stage builds for production images.
- Never run containers as root -- create and use non-root user.
- Always include .dockerignore with strict patterns.
- Pin base image versions -- never use :latest.
- Configure HEALTHCHECK on every service.
- Set resource limits (memory, CPU) on every container.
- Use .env files for environment-specific variables.
- Never store secrets in images or environment variables in Dockerfile.
- Use specific network topologies -- never default bridge for multi-service apps.
- Tag images with semantic version + git SHA.
- Scan images for vulnerabilities before pushing to production.
- Use read-only root filesystem for production containers.
- Drop unnecessary capabilities (--cap-drop=ALL).
- Configure log rotation to prevent disk exhaustion.
- Use Docker Compose with profiles for dev/prod separation.

## Compared With

### Docker Compose vs Kubernetes
Docker Compose: single host, simple networking, good for dev and small deployments. Kubernetes: multi-host, service discovery, auto-scaling, self-healing, complex. Use Compose for development and small production, K8s for large-scale production.

### Multi-stage vs Single-stage
Single-stage: simpler Dockerfile, larger image, includes build tools. Multi-stage: separates build and runtime, smaller final image, reduced attack surface. Multi-stage is always preferred for production.

### alpine vs slim vs distroless
alpine: smallest with apk, musl libc compatibility issues possible. slim: debian-based, glibc compatible, medium size. distroless: minimal, no shell or package manager, hardest to debug. Choose based on security requirements and dependency compatibility.

## References
- references/container-security.md -- Container Security
- references/docker-compose-production.md -- Docker Compose in Production
- references/docker-networking.md -- Docker Networking
- references/docker-patterns-advanced.md -- Docker Patterns Advanced Topics
- references/docker-patterns-fundamentals.md -- Docker Patterns Fundamentals
- references/dockerfile-guide.md -- Dockerfile Best Practices
- references/image-optimization.md -- Image Optimization

## Handoff
After completing this skill:
- Next skill: cicd-pipeline -- CI/CD for the containerized app
- Pass context: Dockerfile structure, multi-stage setup, Docker Compose config
