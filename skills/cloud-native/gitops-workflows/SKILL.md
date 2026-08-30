# GitOps Workflows & Progressive Delivery

## 1. Skill Context
**Focus**: ArgoCD, FluxCD, declarative infrastructure, secrets management, and progressive delivery (Canary/Blue-Green).
**Triggers**: argocd setup, gitops workflow, multi-cluster gitops, manage secrets gitops, progressive delivery

## 2. Deep GitOps Mechanics
The agent must treat Git as the absolute source of truth for the entire Kubernetes state.

### Multi-Environment Synchronization
- **App of Apps Pattern (ArgoCD)**: Managing a root application that recursively deploys other applications to bootstrap entire clusters from scratch.
- **Branching Strategies**: Environment-per-branch (legacy) vs Environment-per-folder (recommended). Promoting configurations via Pull Requests from `overlays/staging` to `overlays/production`.

### Managing Secrets in GitOps
- **The Problem**: Committing raw Kubernetes Secrets to Git is a critical security vulnerability.
- **Solutions**:
  - **Sealed Secrets (Bitnami)**: Asymmetric encryption where the public key encrypts the manifest, and only the cluster holds the private decryption key.
  - **External Secrets Operator (ESO)**: GitOps manages the *reference* to a secret in AWS Secrets Manager / HashiCorp Vault. The operator fetches the real value and injects it into a native K8s Secret at runtime.

### Progressive Delivery
- **Flagger / Argo Rollouts**: Moving beyond basic Rolling Updates. Incrementally shifting traffic (e.g., 5%, 10%, 50%) to the new version using an Ingress Controller/Service Mesh (Istio, Nginx) while continuously querying Prometheus metrics to ensure the new version is healthy before proceeding.

## 3. Output Format
- Provide Kustomize or Helm directory structures for multi-env GitOps.
- Output ArgoCD `Application` or `ApplicationSet` YAMLs.
- Explain the reconciliation loop and drift detection mechanisms.
