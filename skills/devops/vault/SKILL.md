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

## When to Use This Skill
- Setting up Vault for the first time
- Integrating Vault with Kubernetes (sidecar injector or CSI)
- Configuring dynamic database credentials
- Implementing encryption-as-a-service with Transit engine
- Rotating PKI certificates automatically

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

# Initialize
vault operator init -key-shares=5 -key-threshold=3

# Unseal
vault operator unseal
```

### Step 2: Enable Secrets Engine (KV v2)
```bash
# Enable KV v2
vault secrets enable -path=secret kv-v2

# Write secrets
vault kv put secret/myapp/config \
  db_url="postgres://user:pass@db:5432/app" \
  api_key="abc123"

# Read secrets
vault kv get secret/myapp/config

# List versions
vault kv list secret/myapp/
vault kv metadata get secret/myapp/config

# Delete / destroy
vault kv delete secret/myapp/config
vault kv destroy secret/myapp/config  # Permanently destroy version
```

### Step 3: Dynamic Database Secrets
```bash
# Enable database engine
vault secrets enable database

# Configure PostgreSQL
vault write database/config/postgres-db \
  plugin_name=postgresql-database-plugin \
  allowed_roles="my-role" \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/app" \
  username="vault_admin" \
  password="vault_pass"

# Create dynamic role
vault write database/roles/my-role \
  db_name=postgres-db \
  creation_statements="CREATE USER \"{{name}}\" WITH PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Get dynamic credentials
vault read database/creds/my-role
```

### Step 4: Policies
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

# developer.hcl
path "secret/data/dev/*" {
  capabilities = ["read", "list"]
}
path "secret/metadata/dev/*" {
  capabilities = ["list"]
}

# ci-bot.hcl
path "secret/data/ci/*" {
  capabilities = ["read"]
}
path "database/creds/ci-role" {
  capabilities = ["read"]
}
```

```bash
# Write policies
vault policy write admin admin.hcl
vault policy write developer developer.hcl
vault policy write ci-bot ci-bot.hcl
```

### Step 5: Auth Methods
```bash
# Kubernetes auth
vault auth enable kubernetes
vault write auth/kubernetes/config \
  kubernetes_host=https://kubernetes.default.svc \
  token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Create role for a service account
vault write auth/kubernetes/role/my-app \
  bound_service_account_names=my-app \
  bound_service_account_namespaces=default \
  policies=developer \
  ttl=1h

# AppRole auth
vault auth enable approle
vault write auth/approle/role/my-role \
  secret_id_ttl=10m \
  token_ttl=1h \
  token_policies=ci-bot

# Get RoleID and SecretID
vault read auth/approle/role/my-role/role-id
vault write -f auth/approle/role/my-role/secret-id
```

## Rules & Constraints
- Never use dev mode in production — always configure HA and seal/unseal properly
- Always set `default_ttl` and `max_ttl` on dynamic credentials — never omit
- Every policy follows least privilege — grant only the capabilities needed
- Use `kv-v2` over `kv-v1` for secret versioning and delete protection
- Store Vault unseal keys in a secure key management system, never in code
- Use response wrapping for distributing secrets to CI/CD
- Enable audit logging in production

## Output Format
Vault CLI commands, policy HCL files, Terraform resources for Vault configuration.

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
