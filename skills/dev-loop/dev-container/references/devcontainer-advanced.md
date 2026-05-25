# Advanced Dev Container Configuration

## Multi-Stage Dev Containers

### Development Stage
```json
{
  "name": "Full Dev Environment",
  "build": {
    "dockerfile": "Dockerfile",
    "target": "development"
  },
  "features": {
    "ghcr.io/devcontainers/features/node:1": {},
    "ghcr.io/devcontainers/features/docker-outside-of-docker:1": {}
  },
  "forwardPorts": [3000, 5432, 6379],
  "postCreateCommand": "npm install && npm run build"
}
```

### Testing Stage
```json
{
  "name": "Test Environment",
  "build": {
    "dockerfile": "Dockerfile",
    "target": "testing"
  },
  "features": {
    "ghcr.io/devcontainers/features/node:1": {}
  },
  "postCreateCommand": "npm ci",
  "settings": {
    "terminal.integrated.defaultProfile.linux": "bash"
  }
}
```

## Advanced Features

### Docker-in-Docker
- Use `docker-outside-of-docker` feature for better performance
- Mount `/var/run/docker.sock` for Docker access
- Configure resource limits: memory, CPU, disk

### Kubernetes
- Install `kubectl`, `helm`, `minikube`/`kind` via features
- Configure kubeconfig for cluster access
- Mount local kubeconfig directory

### Database Services
```json
{
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "dependsOn": ["postgres", "redis"]
}
```

## Performance Optimization

### Image Caching
- Layer caching for faster rebuilds
- Multi-stage builds to minimize final image size
- Use `--cache-from` for CI pipeline caching

### Volume Mounts
- Mount only necessary source directories
- Use named volumes for package caches
- Exclude node_modules, target, build with `workspaceMount`

### Lifecycle Hooks
| Hook | Use Case |
|------|----------|
| `onCreateCommand` | First-time setup |
| `postCreateCommand` | Install dependencies |
| `postStartCommand` | Start services |
| `postAttachCommand` | Per-attach setup |

## CI Integration

### GitHub Codespaces
```json
{
  "customizations": {
    "codespaces": {
      "openFiles": ["README.md"],
      "repositories": {
        "myorg/myrepo": {
          "permissions": "read-all"
        }
      }
    }
  }
}
```

### GitPod Integration
- Reuse same devcontainer.json for GitPod
- Configure prebuilds for faster startup
- Set environment variables per workspace type

## Troubleshooting

### Common Issues
- Port conflicts — use `forwardPorts` carefully
- Permission issues — match container UID/GID to host
- Slow startup — use prebuilds or cache mounts
- Feature conflicts — avoid overlapping features
