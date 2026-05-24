# Helm Security

## Chart Signing and Verification

```bash
# Generate signing key
gpg --full-generate-key
helm repo add myrepo https://charts.example.com
helm repo index --sign --key mykey@example.com

# Sign a chart
helm package ./chart --sign --key mykey --keyring ~/.gnupg/secring.gpg

# Verify a chart
helm verify chart-1.0.0.tgz
helm install my-release ./chart-1.0.0.tgz --verify
```

| Concept | Purpose |
|---------|---------|
| Provenance file | `.prov` file with signature, shipped alongside `.tgz` |
| Keyring | GPG keyring with trusted signers |
| Verification | `helm verify` checks signature before install |
| CI signing | Sign in CI pipeline using air-gapped key |

## OCI Registry for Charts

```bash
# Login to OCI registry
helm registry login registry.example.com

# Save chart to OCI
helm package ./chart
helm push chart-1.0.0.tgz oci://registry.example.com/helm-charts

# Install from OCI
helm install my-release oci://registry.example.com/helm-charts/chart --version 1.0.0

# Pull chart
helm pull oci://registry.example.com/helm-charts/chart --version 1.0.0
```

| Registry | Helm OCI Support |
|----------|-----------------|
| Docker Hub | Yes |
| GitHub Container Registry | Yes |
| GitLab Container Registry | Yes |
| AWS ECR | Yes (with credential helper) |
| Azure ACR | Yes |
| GCP Artifact Registry | Yes |
| Harbor | Yes (native) |

## RBAC for Helm

| Role | Operations |
|------|-----------|
| Helm operator | Install, upgrade, rollback, delete releases |
| Helm reader | List releases, get release status, history |
| Helm developer | Create charts, lint, package, push to registry |

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: helm-operator
rules:
- apiGroups: ["apps", "batch", ""]
  resources: ["*"]
  verbs: ["*"]
- apiGroups: ["helm.sh"]
  resources: ["*"]
  verbs: ["*"]
```

## Secrets Management

```yaml
# SealedSecrets — encrypted in git, decrypted by controller
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: app-secrets
spec:
  encryptedData:
    DB_PASSWORD: AgBy3i4...

# External Secrets Operator — sync from external provider
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  secretStoreRef:
    kind: ClusterSecretStore
    name: aws-secretsmanager
  target:
    name: app-secrets
  data:
  - secretKey: DB_PASSWORD
    remoteRef:
      key: /production/app/db-password
```

## Chart Security Best Practices

| Practice | Why |
|----------|-----|
| Pin image tags (never `latest`) | Reproducible deployments |
| No secrets in values.yaml | Use SealedSecrets or ESO |
| `readOnlyRootFilesystem: true` | Container security |
| `runAsNonRoot: true` | Privilege escalation prevention |
| Network policies | Restrict pod communication |
| Signed charts | Supply chain security |
| Minimal RBAC | Least privilege for chart roles |
| Scan images with Trivy | Vulnerability detection |
