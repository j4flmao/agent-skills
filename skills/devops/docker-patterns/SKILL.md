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
Before activating, verify:
- The application stack is known (for base image selection).
- The build tooling is known (for layer caching strategy).
- The deployment target is known (for production vs dev separation).

### Output Artifact
Writes to `Dockerfile`, `.dockerignore`, and/or `docker-compose.yml`.

### Response Format
Dockerfile or docker-compose.yml with comments explaining each section.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanation of Docker concepts.

### Completion Criteria
This skill is complete when:
- [ ] Multi-stage build is implemented (builder + runner).
- [ ] Non-root user is configured.
- [ ] `.dockerignore` exists.
- [ ] Layer caching is optimized (dependency files copied first).
- [ ] Health check is configured.
- [ ] Production vs development separation is handled.

### Max Response Length
Direct file write. No response text.

## Quick Start
Multi-stage Dockerfile: builder stage → runner stage (distroless). Non-root user. .dockerignore. Layer caching: copy package files first, source code second.

## When to Use This Skill
- Containerizing a new application
- Reviewing Dockerfile quality
- Setting up local development with Docker Compose
- Optimizing build times

## Core Workflow

### Step 1: Multi-Stage Dockerfile
```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: Production (distroless)
FROM gcr.io/distroless/nodejs22-debian12 AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER nonroot
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health')"
CMD ["dist/main.js"]
```

### Step 2: Layer Caching Optimization
```dockerfile
# 1. Copy dependency files FIRST (rarely changes)
COPY package*.json ./
COPY Cargo.toml Cargo.lock ./
COPY go.mod go.sum ./
RUN npm ci / cargo build / go mod download

# 2. Copy source code SECOND (frequently changes)
COPY . .

# This way, dependency layers are cached unless package files change
```

### Step 3: .dockerignore
```
node_modules
.git
.env
*.log
dist
.next
.cache
coverage
test-results
```

### Step 4: Docker Compose — Development
```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      target: builder  # Use builder stage for dev (includes devDeps)
    volumes:
      - .:/app          # Live reload
      - /app/node_modules  # Don't override container node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://user:pass@db:5432/app
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d app"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### Step 5: Non-Root User
```dockerfile
# Node.js
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Debian/Ubuntu
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

# Distroless — already non-root, but specify
USER nonroot
```

## Rules & Constraints
- Always use multi-stage builds — build artifacts stay in builder, final image is minimal
- Never run containers as root — create and use a non-root user
- Always include `.dockerignore` — without it, the entire context is sent to the daemon
- Use specific version tags (`node:22-alpine`) — not `latest`
- Always set resource limits in production (`--memory`, `--cpus`)
- Every service needs a health check — no exceptions

## Output Format
Dockerfile or docker-compose.yml with comments explaining each section.

## References
- `references/dockerfile-guide.md` — detailed Dockerfile best practices

## Handoff
After completing this skill:
- Next skill: **cicd-pipeline** — CI/CD for the containerized app
- Pass context: Dockerfile structure, multi-stage setup, Docker Compose config
