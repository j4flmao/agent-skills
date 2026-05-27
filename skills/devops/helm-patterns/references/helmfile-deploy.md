# Helmfile Deploy

## Overview

Helmfile is a declarative specification for deploying Helm charts. It manages the entire lifecycle: repos, charts, values, secrets, hooks, and cleanup across multiple environments.

## Helmfile Structure

### Basic helmfile.yaml
```yaml
# helmfile.yaml
repositories:
  - name: bitnami
    url: https://charts.bitnami.com/bitnami
  - name: stable
    url: https://charts.helm.sh/stable

releases:
  - name: myapp
    namespace: default
    chart: ./charts/myapp
    values:
      - values.yaml
      - values/production.yaml
    secrets:
      - secrets.yaml
    set:
      - name: image.tag
        value: "1.2.3"
```

### Multi-Environment Structure
```
helmfile/
├── helmfile.yaml              # Default/base config
├── environments/
│   ├── development.yaml       # Dev environment
│   ├── staging.yaml           # Staging environment
│   └── production.yaml        # Production environment
├── values/
│   ├── myapp/
│   │   ├── defaults.yaml
│   │   ├── development.yaml
│   │   ├── staging.yaml
│   │   └── production.yaml
│   └── redis/
│       └── values.yaml
├── secrets/
│   ├── myapp/
│   │   ├── development.yaml
│   │   ├── staging.yaml
│   │   └── production.yaml
│   └── redis/
│       └── secrets.yaml
└── templates/
    └── partials.yaml
```

## Environments

### Environment Definition
```yaml
# helmfile.yaml
environments:
  development:
    values:
      - environments/development.yaml
  staging:
    values:
      - environments/staging.yaml
  production:
    values:
      - environments/production.yaml
```

### Environment Values Files
```yaml
# environments/development.yaml
environment: development
namespace: myapp-dev
ingress:
  enabled: false
replicaCount: 1
resources:
  requests:
    cpu: 100m
    memory: 128Mi
```

```yaml
# environments/production.yaml
environment: production
namespace: myapp-prod
ingress:
  enabled: true
  hosts:
    - host: app.example.com
      paths:
        - path: /
          pathType: Prefix
replicaCount: 4
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2
    memory: 2Gi
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
```

## Releases

### Single Release
```yaml
releases:
  - name: myapp
    namespace: "{{ .Values.namespace }}"
    chart: ./charts/myapp
    version: "1.2.3"
    installed: true
    wait: true
    waitTimeout: 300
    recreatePods: false
    force: false
    atomic: true
    cleanupOnFail: true
    maxHistory: 10
```

### Multiple Releases
```yaml
releases:
  - name: myapp
    namespace: "{{ .Values.namespace }}"
    chart: ./charts/myapp
    values:
      - values/myapp/defaults.yaml
      - values/myapp/{{ .Environment.Name }}.yaml
    secrets:
      - secrets/myapp/{{ .Environment.Name }}.yaml
    needs:
      - redis
      - postgresql

  - name: redis
    namespace: "{{ .Values.namespace }}"
    chart: bitnami/redis
    version: "18.x"
    values:
      - values/redis/values.yaml
    installed: true
    wait: true

  - name: postgresql
    namespace: "{{ .Values.namespace }}"
    chart: bitnami/postgresql
    version: "12.x"
    values:
      - values/postgresql/values.yaml
    installed: true
    wait: true
```

### Release with Conditionals
```yaml
releases:
  - name: myapp
    chart: ./charts/myapp
    installed: true

  - name: redis
    chart: bitnami/redis
    installed: {{ .Values.redis.enabled | default false }}

  - name: monitoring
    chart: ./charts/monitoring
    installed: false
    labels:
      type: infrastructure
```

### Release Labels
```yaml
releases:
  - name: myapp
    labels:
      app: myapp
      team: backend
      tier: application

  - name: redis
    labels:
      app: redis
      team: platform
      tier: data

  - name: postgresql
    labels:
      app: postgresql
      team: platform
      tier: data
```

## Secrets Management

### SOPS Encryption
```yaml
# secrets.yaml (encrypted with SOPS)
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secrets
type: Opaque
data:
  DATABASE_URL: ENC[AES256_GCM,data:encrypted-base64...]
  API_KEY: ENC[AES256_GCM,data:encrypted-base64...]
```

```yaml
# .sops.yaml
creation_rules:
  - path_regex: secrets/development/.*\.yaml
    age: age1devkey...
  - path_regex: secrets/staging/.*\.yaml
    age: age1stagingkey...
  - path_regex: secrets/production/.*\.yaml
    age: age1prodkey...
```

### Helmfile with SOPS
```yaml
# helmfile.yaml
helmDefaults:
  args:
    - --kube-context={{ .Values.kubeContext }}
  tillerNamespace: kube-system

releases:
  - name: myapp
    chart: ./charts/myapp
    values:
      - values/myapp/defaults.yaml
      - values/myapp/{{ .Environment.Name }}.yaml
    secrets:
      - secrets/myapp/{{ .Environment.Name }}.yaml
```

### VALS Integration
```yaml
# helmfile.yaml
helmDefaults:
  args:
    - --kube-context={{ .Values.kubeContext }}

releases:
  - name: myapp
    chart: ./charts/myapp
    values:
      - values/defaults.yaml
      - values/{{ .Environment.Name }}.yaml
      - {{ .Environment.Name }}/{{ .Release.Name }}.yaml
    secrets:
      - ref+awsssm:///myapp/{{ .Environment.Name }}/database?region=us-east-1
      - ref+gcpsecrets://projects/my-project/secrets/api-key
```

### VALS with AWS Secrets Manager
```yaml
# Fetch values from AWS Secrets Manager via vals
secrets:
  - ref+awsssm:///myapp/production/database?region=us-east-1
  - ref+awsssm:///myapp/production/api-keys?region=us-east-1

# Or from AWS Parameter Store
  - ref+awsssm:///myapp/production/database/password?region=us-east-1
```

## Hooks

### Pre-Install Hook
```yaml
# helmfile.yaml
releases:
  - name: myapp
    chart: ./charts/myapp
    hooks:
      - events: ["presync"]
        showlogs: true
        command: |
          echo "Running pre-install checks..."
          kubectl get namespace {{ .Values.namespace }} || kubectl create namespace {{ .Values.namespace }}
```

### Post-Install Hook
```yaml
releases:
  - name: myapp
    chart: ./charts/myapp
    hooks:
      - events: ["postsync"]
        showlogs: true
        command: |
          echo "Verifying deployment..."
          kubectl rollout status deployment/{{ .Release.Name }} -n {{ .Values.namespace }} --timeout=5m
```

### Pre-Upgrade Hook
```yaml
releases:
  - name: myapp
    chart: ./charts/myapp
    hooks:
      - events: ["prepare", "presync"]
        showlogs: true
        command: |
          echo "Backing up database before upgrade..."
          kubectl exec deploy/{{ .Release.Name }} -n {{ .Values.namespace }} -- pg_dumpall > /tmp/backup.sql
```

### Hook with Webhook Notification
```yaml
releases:
  - name: myapp
    chart: ./charts/myapp
    hooks:
      - events: ["postsync"]
        showlogs: false
        command: |
          curl -X POST https://hooks.slack.com/services/xxx \
            -H 'Content-Type: application/json' \
            -d '{"text": "Deployment of {{ .Release.Name }} completed in {{ .Environment.Name }}"}'
```

### Hook Events Reference
| Event | When It Fires |
|-------|---------------|
| `prepare` | Before syncing, after loading state |
| `presync` | Before sync starts |
| `postsync` | After sync completes |
| `cleanup` | During cleanup phase |

## Diff/Show Before Apply

### Helmfile Diff
```bash
# Show diff between current and desired state
helmfile diff

# Diff for specific environment
helmfile diff --environment production

# Diff with context lines
helmfile diff --context 5

# Diff for specific selector
helmfile diff --selector app=myapp

# Diff with suppressed secrets
helmfile diff --suppress-secrets

# Output diff to file
helmfile diff > /tmp/helmfile-diff.txt
```

### Helmfile Template
```bash
# Render templates without applying
helmfile template

# Template specific environment
helmfile template --environment staging

# Template specific release
helmfile template --selector name=myapp
```

### Helmfile Status
```bash
# Check status of all releases
helmfile status

# Status for specific environment
helmfile status --environment production

# Status with detailed output
helmfile status --output json
```

## Selective Sync

### Using Selectors
```bash
# Sync only application releases
helmfile sync --selector app=myapp

# Sync by team label
helmfile sync --selector team=backend

# Sync by tier
helmfile sync --selector tier=application

# Exclude infrastructure
helmfile sync --selector tier!=infrastructure

# Multiple selectors (AND)
helmfile sync --selector app=myapp,tier=application

# Selector with glob
helmfile sync --selector name=myapp*
```

### Selector Labels in Releases
```yaml
releases:
  - name: myapp-api
    labels:
      app: myapp
      team: backend
      tier: application
      component: api

  - name: myapp-worker
    labels:
      app: myapp
      team: backend
      tier: application
      component: worker

  - name: myapp-redis
    labels:
      app: myapp
      team: platform
      tier: data
```

## Layered Values Files

### Value Precedence
```yaml
# Order: later files override earlier ones
releases:
  - name: myapp
    values:
      - values/defaults.yaml           # Lowest priority
      - values/global.yaml
      - values/{{ .Environment.Name }}.yaml  # Environment-specific
      - values/secrets.yaml            # Secrets always last
```

### Using Templates in Values
```yaml
# values/defaults.yaml
replicaCount: 2
image:
  repository: myapp
  tag: {{ .Values.imageTag | default "latest" }}

# values/production.yaml (overrides)
replicaCount: {{ .Values.production.replicaCount | default 4 }}
image:
  tag: {{ .Values.releaseTag }}
```

### YAML Anchors for DRY Values
```yaml
# values/common.yaml
x-labels: &labels
  app.kubernetes.io/managed-by: helm
  app.kubernetes.io/part-of: myapp

x-production-resources: &prod-resources
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2
    memory: 2Gi

releases:
  - name: myapp-api
    values:
      - labels: *labels
        resources: *prod-resources
  - name: myapp-worker
    values:
      - labels: *labels
        resources: *prod-resources
```

## Remote State

### State Storage Backends
```yaml
# helmfile.yaml
helmfile: |
  apiVersion: 1
  state:
    backend: s3
    config:
      bucket: my-helmfile-state
      key: helmfile/state.yaml
      region: us-east-1
```

```yaml
# Using Git backend
state:
  backend: git
  config:
    repository: git@github.com:org/helmfile-state.git
    branch: main
    path: helmfile/state.yaml
```

### State Commands
```bash
# Pull remote state
helmfile state pull

# Push local state to remote
helmfile state push

# List states
helmfile state list

# Delete state
helmfile state delete
```

## CI/CD Integration

### GitHub Actions
```yaml
# .github/workflows/deploy.yaml
name: Deploy with Helmfile

on:
  push:
    branches:
      - main
    paths:
      - 'helmfile/**'
      - 'charts/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE }}
          aws-region: us-east-1

      - name: Setup helmfile
        uses: mamezou-tech/setup-helmfile@v3
        with:
          helmfile-version: "0.169.0"
          install-helm: true
          helm-version: "v3.15.0"

      - name: Install helm-diff
        run: helm plugin install https://github.com/databus23/helm-diff

      - name: Install sops
        run: |
          curl -LO https://github.com/getsops/sops/releases/download/v3.9.0/sops-v3.9.0.linux.amd64
          mv sops-v3.9.0.linux.amd64 /usr/local/bin/sops
          chmod +x /usr/local/bin/sops

      - name: Diff
        id: diff
        working-directory: helmfile
        run: |
          helmfile diff --environment production --suppress-secrets
        continue-on-error: true

      - name: Apply
        if: steps.diff.outcome == 'success'
        working-directory: helmfile
        run: |
          helmfile apply --environment production --suppress-secrets --wait
```

### GitLab CI
```yaml
# .gitlab-ci.yml
variables:
  HELMFILE_VERSION: "0.169.0"

stages:
  - diff
  - deploy

.helmfile-setup: &helmfile-setup
  before_script:
    - curl -LO https://github.com/helmfile/helmfile/releases/download/v${HELMFILE_VERSION}/helmfile_${HELMFILE_VERSION}_linux_amd64.tar.gz
    - tar -xzf helmfile_${HELMFILE_VERSION}_linux_amd64.tar.gz
    - mv helmfile /usr/local/bin/
    - helm plugin install https://github.com/databus23/helm-diff
    - helm repo add bitnami https://charts.bitnami.com/bitnami

helmfile-diff:
  stage: diff
  image: alpine:3.19
  <<: *helmfile-setup
  script:
    - helmfile diff --environment $CI_ENVIRONMENT_NAME --suppress-secrets
  environment:
    name: production
  only:
    - main

helmfile-deploy:
  stage: deploy
  image: alpine:3.19
  <<: *helmfile-setup
  script:
    - helmfile apply --environment $CI_ENVIRONMENT_NAME --suppress-secrets --wait
  environment:
    name: production
  only:
    - main
  when: manual
```

### ArgoCD Integration with Helmfile
```yaml
# argocd-helmfile.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
spec:
  project: default
  source:
    repoURL: https://github.com/org/repo
    path: helmfile
    targetRevision: main
    plugin:
      name: helmfile
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Rollback Strategies

### Manual Rollback
```bash
# Rollback specific release to previous revision
helmfile rollback --selector name=myapp

# Rollback to specific revision
helmfile rollback --selector name=myapp --revision 5

# Rollback with wait
helmfile rollback --selector name=myapp --wait --timeout 5m

# Rollback entire state
helmfile rollback
```

### Automatic Rollback with Atomic
```yaml
releases:
  - name: myapp
    atomic: true          # Automatically rollback on failure
    wait: true
    waitTimeout: 300
    cleanupOnFail: true   # Remove partial resources on failure
```

### Rollback Hooks
```yaml
releases:
  - name: myapp
    hooks:
      - events: ["presync"]
        showlogs: true
        command: |
          echo "Creating snapshot before rollback..."
          kubectl exec deploy/{{ .Release.Name }} -n {{ .Values.namespace }} -- \
            curl -X POST http://localhost:8080/api/snapshot
```

## Helmfile vs Helm Native Workflows

| Feature | Helmfile | Helm Native |
|---------|----------|-------------|
| Multi-release management | Built-in | Manual script |
| Environment support | Native environments | Values files |
| Diff before apply | `helmfile diff` | `helm diff` plugin |
| Secrets management | SOPS, vals, AWS SSM | Manual decryption |
| Hooks (pre/post sync) | Per-release hooks | Helm hooks in template |
| CI/CD integration | First-class | Manual wrapper |
| Dependency ordering | `needs` field | Manual sequencing |
| State management | Remote state backends | Local release storage |
| Selective sync | Label selectors | Manual targeting |

### When to Use Each
| Scenario | Choice |
|----------|--------|
| Single chart, single env | Helm native |
| Multiple charts, multiple envs | Helmfile |
| Platform team managing 10+ services | Helmfile |
| Simple sidecar/helper chart | Helm native |
| GitOps with ArgoCD | Helmfile + ArgoCD plugin |
| Quick prototype | Helm native |

## Best Practices

### Project Structure
```yaml
# Recommended helmfile project layout
helmfile/
├── helmfile.yaml                 # Entry point
├── environments/
│   ├── development.yaml
│   ├── staging.yaml
│   └── production.yaml
├── releases/                     # One file per release
│   ├── myapp.yaml
│   ├── redis.yaml
│   └── monitoring.yaml
└── values/
    ├── myapp/
    │   ├── defaults.yaml
    │   ├── development.yaml
    │   ├── staging.yaml
    │   └── production.yaml
    └── global/
        └── global.yaml
```

### Common Patterns
```yaml
# Use base values and per-environment overrides
releases:
  - name: myapp
    values:
      - values/global.yaml
      - values/myapp/defaults.yaml
      - values/myapp/{{ .Environment.Name }}.yaml
      - "{{ .Environment.Name }}/{{ .Release.Name }}.yaml"

# Always pin chart versions
  - name: redis
    chart: bitnami/redis
    version: "18.19.0"  # Pin to exact version, not 18.x

# Use labels for selective operations
  - name: myapp
    labels:
      app: myapp
      environment: {{ .Environment.Name }}

# Include secrets handling
    secrets:
      - secrets/{{ .Environment.Name }}.yaml
```

## Key Points
- Helmfile provides a declarative multi-release management layer on top of Helm
- Use environments for environment-specific values and release configuration
- Always use `helmfile diff` before `helmfile apply` to review changes
- Manage secrets with SOPS, vals, or cloud secret managers — never plaintext
- Use label selectors for targeted sync of specific releases
- Prefer atomic releases with `cleanupOnFail` for production safety
- Integrate helmfile diff into CI/CD pipelines as a mandatory review step
- Use remote state backends (S3, Git) for team collaboration
- Hooks enable pre/post sync automation like backups and notifications
- Pin all chart versions and use layered values files for clear precedence
