# Reusable Workflows

## Defining a Reusable Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy Workflow
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
        description: "Deployment environment"
      version:
        required: true
        type: string
        default: "latest"
    secrets:
      CLOUD_API_KEY:
        required: true
      DOCKER_REGISTRY_PASS:
        required: false
    outputs:
      deploy-url:
        description: "URL of the deployed app"
        value: ${{ jobs.deploy.outputs.url }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    outputs:
      url: ${{ steps.set-url.outputs.url }}
    steps:
      - uses: actions/checkout@v4
      - run: echo "Deploying ${{ inputs.version }} to ${{ inputs.environment }}"
      - id: set-url
        run: echo "url=https://${{ inputs.environment }}.example.com" >> $GITHUB_OUTPUT
```

## Calling a Reusable Workflow

```yaml
# Same repository
jobs:
  deploy-staging:
    uses: ./.github/workflows/deploy.yml
    with:
      environment: staging
      version: ${{ github.sha }}
    secrets:
      CLOUD_API_KEY: ${{ secrets.CLOUD_API_KEY }}

# Different repository
jobs:
  deploy:
    uses: org/shared-workflows/.github/workflows/deploy.yml@v1
    with:
      environment: production
    secrets:
      CLOUD_API_KEY: ${{ secrets.CLOUD_API_KEY }}
```

## Passing Secrets

Secrets must be explicitly passed — they are not inherited:

```yaml
jobs:
  call-workflow:
    uses: ./.github/workflows/secret-workflow.yml
    secrets:
      # Pass individual secrets
      API_TOKEN: ${{ secrets.API_TOKEN }}
      # Pass all org secrets (org-level workflows only)
      inherit: ${{ toJSON(secrets) }}
```

## Matrix Strategy with Reusable Workflows

```yaml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [18, 20]
    uses: ./.github/workflows/test.yml
    with:
      os: ${{ matrix.os }}
      node-version: ${{ matrix.node }}
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Workflow Dispatch (Manual Trigger)

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: "Target environment"
        required: true
        type: choice
        options:
          - staging
          - production
      debug:
        description: "Enable debug logging"
        required: false
        type: boolean
        default: false
      version:
        description: "Version to deploy"
        required: true
        type: string

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - if: ${{ inputs.debug }}
        run: echo "Debug logging enabled"
      - run: echo "Deploying ${{ inputs.version }} to ${{ inputs.environment }}"
```

## Best Practices

- Pin reusable workflow calls to a tag or SHA — never `@main`
- Document all `inputs` and `secrets` with descriptions
- Use `outputs` sparingly — prefer artifacts or deployment status APIs
- Keep reusable workflows focused on one concern
- Validate inputs early in the workflow with conditionals
- Use `workflow_call` with `types` for stricter input validation where possible
- Store shared workflows in a dedicated `.github` repository
