# Secret Storage

## HashiCorp Vault

### Deployment
Kubernetes: Vault Helm chart with HA mode, integrated storage (Raft). Auth methods: Kubernetes (pods authenticate via service account), AppRole (machine-to-machine), OIDC (human users). Seal: auto-unseal with cloud KMS (AWS KMS, GCP Cloud KMS, Azure Key Vault).

### Secret Structure
```
secret/data/<environment>/<service>/<key>
secret/data/production/orders-api/db_password
secret/data/staging/orders-api/db_password
```

### Access Policies
```hcl
path "secret/data/production/orders-api/*" {
  capabilities = ["read"]
}
path "secret/data/production/inventory-api/*" {
  capabilities = ["read"]
}
path "secret/metadata/production/*" {
  capabilities = ["list"]
}
```

### Dynamic Secrets
Database: short-lived credentials with TTL. PostgreSQL: `vault write database/creds/app-readonly ttl=1h`. Auto-revoke: credentials expire after TTL, no manual rotation. Best for: database access, service-to-service auth.

### CLI Usage
```bash
vault kv get secret/production/orders-api/db_password
vault kv put secret/staging/orders-api/db_password value=dev-pass
vault kv delete secret/development/orders-api/db_password
```

## AWS Secrets Manager

### Secret Structure
```
/aws/reference/secretsmanager/{secret_id}
Naming: /<env>/<service>/<key>
```

### Rotation
Automatic rotation via Lambda. Supported: RDS databases, Redshift, DocumentDB, custom Lambda function. Rotation window: schedule expression `rate(30 days)`. Lambda function: create secret, test secret, update secret, complete rotation.

### Access Control
```json
{
  "Effect": "Allow",
  "Action": "secretsmanager:GetSecretValue",
  "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:production/*"
}
```
Use IAM roles for EC2/EKS, IAM users for external access.

## Kubernetes External Secrets

### Installation
```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets
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
  data:
  - secretKey: password
    remoteRef:
      key: production/orders-api/db_password
```

### Sync Behavior
Poll interval: 1 hour (default). Push: trigger sync via annotation. Deletion policy: Delete (delete K8s secret when ExternalSecret deleted), Retain (keep), Merge.

## Rotation Patterns

### Rotation Strategies
- Co-rotation: create new version while old version remains valid
- Dual credentials: two active credentials, rotate one at a time
- Zero-downtime: maintain both old and new during rotation window
- Grace period: old credential valid for N hours after rotation

### Rotation Automation
Database passwords: update app config + reload (SIGHUP, rolling restart). API keys: generate new key, deploy new key, deprecate old key, revoke old key. Certificates: auto-renew with cert-manager (K8s). Token refreshes: short-lived tokens, auto-refresh via SDK.

### Rotation Schedule
- Database credentials: 30 days
- API keys: 90 days
- JWT signing keys: 180 days
- TLS certificates: 90 days (Let's Encrypt) or 1 year
- Cloud provider keys: rotate immediately on suspected compromise
