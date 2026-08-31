# GitHub Actions: Reusable Workflows

## 1. DRY (Don't Repeat Yourself) in CI/CD
In an organization with 50 microservices, copying and pasting the exact same `deploy.yml` into 50 different repositories is a maintenance nightmare. If you need to update the AWS deployment role, you have to create 50 Pull Requests.

## 2. Reusable Workflows (`workflow_call`)
GitHub Actions allows you to define a workflow in a central repository that can be called by other repositories.

### The Caller Workflow (Microservice Repo)
```yaml
name: Deploy Microservice
on:
  push:
    branches: [ main ]
jobs:
  call-central-deploy:
    # Calls the reusable workflow from the central DevOps repo
    uses: my-org/devops-workflows/.github/workflows/deploy-aws.yml@v1
    with:
      environment: production
      service_name: payment-api
    secrets:
      AWS_ACCESS_KEY: ${{ secrets.AWS_ACCESS_KEY }}
```

### The Reusable Workflow (Central Repo)
```yaml
name: Reusable AWS Deploy
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      service_name:
        required: true
        type: string
    secrets:
      AWS_ACCESS_KEY:
        required: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to AWS
        run: echo "Deploying ${{ inputs.service_name }} to ${{ inputs.environment }}"
```
