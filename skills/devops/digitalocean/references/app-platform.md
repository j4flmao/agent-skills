# App Platform

## Overview

App Platform is a fully managed Platform-as-a-Service (PaaS) that automatically builds, deploys, and scales containerized applications from source code. It supports GitHub, GitLab, Docker Hub, and Container Registry.

## App Spec YAML

```yaml
# .do/app.yaml (full app spec)
name: my-production-app
region: nyc
alerts:
- rule: DEPLOYMENT_FAILED
- rule: DOMAIN_FAILED
- rule: DEPLOYMENT_LIVE
features:
- buildpack
- mariadb
ingress:
  rules:
  - component:
      name: api
    match:
      path:
        prefix: "/api"
  - component:
      name: frontend
    match:
      path:
        prefix: "/"
envs:
- key: APP_ENV
  value: production
  scope: RUN_TIME
- key: DATABASE_URL
  value: ${db.DATABASE_URL}
  scope: RUN_TIME
- key: SECRET_KEY
  value: "---encrypted---"
  type: SECRET
jobs:
- name: migrations
  github:
    branch: main
    deploy_on_push: true
    repo: your-org/api-repo
  instance_count: 1
  instance_size_slug: basic-xxs
  environment_slug: node-js
  run_command: npx prisma migrate deploy
  source_dir: /
services:
- name: api
  github:
    branch: main
    deploy_on_push: true
    repo: your-org/api-repo
  build_command: npm ci && npm run build
  run_command: npm start
  source_dir: /
  http_port: 3000
  instance_count: 3
  instance_size_slug: professional-s
  health_check:
    http_path: /health
    initial_delay_seconds: 10
    period_seconds: 30
    timeout_seconds: 5
    failure_threshold: 3
    success_threshold: 2
  cors:
    allow_origins:
    - exact: "https://app.example.com"
    allow_methods:
    - GET
    - POST
    - PUT
    - DELETE
    allow_headers:
    - Authorization
    - Content-Type
  logging:
    max_log_size: 5
    destination: papertrail
  routes:
  - path: /api
    preserve_path_prefix: true
  autoscaling:
    min_instances: 2
    max_instances: 10
    metric: cpu
    target: 70
  envs:
  - key: NODE_ENV
    value: production
static_sites:
- name: frontend
  github:
    branch: main
    deploy_on_push: true
    repo: your-org/frontend-repo
  build_command: npm ci && npm run build
  source_dir: /
  output_dir: dist
  routes:
  - path: /
  catchall_document: index.html
  error_document: error.html
  index_document: index.html
  dockerfile_path: Dockerfile
  envs:
  - key: API_URL
    value: https://api.example.com
workers:
- name: queue-processor
  github:
    branch: main
    deploy_on_push: true
    repo: your-org/worker-repo
  build_command: npm ci
  run_command: node processor.js
  instance_count: 2
  instance_size_slug: professional-xs
  envs:
  - key: QUEUE_NAME
    value: default
functions:
- name: email-sender
  github:
    branch: main
    deploy_on_push: true
    repo: your-org/functions-repo
  source_dir: /email
  routes:
  - path: /send-email
  envs:
  - key: SENDGRID_KEY
    value: "---encrypted---"
    type: SECRET
databases:
- engine: PG
  name: app-db
  num_nodes: 2
  production: true
  version: "16"
- engine: REDIS
  name: cache
  num_nodes: 2
  production: true
  version: "7"
domains:
- domain: app.example.com
  type: ALIAS
  zone: example.com
  wildcard: false
  minimum_tls_version: "1.3"
```

## Deployment Methods

### Git-Based Deploy

```bash
# Deploy from GitHub/GitLab (push to branch triggers deploy)
# Configure in App Platform dashboard or app spec

# doctl: deploy app
doctl apps create --spec .do/app.yaml

# Update app
doctl apps update <app-id> --spec .do/app.yaml

# List deployments
doctl apps list-deployments <app-id>

# Get deployment logs
doctl apps logs <app-id> <deployment-id>
```

### Container Registry

```yaml
# Deploy from DO Container Registry
services:
- name: api
  image:
    registry_type: DOCR
    repository: myapp/api
    tag: latest
    deploy_on_push:
      enabled: true
  instance_count: 3
  instance_size_slug: professional-s
```

### Docker Hub

```yaml
services:
- name: api
  image:
    registry_type: DOCKER_HUB
    registry: myorg
    repository: api
    tag: production
  instance_count: 3
```

## Functions

```yaml
# Functions are lightweight serverless functions
functions:
- name: transform-image
  github:
    branch: main
    deploy_on_push: true
    repo: your-org/functions-repo
  source_dir: /transform
  routes:
  - path: /transform
  envs:
  - key: MAX_WIDTH
    value: "1920"
```
```javascript
// Node.js function (`/transform/index.js`)
exports.main = async function (args) {
  const { imageUrl, width } = args;
  const response = await fetch(imageUrl);
  // Process image...
  return {
    statusCode: 200,
    body: { url: `https://cdn.example.com/processed/${width}` },
  };
};
```

## Autoscaling

```yaml
# Autoscaling is available on Professional plans
services:
- name: api
  autoscaling:
    min_instances: 2
    max_instances: 10
    metric: cpu        # or memory
    target: 70         # target percentage
```

## SSL/TLS

```yaml
# Automatic SSL via Let's Encrypt (enabled by default)
# Custom domains bring their own certificates
domains:
- domain: app.example.com
  type: ALIAS
  zone: example.com
  minimum_tls_version: "1.3"
  certificate:
    type: lets_encrypt
```

## Health Checks and Zero-Downtime Deploys

```yaml
services:
- name: api
  health_check:
    http_path: /health
    initial_delay_seconds: 10
    period_seconds: 30
    timeout_seconds: 5
    failure_threshold: 3
    success_threshold: 2
```

App Platform uses rolling deployments with:
- New instances created before old ones destroyed
- Health checks determine deployment success
- Failed health checks roll back the deployment
- No traffic is routed until health checks pass

## Environment Variables and Secrets

```yaml
# Three types:
envs:
# 1. Plain text (visible in dashboard)
- key: NODE_ENV
  value: production
  scope: RUN_TIME

# 2. Encrypted secrets (masked in dashboard)
- key: API_SECRET
  value: "---encrypted---"
  type: SECRET
  scope: RUN_TIME

# 3. App-level envs (shared across components)
- key: APP_VERSION
  value: "1.0.0"
  scope: APP
```

## CLI Commands

```bash
# Create app
doctl apps create --spec .do/app.yaml

# List apps
doctl apps list

# Update app
doctl apps update <app-id> --spec .do/app.yaml

# Get app details
doctl apps get <app-id>

# Create deployment
doctl apps create-deployment <app-id>

# List deployments
doctl apps list-deployments <app-id>

# Get deployment logs
doctl apps logs <app-id> <deployment-id> --component api

# List deployment history
doctl apps list-deployments <app-id>

# Get app alerts
doctl apps alerts list <app-id>

# Delete app
doctl apps delete <app-id>

# Propose app spec (validate without deploying)
doctl apps propose --spec .do/app.yaml
```

## App Platform Regions

| Region | Slug |
|--------|------|
| New York | nyc |
| San Francisco | sfo |
| Amsterdam | ams |
| Singapore | sgp |
| London | lon |
| Frankfurt | fra |
| Bangalore | blr |

## Instance Sizes

| Plan | Size Slug | vCPUs | Memory |
|------|-----------|-------|--------|
| Basic | basic-xxs | 1 | 512 MB |
| Basic | basic-xs | 1 | 1 GB |
| Basic | basic-s | 2 | 2 GB |
| Professional | professional-xs | 1 | 1 GB |
| Professional | professional-s | 2 | 4 GB |
| Professional | professional-m | 4 | 8 GB |
| Professional | professional-l | 8 | 16 GB |

## Best Practices

- Use `deploy_on_push: true` for automatic CI/CD from your repository
- Configure health checks on every service for zero-downtime deployments
- Use encrypted secrets for all sensitive values (API keys, passwords)
- Set up alerts for deployment failures and domain issues
- Use environment-specific `.do/app.yaml` files (app.dev.yaml, app.prod.yaml)
- Use the App Platform CLI (`doctl apps`) for debugging deployments
- Pin function runtimes and service container versions explicitly
- Use App Platform's built-in CDN for static site assets
- For traffic spikes, set up proper autoscaling thresholds
- Separate frontend, API, and worker into different components
- Use Professional plan for production workloads (supports autoscaling, larger instances)
