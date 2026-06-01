# Dev Container Advanced

## Overview
Advanced dev containers covers multi-container setups (docker-compose), GPU acceleration, remote dev with SSH/Tailscale, CI integration, performance tuning, and large monorepo optimization.

## Advanced Concepts

### Concept 1: Multi-Container Dev Environment
docker-compose.yml alongside devcontainer.json: app container + database (postgres, mssql), cache (redis, memcached), message broker (rabbitmq, kafka), and storage (minio, azurite). devcontainer.json references dockerComposeFile. Dependencies start before the dev container.

### Concept 2: GPU-Accelerated Dev
CUDA/cuDNN for ML development: nvidia/cuda base images, nvidia-container-toolkit on host, --gpus all in runArgs. MPS (Metal Performance Shaders) for macOS GPU. OpenGL/Vulkan passthrough for graphics development.

### Concept 3: Remote Development
devcontainer CLI for headless dev: SSH into remote VM → attach VS Code. Tailscale/WireGuard for secure tunnel. Codespaces / GitHub Actions for ephemeral containers. Coder / OpenVSCode Server for browser-based dev.

### Concept 4: CI Integration
Use devcontainer features in CI: devcontainer exec for consistent local/CI environments, devcontainer build for pre-built images, and devcontainer up for integration tests. Cache layers in CI registry for faster builds. Same environment guarantees reproducible CI.

### Concept 5: Large Monorepo Optimization
Source-only mount (exclude node_modules, out/, target/, .git). Pre-built cache image (rebuild weekly, cache features). Multi-stage Dockerfile (dev vs production distinct). File watcher limits (fs.inotify for Linux). WSL2 vs Hyper-V performance comparison.

## Advanced Techniques

### docker-compose Dev Container
```json
{
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "shutdownAction": "stopCompose"
}
```

### Pre-Built Cache Image
```dockerfile
# CI: build and push weekly
FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm
RUN apt-get update && apt-get install -y protobuf-compiler
# Cache layer for fast local rebuilds
```

### CI Dev Container
```yaml
test:
  container: from devcontainer.json
  steps:
    - run: devcontainer exec ./scripts/test.sh
```

## Anti-Patterns

- Containers without resource limits (host starved)
- GPU passthrough without driver compatibility check
- docker-compose with too many services (memory pressure)
- CI devcontainer image drift from local
- Monorepo mounts with 50K+ files (slow `git status`)
- Stateful containers (destroyed on rebuild, losing work)
- Not pinning compose image versions
- Devcontainers used in production (different security posture)
