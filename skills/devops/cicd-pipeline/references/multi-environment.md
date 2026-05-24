# Multi-Environment Pipelines

Multi-environment pipelines manage promotion of artifacts through dev, staging, and production with appropriate gates and controls.

## Environment Promotion Flow

```
[Feature Branch] → [Dev/Review] → [Staging] → [Production]
      ↓                 ↓              ↓             ↓
  PR checks         Auto-deploy    Manual gate    Approval + deploy
```

## Environment-Specific Variables

### GitHub Environments

```yaml
jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    environment:
      name: development
      url: https://dev.app.example.com
    env:
      API_URL: "https://api.dev.example.com"
      LOG_LEVEL: debug

  deploy-staging:
    needs: deploy-dev
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.app.example.com
    env:
      API_URL: "https://api.staging.example.com"
      LOG_LEVEL: info

  deploy-prod:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    env:
      API_URL: "https://api.example.com"
      LOG_LEVEL: warn
```

## Approval Gates

### Manual Approval (GitHub)

```yaml
deploy-prod:
  needs: deploy-staging
  runs-on: ubuntu-latest
  environment:
    name: production
    url: https://app.example.com
  steps:
    - name: Deploy
      run: ./deploy.sh
```

Production environment with "Required reviewers" enabled in GitHub settings — deployment waits for approval.

### Custom Approval

```yaml
- name: Request approval
  uses: trstringer/manual-approval@v1
  with:
    secret: ${{ github.TOKEN }}
    approvers: team-lead,cto
    minimum-approvals: 2
    issue-title: "Deploy to production"
    issue-body: "Review changes before production deployment"
```

## Automated vs Manual Promotion

```yaml
name: Pipeline

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - id: version
        run: echo "version=$(cat VERSION)" >> $GITHUB_OUTPUT

  # Automatic: dev and staging
  deploy-dev:
    needs: build
    uses: ./.github/workflows/deploy.yml
    with:
      environment: dev
      version: ${{ needs.build.outputs.version }}

  deploy-staging:
    needs: deploy-dev
    uses: ./.github/workflows/deploy.yml
    with:
      environment: staging
      version: ${{ needs.build.outputs.version }}

  # Manual: production
  deploy-prod:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: ./.github/workflows/deploy.yml
        with:
          environment: production
          version: ${{ needs.build.outputs.version }}
```

## Pipeline Configuration per Environment

### Reusable Workflow

```yaml
# .github/workflows/deploy.yml
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      version:
        required: true
        type: string
    secrets:
      CLOUD_TOKEN:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: |
          ./deploy.sh \
            --env ${{ inputs.environment }} \
            --version ${{ inputs.version }}
        env:
          CLOUD_TOKEN: ${{ secrets.CLOUD_TOKEN }}
```

### Environment Config as Code

```yaml
# .github/config/dev.yaml
environment: development
replicas: 1
resources:
  cpu: 0.5
  memory: 256Mi
features:
  new-checkout: true
  experimental: true

# .github/config/prod.yaml
environment: production
replicas: 5
resources:
  cpu: 2
  memory: 1Gi
features:
  new-checkout: true
  experimental: false
```

## Smoke Tests per Environment

```yaml
- name: Smoke test
  env:
    ENV_URL: ${{ vars.ENV_URL }}
  run: |
    # Health check
    curl -f $ENV_URL/health || exit 1

    # API smoke test
    curl -f $ENV_URL/api/v1/status || exit 1

    # Database connectivity
    curl -f $ENV_URL/api/v1/db/health || exit 1
```

## Rollback Strategy

```yaml
- name: Deploy with rollback
  run: |
    kubectl set image deployment/myapp app=myapp:${{ inputs.version }} --record
    kubectl rollout status deployment/myapp --timeout=5m || {
      echo "Deployment failed, rolling back..."
      kubectl rollout undo deployment/myapp
      exit 1
    }
```

## Promotion Matrix

| Environment | Deploy Trigger | Approval | Tests | Rollback |
|-------------|---------------|----------|-------|----------|
| Development | On push to branch | Automatic | Unit + integration | Automatic |
| Staging | After dev success | Automatic | Integration + E2E | Automatic |
| Production | After staging success | Manual approval | Smoke + canary | Manual + automatic |

Each environment serves a distinct validation purpose, catching issues at the earliest possible stage with appropriate guardrails.
