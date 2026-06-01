# Vault High Availability and Clustering

## Vault HA Architecture
Active node: handles all requests (read/write). Standby nodes: forward requests to active, handle reads (if using Performance Standbys). Leader election: via backend (Consul, Raft integrated). Failover: standby promoted to active automatically. Client retry: handle redirect with vault CLI retry logic.

## Storage Backends for HA
Consul: recommended for production, strong consistency. Integrated Raft: built-in HA, no external dependency, single region. DynamoDB: AWS-native, cross-region replication. PostgreSQL: HA via read replicas but not officially recommended. etcd: high consistency, used with Kubernetes. Backend selection impacts latency, availability, and scale.

## Performance Standbys
Performance Standbys handle read requests (transit, encryption, leases). Reduces load on active node. Requires Consul storage backend. Per-node licensing cost. Configure with max_parallelism based on CPU.

## Disaster Recovery Replication
DR replication: async replication to secondary cluster. Secondary is idle until promoted. Promotes: promote secondary on primary failure. Data loss window: replication lag (typically < 1 minute). DR requires secondary cluster with matching configuration. Seal wrapping: DR secondary automatically unseals via primary.

## Performance Replication
Mount-level replication: selective namespace/secret engine replication. Multi-region active-active for read workloads. Multi-region active-passive for write workloads. Conflict resolution: last-write-wins. Use for: cross-region read scaling and disaster avoidance.

## Seal and Unseal
Auto-unseal: cloud KMS (AWS KMS, Azure Key Vault, GCP Cloud KMS). Auto-unseal removes manual unseal steps. Seal migration: migrate from Shamir to auto-unseal or between auto-unseal types. Recovery keys: stored in secure location for disaster recovery. Seal wrapping for DR replication.

## Monitoring Vault
Prometheus metrics: vault_core_unsealed, vault_core_active, vault_token_count. Audit log: all requests and responses logged. Replication status: replication state, lag, merkle sync. Seal health: monitoring alert if vault becomes sealed. Storage backend health: backend latency and availability.

## References
- vault-fundamentals.md -- Fundamentals
- vault-basics.md -- Basics
- vault-policies.md -- Policies
- secrets-engines.md -- Secrets Engines
- vault-integration.md -- Integration
