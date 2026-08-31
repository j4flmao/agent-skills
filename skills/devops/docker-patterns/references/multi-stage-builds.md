# Docker: Multi-Stage Builds

## 1. The Bloated Image Problem
A naive Dockerfile compiles source code and runs it in the same environment. This leaves compilers (like `gcc`, `go build`), testing frameworks, and source code files inside the final production image.
- **Consequence**: The image is huge (e.g., 1GB+), slow to pull, and contains a massive attack surface (compilers can be used by hackers to compile malware if they break in).

## 2. Multi-Stage Architecture
Multi-stage builds use multiple `FROM` statements in a single Dockerfile.
- **Builder Stage**: Uses a heavy image (like `golang:1.21`) to compile the binary.
- **Production Stage**: Uses a minimal image (like `alpine` or `scratch`) and simply `COPY` the compiled binary from the builder stage.

### Implementation Example (Go)
```dockerfile
# Stage 1: Build Environment
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Compile a statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Stage 2: Minimal Production Image
FROM scratch
WORKDIR /
# Copy only the binary, no source code or Go compiler included
COPY --from=builder /app/main /main
EXPOSE 8080
ENTRYPOINT ["/main"]
```
This reduces a 1.2GB image down to a 15MB image.
