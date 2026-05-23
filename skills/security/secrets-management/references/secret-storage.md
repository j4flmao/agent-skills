# Secret Storage

## HashiCorp Vault

### Deployment
Kubernetes: Vault Helm chart with HA mode (3 replicas), integrated storage via Raft. Auth methods: Kubernetes (pods authenticate via service account JWT), AppRole (machine-to-machine with secret_id + role_id), OIDC (human users via SSO). Seal: auto-unseal with cloud KMS — AWS KMS, GCP Cloud KMS, Azure Key Vault. For on-prem: Vault on VMs with Consul or Raft backend.

### Secret Structure
```
secret/data/<environment>/<service>/<key>
secret/data/production/orders-api/db_password
secret/data/staging/orders-api/db_password
secret/data/development/orders-api/db_password
```

### Access Policies
```hcl
path "secret/data/production/orders-api/*" {
  capabilities = ["read"]
}
path "secret/data/production/*" {
  capabilities = ["list"]
}
path "secret/metadata/production/*" {
  capabilities = ["list"]
}
```

### Dynamic Secrets
Database: short-lived credentials with configurable TTL. PostgreSQL: `vault write database/creds/app-readonly ttl=1h`. Auto-revoke: credentials expire after TTL, no manual rotation needed. Best for: database access (PostgreSQL, MySQL, MongoDB), service-to-service auth, cloud IAM roles.

### CLI Usage
```bash
vault kv get secret/production/orders-api/db_password
vault kv put secret/staging/orders-api/db_password value=dev-pass
vault kv delete secret/development/orders-api/db_password
vault list secret/metadata/production
```

## AWS Secrets Manager

### Secret Structure
```
/aws/reference/secretsmanager/{secret_id}
Naming: /<env>/<service>/<key>
/production/orders-api/db-password
/staging/orders-api/db-password
```

### Rotation
Automatic rotation via Lambda. Supported targets: RDS databases (MySQL, PostgreSQL, MariaDB, SQL Server, Oracle), Redshift, DocumentDB, custom Lambda function. Rotation schedule: `rate(30 days)`. Lambda rotation stages: create secret (generate new), test secret (verify new works), update secret (make new active), complete rotation (deprecate old). Zero-downtime rotation: old secret remains valid during rotation window.

### Access Control
```json
{
  "Effect": "Allow",
  "Action": "secretsmanager:GetSecretValue",
  "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:production/*"
}
```
Use IAM roles for EC2/EKS, IAM users for external access. Cross-account access via resource-based policies.

## GCP Secret Manager

### Configuration
```
projects/{project_id}/secrets/{secret_id}/versions/{version}
```
IAM roles: Secret Manager Viewer (read), Secret Manager Admin (full). Replication: automatic multi-region or user-managed location. Payload: up to 64KB per secret version. CMEK: customer-managed encryption keys supported.

### Access via gcloud
```bash
gcloud secrets versions access latest --secret="db-password"
gcloud secrets add-version "db-password" --data-file="password.txt"
```

## Azure Key Vault

### Features
Soft-delete protection (retain deleted secrets for configurable days). RBAC integration with Azure AD. Access policies per vault. Integration with Azure managed identities for automatic credential rotation.

## Kubernetes External Secrets

### Installation
```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace
```

### SecretStore Configuration
```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  secretStoreRef:
    name: aws-secrets-manager
  target:
    name: db-credentials
    deletionPolicy: Delete
  data:
  - secretKey: password
    remoteRef:
      key: production/orders-api/db_password
```

### Sync Behavior
Poll interval: 1 hour (default). Push: trigger sync via `external-secrets.io/refresh` annotation. Deletion policy: Delete (remove K8s secret when ExternalSecret deleted), Retain (keep on deletion), Merge (combine with existing). Supports: AWS, GCP, Azure, Vault, and 20+ providers.

## Rotation Patterns

### Rotation Strategies
Co-rotation: create new version while old remains valid. Dual credentials: two active credentials, rotate one at a time. Zero-downtime: maintain both old and new during rotation window. Grace period: old credential valid for N hours after rotation.

### Rotation Automation
Database passwords: update app config + SIGHUP reload or rolling restart. API keys: generate new key, deploy new, deprecate old, revoke old after grace period. Certificates: auto-renew with cert-manager (K8s) using Let's Encrypt. Token refreshes: short-lived tokens, auto-refresh via SDK (Vault agent, AWS SDK).

### Rotation Schedule
Database credentials: 30 days. API keys: 90 days. JWT signing keys: 180 days. TLS certificates: 90 days (Let's Encrypt) or 1 year. Cloud provider keys: immediate on suspected compromise.

### Audit Logging
Vault audit: all secret access logged with timestamp, path, auth method. Cloud audit trails: CloudTrail (AWS), Cloud Audit Logs (GCP), Azure Monitor. Retention: 90 days hot, 7 years cold for compliance. Alert on: multiple failed reads, access from unusual IP, bulk retrieval.
