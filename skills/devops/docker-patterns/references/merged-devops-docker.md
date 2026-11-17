# Docker

> Reference for `devops/docker-patterns` — the entry point is [`../SKILL.md`](../SKILL.md). This file keeps only material the SKILL.md does not cover (runtime and registry choice, CI build/push, networks, secrets, Swarm, tool comparison); Dockerfile, .dockerignore, Compose profiles and anti-patterns live in the SKILL.md.

## Purpose
Build, ship, and run containerized applications using Docker Engine, Compose, and ecosystem tools with security, optimization, and production-grade patterns.

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
services:
  app:
    image: myapp:${TAG:?set an immutable tag}
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
| kaniko | In-cluster builds | No daemon needed; upstream archived June 2025, use a maintained fork |
| buildah | Daemonless OCI builds | Rootless, scriptable |
| packer | VM + Docker images | HashiCorp ecosystem |

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
- Sign images with Sigstore cosign or Notation and verify at deploy time (Docker Content Trust / Notary v1 is being retired)
- Enable live-restore for production Docker daemons
- Use explicit restart policies (`unless-stopped` or `always`)
- Never use `docker exec` for production changes — rebuild and redeploy
- Use Docker Compose with profiles for dev/prod separation
- Pin base image digests in production for supply chain security

## References
- [docker-fundamentals.md](docker-fundamentals.md), [docker-advanced.md](docker-advanced.md), [compose-networking.md](compose-networking.md)
- Related skills: `docker-internals` (namespaces, cgroups), `cloud-native-kubernetes-patterns` (orchestration), `cicd-pipeline` (CI/CD integration).
