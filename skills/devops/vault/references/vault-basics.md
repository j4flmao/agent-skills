# Vault Basics

## Architecture

```
┌────────────────────────────────────────────┐
│              Vault Cluster                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  Node 1 │  │  Node 2 │  │  Node 3 │    │
│  │ (Sealed)│  │(Unsealed)│  │(Unsealed)│   │
│  └────┬────┘  └────┬────┘  └────┬────┘    │
│       │            │            │          │
│  ┌────┴────────────┴────────────┴────┐     │
│  │      Integrated Storage (Raft)     │     │
│  └───────────────────────────────────┘     │
└────────────────────────────────────────────┘
         │
         │ HTTPS
         ▼
    ┌────────────┐
    │  Clients   │
    │ (App, CLI, │
    │  K8s, CI)  │
    └────────────┘
```

## Deployment Modes

| Mode | Storage | HA | Use case |
|------|---------|----|----------|
| Dev | In-memory | No | Testing only |
| Integrated | Raft | Yes | Self-managed, simple |
| Consul | Consul | Yes | Existing Consul infra |
| File | Filesystem | No | Single node, dev |

## Initialization and Unsealing

```bash
# Initialize
vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -pgp-keys="keybase:user1,keybase:user2,..."

# Output:
# Unseal Key 1: abc...
# Unseal Key 2: def...
# Unseal Key 3: ghi...
# Initial Root Token: hvs...

# Auto-unseal (KMS)
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "alias/vault-unseal"
}

# Auto-unseal (GCP)
seal "gcpckms" {
  project    = "my-project"
  region     = "global"
  key_ring   = "vault"
  crypto_key = "unseal-key"
}
```

## High Availability

```hcl
# ha config.hcl
storage "raft" {
  path = "/vault/data"
  node_id = "node-1"

  retry_join {
    leader_api_addr = "https://vault-1.example.com:8200"
  }
  retry_join {
    leader_api_addr = "https://vault-2.example.com:8200"
  }
  retry_join {
    leader_api_addr = "https://vault-3.example.com:8200"
  }
}

listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_cert_file = "/etc/tls/vault.crt"
  tls_key_file  = "/etc/tls/vault.key"
}

api_addr     = "https://vault-1.example.com:8200"
cluster_addr = "https://vault-1.example.com:8201"

ui        = true
log_level = "info"
```

## Common CLI Commands

```bash
# Status
vault status
vault operator raft list-peers

# Seal/Unseal
vault operator seal
vault operator unseal
vault operator unseal -reset  # Reset unseal process

# Audit
vault audit enable file file_path=/vault/logs/audit.log
vault audit list

# Token
vault token create -policy=my-policy
vault token revoke <token>
vault token lookup <token>
vault token renew <token>

# Namespace (Vault Enterprise)
vault namespace create dev
vault namespace list
```

## Response Wrapping

```bash
# Wrap a secret
vault kv put -wrap-ttl=60s secret/temp key=value

# Unwrap (single use, TTL-limited)
vault unwrap <wrapping_token>

# Used in CI/CD to distribute secrets without persistent storage
```

## Best Practices

- Use auto-unseal with a cloud KMS when possible
- Distribute unseal keys to separate trusted individuals
- Enable audit logging before writing any secrets
- Use namespaces (enterprise) or separate Vault instances per environment
- Rotate root tokens after initial setup
- Use short TTLs for all tokens
- Never log or commit Vault tokens
