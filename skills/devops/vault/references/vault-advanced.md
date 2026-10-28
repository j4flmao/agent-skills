# HashiCorp Vault Advanced: Production Operations, Auto-Unseal, Raft, Namespaces, PKI, Audit and Scaling

Advanced operation of Vault in production: auto-unseal, Integrated Storage (Raft) operations, Enterprise replication and namespaces, PKI hierarchies, transit key lifecycle, audit devices, performance and lease management, Kubernetes secret delivery, hardening and monitoring. Fundamentals and per-engine details are in sibling references (`vault-fundamentals.md`, `vault-clustering.md`, `secrets-engines.md`, `vault-policies.md`, `vault-integration.md`).

## Auto-Unseal

Shamir unsealing requires operators to enter key shares after every restart. Auto-unseal delegates protection of the root key to a KMS or HSM:

```hcl
# vault.hcl
seal "awskms" {
  region     = "eu-central-1"
  kms_key_id = "alias/vault-unseal"
}
# Alternatives: seal "azurekeyvault", seal "gcpckms", seal "transit" (another Vault), seal "pkcs11" (HSM, Enterprise)
```

- With auto-unseal, initialization produces **recovery keys** (for operations like generating a root token), not unseal keys.
- The KMS key becomes critical: restrict its IAM policy to the Vault servers' identity, enable deletion protection and key rotation, and monitor its use.
- Migration between seals uses `vault operator unseal -migrate` with both stanzas configured (old marked `disabled = "true"`); follow the documented procedure and back up first.
- Seal High Availability (Enterprise) supports multiple seals so one KMS outage does not prevent unsealing.

## Integrated Storage (Raft) Operations

```hcl
storage "raft" {
  path    = "/opt/vault/data"
  node_id = "vault-1"
  retry_join {
    leader_api_addr         = "https://vault-0.vault-internal:8200"
    leader_ca_cert_file     = "/etc/vault/tls/ca.pem"
  }
}
cluster_addr = "https://vault-1.vault-internal:8201"
api_addr     = "https://vault-1.example.com:8200"
```

```bash
vault operator raft list-peers
vault operator raft autopilot state             # health, failure tolerance, voter status
vault operator raft snapshot save /backup/vault-$(date +%F).snap
vault operator raft snapshot restore /backup/vault-2026-10-27.snap
vault operator raft remove-peer vault-3          # after a node is permanently lost
```

- Run 3 or 5 voters across availability zones; 5 tolerates two failures.
- Autopilot handles dead server cleanup and stabilization; configure `cleanup_dead_servers` and `min_quorum` deliberately.
- Automate snapshots (Enterprise has automated snapshots; Community needs a scheduled job with a token limited to `sys/storage/raft/snapshot`) and store them encrypted off-cluster. Snapshots are encrypted with the seal, so restoring requires the same seal (KMS key or Shamir keys).
- Use fast, dedicated disks; Raft performance depends on fsync latency.

## Enterprise Replication and Namespaces

| Feature | Purpose | Notes |
|---------|---------|-------|
| Performance replication | Secondary clusters serve reads and local operations near clients | Tokens and leases are local to each cluster; secrets data replicates |
| DR replication | Warm standby, not serving clients until promoted | Replicates tokens and leases too; promote during disaster |
| Performance standby nodes | Standby nodes in one cluster serve read requests | Scales reads within a cluster |
| Namespaces | Isolated "Vaults within Vault" with own mounts, policies, identity | Delegate administration to tenants (`vault namespace create team-a`; `VAULT_NAMESPACE=team-a`) |

Run regular DR promotion drills: generate a DR operation token, promote the secondary, repoint clients (DNS), and demote/re-establish the old primary.

## PKI Hierarchy

Keep the root CA offline or in a separate, rarely used mount; issue from an intermediate:

```bash
# Intermediate CA in Vault (root signed externally or by a separate root mount)
vault secrets enable -path=pki_int pki
vault secrets tune -max-lease-ttl=43800h pki_int
vault write -field=csr pki_int/intermediate/generate/internal \
  common_name="Example Intermediate CA" key_type=ec key_bits=384 > int.csr
# sign int.csr with the root CA, then:
vault write pki_int/intermediate/set-signed certificate=@int.pem

vault write pki_int/config/urls \
  issuing_certificates="https://vault.example.com/v1/pki_int/ca" \
  crl_distribution_points="https://vault.example.com/v1/pki_int/crl"

vault write pki_int/roles/internal-web \
  allowed_domains="svc.example.internal" allow_subdomains=true \
  key_type=ec key_bits=256 max_ttl=72h no_store=true

vault write pki_int/issue/internal-web common_name="orders.svc.example.internal" ttl=24h
```

- Short-lived certificates (hours to days) with automated renewal reduce the need for revocation; `no_store=true` avoids storing every leaf certificate (it then cannot be revoked by serial through Vault).
- Vault PKI supports multiple issuers per mount for CA rotation, and ACME for clients like cert-manager or Caddy (enable ACME on the mount and configure cluster paths).
- Enable automatic tidy (`pki_int/config/auto-tidy`) to purge expired certificates and revocation entries.

## Transit Key Lifecycle

```bash
vault write -f transit/keys/orders type=aes256-gcm96
vault write -f transit/keys/orders/rotate                     # new key version for encryption
vault write transit/keys/orders/config min_decryption_version=3 auto_rotate_period=720h
vault write transit/rewrap/orders ciphertext="$OLD_CIPHERTEXT"   # re-encrypt with latest version without exposing plaintext
```

- Ciphertexts carry the key version prefix (`vault:vN:`); rewrap stored data after rotation, then raise `min_decryption_version`.
- Use convergent encryption only when deterministic ciphertext is required (it reveals equality).
- Keys are non-exportable by default; keep it that way unless a documented need exists.

## Audit Devices

```bash
vault audit enable file file_path=/var/log/vault/audit.log
vault audit enable -path=socket socket address=logcollector:9090 socket_type=tcp
```

- Vault refuses to service requests if it cannot write to **any** enabled audit device; enable at least two devices to avoid an outage from one failing sink.
- Sensitive values are HMAC'ed in audit logs; correlate with `vault write sys/audit-hash/<path> input=<value>`.
- Ship audit logs to a SIEM with retention matching compliance needs; alert on root token use, policy changes, auth method changes, and denied requests spikes.

## Performance and Lease Management

| Problem | Symptom | Fix |
|---------|---------|-----|
| Lease explosion | `vault.expire.num_leases` grows into millions; slow restarts | Shorter TTLs, reuse credentials (Agent caching), batch tokens, revoke unused leases |
| Token churn from many short jobs | High storage writes | Batch tokens for short-lived workloads |
| Hot paths on a single cluster | Latency increases | Performance standbys / replicas (Enterprise), Vault Agent caching, client-side caching of static secrets |
| Slow storage | High `vault.raft.commitTime` / fsync latency | Faster disks, dedicated volumes |

Rate limit quotas (`vault write sys/quotas/rate-limit/global rate=500`) and lease count quotas protect the cluster from runaway clients.

## Delivering Secrets to Kubernetes

| Method | How | Notes |
|--------|-----|-------|
| Vault Secrets Operator (VSO) | CRDs (`VaultAuth`, `VaultStaticSecret`, `VaultDynamicSecret`, `VaultPKISecret`) sync into Kubernetes Secrets | Native Secret consumption; supports rollout restarts on change |
| Vault Agent Injector | Sidecar renders secrets into files | No Kubernetes Secret objects created |
| CSI provider | Secrets mounted as volumes via Secrets Store CSI Driver | Mount-time delivery |
| External Secrets Operator | `external-secrets.io/v1` `ExternalSecret` with a Vault `SecretStore` | Multi-backend operator |

```yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultStaticSecret
metadata:
  name: orders-db
  namespace: orders
spec:
  vaultAuthRef: orders-auth
  mount: secret
  type: kv-v2
  path: orders/db
  refreshAfter: 60s
  destination:
    name: orders-db
    create: true
  rolloutRestartTargets:
    - kind: Deployment
      name: orders-api
```

Syncing into Kubernetes Secrets means etcd encryption at rest and RBAC on Secrets matter.

## Hardening

- TLS everywhere (API and cluster ports), modern ciphers; no `tls_disable` outside dev.
- Run as an unprivileged user, `disable_mlock` only where the platform requires it (Integrated Storage docs recommend keeping mlock unless swap is disabled), no core dumps.
- Restrict network access to 8200 (clients) and 8201 (cluster) only.
- Revoke root tokens; generate on demand with quorum of recovery/unseal key holders.
- Manage Vault configuration (mounts, auth methods, policies) as code with the Terraform Vault provider and review changes.
- Separate administration duties: policy authors, auth method admins, operators.
- Upgrade regularly; follow security advisories.

## Monitoring

```hcl
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = true
}
```

Scrape `/v1/sys/metrics?format=prometheus` (requires a token with read on `sys/metrics`, or `unauthenticated_metrics_access` on the listener). Key signals:

| Metric | Watch for |
|--------|-----------|
| `vault.core.unsealed` | 0 on any node |
| `vault.core.active` / leadership changes | Frequent leader elections |
| `vault.expire.num_leases` | Steady growth |
| `vault.raft.commitTime`, `vault.raft.leader.lastContact` | Storage or network latency |
| `vault.audit.log_request_failure` | Any failures |
| `vault.core.handle_request` latency | Rising p99 |

## Checklist

- [ ] Auto-unseal with a tightly controlled KMS/HSM key; recovery keys held by separate people
- [ ] 3 or 5 Raft voters across zones; automated, tested snapshots
- [ ] DR strategy (Enterprise DR replication or snapshot restore) drilled
- [ ] PKI with offline root, short-lived leaf certificates, auto-tidy
- [ ] Transit keys rotated with rewrap and minimum decryption version
- [ ] At least two audit devices shipped to a SIEM with alerts
- [ ] Lease and rate quotas; lease counts monitored
- [ ] Configuration as code; TLS, least privilege and regular upgrades
