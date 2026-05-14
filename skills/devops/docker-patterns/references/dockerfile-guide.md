# Dockerfile Best Practices

## Multi-Stage Build Pattern

### Node.js
```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production runner
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

### Go
```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server

FROM scratch
COPY --from=builder /app/server /server
USER 65534:65534
EXPOSE 8080
CMD ["/server"]
```

### Rust
```dockerfile
FROM rust:1.80-slim-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
COPY src ./src
RUN touch src/main.rs && cargo build --release

FROM gcr.io/distroless/cc-debian12
COPY --from=builder /app/target/release/app /app
USER nonroot
EXPOSE 8080
CMD ["/app"]
```

## Layer Caching Rules
- Copy dependency manifests FIRST (package.json, Cargo.toml, go.mod)
- Install dependencies SECOND
- Copy source code LAST
- This ensures dependency layers are cached unless manifests change

## .dockerignore
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
.venv
__pycache__
*.pyc
.gitignore
.dockerignore
Dockerfile
README.md
```

## Non-Root User Patterns
```dockerfile
# Alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Debian/Ubuntu
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

# Distroless
USER nonroot
```

## Health Check
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

## Resource Constraints
```bash
docker run --memory="512m" --cpus="0.5" --memory-reservation="256m" my-app
```
