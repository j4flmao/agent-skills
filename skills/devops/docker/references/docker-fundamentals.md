# Docker Fundamentals

## Overview
Docker is a containerization platform that packages applications and dependencies into lightweight, portable containers. Containers run consistently across any environment with Docker Engine installed.

## Core Concepts

### Images and Containers
Image: read-only template with application code, runtime, libraries, and configuration. Built from a Dockerfile. Stored in a registry (Docker Hub, ECR, GCR). Container: running instance of an image with isolated filesystem, network, and process namespace. Ephemeral by default.

### Dockerfile Instructions
FROM: base image selection. RUN: execute commands during build. COPY/ADD: files from context to image. WORKDIR: set working directory. ENV: environment variables. EXPOSE: document listening port. CMD: default command when container starts. ENTRYPOINT: executable wrapper. HEALTHCHECK: container health probe. USER: runtime user.

### Layer Caching
Each Dockerfile instruction creates a cacheable layer. Layers are reused across builds when unchanged. Order instructions from least to most frequently changing: base image, system dependencies, application dependencies, source code, build step. Use .dockerignore to exclude unnecessary files from build context.

### Volumes and Bind Mounts
Volume: managed by Docker, stored in /var/lib/docker/volumes. Persistent across container lifecycle. Bind mount: maps host directory into container. Useful for development (live reload). tmpfs mount: in-memory, for temporary sensitive data.

## Key Commands

### Basic Operations
```bash
docker pull node:22-alpine
docker build -t myapp:latest .
docker run -d -p 3000:3000 --name myapp myapp:latest
docker ps
docker logs myapp
docker exec -it myapp sh
docker stop myapp
docker rm myapp
docker rmi myapp:latest
```

### Image Management
```bash
docker images
docker tag myapp:latest myrepo/myapp:1.0.0
docker push myrepo/myapp:1.0.0
docker pull myrepo/myapp:1.0.0
docker system prune -a  # Clean unused images
```

### Compose Commands
```bash
docker compose up -d        # Start services
docker compose down         # Stop and remove
docker compose logs -f      # Follow logs
docker compose build        # Build images
docker compose exec app sh  # Shell in service
```

## Networking
Bridge: default network for standalone containers. Communication via IP address. Overlay: multi-host networking for Swarm services. Host: container uses host network directly. None: no network access. User-defined bridge: custom network with DNS resolution between containers.

## Best Practices
- Use specific image tags (node:22-alpine), never :latest.
- Implement multi-stage builds for smaller production images.
- Run as non-root user for security.
- Use .dockerignore to reduce build context size.
- Configure HEALTHCHECK for all services.
- Set resource limits (memory, CPU) on containers.
- Use Docker Compose for multi-service applications.
- Keep containers stateless -- use volumes for persistence.

## References
- docker-advanced.md -- Advanced Docker topics
- compose-networking.md -- Docker Compose and Networking
- security-best-practices.md -- Container Security
