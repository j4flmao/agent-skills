# Secrets Lifecycle Management

## Overview

Secrets lifecycle management covers every stage from secret creation through rotation to destruction. A comprehensive lifecycle model ensures that secrets are never exposed, always available to authorized services, and promptly revoked when no longer needed. This reference details the operational practices, automation patterns, and tooling for each lifecycle phase.

## The Secret Lifecycle

### Lifecycle Stages

```
Creation
  ├── Generate cryptographically random value
  ├── Define metadata (owner, purpose, rotation interval)
  ├── Set initial access policy
  └── Encrypt and store in vault

Distribution
  ├── Push to consuming services
  ├── Mount as files or inject as env vars
  ├── Certify receipt and health check
  └── Document in service catalog

Use
  ├── Authenticated access with audit trail
  ├── Rate-limited retrieval
  ├── Cache with TTL to reduce vault load
  └── Health monitoring for credential validity

Rotation
  ├── Generate new secret value
  ├── Deploy to all consumers
  ├── Verify consumer health with new secret
  └── Revoke old secret after grace period

Revocation
  ├── Immediate invalidation on incident
  ├── Zero-downtime rotation triggered
  ├── Verify all consumers have switched
  └── Archive for forensic analysis

Destruction
  ├── Cryptographic deletion (zeroize)
  ├── Audit log finalization
  ├── Compliance record retention
  └── Dependent service notification
```

### Lifecycle State Machine

```
States:
┌─────────────────────────────────────────────────────────────┐
│ CREATED ──→ ACTIVE ──→ ROTATING ──→ DEPRECATED ──→ DESTROYED
│   │            │                      ↑
│   └──→ ERROR   └──→ COMPROMISED ──────┘
│                         │
│                         └──→ REVOKED ──→ DESTROYED
└─────────────────────────────────────────────────────────────┘

State transitions:
├── CREATED: Secret generated, stored, not yet used
│   ├── Configuration verified → ACTIVE
│   └── Generation failure → ERROR
├── ACTIVE: Secret in use by services
│   ├── Rotation due → ROTATING
│   ├── Incident detected → COMPROMISED
│   └── Service decommissioned → DEPRECATED
├── ROTATING: New secret deployed, old still valid
│   ├── All consumers verified → DEPRECATED
│   └── Rotation timeout → ERROR (restore old)
├── DEPRECATED: Old secret, not used, kept for rollback
│   ├── Retention period expired → DESTROYED
│   └── Incident rollback → ACTIVE (restore)
├── COMPROMISED: Secret exposed, emergency action
│   ├── Immediate revocation → REVOKED
│   └── False alarm → ACTIVE (confirm no exposure)
├── REVOKED: Secret invalidated, access denied
│   └── Retention period expired → DESTROYED
├── ERROR: Lifecycle operation failed
│   └── Manual intervention → CREATED or ACTIVE
└── DESTROYED: Secret permanently removed
    └── Audit trail retained per compliance
```

## Phase 1: Secret Creation

### Entropy Requirements

```
Minimum entropy for cryptographic secrets:

Use Case              │ Minimum Bits │ Minimum Length │ Character Set
─────────────────────────────────────────────────────────────────────
Database password     │ 128          │ 30             │ a-z, A-Z, 0-9, symbols
API key               │ 128          │ 40             │ base64url
JWT signing key       │ 256          │ 32 bytes       │ cryptographically random
TLS private key       │ 2048 (RSA)   │ n/a            │ cryptographically random
                       │ 256 (ECDSA)  │ n/a            │ cryptographically random
SSH key               │ 2048 (RSA)   │ n/a            │ cryptographically random
                       │ 256 (Ed25519)│ n/a            │ cryptographically random
Encryption key        │ 256          │ 32 bytes       │ cryptographically random
OAuth client secret   │ 128          │ 32 bytes       │ base64url
Webhook secret        │ 128          │ 32 bytes       │ hex
API token             │ 160          │ 40             │ base64url

Generation commands:
├── OpenSSL: openssl rand -base64 32 (256-bit key)
├── Python: secrets.token_hex(32) / secrets.token_urlsafe(32)
├── Node.js: crypto.randomBytes(32).toString('base64url')
├── Vault: vault write -field=random_bytes -format=base64 sys/tools/random/32
├── AWS SM: aws secretsmanager get-random-secret --exclude-punctuation
└── GCP SM: Secret Manager auto-generates on creation
```

### Creation Patterns

```
Pattern 1: Pre-provisioned (for new service)
├── Vault: create static secret with known path
├── Cloud: create secret in Secrets Manager / Secret Manager / Key Vault
├── Set rotation schedule and access policy
├── Store version 1
└── Hand off to deployment pipeline

Pattern 2: Auto-generated (for databases, service accounts)
├── Vault dynamic secrets engine creates on first request
├── Example: vault read database/creds/my-role
├── AWS: Secrets Manager auto-generated with CloudFormation
├── TTL set at engine level (default 1h)
└── Service connects, receives valid credentials immediately

Pattern 3: Imported (from existing system)
├── Manual entry via UI or CLI
├── Validate secret format (length, character set, encoding)
├── Store as version 1 with original creation date
├── Schedule first rotation within 24h
└── Document source and owner

Pattern 4: Derived (from master key using KDF)
├── Uses HKDF or similar key derivation function
├── Master key stored in HSM or KMS
├── Derived keys per service per environment
├── No storage of derived keys — derived on demand
└── Used for: encryption keys where master key separation is required
```

### Metadata Schema

```
Every secret must include metadata:

Required fields:
├── name: unique identifier within namespace
├── type: password | api-key | certificate | token | encryption-key
├── environment: dev | staging | prod
├── owner: team or individual responsible
├── created_at: ISO 8601 timestamp
├── rotation_interval_days: integer
└── version: semantic version

Recommended fields:
├── description: human-readable purpose
├── service: consuming service name
├── rotation_strategy: dual-credential | single-credential | dynamic
├── rotation_window: hours of dual-credential overlap
├── compliance_classification: pci | hipaa | soc2 | internal
├── incident_response_runbook: link to runbook
├── emergency_contact: on-call rotation
├── access_whitelist: allowed IPs or VPC endpoints
├── auto_rotate: true | false
├── status: active | deprecated | compromised | revoked
└── last_rotation: ISO 8601 timestamp

Audit fields (system-managed):
├── created_by: user or service principal
├── last_accessed: ISO 8601 timestamp
├── access_count: integer
├── last_modified: ISO 8601 timestamp
└── deleted_at: ISO 8601 timestamp
```

## Phase 2: Secret Distribution

### Distribution Methods

```
Method 1: Environment variables (simple, ephemeral)
├── Inject at container startup from vault sidecar
├── Vault Agent: agent-sidecar injects env vars via template
├── AWS: ECS Secrets injects env vars from Secrets Manager
├── K8s: External Secrets → K8s Secret → envFrom
├── Pros: simple, language-agnostic
├── Cons: visible in process list, logs may capture them
└── Best for: connection strings, API keys

Method 2: Volume mounts (secure, file-based)
├── Vault CSI Provider: mounts secret as CSI volume (read-only)
├── Kubernetes: projected service account tokens
├── Container: secret at /mnt/secrets/<name>
├── Pros: not exposed in env, can track file access, audit
├── Cons: requires filesystem permissions management
└── Best for: TLS certificates, database passwords

Method 3: Vault Agent template (flexible, config-based)
├── Vault Agent: renders templates from secrets
├── Template: {{ secret "database/creds/my-app" }}
├── Output: config file with populated values
├── Reload: SIGHUP to application on change
├── Pros: any config format supported, built-in reload
├── Cons: requires Vault Agent sidecar
└── Best for: complex application configs

Method 4: SDK (direct, programmatic)
├── App calls vault.SecretStore.Get("path") at startup
├── AWS SDK: GetSecretValueAsync("secretName")
├── GCP SDK: SecretManagerServiceClient.AccessSecretVersion
├── Azure SDK: SecretClient.GetSecretAsync("secretName")
├── Pros: full control, cache implementation
├── Cons: app code changes, library dependencies
└── Best for: custom caching, performance-sensitive apps
```

### Distribution Security

```
Transport security requirements:
├── All secret distribution over TLS 1.2 or 1.3
├── Mutual TLS for vault-to-consumer where possible
├── No plaintext HTTP, no unencrypted gRPC
├── Certificate pinning for production critical paths
├── Network policy: only authorized pods/services can reach vault
└── Egress filtering: vault accessible only from trusted subnets

In-transit protections:
├── Secrets encrypted at every network hop
├── End-to-end encryption (vault → consumer, no intermediate decrypt)
├── No logging of secret values in transit (mask in proxy logs)
├── Wire-level encryption: mTLS for K8s to vault
└── KMS envelope encryption for cloud secrets manager

At-rest protections:
├── Secrets encrypted in vault storage (seal mechanism)
├── Auto-unseal with cloud KMS (AWS KMS, GCP Cloud KMS, Azure Key Vault)
├── HSM-backed encryption for highest security
├── No plaintext secrets in database, file system, or memory dumps
├── Memory locking: mlock() to prevent swap exposure
└── Core dump prevention: setrlimit(RLIMIT_CORE, 0)
```

### Consumer Verification

```
After distributing a new secret, verify consumer health:

1. Liveness check
├── Can consumer read the secret from store?
├── Is access denied? → Check IAM/K8s SA binding
├── Is network blocked? → Check network policy
└── Is secret path correct? → Verify metadata

2. Functionality check
├── Can consumer authenticate with the new secret?
├── For DB creds: can it connect and query?
├── For API key: receives 200, not 401/403?
├── For TLS cert: no certificate error?
└── For encryption key: can encrypt/decrypt?

3. Performance check
├── Is latency within baseline?
├── Is error rate unchanged?
├── Are there additional vault calls? (cache issue)
└── Is CPU/memory unchanged?

4. Rollback criteria
├── If any above check fails for >60s → trigger rollback
├── Restore previous secret version
├── Signal all consumers to re-read
└── Alert on-call with failure details
```

## Phase 3: Secret Use

### Access Patterns

```
Retrieval patterns:

Retrieve on startup:
├── Application reads all secrets at boot
├── Cache in memory for session duration
├── Re-read on SIGHUP or periodic refresh
├── Latency: acceptable (app start)
└── Best for: long-running services with stable credential sets

Retrieve per request:
├── Application reads secret for each operation
├── No caching — guaranteed freshness
├── Latency-sensitive (adds 10-50ms per request)
├── Use vault read cache (Vault Agent sidecar)
└── Best for: short-lived tokens, each request needs new creds

Lazy loading with TTL-based refresh:
├── Read on first use, cache with TTL (e.g., 10min)
├── Background refresh before TTL expiry
├── On refresh failure: use stale cache, retry in background
├── Latency: low (most requests use cached value)
└── Best for: most production services

Event-based refresh:
├── Subscribe to secret change events (webhook, Vault agent)
├── On change notification: re-read and update cache
├── Near-instant propagation of rotation
├── Latency: zero (pushed, not polled)
└── Best for: zero-downtime rotation
```

### Caching Strategy

```
Cache layers:

Level 1: In-memory (fastest)
├── Map[secretName]secretValue with expiry
├── TTL: 60-300s (configurable)
├── Refresh: background goroutine/task
├── Fail: use stale if refresh fails, log warning
├── Max entries: 1000
└── Eviction: LRU

Level 2: Local file (intermediate)
├── Write secret to tmpfs file
├── TTL: 300-600s
├── Use: multi-process apps need shared cache
├── Protect: file mode 0600, owned by app user
└── Eviction: temp file cleanup on expiry

Level 3: Vault Agent cache (recommended)
├── Vault Agent sidecar caches all secret reads
├── Configurable TTL per secret path
├── Auto-refresh on Vault token renewal
├── Client → local agent → vault (agent handles caching)
├── Zero app code changes for caching
└── Max cache size: 100MB

Cache invalidation:
├── Time-based TTL expiry (most reliable)
├── Event-based: webhook from vault → app re-reads
├── Manual: POST to /reload endpoint in app
├── Startup: always fetch fresh, never initialize from cache
└── Incident: force cache flush for specific secret path
```

### Access Audit

```
Audit data to capture per access:

Who:
├── User identity (OIDC claim, username, K8s SA)
├── Application identity (AppRole role_id, client certificate CN)
├── Machine identity (pod name, node name, IP address)
└── Service account (IAM role ARN, GCP SA email)

What:
├── Secret path or name
├── Secret version accessed
├── Operation (read, write, delete, list)
├── Result (success, denied, not found)
└── Secret type (dynamic, static, PKI)

When:
├── Timestamp with millisecond precision
├── Timezone (always UTC)
├── Request duration (ms)
└── Vault request ID (traceable to Vault log)

Where:
├── Source IP address
├── Source VPC or network
├── Geographic region (from IP geolocation)
├── K8s namespace (if applicable)
└── Cloud region (if cloud-based secret store)

Why:
├── Request justification (if using justification-based access)
├── Policy evaluation trace
└── Business context (if available from caller)

Audit log format:
{
  "time": "2025-03-15T14:30:00.123Z",
  "source": "vault-cluster-1",
  "type": "audit",
  "auth": {
    "client_token": "hm-sha256:abc...",
    "policies": ["db-reader", "app-my-app"],
    "metadata": {
      "role": "my-app",
      "service_account": "my-app-sa",
      "namespace": "prod"
    }
  },
  "request": {
    "path": "secret/data/prod/db/main",
    "operation": "read",
    "data": {},
    "remote_address": "10.0.1.42"
  },
  "response": {
    "data": {
      "secret/path": "secret/data/prod/db/main",
      "secret/version": 12,
      "ttl": 3600
    }
  }
}
```

## Phase 4: Secret Rotation

### Rotation Strategies

```
Strategy 1: Dual-credential (zero-downtime)
├── Two concurrent valid credentials at all times
├── Timeline:
│   ├── T0: Create new credential v2 (keep v1 alive)
│   ├── T1: Deploy v2 to all consumers
│   ├── T2: Verify all consumers on v2
│   └── T3: Revoke v1 (after grace period)
├── Grace period: 24-48h (configurable)
├── Rollback: restore v1 if v2 has issues
├── Monitoring: track which service uses which version
└── Best for: database passwords, API keys, service tokens

Strategy 2: Single-credential (coordinated)
├── One credential at a time
├── Timeline:
│   ├── T0: Deploy new credential to all consumers simultaneously
│   ├── T1: Brief window of invalid credential
│   ├── T2: All consumers reconnected
│   └── T3: Confirm all healthy
├── Downtime window: 0-5s (depends on consumer reconnect speed)
├── Rollback: deploy previous credential
├── Risk: brief outage if consumers don't retry
└── Best for: internal service tokens, where retry logic handles brief disruption

Strategy 3: Dynamic (auto-expiring)
├── Secret has built-in TTL
├── Consumer must renew before expiry
├── No actual rotation event needed
├── Timeline:
│   ├── T0: Consumer requests credential, gets TTL 1h
│   ├── T+30min: Consumer renews (gets new 1h TTL)
│   ├── T+1h: Original credential expires
│   └── Continuous: periodic renewal keeps credential alive
├── Downtime: zero (continuous renewal)
├── Rollback: no action needed (new credential issued)
├── Risk: consumer must implement renewal logic
└── Best for: database connections (Vault dynamic DB creds)

Strategy 4: Blue/green rotation (for PKI)
├── Two distinct certificates issued
├── Timeline:
│   ├── T0: Issue new cert from different CA/intermediate
│   ├── T1: Start serving new cert alongside old
│   ├── T2: Clients migrate to new CA trust chain
│   └── T3: Old cert retired
├── Downtime: zero (both active during migration)
├── Rollback: switch back to old cert/chain
└── Best for: TLS certificates, CA rotation
```

### Rotation Automation

```
Vault dynamic secrets (auto-rotation):
├── TTL: set at role creation
├── Renew: consumer calls vault write database/creds/my-role
├── Revoke: vault lease revoke <lease_id>
├── Max TTL: set at mount level (e.g., 24h)
├── Rotation: automatic on each renewal
└── Code: no special rotation logic needed in app

AWS Secrets Manager rotation:
├── Lambda function triggered by rotation schedule
├── Function template per credential type:
│   ├── RDS rotation: createUser → setPassword → test → finish
│   ├── DocumentDB rotation: same pattern as RDS
│   ├── Redshift rotation: alter user password
│   └── Custom: any Lambda-compatible rotation logic
├── Rotation schedule: rate(30 days) or cron(0 3 1 * ? *)
├── Secret versions: AWSPREVIOUS, AWSCURRENT, AWSPENDING
├── Stage transitions: AWSPENDING → (test) → AWSCURRENT → AWSPREVIOUS
└── Sync: External Secrets Operator auto-refreshes on AWSCURRENT change

Vault static secrets rotation:
├── Vault 1.9+: automatic rotation for static secrets
├── Schedule: cron expression in secret metadata
├── Rotation: vault automatically generates new value
├── Notification: webhook to consumers on rotation
├── Consumer: must re-read on notification
└── Versions: old version remains readable for grace period

Scheduled rotation (manual or semi-automated):
├── Terraform: resources with rotate_immediately flag
├── Pulumi: stack updates with secret regeneration
├── CronJob: script that generates new secret, deploys, tests
├── Ansible: playbook with password lookup + deploy
└── Approval: require two-person approval for production rotation
```

### Zero-Downtime Rotation Procedures

```
Database credential rotation (Vault dynamic):
├── App uses Vault to get DB creds
├── TTL: 24h (auto-renewed every 12h)
├── On rotation: simply renew lease → new creds issued
├── Old creds: auto-revoked by Vault after TTL
└── App impact: zero (renewal is transparent)

Database credential rotation (static, dual-credential):
├── Phase 1: Create second DB user (app_prod_v2)
├── Phase 2: Grant same permissions as v1
├── Phase 3: Deploy connection string to 10% of instances (canary)
├── Phase 4: Verify canary health (5min)
├── Phase 5: Deploy to remaining 90%
├── Phase 6: Verify 100% health (30min)
├── Phase 7: Revoke app_prod user
└── Rollback at any phase: re-deploy old connection string

API key rotation:
├── Phase 1: Generate new API key
├── Phase 2: Deploy to API provider (add second key)
├── Phase 3: Update consumer with new key
├── Phase 4: Verify consumer using new key
├── Phase 5: Remove old key from API provider
├── Timeline: 24h window where both keys valid
└── Rollback: re-activate old key

TLS certificate rotation:
├── Phase 1: Generate new CSR → new cert
├── Phase 2: Deploy cert to load balancer/reverse proxy
├── Phase 3: Cert automation: letsencrypt/cert-manager auto-renew
├── Phase 4: Monitor for certificate expiration alerts (30/14/7/1 days)
├── Phase 5: Old cert valid until expiry, dual-serving during transition
└── Rollback: re-deploy old cert
```

### Rotation Validation

```
Post-rotation validation checklist:

Immediate (within 1 minute):
├── New secret retrievable from store
├── Old secret still retrievable (if dual-credential)
├── Consumer count: verify all pods/services have refreshed
├── Canary: canary group healthy with new secret
└── Error rate: no increase in auth/connection errors

Short-term (within 30 minutes):
├── Error rate: stable at pre-rotation level
├── Latency: unchanged
├── Consumer count: 100% on new secret
├── Audit log: all access events expected (no unauthorized)
└── Repeat: run integration test suite

Long-term (within 24 hours):
├── Old secret: verify grace period working (if dual)
├── Revocation: old secret revoked after grace period
├── Compliance: rotation event logged to SIEM
├── Documentation: rotation record updated
└── Schedule: next rotation scheduled correctly
```

## Phase 5: Secret Revocation

### Incident-Driven Revocation

```
Trigger events for immediate revocation:
├── Secret pushed to public repository (GitHub, GitLab)
├── Secret exposed in CI/CD logs
├── Secret in error message or stack trace
├── Secret in screenshot posted to chat/social media
├── Unauthorized access detected to secret store
├── Employee offboarding (had access to secrets)
├── Service compromise (pod/container breached)
├── Insider threat detection (anomalous access)
└── Compliance violation (secret not properly protected)

Revocation procedure (emergency):

Step 1: Identify affected secrets (30s)
├── Determine which secrets were exposed
├── Check secret metadata for affected services
├── Check audit logs for unauthorized access
├── Open incident in PagerDuty/Opsgenie
└── Page on-call engineer

Step 2: Revoke immediately (60s)
├── AWS SM: update-secret-with-new-value (same rotation lambda)
├── Vault: vault write -force secret/rotate/<path>
├── GCP SM: add-secret-version (new value), disable old version
├── Azure KV: set-secret (new value), enable soft-delete on old
├── K8s: delete secret, External Secrets re-syncs new value
└── Note: revoke don't just disable — bad actor can re-enable

Step 3: Rotate all dependent credentials (5min)
├── RDS: rotate master password → rotate application user
├── API: generate new key at provider → deploy to consumer
├── SSO: rotate client secret → update Relying Party
├── Certificate: reissue with new key pair
└── Service account: delete and recreate

Step 4: Verify all consumers updated (15min)
├── Monitor error rates per service
├── Check auth success rate returning to baseline
├── Verify no retry storms from invalidated credentials
├── Confirm External Secrets synced new value
└── Run health check suite

Step 5: Post-incident actions (within 24h)
├── Root cause analysis
├── Improve detection rules (was scanner supposed to catch this?)
├── Reduce time between leak and revocation
├── Update incident response runbook
├── Notify compliance team
└── Train team on prevention
```

### Graceful Deprecation

```
When a secret is no longer needed (service decommissioned, migrated):

├── Step 1: Mark secret as DEPRECATED in metadata
├── Step 2: Notify all known consumers (check audit logs)
├── Step 3: Remove read access for all but emergency team
├── Step 4: Monitor for access attempts (warn, not block)
├── Step 5: After 30 days with zero access → proceed to destroy
├── Step 6: Archive audit log of the secret
└── Step 7: Destroy secret

Deprecation timeline:
├── Days 0-7: DEPRECATED, all consumers should migrate
├── Days 7-14: Access restricted to migration team only
├── Days 14-30: Access blocked, monitoring for errors
├── Day 30: Destroy if no access attempts
└── Exception: manual override for secrets with compliance holds
```

## Phase 6: Secret Destruction

### Secure Deletion

```
Cryptographic deletion (preferred):
├── Never delete encrypted data without destroying the key
├── For KMS-envelope encrypted secrets:
│   ├── Delete the DEK (data encryption key)
│   ├── Encrypted ciphertext becomes permanently unrecoverable
│   └── KMS key rotation naturally destroys old DEKs
├── For Vault: seal migration removes old encryption keys
├── For cloud providers: deleting the KMS key effectively destroys all secrets encrypted with it
└── Compliance: verify via cryptographic audit (prove data unrecoverable)

Storage-level deletion:
├── AWS SM: DeleteSecret with RecoveryWindowInDays
│   ├── Immediate: RecoveryWindowInDays=0 (irreversible)
│   ├── Standard: 7-30 day recovery window
│   └── Soft-delete: can restore during recovery window
├── GCP SM: DestroySecretVersion
│   ├── Immediate: destroyed versions cannot be read
│   ├── State: DESTROYED (not re-creatable)
│   └── Metadata: retained for 30 days
├── Azure KV: PurgeDeletedSecret (after soft-delete)
│   ├── Soft-delete: recoverable for retention period (default 90 days)
│   ├── Purge: permanently delete during retention window
│   └── Protection: purge protection prevents purging without MFA
├── Vault: vault kv destroy <path>
│   ├── Destroys specific version metadata
│   ├── Data: deletion is permanent
│   ├── Version: specify version number to destroy
│   └── Metadata: vault kv metadata delete <path> removes all versions
└── K8s: kubectl delete secret <name>
    ├── Deletes K8s Secret object
    ├── Underlying data: garbage-collected by etcd
    └── Caution: if synced from External Secrets, will be recreated
```

### Compliance Records

```
Retention requirements after secret destruction:

Record what must be kept:
├── Secret name and path
├── Creation and destruction timestamps
├── Access audit log (who accessed, when, from where)
├── Rotation history (versions, dates, rotation events)
├── Incident reports (if compromised)
├── Owner and responsible team
├── Justification for destruction (decommission, migration, expiry)
└── Approval record for destruction

Retention periods:
├── SOC 2: minimum 1 year
├── PCI DSS: minimum 3 years
├── HIPAA: minimum 6 years
├── GDPR: until consent withdrawn + 3 years
└── Internal policy: typical 7 years

Audit log export:
├── Realtime: stream to SIEM (Splunk, Elastic, Datadog)
├── Daily: export to cold storage (S3 Glacier, GCS Archive)
├── Format: JSON lines (.jsonl) with schema validation
├── Encryption: archive encrypted with compliance KMS key
├── Access: read-only for compliance team, append-only for system
└── Verification: periodic checksum validation of archive integrity
```

## Secrets as Code

### Policy as Code

```
Define secret access policies in version control:

HashiCorp Vault policy (HCL):
path "secret/data/prod/db/*" {
  capabilities = ["read"]
  control_group = {
    factor "approver" {
      identity {
        group_names = ["db-admins"]
      }
    }
  }
}

path "secret/data/dev/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/prod/db/*" {
  capabilities = ["list", "read"]
}

path "secret/+/transit/*" {
  capabilities = ["encrypt", "decrypt"]
  denied_parameters = ["export"]
}

AWS IAM policy for Secrets Manager:
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456:secret:prod/*",
      "Condition": {
        "StringEquals": {
          "aws:SourceVpce": "vpce-123456"
        }
      }
    }
  ]
}
```

### Infrastructure as Code

```
Manage secrets with Terraform/Pulumi/CloudFormation:

Terraform Vault secret:
resource "vault_kv_secret_v2" "db_creds" {
  mount  = vault_mount.kvv2.path
  name   = "prod/db/main"
  data_json = jsonencode({
    username = "app_prod"
    password = random_password.db_password.result
  })
  custom_metadata {
    max_versions = 5
    data = {
      owner              = "platform-team"
      rotation_interval  = "30"
      compliance         = "soc2"
    }
  }
}

resource "vault_policy" "app_policy" {
  name = "app-my-service"
  policy = file("policies/app-my-service.hcl")
}

Pulumi AWS Secret:
const secret = new aws.secretsmanager.Secret("db-secret", {
  name: "prod/db/main",
  recoveryWindowInDays: 7,
  tags: { owner: "platform", compliance: "soc2" }
});

const version = new aws.secretsmanager.SecretVersion("db-secret-v1", {
  secretId: secret.id,
  secretString: JSON.stringify({
    username: "app_prod",
    password: randomPassword.result
  })
});
```

## Monitoring and Alerting

### Secret Health Metrics

```
Key metrics to monitor:

Access metrics:
├── secret_access_count: total reads per secret per hour
├── secret_access_errors: rate of denied access
├── secret_access_latency: p50/p95/p99 read latency
├── unique_consumers: distinct services accessing per secret
└── access_geo_distribution: by region

Rotation metrics:
├── rotation_age_days: days since last rotation
├── rotation_duration_seconds: time to complete rotation
├── rotation_success_rate: percentage of successful rotations
├── dual_credential_overlap_hours: current overlap period
└── consumer_migration_progress: % of consumers on new secret

Health metrics:
├── secret_status: active/deprecated/compromised/expired
├── expiration_days: days until secret expires
├── certificate_expiry: days until TLS cert expires
├── consumer_health: % of consumers successfully authenticating
└── vault_cluster_health: leader status, replication lag

Alert thresholds:
├── Missed rotation: >30 days past due → P3
├── Rotation failure: consecutive failures → P2
├── Access denied spike: >5x baseline → P2
├── Bulk retrieval: >100 secrets/min from single user → P1
├── Certificate expiry: <30 days → notify, <7 days → P2, <1 day → P1
├── Secret access from unexpected geo → P2
├── New consumer on deprecated secret → P3
└── Secret revoked by incident → P1
```

### Dashboard Layout

```
Suggested Grafana/DataDog dashboard panels:

Row 1: Overview
├── Total secrets: gauge (by environment)
├── Secrets by type: pie chart
├── Rotation compliance: % on schedule
├── Active incidents: count
└── Secret access volume: time series

Row 2: Access Patterns
├── Top 10 most accessed secrets: bar chart
├── Access rate by environment: stacked area
├── Access latency P95: time series
├── Denied access: time series (with threshold line)
└── Unique consumers per secret: heatmap

Row 3: Rotation Health
├── Secrets past rotation due: table
├── Rotation success rate: time series
├── Days until next rotation: histogram
├── Dual-credential overlap status: table
└── Certificate expiry timeline: Gantt-like chart

Row 4: Security
├── Access by geographic region: map
├── Anomalous access alerts: event list
├── Compromised secret timeline: chart
├── Bulk access events: table
└── Top denied access sources: table

Row 5: Audit Compliance
├── Secrets not accessed in 90 days: table
├── Secrets without rotation schedule: table
├── Audit log coverage: % of secrets with audit
├── Compliance classification distribution: pie
└── Retention compliance: % meeting retention policy
```

## Incident Response Integration

### Secret Leak Runbook Template

```
Runbook: Credential Leak (API Key)

1. DETECTION
   ├── Source: [GitLeaks CI alert / truffleHog verified / user report]
   ├── Secret ID: [key name or path]
   ├── Timestamp: [when detected]
   ├── Exposure scope: [public repo, private repo, CI log, chat, etc.]
   └── Severity: [CRITICAL / HIGH / MEDIUM]

2. TRIAGE
   ├── Is it a real secret? [Yes/No — confirm format, test against service]
   ├── Is it currently valid? [Yes/No — check expiry, last rotation]
   ├── Is there evidence of misuse? [Yes/No — check audit logs]
   ├── Affected services: [list of consumers]
   ├── Compliance impact: [PCI/HIPAA/SOC2/None]
   └── Decision: [REVOKE now / Rotate within 24h / False positive]

3. CONTAINMENT
   ├── [ ] Revoke credential immediately
   ├── [ ] Notify affected service owners
   ├── [ ] Rotate to new credential
   ├── [ ] Verify consumer health post-rotation
   ├── [ ] Check cloud audit logs for unauthorized access
   ├── [ ] Check GitHub/GitLab audit logs for repo access
   └── [ ] Lock down exposure path (delete branch, scrub logs)

4. ERADICATION
   ├── [ ] Remove secret from all exposed locations
   ├── [ ] If public repo: contact GitHub support for takedown
   ├── [ ] If CI logs: rotate CI access token
   ├── [ ] Update secret scanning rules if this was missed
   └── [ ] Run full history scan to verify no other leaks

5. RECOVERY
   ├── [ ] Confirm all consumers on new secret
   ├── [ ] Verify error rates back to baseline
   ├── [ ] Run security integration tests
   ├── [ ] Document incident in post-mortem
   └── [ ] Update incident response runbook

6. POST-MORTEM
   ├── Root cause: [scanning gap, developer mistake, CI misconfig]
   ├── Blameless: what system failed, not who
   ├── Action items: [improve scanning rules, add CI gate, training]
   ├── Timeline: detection → triage → containment → recovery
   └── Review: incident review scheduled for [date]
```

### Automated Response

```
Automated response to secret leak:

Trigger: truffleHog verified secret → webhook → automation

Automation workflow:
├── Step 1: Parse secret type from detector (AWS key, GitHub token, etc.)
├── Step 2: Revoke credential via provider API
│   ├── AWS key: iam delete-access-key
│   ├── GitHub token: api.github.com/applications/{client_id}/tokens/{token}
│   └── Slack token: api.slack.com/auth.revoke
├── Step 3: Create new credential
│   ├── AWS key: iam create-access-key
│   ├── GitHub token: generate new, store in vault
│   └── Slack token: generate new
├── Step 4: Update secret in vault
│   ├── Write new value to same path
│   ├── Increment version
│   └── Log automation event to audit trail
├── Step 5: Notify affected teams
│   ├── Slack: #security-alerts
│   ├── PagerDuty: trigger incident
│   └── Email: security team + service owner
└── Step 6: Track in incident management system
    ├── Create Jira ticket
    ├── Set severity and SLA
    └── Assign to on-call engineer
```

## Tool Integration Patterns

### CI/CD Pipeline

```
GitHub Actions secret scanning:
name: secret-scan
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: GitLeaks scan
        uses: gitleaks/gitleaks-action@v2
        with:
          config-path: .gitleaks.toml
          scan-type: full
          fail: true

      - name: truffleHog scan
        run: |
          trufflehog git file://. --only-verified --fail \
            --github-token ${{ secrets.GH_PAT }}
        continue-on-error: false

GitLab CI secret scanning:
secret-detection:
  stage: test
  script:
    - gitleaks detect --source . --verbose --no-git
    - trufflehog filesystem . --only-verified --fail
  artifacts:
    reports:
      secret_detection: gl-secret-detection-report.json
  only:
    - merge_requests
    - main

CircleCI orb:
version: 2.1
orbs:
  secret-scan: company/secret-scan@1.0
workflows:
  scan:
    jobs:
      - secret-scan/scan:
          context: secret-scanning
          fail_on_detected: true
```

### Kubernetes Integration

```
External Secrets Operator manifest:
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: prod
spec:
  provider:
    vault:
      server: "https://vault.internal:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: "external-secrets-sa"
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: prod
spec:
  refreshInterval: "300s"
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
    deletionPolicy: Retain
  data:
    - secretKey: DB_USERNAME
      remoteRef:
        key: secret/data/prod/db/main
        property: username
        version: "0"
    - secretKey: DB_PASSWORD
      remoteRef:
        key: secret/data/prod/db/main
        property: password
        version: "0"
---
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  namespace: prod
spec:
  containers:
    - name: app
      image: my-app:latest
      envFrom:
        - secretRef:
            name: db-credentials
```

## Compliance Mapping

### Standards Alignment

```
SOC 2 (Security):
├── CC6.1: Logical access controls — secret store with policies
├── CC6.6: Encryption of data at rest — vault seal + KMS
├── CC6.7: Encryption of data in transit — TLS for all secret access
├── CC7.2: Monitoring and detection — audit logging + SIEM
└── CC7.3: Incident response — secret leak runbook

PCI DSS v4.0:
├── Requirement 3: Protect stored cardholder data — no card data in secrets (separate)
├── Requirement 7: Access control — least privilege per secret path
├── Requirement 8: Authentication — strong auth to vault (OIDC + MFA)
├── Requirement 10: Audit trails — all secret access logged
└── Requirement 12: Information security policy — rotation policies defined

HIPAA:
├── 164.312(a)(1): Access control — unique user IDs, emergency access
├── 164.312(a)(2)(iv): Encryption and decryption — encrypted secrets
├── 164.312(b): Audit controls — hardware/software audit of all access
├── 164.312(c)(1): Integrity — version management, rollback
└── 164.312(e)(1): Transmission security — TLS for all secret transport

ISO 27001:
├── A.9.1.2: Access to networks and network services — vault policies
├── A.9.2.3: Management of privileged access rights — AppRole + K8s auth
├── A.9.4.3: Password management system — automated rotation
├── A.12.4.1: Event logging — comprehensive audit
└── A.18.1.4: Privacy and protection of PII — no secrets with PII
```

## Conclusion

Secrets lifecycle management requires a systematic approach across creation, distribution, use, rotation, revocation, and destruction. The core principles are:

1. **Least privilege**: Every secret access must be authorized and minimal
2. **Short lifetime**: Dynamic secrets are better than static; rotation is mandatory for static
3. **Defense in depth**: Pre-commit, CI, and scheduled scanning catch secrets at every stage
4. **Audit everything**: Every access logged, monitored, and alerted
5. **Automate everything**: Manual processes are error-prone and slow
6. **Plan for incident**: Runbooks, automated revocation, and post-mortems
7. **Version control**: Secrets as code with policies in git
8. **Compliance first**: Map lifecycle stages to regulatory requirements
9. **Test rotation**: Simulate failures and verify zero-downtime procedures
10. **Train developers**: Prevention is cheaper than incident response

## References

- HashiCorp Vault Documentation: `developer.hashicorp.com/vault/docs`
- AWS Secrets Manager Documentation: `docs.aws.amazon.com/secretsmanager`
- GCP Secret Manager Documentation: `cloud.google.com/secret-manager/docs`
- Azure Key Vault Documentation: `learn.microsoft.com/azure/key-vault`
- External Secrets Operator: `external-secrets.io`
- OWASP Secrets Management Cheat Sheet: `cheatsheetseries.owasp.org`
- NIST SP 800-57: Key Management: `csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5`
- GitLeaks Documentation: `github.com/gitleaks/gitleaks`
- truffleHog Documentation: `github.com/trufflesecurity/trufflehog`
- GitGuardian ggshield: `docs.gitguardian.com`
