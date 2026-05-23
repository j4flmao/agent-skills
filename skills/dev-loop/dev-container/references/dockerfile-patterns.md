# Dockerfile Patterns for Dev Containers

## Multi-Stage Build Patterns

### Node.js

```dockerfile
# Base stage — shared deps
FROM node:20-bookworm AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*
EXPOSE 3000

# Development stage — all tooling
FROM base AS dev
RUN npm install -g nodemon pnpm
COPY package*.json ./
RUN npm install
COPY . .
CMD ["nodemon", "src/index.js"]

# Production stage — minimal image
FROM base AS prod
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
USER node
CMD ["node", "dist/index.js"]
```

### Python

```dockerfile
FROM python:3.12-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dev
COPY requirements*.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "src.main:app", "--reload", "--host", "0.0.0.0"]

FROM base AS prod
COPY requirements*.txt ./
RUN pip install --no-cache-dir -r requirements.txt --no-dev
COPY . .
CMD ["gunicorn", "src.main:app", "-w", "4", "-b", "0.0.0.0:8000"]
```

### Go

```dockerfile
FROM golang:1.22-bookworm AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dev
RUN go install github.com/air-verse/air@latest
COPY go.mod go.sum ./
RUN go mod download
COPY . .
CMD ["air"]

FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app/server ./cmd/server

FROM scratch AS prod
COPY --from=build /app/server /server
CMD ["/server"]
```

### Rust

```dockerfile
FROM rust:1.78-bookworm AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dev
RUN cargo install cargo-watch
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build
COPY src/ src/
RUN cargo build
CMD ["cargo", "watch", "-x", "run"]

FROM rust:1.78-slim-bookworm AS build
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim AS prod
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/target/release/myapp /usr/local/bin/
CMD ["myapp"]
```

## Dev Container Optimizations

### Caching Package Downloads

```dockerfile
# Keep package manager caches between builds
# Mount these in docker-compose:
volumes:
  - npm-cache:/root/.npm
  - cargo-cache:/usr/local/cargo/registry
  - go-cache:/root/go/pkg/mod
```

### Layer Ordering

```dockerfile
# Order matters for build cache
# 1. System dependencies (change rarely)
RUN apt-get update && apt-get install -y ...

# 2. Language runtime
FROM node:20-bookworm

# 3. Package manifests (change with dependencies)
COPY package.json package-lock.json ./

# 4. Dependency install (cached until manifests change)
RUN npm ci

# 5. Source code (changes most frequently)
COPY . .
```

### Security Patterns

```dockerfile
# Non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser

# Minimal base images for production
FROM node:20-alpine          # Node.js
FROM python:3.12-slim        # Python
FROM alpine:3.20             # Static binaries
FROM scratch                 # Go/Rust compiled

# No secrets in build args
ARG BUILD_ENV=production     # Only for build metadata
ENV NODE_ENV=$BUILD_ENV     # Not for secrets!

# Health check
HEALTHCHECK --interval=30s --timeout=3s CMD curl -f http://localhost:3000/health
```

## Docker Compose for Dev

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: dev
    volumes:
      - .:/app
      - node_modules:/app/node_modules  # Named volume, not bind mount
      - npm-cache:/root/.npm
    ports:
      - "3000:3000"
      - "9229:9229"   # Debugger
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://user:pass@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy
    command: npx nodemon src/index.js

  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init:/docker-entrypoint-initdb.d
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    healthcheck:
      test: pg_isready -U user -d myapp
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  node_modules:
  npm-cache:
  pgdata:
```

## Common Patterns

### Install System Dependencies

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build tools
    build-essential \
    pkg-config \
    # Network tools
    curl \
    dnsutils \
    netcat-openbsd \
    # File tools
    jq \
    ripgrep \
    fd-find \
    # Git
    git \
    && rm -rf /var/lib/apt/lists/*
```

### Install Multiple Runtimes

```dockerfile
# Python + Node.js in one container
FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*
```

### VS Code Dev Container Feature

```dockerfile
# Instead of custom Dockerfile, use features in devcontainer.json:
# "features": {
#   "ghcr.io/devcontainers/features/node:1": { "version": "20" },
#   "ghcr.io/devcontainers/features/python:1": { "version": "3.12" },
#   "ghcr.io/devcontainers/features/docker-outside-of-docker:1": {}
# }
```

### BuildKit Cache Mounts

```dockerfile
# Speed up repeated builds with cache mounts
# Docker BuildKit required: DOCKER_BUILDKIT=1
RUN --mount=type=cache,target=/root/.npm \
    npm ci

RUN --mount=type=cache,target=/var/cache/apt \
    apt-get update && apt-get install -y python3
```
