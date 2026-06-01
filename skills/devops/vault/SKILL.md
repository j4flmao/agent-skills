---
name: vault
description: >
  Use this skill when the user says 'Vault', 'HashiCorp Vault', 'secrets
  management', 'dynamic secrets', 'transit engine', 'Vault policy', 'Vault auth
  method', 'Vault agent', 'Vault injector', 'Vault API', 'kv-v2', 'PKI
  secrets engine', 'database secrets engine', 'Vault role', 'Vault token'.
  Covers: Vault setup, secrets engines, policies, auth methods, dynamic secrets,
  transit encryption, Vault Agent, Vault+Kubernetes integration.
  Do NOT use this for: AWS Secrets Manager, Azure Key Vault, or non-HashiCorp
  secret stores.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, vault, secrets, security, phase-5]
---

# Vault

## Purpose
Manage secrets, encryption, and access control using HashiCorp Vault.

## Agent Protocol

### Trigger
Exact user phrases: "Vault", "HashiCorp Vault", "secrets management", "dynamic secrets", "transit engine", "Vault policy", "Vault auth method", "Vault agent", "Vault injector", "secret engine", "kv-v2", "Vault role", "Vault token".

### Input Context
Before activating, verify:
- Vault deployment mode (dev, HA, integrated storage, external backend).
- Auth method to use (token, Kubernetes, OIDC, AppRole, AWS IAM).
- Secrets engine needed (KV, database, PKI, Transit, AWS).
- Dynamic vs static secret requirements.

### Output Artifact
Writes to Vault CLI commands, Terraform HCL for Vault, Vault policy HCL, and/or Kubernetes injector annotations.

### Response Format
Vault CLI commands, policy HCL, or Terraform configuration with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
This skill is complete when:
- [ ] Secrets engine(s) are enabled and configured.
- [ ] Policies are defined and associated with auth methods/roles.
- [ ] Auth method is configured (Kubernetes, AppRole, OIDC, or token).
- [ ] Dynamic secrets path is validated (read + renew + revoke).
- [ ] Encryption (transit engine) or PKI is configured if needed.

### Max Response Length
Direct file write. No response text.

## Quick Start
Enable kv-v2 at `secret/`, write a policy granting read access, create a token, and test: `vault secrets enable -path=secret kv-v2` → `vault policy write` → `vault token create -policy=my-policy`.

## Decision Tree: Secrets Engine Selection
| Need | Engine | Example |
|------|--------|---------|
| Static secrets (API keys, passwords) | KV v2 | `secret/myapp/config` |
| Dynamic database credentials | Database | Short-lived DB users |
| TLS certificates | PKI | Internal mTLS, cert rotation |
| Encryption as a service | Transit | Encrypt/decrypt data at rest |
| Cloud credentials (AWS/Azure/GCP) | AWS/Azure/GCP | IAM role assumption |
| SSH access | SSH | Signed SSH certificates |

## Core Workflow

### Step 1: Vault Setup and Unseal
```bash
# Dev server (DO NOT USE in production)
vault server -dev

# Production with Integrated Storage
vault server -config=config.hcl

# config.hcl
storage "raft" {
  path = "./vault/data"
  node_id = "node1"
  retry_join {
    leader_api_addr = "https://vault-2.example.com:8200"
  }
}
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = false
  tls_cert_file = "/path/to/cert.pem"
  tls_key_file  = "/path/to/key.pem"
}
api_addr = "https://vault.example.com:8200"
cluster_addr = "https://vault.example.com:8201"
ui = true
log_level = "info"

seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/abc123"
}

# Initialize
vault operator init -key-shares=5 -key-threshold=3

# Print unseal keys and root token — store securely
vault operator unseal  # Repeat with 3 of 5 keys
```

### Step 2: Enable and Configure KV v2
```bash
# Enable KV v2
vault secrets enable -path=secret kv-v2

# Write secrets
vault kv put secret/myapp/config \
  db_url="postgres://user:pass@db:5432/app" \
  api_key="abc123"

# Read secrets
vault kv get secret/myapp/config
vault kv get -version=2 secret/myapp/config

# List versions
vault kv list secret/myapp/
vault kv metadata get secret/myapp/config

# Soft delete
vault kv delete secret/myapp/config

# Permanent destroy
vault kv destroy secret/myapp/config

# Undelete
vault kv undelete -versions=1 secret/myapp/config
```

### Step 3: Dynamic Database Secrets — PostgreSQL
```bash
vault secrets enable database

vault write database/config/postgres-prod \
  plugin_name=postgresql-database-plugin \
  allowed_roles="app-role,readonly-role" \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/app" \
  username="vault_admin" \
  password="vault_pass"

vault write database/roles/app-role \
  db_name=postgres-prod \
  creation_statements="CREATE USER \"{{name}}\" WITH PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Get dynamic credentials
vault read database/creds/app-role
# Output:
# Key                Value
# lease_id           database/creds/app-role/abc123
# lease_duration     1h
# password           a9b8c7d6e5f4
# username           v-token-app-role-x9y8z7

# Renew lease
vault lease renew database/creds/app-role/abc123

# Revoke lease
vault lease revoke database/creds/app-role/abc123
```

### Step 4: Dynamic Database Secrets — AWS RDS
```bash
vault write database/config/mysql-prod \
  plugin_name=mysql-database-plugin \
  allowed_roles="app-mysql" \
  connection_url="{{username}}:{{password}}@tcp(mysql.example.com:3306)/" \
  username="vault_admin" \
  password="vault_pass"

vault write database/roles/app-mysql \
  db_name=mysql-prod \
  creation_statements="CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}'; GRANT SELECT ON app.* TO '{{name}}'@'%';" \
  default_ttl="30m" \
  max_ttl="4h"
```

### Step 5: Policies — Detailed Examples
```hcl
# admin.hcl
path "secret/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "secret/metadata/*" {
  capabilities = ["list"]
}
path "sys/*" {
  capabilities = ["read"]
}
path "sys/health" {
  capabilities = ["read", "sudo"]
}

# developer.hcl
path "secret/data/dev/*" {
  capabilities = ["read", "list"]
}
path "secret/metadata/dev/*" {
  capabilities = ["list"]
}
path "database/creds/app-role" {
  capabilities = ["read"]
}

# ci-bot.hcl
path "secret/data/ci/*" {
  capabilities = ["read"]
}
path "database/creds/ci-role" {
  capabilities = ["read"]
}
path "transit/encrypt/ci-key" {
  capabilities = ["create", "update"]
}
path "transit/decrypt/ci-key" {
  capabilities = ["create", "update"]
}

# audit-log.hcl
path "sys/audit/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}
```

```bash
vault policy write admin admin.hcl
vault policy write developer developer.hcl
vault policy write ci-bot ci-bot.hcl
```

### Step 6: Auth Methods
```bash
# Kubernetes auth
vault auth enable kubernetes
vault write auth/kubernetes/config \
  kubernetes_host=https://kubernetes.default.svc \
  token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

vault write auth/kubernetes/role/my-app \
  bound_service_account_names=my-app \
  bound_service_account_namespaces=default \
  policies=developer \
  ttl=1h \
  max_ttl=24h \
  period=0

# AppRole auth
vault auth enable approle
vault write auth/approle/role/my-role \
  secret_id_ttl=10m \
  secret_id_num_uses=1 \
  token_ttl=1h \
  token_max_ttl=4h \
  token_policies=ci-bot

vault read auth/approle/role/my-role/role-id
vault write -f auth/approle/role/my-role/secret-id

# OIDC auth
vault auth enable oidc
vault write auth/oidc/config \
  oidc_discovery_url="https://accounts.example.com" \
  oidc_client_id="vault-client" \
  oidc_client_secret="client-secret" \
  default_role="developer"

vault write auth/oidc/role/developer \
  bound_audiences="vault-client" \
  allowed_redirect_uris=["https://vault.example.com:8200/oidc/callback"] \
  user_claim="sub" \
  policies="developer" \
  ttl="1h"

# AWS IAM auth
vault auth enable aws
vault write auth/aws/config/client \
  access_key="AKIA..." \
  secret_key="..."

vault write auth/aws/role/deploy-role \
  auth_type=iam \
  bound_iam_principal_arn="arn:aws:iam::123456789012:role/deploy-role" \
  policies=ci-bot \
  ttl=1h
```

### Step 7: PKI Secrets Engine
```bash
vault secrets enable pki
vault secrets tune -max-lease-ttl=87600h pki

# Generate root CA
vault write pki/root/generate/internal \
  common_name=example.com \
  ttl=87600h

# Configure CRL and issuing URLs
vault write pki/config/urls \
  issuing_certificates="https://vault.example.com:8200/v1/pki/ca" \
  crl_distribution_points="https://vault.example.com:8200/v1/pki/crl"

# Create role for cert issuance
vault write pki/roles/shared \
  allowed_domains=example.com \
  allow_subdomains=true \
  max_ttl=720h \
  key_type=rsa \
  key_bits=2048

# Issue cert
vault write pki/issue/shared \
  common_name=myapp.example.com \
  ttl=24h
```

### Step 8: Transit Engine — Encryption as a Service
```bash
vault secrets enable transit

# Create encryption key
vault write -f transit/keys/payment-keys

# Rotate key
vault write -f transit/keys/payment-keys/rotate

# Encrypt
vault write transit/encrypt/payment-keys \
  plaintext=$(echo -n "sensitive-data" | base64)

# Decrypt
vault write transit/decrypt/payment-keys \
  ciphertext="vault:v1:abc123..."

# Create key with exportable material
vault write transit/keys/exportable-key \
  type=aes256-gcm96 \
  exportable=true

# Create datakey (envelope encryption)
vault write transit/datakey/plaintext/payment-keys \
  key_version=1 \
  bits=256
```

### Step 9: Vault Agent for Auto-Auth
```hcl
# vault-agent.hcl
pid_file = "/tmp/vault-agent-pid"

vault {
  address = "https://vault.example.com:8200"
}

auto_auth {
  method "kubernetes" {
    mount_path = "auth/kubernetes"
    config = {
      role = "my-app"
    }
  }

  sink "file" {
    config = {
      path = "/vault/secrets/token"
    }
  }
}

template {
  source      = "/vault/templates/config.ctmpl"
  destination = "/app/config/.env"
  create_dest_dirs = true
}
```

```ctmpl
# /vault/templates/config.ctmpl
{{- with secret "secret/data/myapp/config" }}
DB_URL={{ .Data.data.db_url }}
API_KEY={{ .Data.data.api_key }}
{{- end }}

{{- with secret "database/creds/app-role" }}
DB_USER={{ .Data.username }}
DB_PASS={{ .Data.password }}
{{- end }}
```

### Step 10: Vault Agent Injector (Kubernetes)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "my-app"
    vault.hashicorp.com/agent-inject-secret-config: "secret/data/myapp/config"
    vault.hashicorp.com/agent-inject-template-config: |
      {{- with secret "secret/data/myapp/config" -}}
      export DB_URL={{ .Data.data.db_url }}
      export API_KEY={{ .Data.data.api_key }}
      {{- end -}}
    vault.hashicorp.com/agent-run-as-user: "1000"
    vault.hashicorp.com/agent-run-as-group: "1000"
```

### Step 11: Audit Logging
```bash
# Enable file audit
vault audit enable file file_path=/vault/logs/audit.log

# Enable syslog audit
vault audit enable syslog \
  facility="AUTH" \
  tag="vault" \
  log_level="info"

# List audit devices
vault audit list

# Disable audit
vault audit disable file/
```

### Step 12: Terraform Provider for Vault
```hcl
provider "vault" {
  address = "https://vault.example.com:8200"
  token   = var.vault_token
}

resource "vault_mount" "kv" {
  path = "secret"
  type = "kv-v2"
}

resource "vault_policy" "developer" {
  name = "developer"
  policy = file("policies/developer.hcl")
}

resource "vault_kubernetes_auth_backend_config" "k8s" {
  backend = vault_auth_backend.kubernetes.path
  kubernetes_host = "https://kubernetes.default.svc"
}

resource "vault_kubernetes_auth_backend_role" "app" {
  backend                          = vault_auth_backend.kubernetes.path
  role_name                        = "my-app"
  bound_service_account_names      = ["my-app"]
  bound_service_account_namespaces = ["default"]
  token_policies                   = ["developer"]
  token_ttl                        = 3600
}

resource "vault_database_secret_backend_connection" "postgres" {
  backend       = vault_mount.database.path
  name          = "postgres-prod"
  allowed_roles = ["app-role"]

  postgresql {
    connection_url = "postgresql://{{username}}:{{password}}@postgres:5432/app"
    username       = "vault_admin"
    password       = var.db_admin_password
  }
}

resource "vault_database_secret_backend_role" "app_role" {
  backend = vault_mount.database.path
  name    = "app-role"
  db_name = vault_database_secret_backend_connection.postgres.name
  creation_statements = [
    "CREATE USER \"{{name}}\" WITH PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";"
  ]
  default_ttl = 3600
  max_ttl     = 86400
}
```

## Rules & Constraints
- Never use dev mode in production — always configure HA and seal/unseal properly
- Always set `default_ttl` and `max_ttl` on dynamic credentials — never omit
- Every policy follows least privilege — grant only the capabilities needed
- Use `kv-v2` over `kv-v1` for secret versioning and delete protection
- Store Vault unseal keys in a secure key management system, never in code
- Use response wrapping for distributing secrets to CI/CD
- Enable audit logging in production
- Use auto-unseal (AWS KMS, Azure KeyVault, GCP KMS) in production
- Set `max_lease_ttl` of 1h for dynamic secrets whenever possible

## Production Considerations
- Deploy Vault with 3 or 5 nodes for HA with Raft storage.
- Use auto-unseal with cloud KMS (AWS KMS, Azure KeyVault, GCP KMS).
- Enable audit logging to both file and syslog for redundancy.
- Store unseal keys in a secure KMS (AWS Secrets Manager, Azure Key Vault).
- Use Vault Agent sidecar for app secret injection instead of SDK.
- Set conservative TTLs: 1h default, 24h max for dynamic secrets.
- Monitor Vault cluster health: `vault operator raft list-peers`.
- Configure performance replication for multi-region access.
- Use response wrapping for CI/CD pipeline secret delivery.
- Block root token usage after initial setup — use auth methods.

## Anti-Patterns
- Dev mode in production — single node, no TLS, in-memory storage.
- No TTL on dynamic secrets — credentials never expire.
- Overly permissive policies (wildcard `*` capabilities) — security risk.
- Storing unseal keys alongside Vault config — defeats security purpose.
- No audit logging — can't trace who accessed which secret.
- Using root token for daily operations — no audit trail, no revocation.
- Not rotating transit keys — compromised key affects all encrypted data.
- Manual secrets management — Vault is automated secrets, not a password manager.
- Cross-mount policy bypass — ensuring policies restrict cross-path access.
- Skipping replication setup in multi-region — high latency for secret reads.

## References
  - references/secrets-engines.md — Secrets Engines
  - references/vault-advanced.md — Vault Advanced Topics
  - references/vault-basics.md — Vault Basics
  - references/vault-fundamentals.md — Vault Fundamentals
  - references/vault-integration.md — Vault Integration
  - references/vault-policies.md — Vault Policies
## Handoff
After completing this skill:
- Next skill: **aws** — IAM roles for Vault AWS engine, Vault on EKS
- Pass context: Vault address, auth method, policy paths
