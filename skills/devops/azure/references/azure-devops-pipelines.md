# Azure DevOps Pipelines

## CI Pipeline

```yaml
trigger:
  branches:
    include:
      - main
      - develop
      - feature/*
  paths:
    exclude:
      - '*.md'
      - docs/*

pool:
  vmImage: 'ubuntu-latest'

variables:
  dockerRegistryServiceConnection: 'acr-connection'
  imageRepository: 'myapp'
  tag: '$(Build.BuildId)'

stages:
  - stage: Build
    jobs:
      - job: BuildAndTest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '18.x'
          - script: npm ci
          - script: npm run lint
          - script: npm run test -- --coverage
          - task: PublishTestResults@2
            inputs:
              testResultsFormat: 'JUnit'
              testResultsFiles: '**/junit.xml'
          - task: PublishCodeCoverageResults@1
            inputs:
              codeCoverageTool: 'Cobertura'
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/**/cobertura-coverage.xml'

  - stage: Docker
    dependsOn: Build
    jobs:
      - job: BuildAndPush
        steps:
          - task: Docker@2
            inputs:
              containerRegistry: '$(dockerRegistryServiceConnection)'
              repository: '$(imageRepository)'
              command: 'buildAndPush'
              Dockerfile: '**/Dockerfile'
              tags: |
                $(tag)
                latest
```

## CD Pipeline

```yaml
stages:
  - stage: DeployDev
    dependsOn: Docker
    condition: succeeded()
    variables:
      environment: 'dev'
    jobs:
      - deployment: Deploy
        environment: 'dev'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: KubernetesManifest@0
                  inputs:
                    action: 'deploy'
                    kubernetesServiceConnection: 'aks-dev'
                    namespace: '$(environment)'
                    manifests: 'kubernetes/overlays/dev'

  - stage: DeployStaging
    dependsOn: DeployDev
    condition: succeeded()
    variables:
      environment: 'staging'
    jobs:
      - deployment: Deploy
        environment: 'staging'
        strategy:
          canary:
            increments: [25, 50, 75, 100]
            deploy:
              steps:
                - task: KubernetesManifest@0
                  inputs:
                    action: 'deploy'
                    kubernetesServiceConnection: 'aks-staging'
                    namespace: '$(environment)'
                    manifests: 'kubernetes/overlays/staging'
                    canaryPercentage: '$(increments[0])'
```

## Multi-Stage with Approvals

```yaml
stages:
  - stage: DeployProduction
    dependsOn: DeployStaging
    condition: succeeded()
    variables:
      environment: 'production'
    jobs:
      - deployment: Deploy
        environment: 'production'
        strategy:
          rolling:
            maxParallel: 2
            preDeploy:
              steps:
                - script: echo "Running smoke tests"
            deploy:
              steps:
                - task: KubernetesManifest@0
                  inputs:
                    action: 'deploy'
                    kubernetesServiceConnection: 'aks-production'
                    namespace: '$(environment)'
                    manifests: 'kubernetes/overlays/production'
            routeTraffic:
              steps:
                - script: echo "Routing 100% traffic"
            postRouteTraffic:
              steps:
                - script: echo "Running post-deploy validation"
            on:
              failure:
                steps:
                  - script: echo "Initiating rollback"
```

## Key Points

- Use multi-stage YAML pipelines for CI/CD
- Implement canary deployments with traffic splitting
- Use rolling updates for zero-downtime deployments
- Set up environment approvals for production
- Run automated tests in pipeline stages
- Publish test results and coverage reports
- Use container registries for artifact storage
- Implement Kubernetes manifest deployments
- Use variable groups for environment configuration
- Set up branch policies for quality gates
- Monitor pipeline performance and failures
- Use templates for reusable pipeline stages
