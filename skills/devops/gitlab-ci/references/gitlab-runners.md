# GitLab Runners

## Overview

GitLab Runners are the agents that execute CI/CD jobs. Runners can be shared across projects, scoped to groups, or dedicated to specific projects. They support autoscaling via Kubernetes, Docker Machine, or custom executors.

## Runner Architecture

```
                    ┌─────────────────────┐
                    │    GitLab Server     │
                    │  (Coordinator)      │
                    └──────────┬──────────┘
                               │ API
                               │ (HTTPS)
                    ┌──────────┴──────────┐
                    │    GitLab Runner    │
                    │                     │
                    │  ┌───────────────┐  │
                    │  │   Executor    │  │
                    │  ├───────────────┤  │
                    │  │ Docker | K8s  │  │
                    │  │ Shell | SSH   │  │
                    │  │ Custom        │  │
                    │  └───────────────┘  │
                    └─────────────────────┘
```

## Runner Types

### Shared Runners
Available to all projects in a GitLab instance.

```yaml
# .gitlab-ci.yml — use shared runner
test:
  tags:
    - shared-runner
  script:
    - npm test
```

### Group Runners
Available to all projects within a specific group.

```yaml
# .gitlab-ci.yml — use group runner
test:
  tags:
    - group-runner-linux
    - docker
  script:
    - npm test
```

### Specific Runners
Dedicated to a single project.

```bash
# Register a specific runner
gitlab-runner register \
  --url https://gitlab.com \
  --registration-token $PROJECT_TOKEN \
  --executor docker \
  --description "Project-specific Docker Runner" \
  --tag-list "project-specific,docker,linux" \
  --locked=true
```

```yaml
# .gitlab-ci.yml — use specific runner
deploy:
  tags:
    - project-specific
  script:
    - deploy.sh
```

## Runner Registration

### Docker Executor
```bash
# Install on Linux
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh" | bash
apt-get install gitlab-runner

# Register
gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com" \
  --token "glrt-xxxxxxxxxxxx" \
  --executor "docker" \
  --docker-image "alpine:latest" \
  --description "docker-runner" \
  --tag-list "docker,linux" \
  --run-untagged="true" \
  --locked="false" \
  --access-level="not_protected"
```

### Kubernetes Executor
```bash
gitlab-runner register \
  --non-interactive \
  --url "https://gitlab.com" \
  --token "glrt-xxxxxxxxxxxx" \
  --executor "kubernetes" \
  --kubernetes-namespace "gitlab-runners" \
  --kubernetes-image "alpine:latest" \
  --description "k8s-runner" \
  --tag-list "kubernetes,linux" \
  --kubernetes-service-account "gitlab-runner"
```

## Runner Configuration

### `config.toml` Structure
```toml
concurrent = 10
check_interval = 3
log_level = "info"

[session_server]
  session_timeout = 1800

[[runners]]
  name = "docker-runner"
  url = "https://gitlab.com"
  token = "glrt-xxxxxxxxxxxx"
  executor = "docker"
  tags = ["docker", "linux"]
  run_untagged = true
  protected = false
  [runners.custom_build_dir]
    enabled = true
  [runners.docker]
    image = "alpine:latest"
    privileged = false
    disable_entrypoint_overwrite = false
    oom_kill_disable = false
    disable_cache = false
    volumes = ["/cache:/cache:rw", "/var/run/docker.sock:/var/run/docker.sock"]
    shm_size = 0
    helper_image = "gitlab/gitlab-runner-helper:x86_64-latest"
    security_opt = ["seccomp=unconfined"]
    memory = "4g"
    memory_swap = "4g"
    cpus = "2"
    dns = ["8.8.8.8", "8.8.4.4"]
  [runners.cache]
    Type = "s3"
    Path = "cache"
    Shared = true
    [runners.cache.s3]
      ServerAddress = "s3.amazonaws.com"
      AccessKey = "AKIAIOSFODNN7EXAMPLE"
      SecretKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
      BucketName = "runner-cache"
      BucketLocation = "us-east-1"
      Insecure = false
```

## Autoscaling with Kubernetes

### Kubernetes Runner Helm Chart
```bash
# Install runner on Kubernetes
helm repo add gitlab https://charts.gitlab.io
helm upgrade --install gitlab-runner gitlab/gitlab-runner \
  --namespace gitlab-runners \
  --set gitlabUrl=https://gitlab.com \
  --set runnerRegistrationToken=glrt-xxxxxxxxxxxx \
  --set rbac.create=true \
  --set runners.privileged=false \
  --set runners.tags="kubernetes,linux,docker" \
  --set runners.namespace=gitlab-runners \
  --set runners.cache.type=s3 \
  --set runners.cache.s3.bucketName=runner-cache
```

### Autoscaling Values
```yaml
# values.yaml
gitlabUrl: https://gitlab.com
runnerRegistrationToken: glrt-xxxxxxxxxxxx

rbac:
  create: true

runners:
  privileged: false
  tags: "kubernetes,linux"
  namespace: "gitlab-runners"
  pollTimeout: 600

  # Resource limits per job
  builds:
    cpuLimit: 4
    memoryLimit: 8Gi
    cpuRequests: 500m
    memoryRequests: 1Gi

  # Service account
  serviceAccountName: gitlab-runner

  # Cache
  cache:
    type: s3
    s3:
      bucketName: runner-cache
      bucketLocation: us-east-1
      accessKey: AKIAIOSFODNN7EXAMPLE
      secretKey: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

  # Node selector
  nodeSelector:
    instance-type: ci-worker

  # Tolerations
  tolerations:
  - key: "ci-only"
    operator: "Exists"
    effect: "NoSchedule"

  # Pod annotations
  podAnnotations:
    iam.amazonaws.com/role: gitlab-runner-role

  # Resource limits
  resources:
    requests:
      memory: 256Mi
      cpu: 200m

# Runner replica count for HA
replicas: 2
```

### Horizontal Scaling
```yaml
# values.yaml — scale based on demand
metrics:
  enabled: true

service:
  metricsPort: 9252

# Prometheus ServiceMonitor
servicemonitor:
  enabled: true
  interval: 15s

# Autoscaling
hpa:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

## Autoscaling with Docker Machine

### `config.toml` for Docker Machine
```toml
concurrent = 50
check_interval = 3

[[runners]]
  name = "docker-machine-runner"
  url = "https://gitlab.com"
  token = "glrt-xxxxxxxxxxxx"
  executor = "docker+machine"
  limit = 20
  [runners.machine]
    IdleCount = 2
    IdleTime = 1800
    MaxBuilds = 100
    MachineDriver = "amazonec2"
    MachineName = "gitlab-docker-machine-%s"
    MachineOptions = [
      "amazonec2-region=us-east-1",
      "amazonec2-zone=a",
      "amazonec2-vpc-id=vpc-xxxxx",
      "amazonec2-subnet-id=subnet-xxxxx",
      "amazonec2-use-private-address=true",
      "amazonec2-tags=runner,gitlab,ci",
      "amazonec2-security-group=gitlab-runner",
      "amazonec2-instance-type=c5.xlarge",
      "amazonec2-ami=ami-xxxxx",
      "amazonec2-root-size=50",
      "amazonec2-userdata=userdata.sh",
      "amazonec2-request-spot-instance=true",
      "amazonec2-spot-price=0.05",
    ]
    OffPeakPeriods = [
      "* * 0-7 * * mon-fri *",
      "* * 21-23 * * mon-fri *",
      "* * * * * sat,sun *",
    ]
    OffPeakIdleCount = 1
    OffPeakIdleTime = 3600
  [runners.cache]
    Type = "s3"
    Path = "cache"
    Shared = true
    [runners.cache.s3]
      ServerAddress = "s3.amazonaws.com"
      AccessKey = "AKIAIOSFODNN7EXAMPLE"
      SecretKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
      BucketName = "runner-cache"
      BucketLocation = "us-east-1"
```

## Cache Configuration

### Local Cache
```toml
[[runners]]
  [runners.docker]
    volumes = ["/cache:/cache:rw"]
  [runners.cache]
    Type = "local"
    Path = "cache"
```

### S3 Cache
```toml
[[runners]]
  [runners.cache]
    Type = "s3"
    Path = "cache"
    Shared = true
    [runners.cache.s3]
      ServerAddress = "s3.amazonaws.com"
      AccessKey = "AKIAIOSFODNN7EXAMPLE"
      SecretKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
      BucketName = "my-runner-cache"
      BucketLocation = "us-east-1"
      Insecure = false
```

### GCS Cache
```toml
[[runners]]
  [runners.cache]
    Type = "gcs"
    Path = "cache"
    Shared = true
    [runners.cache.gcs]
      AccessID = "my-service-account@project.iam.gserviceaccount.com"
      PrivateKey = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
      BucketName = "my-runner-cache"
```

### Azure Cache
```toml
[[runners]]
  [runners.cache]
    Type = "azure"
    Path = "cache"
    Shared = true
    [runners.cache.azure]
      AccountName = "mystorageaccount"
      AccountKey = "xxxxx"
      ContainerName = "runner-cache"
```

## Tags and Selection

```yaml
# .gitlab-ci.yml — runner selection
build:
  tags:
    - docker
    - linux
  script:
    - ./build.sh

test:
  tags:
    - macos
    - m1
  script:
    - swift test

deploy:
  tags:
    - kubernetes
    - production
  script:
    - helm upgrade app ./chart
```

## Runner Monitoring

### Prometheus Metrics
```toml
listen_address = ":9252"

[[runners]]
  # Metrics exported automatically
```

### Metrics Endpoints
```
# Runner metrics
http://runner-ip:9252/metrics

# Key metrics:
gitlab_runner_jobs_total              # Total jobs processed
gitlab_runner_jobs_running            # Currently running
gitlab_runner_errors_total            # Runner errors
gitlab_runner_requests_duration_ms    # API request latency
gitlab_runner_builds_duration_seconds # Build duration
```

### Health Check
```bash
# Runner health
gitlab-runner health-check

# Verify
curl http://localhost:9252/health
```

## Troubleshooting

### Common Issues
```bash
# Debug logging
gitlab-runner run --debug

# Check logs
journalctl -u gitlab-runner -f

# Force re-register
gitlab-runner unregister --url https://gitlab.com --token glrt-xxxxx
gitlab-runner register ...

# Clear build directory
rm -rf /tmp/gitlab-runner-*

# Reset cache
gitlab-runner cache clear
```

### CI Job Timeout
```yaml
# .gitlab-ci.yml — per-job timeout
test:
  timeout: 30m
  script:
    - npm test

# Per-runner timeout (config.toml)
[[runners]]
  builds_timeout = 3600  # 1 hour
```

## Best Practices

1. **Use tags** for runner selection — assign meaningful tags to runners.
2. **Prefer Kubernetes executor** for cloud environments — better autoscaling and isolation.
3. **Never use `privileged: true`** unless absolutely necessary (use Kaniko instead of Docker-in-Docker).
4. **Configure S3/GCS cache** — reduces build times significantly for shared runners.
5. **Set `concurrent`** to a reasonable limit based on runner CPU/memory capacity.
6. **Monitor runner metrics** with Prometheus and set alerts for queue depth.
7. **Use CI_JOB_TOKEN** for authenticating to Container Registry instead of registry credentials.
8. **Run at least 2 replicas** of the Kubernetes runner for high availability.
