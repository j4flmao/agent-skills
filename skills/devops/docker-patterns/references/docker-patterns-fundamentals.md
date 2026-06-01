# Docker Patterns Fundamentals

## Overview
Docker patterns are standardized approaches to containerizing applications for development and production. These patterns optimize image size, build speed, security, and development experience.

## Core Concepts

### Multi-Stage Builds
Multi-stage builds use multiple FROM statements in a single Dockerfile. Each stage starts from a different base image. Build artifacts are copied between stages. The final stage contains only runtime dependencies. Benefits: smaller images, no build tools in production, no privileged access needed.

### Development vs Production Images
Development: includes dev dependencies, source code mounted as volume, live reload enabled. Production: minimal dependencies, compiled/bundled code, no dev tools. Use Docker Compose profiles or separate Dockerfiles.

### Layer Optimization
Each Docker instruction creates a layer. Combine RUN commands to reduce layers. Copy dependency files first for cache efficiency. Use --link flag for COPY/ADD to enable independent layer caching. Use .dockerignore to exclude files from build context.

## Key Patterns

### Dependency Cache Pattern
```dockerfile
# Copy dependency manifests FIRST (rarely changes)
COPY package*.json ./
RUN npm ci

# Copy source code SECOND (frequently changes)
COPY . .
RUN npm run build
```

### Non-Root User Pattern
```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
```

### Health Check Pattern
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

### Development Compose Pattern
```yaml
services:
  app:
    build:
      target: builder
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev
```

## Best Practices
- Always use multi-stage builds for production.
- Copy dependency files before source code for cache efficiency.
- Use .dockerignore to reduce build context.
- Set HEALTHCHECK on every service.
- Run containers as non-root user.
- Pin base image versions.
- Use Docker Compose with profiles for dev/prod separation.
- Set resource limits to prevent resource starvation.

## References
- docker-patterns-advanced.md -- Advanced Docker Patterns topics
- dockerfile-guide.md -- Dockerfile Best Practices
- docker-compose-production.md -- Docker Compose in Production
- image-optimization.md -- Image Optimization
- container-security.md -- Container Security
