# Image Optimization

Optimizing container images reduces build time, network transfer, attack surface, and storage costs.

## Multi-Stage Build Patterns

### Go Application

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .

FROM gcr.io/distroless/static-debian12 AS runner
WORKDIR /app
COPY --from=builder /app/server .
USER nonroot
EXPOSE 8080
ENTRYPOINT ["/app/server"]
```

### Node.js Application

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://localhost:3000/health')"
CMD ["node", "dist/main.js"]
```

### Python Application

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY pyproject.toml poetry.lock ./
RUN pip install --no-cache-dir poetry && \
    poetry config virtualenvs.create false && \
    poetry install --only main --no-root
COPY . .
RUN pip install --no-cache-dir --no-deps .

FROM python:3.12-slim AS runner
WORKDIR /app
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app /app
USER appuser
CMD ["python", "-m", "app"]
```

## Distroless vs Alpine

| Base Image | Size | Security | Tooling | Debugging |
|------------|------|----------|---------|-----------|
| `distroless/base` | ~5 MB | Minimal attack surface | No shell, no package manager | Hard (no shell) |
| `distroless/static` | ~2 MB | Minimal attack surface | Static binaries only | Hard (no shell) |
| `alpine:3.19` | ~5 MB | Small attack surface | BusyBox, apk | Moderate (has shell) |
| `slim` (debian) | ~30 MB | Moderate | Standard tools | Easy |
| `ubuntu:22.04` | ~80 MB | Larger attack surface | Full system | Easy |

### When to Use Which

- **distroless**: Production artifacts — static binaries, Go, Rust
- **alpine**: Need common tools (curl, bash) but want small size
- **slim**: Need full compatibility with C libraries
- **full**: Only for builder stages or when compiling native modules

## Layer Structure Optimization

Order layers by change frequency — least changing first:

```dockerfile
# 1. OS base (rarely changes)
FROM node:22-alpine

# 2. System dependencies (changes with app updates)
RUN apk add --no-cache tini curl

# 3. Dependency manifests (changes with deps updates)
COPY package*.json ./

# 4. Dependency install (cached unless manifests change)
RUN npm ci --only=production

# 5. Application source (changes most frequently)
COPY . .

# 6. Final configuration
EXPOSE 3000
USER appuser
CMD ["node", "app.js"]
```

### Layer Inspection

```bash
# View layers and sizes
docker history myapp:latest

# Analyze image
dive myapp:latest

# Check for unused files
docker run --rm myapp:latest du -sh /* 2>/dev/null
```

## .dockerignore Optimization

```dockerignore
# Dependencies (separate layer)
**/node_modules/
**/.git/

# Build artifacts
dist/
build/
*.js.map
*.tsbuildinfo

# Environment and secrets
.env*
*.pem
*.key

# CI and local config
.git/
.gitlab/
.github/
.gitignore
.gitattributes
*.md
Dockerfile
.dockerignore
docker-compose*.yml

# Cache and logs
.cache/
*.log
.coverage/
.nyc_output/

# OS files
.DS_Store
Thumbs.db

# Temporary files
*.swp
*.swo
*~
```

## BuildKit Caching

```bash
# Enable BuildKit
DOCKER_BUILDKIT=1 docker build -t myapp .

# Mount cache for package managers
# dockerfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Use cache mounts in Compose
docker compose build --build-arg BUILDKIT_INLINE_CACHE=1

# Cache from registry
docker build --cache-from registry.example.com/myapp:cache .
```

## Compression and Squashing

```bash
# Squash layers (experimental)
docker build --squash -t myapp:squashed .

# Export and re-import to flatten
docker save myapp:latest | gzip > myapp.tar.gz

# Use --squash in docker buildx
docker buildx build --squash -t myapp:optimized .
```

## Comparison: Image Sizes

| Application | Naive | Optimized | Savings |
|-------------|-------|-----------|---------|
| Go binary | 800 MB (golang:latest) | 12 MB (distroless) | 98.5% |
| Node.js API | 1.2 GB (node:latest) | 180 MB (alpine multi-stage) | 85% |
| Python app | 900 MB (python:latest) | 140 MB (slim multi-stage) | 84% |
| Java app | 700 MB (maven + jdk) | 220 MB (jre multi-stage) | 69% |

Smaller images mean faster deployments, less network transfer, reduced storage costs, and a smaller attack surface.
