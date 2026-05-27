# Google Cloud DevOps

## Cloud Build CI/CD

```yaml
steps:
  - name: node:18
    entrypoint: npm
    args: ['ci']

  - name: node:18
    entrypoint: npm
    args: ['run', 'lint']

  - name: node:18
    entrypoint: npm
    args: ['run', 'test', '--', '--coverage']

  - name: gcr.io/cloud-builders/docker
    args:
      - build
      - -t
      - us-central1-docker.pkg.dev/$PROJECT_ID/myapp/myapp:$SHORT_SHA
      - -t
      - us-central1-docker.pkg.dev/$PROJECT_ID/myapp/myapp:latest
      - .

  - name: gcr.io/cloud-builders/docker
    args:
      - push
      - us-central1-docker.pkg.dev/$PROJECT_ID/myapp/myapp:$SHORT_SHA

  - name: gcr.io/cloud-builders/kubectl
    entrypoint: bash
    args:
      - -c
      - |
        sed -i "s|image:.*|image: us-central1-docker.pkg.dev/$PROJECT_ID/myapp/myapp:$SHORT_SHA|g" kubernetes/deployment.yaml
        kubectl apply -f kubernetes/

images:
  - us-central1-docker.pkg.dev/$PROJECT_ID/myapp/myapp

options:
  machineType: E2_HIGHCPU_8

timeout: 1800s
```

## Cloud Deploy Delivery

```yaml
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: myapp-pipeline
description: Main application delivery pipeline
serialPipeline:
  stages:
    - targetId: dev
      profiles: [dev]
    - targetId: staging
      profiles: [staging]
      strategy:
        canary:
          canaryDeployment:
            percentages: [25, 50, 75, 100]
    - targetId: prod
      profiles: [prod]
      strategy:
        canary:
          runtimeConfig:
            kubernetes:
              gatewayServiceMesh:
                deployment:
                  percentage: 10
                  verify: true

---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: dev
description: Development cluster
gke:
  cluster: projects/$PROJECT_ID/locations/us-central1/clusters/gke-dev

---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: prod
description: Production cluster
requireApproval: true
gke:
  cluster: projects/$PROJECT_ID/locations/us-central1/clusters/gke-prod
```

## Secret Management

```yaml
steps:
  - name: gcr.io/google.com/cloudsdktool/cloud-sdk
    entrypoint: bash
    args:
      - -c
      - |
        gcloud secrets versions access latest --secret=db-password > /tmp/db-password
        gcloud secrets versions access latest --secret=api-key > /tmp/api-key

  - name: gcr.io/cloud-builders/kubectl
    entrypoint: bash
    args:
      - -c
      - |
        kubectl create secret generic app-secrets \
          --from-file=db-password=/tmp/db-password \
          --from-file=api-key=/tmp/api-key \
          --dry-run=client -o yaml | kubectl apply -f -

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/db-password/versions/latest
      env: DB_PASSWORD
    - versionName: projects/$PROJECT_ID/secrets/api-key/versions/latest
      env: API_KEY
```

## Key Points

- Use Cloud Build for containerized CI/CD pipelines
- Integrate with Secret Manager for secrets
- Use Cloud Deploy for progressive delivery
- Implement canary deployments with Cloud Deploy
- Use Artifact Registry for container images
- Configure build triggers for automated builds
- Use Cloud Run for serverless deployments
- Implement IAM roles for least privilege
- Use Cloud Source Repositories or GitHub integration
- Enable VPC Service Controls for data security
- Use Cloud Scheduler for cron jobs
- Monitor deployments with Cloud Operations
