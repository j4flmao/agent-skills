# CircleCI Kubernetes Integration

## Overview

CircleCI integrates with Kubernetes for build, test, and deployment workflows. Supported methods include Helm charts, raw kubectl commands, kustomize overlays, and service account authentication.

## Authentication

### Cluster Authentication Methods

#### Kubeconfig Context
```yaml
orbs:
  aws-eks: circleci/aws-eks@2.2.2

jobs:
  deploy:
    docker:
      - image: cimg/python:3.12
    steps:
      - checkout
      - aws-eks/update-kubeconfig-with-authenticator:
          cluster-name: my-cluster
          region: us-east-1
          aws-profile: eks-admin
      - run: kubectl get pods
```

#### GKE Authentication
```yaml
orbs:
  gcp-cli: circleci/gcp-cli@3.0.0

jobs:
  deploy-gke:
    docker:
      - image: cimg/google-cloud-sdk:latest
    steps:
      - checkout
      - gcp-cli/setup:
          google-project-id: my-project
          google-application-credentials: GOOGLE_APPLICATION_CREDENTIALS
      - run: |
          gcloud container clusters get-credentials my-cluster --zone us-central1
          kubectl apply -f k8s/
```

#### Config File Authentication
```yaml
jobs:
  deploy:
    docker:
      - image: cimg/base:stable
    steps:
      - run: |
          mkdir -p ~/.kube
          echo "$KUBECONFIG_DATA" | base64 -d > ~/.kube/config
          kubectl get nodes
```

## Helm Deployment

### Basic Helm Deploy
```yaml
jobs:
  helm-deploy:
    docker:
      - image: alpine/helm:3.14.3
    steps:
      - checkout
      - run: |
          echo "$KUBECONFIG_DATA" | base64 -d > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig
          helm upgrade --install my-app ./charts/my-app \
            --namespace production \
            --set image.tag=${CIRCLE_SHA1} \
            --set replicaCount=3 \
            --wait --timeout 5m
```

### Helm with Values Management
```yaml
jobs:
  helm-deploy-env:
    parameters:
      environment:
        type: string
    docker:
      - image: alpine/helm:3.14.3
    steps:
      - checkout
      - run: |
          echo "$KUBECONFIG_DATA" | base64 -d > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig

          # Environment-specific values
          helm upgrade --install my-app ./charts/my-app \
            --namespace << parameters.environment >> \
            --values ./charts/values/<< parameters.environment >>.yaml \
            --set image.tag=${CIRCLE_SHA1} \
            --wait --timeout 5m

workflows:
  deploy:
    jobs:
      - helm-deploy-env:
          name: deploy-staging
          environment: staging
          filters:
            branches:
              only: main
      - hold:
          type: approval
          requires:
            - deploy-staging
      - helm-deploy-env:
          name: deploy-production
          environment: production
          requires:
            - hold
```

### Helm with Dependency Build
```yaml
jobs:
  helm-package:
    docker:
      - image: alpine/helm:3.14.3
    steps:
      - checkout
      - run: |
          cd charts/my-app
          helm dependency build
          helm lint
          helm package . -d ../../dist/
      - persist_to_workspace:
          root: dist
          paths:
            - my-app-*.tgz

  helm-deploy:
    docker:
      - image: alpine/helm:3.14.3
    steps:
      - attach_workspace:
          at: /tmp/charts
      - run: |
          export KUBECONFIG=/tmp/kubeconfig
          helm upgrade --install my-app /tmp/charts/my-app-*.tgz \
            --namespace production \
            --wait
```

## kubectl Deployment

### Basic kubectl
```yaml
jobs:
  kubectl-deploy:
    docker:
      - image: bitnami/kubectl:1.29
    steps:
      - checkout
      - run: |
          echo "$KUBECONFIG_DATA" | base64 -d > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig

          # Update deployment image
          kubectl set image deployment/my-app app=myregistry/my-app:${CIRCLE_SHA1} \
            --namespace production

          # Rollout status
          kubectl rollout status deployment/my-app \
            --namespace production \
            --timeout=5m
```

### Canary Deployment with kubectl
```yaml
jobs:
  deploy-canary:
    docker:
      - image: bitnami/kubectl:1.29
    steps:
      - run: |
          export KUBECONFIG=/tmp/kubeconfig

          # Deploy canary (10% traffic)
          kubectl set image deployment/my-app-canary app=myregistry/my-app:${CIRCLE_SHA1} \
            --namespace production
          kubectl rollout status deployment/my-app-canary \
            --namespace production --timeout=5m

  promote-canary:
    docker:
      - image: bitnami/kubectl:1.29
    steps:
      - run: |
          export KUBECONFIG=/tmp/kubeconfig

          # Promote canary to stable
          kubectl set image deployment/my-app app=myregistry/my-app:${CIRCLE_SHA1} \
            --namespace production
          kubectl rollout status deployment/my-app \
            --namespace production --timeout=5m
```

### Blue-Green Deployment
```yaml
jobs:
  blue-green:
    docker:
      - image: bitnami/kubectl:1.29
    steps:
      - run: |
          export KUBECONFIG=/tmp/kubeconfig
          NEW_VERSION="green"

          # Deploy new version
          kubectl apply -f k8s/deployment-${NEW_VERSION}.yaml
          kubectl rollout status deployment/app-${NEW_VERSION} --timeout=5m

          # Switch service selector
          kubectl patch service app -p \
            '{"spec":{"selector":{"version":"'${NEW_VERSION}'"}}}'

          # Scale down old version
          kubectl scale deployment/app-blue --replicas=0
```

## Kustomize

### Basic Kustomize
```yaml
jobs:
  kustomize-deploy:
    docker:
      - image: k8s.gcr.io/kustomize/kustomize:v5.4.0
    steps:
      - checkout
      - run: |
          echo "$KUBECONFIG_DATA" | base64 -d > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig

          # Build and apply
          kustomize build overlays/production | kubectl apply -f -
```

### Kustomize with Image Override
```yaml
jobs:
  kustomize-deploy-env:
    parameters:
      overlay:
        type: string
    docker:
      - image: k8s.gcr.io/kustomize/kustomize:v5.4.0
    steps:
      - checkout
      - run: |
          export KUBECONFIG=/tmp/kubeconfig

          # Override image tag and deploy
          cd overlays/<< parameters.overlay >>
          kustomize edit set image my-app=myregistry/my-app:${CIRCLE_SHA1}
          kustomize build . | kubectl apply -f -
```

## AWS EKS Integration

### EKS Orb
```yaml
orbs:
  aws-cli: circleci/aws-cli@3.1.4
  aws-eks: circleci/aws-eks@2.2.2

jobs:
  deploy-eks:
    docker:
      - image: cimg/python:3.12
    steps:
      - checkout
      - aws-cli/setup:
          aws-access-key-id: AWS_ACCESS_KEY_ID
          aws-secret-access-key: AWS_SECRET_ACCESS_KEY
          aws-region: AWS_REGION
      - aws-eks/update-kubeconfig-with-authenticator:
          cluster-name: my-eks-cluster
          install-kubectl: true
          aws-region: AWS_REGION
      - run: |
          kubectl apply -f k8s/
          kubectl rollout status deployment/app
```

### ECR + EKS Workflow
```yaml
orbs:
  docker: circleci/docker@2.5.0
  aws-eks: circleci/aws-eks@2.2.2

jobs:
  build-push:
    executor: docker/docker
    steps:
      - checkout
      - setup_remote_docker:
          docker_layer_caching: true
      - docker/check:
          docker-username: AWS
          docker-password: $AWS_ECR_PASSWORD
          registry: $AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
      - docker/build:
          image: $AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/my-app
          tag: ${CIRCLE_SHA1}
      - docker/push:
          image: $AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/my-app
          tag: ${CIRCLE_SHA1}

  deploy-eks:
    docker:
      - image: cimg/python:3.12
    steps:
      - checkout
      - aws-eks/update-kubeconfig-with-authenticator:
          cluster-name: my-eks-cluster
      - run: |
          kubectl set image deployment/app \
            app=$AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/my-app:${CIRCLE_SHA1}

workflows:
  build-deploy:
    jobs:
      - build-push
      - deploy-eks:
          requires:
            - build-push
```

## Security Context

### CircleCI Context for K8s Credentials
```yaml
# CircleCI web UI → Organization Settings → Contexts
# Create context: k8s-production
# Add environment variables:
#   KUBECONFIG_DATA (base64-encoded kubeconfig)
#   K8S_NAMESPACE: production

workflows:
  deploy:
    jobs:
      - deploy:
          context: k8s-production  # Secure access to credentials
```

### Restricted Service Account
```yaml
# k8s/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: circleci-deployer
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
  name: deployer
rules:
- apiGroups: ["apps", "extensions"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch", "create", "update"]
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["get", "list", "watch", "create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: circleci-deployer-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: circleci-deployer
  namespace: production
roleRef:
  kind: Role
  name: deployer
  apiGroup: rbac.authorization.k8s.io
```

## Best Practices

1. **Use CircleCI contexts** for K8s credentials — never inline in config.yml.
2. **Base64 encode kubeconfig** files before storing as environment variables.
3. **Pin kubectl version** to match cluster version (within +/-1 minor version).
4. **Use `rollout status`** after apply to wait for deployment readiness.
5. **Set `--timeout`** on all kubectl rollout commands to prevent stuck pipelines.
6. **Separate build from deploy** — build images in one job, deploy in another.
7. **Use namespaces** for environment isolation within a cluster.
8. **Least privilege RBAC** — CircleCI deployer accounts need minimal permissions.
9. **Test kustomize overlays** in CI before deploying to production.
10. **Use Helm for complex deployments** — kubectl for simple updates.
