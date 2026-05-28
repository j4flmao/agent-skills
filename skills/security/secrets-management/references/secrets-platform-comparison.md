# Secrets Platform Comparison: Vault vs Cloud Providers

## Overview

Selecting the right secrets management platform is one of the most consequential infrastructure decisions an organization makes. This reference provides a deep comparison of HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, and Azure Key Vault across architecture, features, pricing, performance, operations, and compliance. It covers when to choose each platform, how to combine them, and migration strategies between them.

## Platform Overview

### Feature Matrix

```
Feature                          │ Vault     │ AWS SM     │ GCP SM    │ Azure KV
───────────────────────────────────────────────────────────────────────────────
Multi-cloud support              │ ✅ Native  │ ❌ AWS-only│ ❌ GCP-only│ ❌ Azure-only
On-premises deployment           │ ✅ Yes     │ ❌ No      │ ❌ No      │ ❌ No
Dynamic secrets                  │ ✅ Yes     │ ❌ Static  │ ❌ Static  │ ❌ Static
PKI / Certificate management     │ ✅ Yes     │ ❌ No      │ ❌ No      │ ✅ Yes (cert)
Transit encryption               │ ✅ Yes     │ ❌ No      │ ❌ No      │ ❌ No
Secret versioning                │ ✅ Yes     │ ✅ Yes    │ ✅ Yes    │ ✅ Yes
Automatic rotation               │ ✅ Yes (1.9+)| ✅ Yes    │ ❌ No      │ ✅ Yes (cert)
Rotation via Lambda              │ ❌ N/A     │ ✅ Yes    │ ❌ N/A     │ ❌ N/A
Fine-grained access policies     │ ✅ HCL     │ ✅ IAM    │ ✅ IAM    │ ✅ RBAC
Kubernetes native auth           │ ✅ Yes     │ ✅ IRSA   │ ✅ WI     │ ✅ AKS
Multi-region replication         │ ✅ Perf replication | ✅ Cross-region| ✅ Multi-region| ✅ Geo-redundant
HSM support                      │ ✅ Yes     │ ✅ KMS    │ ✅ Cloud HSM| ✅ Managed HSM
Open source                      │ ✅ BSL     │ ❌ Proprietary | ❌ Proprietary | ❌ Proprietary
Audit logging                    │ ✅ Syslog/file | ✅ CloudTrail| ✅ Cloud Audit| ✅ Monitor
CLI                              │ ✅ vault   │ ✅ aws sm | ✅ gcloud  │ ✅ az kv
Terraform provider               │ ✅ Full    │ ✅ Full   │ ✅ Full   │ ✅ Full
REST API                         │ ✅ Yes     │ ✅ Yes    │ ✅ Yes    │ ✅ Yes
Maximum secret size              │ 512KB      │ 64KB      │ 64KB      │ 25KB
Maximum versions per secret      │ configurable| 100       │ 1,000     │ unlimited
Free tier                        │ No (self-host OSS)| $0.40/secret/mo| $0.06/version/mo| $0.03/10K ops
```

### Architecture Comparison

```
┌─────────────────────────────────────────────────────────────┐
│ HashiCorp Vault Architecture                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐                   │
│  │ Vault   │   │ Vault   │   │ Vault   │  Active Node      │
│  │ Active  │──▶│ Standby │──▶│ Standby │                    │
│  └────┬────┘   └─────────┘   └─────────┘                   │
│       │                                                     │
│  ┌────┴────┐   ┌─────────────────────┐                      │
│  │ Storage │   │ Auto-unseal KMS     │                      │
│  │ (Consul │   │ (AWS KMS / GCP KMS) │                      │
│  │  / Raft)│   └─────────────────────┘                      │
│  └─────────┘                                                │
│                                                             │
│ Engines: KV, Database, PKI, Transit, AWS, Azure, GCP       │
│ Auth: Token, K8s, AppRole, OIDC, LDAP, Cert, AWS, GCP      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ AWS Secrets Manager Architecture                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────┐           │
│  │  AWS Managed Service                          │           │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐    │           │
│  │  │ Secret  │   │ Secret  │   │ Secret  │    │           │
│  │  │  A      │   │  B      │   │  C      │    │           │
│  │  └────┬────┘   └────┬────┘   └────┬────┘    │           │
│  │       │              │              │        │           │
│  │  ┌────┴──────────────┴──────────────┴────┐   │           │
│  │  │  KMS Customer Master Key              │   │           │
│  │  └───────────────────────────────────────┘   │           │
│  └──────────────────────────────────────────────┘           │
│                                                             │
│  ┌──────────────────────────┐  ┌──────────────────────┐     │
│  │  Rotation Lambda         │  │  CloudTrail Audit    │     │
│  │  (RDS / Redshift / Custom)│  │                      │     │
│  └──────────────────────────┘  └──────────────────────┘     │
│                                                             │
│ Auth: IAM roles, IAM users, AWS Organizations               │
│ K8s integration: EKS IRSA + External Secrets Operator       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## HashiCorp Vault Deep Dive

### Deployment Models

```
Self-managed (OSS):
├── Binary deployment on VMs or containers
├── Storage backends: Consul, Raft (integrated), DynamoDB, etcd
├── Single cluster or multi-datacenter replication
├── High availability: active/standby with automatic failover
├── Scaling: add standby nodes for read scaling
├── Performance: 2-5x slower than cloud managed (self-host overhead)
└── Cost: infrastructure only (OSS is free), but operational cost is high

Self-managed (Enterprise):
├── All OSS features + Enterprise features
├── Performance replication (read scaling across regions)
├── Disaster recovery replication (warm standby in another region)
├── Control groups (approval workflows)
├── Namespaces (multi-tenant isolation)
├── HSM integration (FIPS 140-2 Level 2 or Level 3)
├── Monetary cost: license fee per node, significant
└── Features that justify cost: performance replication, namespaces, control groups

HCP Vault (HashiCorp Cloud Platform):
├── Fully managed by HashiCorp
├── Deployed in AWS, Azure, or GCP
├── Automatic upgrades, backups, scaling
├── High availability built-in
├── Performance replication included
├── No need to manage storage backend
├── Cost: premium over self-managed
└── Best for: teams without Vault operational expertise
```

### Secret Engines

```
Engine             │ Use Case                          │ Rotation
─────────────────────────────────────────────────────────────────────
KV v2             │ Static secrets, configs, API keys  │ Manual or scheduled
Database          │ Dynamic DB credentials             │ Auto (TTL-based)
AWS               │ Dynamic AWS IAM/STS credentials    │ Auto (TTL-based)
GCP               │ Dynamic GCP service account keys   │ Auto (TTL-based)
Azure             │ Dynamic Azure service principal    │ Auto (TTL-based)
PKI               │ Dynamic X.509 certificates         │ Auto (TTL-based)
Transit           │ Encryption as a service            │ Key rotation (manual)
SSH               │ One-time SSH passwords or certs    │ Auto (per-session)
TOTP              │ Time-based one-time passwords      │ Auto (per-generation)
Consul            │ Consul token management            │ Auto (TTL-based)
Nomad             │ Nomad token management             │ Auto (TTL-based)
RADIUS            │ RADIUS authentication              │ N/A
AD / LDAP         │ Active Directory credential rotation│ Scheduled
Transform         │ Data masking / tokenization        │ N/A
Key Management    │ KMS key management                 │ Key rotation
```

### Auth Methods

```
Method           │ Best For                         │ Strength
────────────────────────────────────────────────────────────────
Token            │ Root, initial setup, automation  │ Basic
Kubernetes       │ K8s workloads (service accounts)  │ Strong (SA-bound)
AppRole          │ Machine-to-machine, CI/CD         │ Strong (secret_id + role_id)
OIDC             │ Human users, SSO integration      │ Strong (MFA capable)
LDAP             │ Enterprise directory integration  │ Moderate
Certificate      │ mTLS workloads                    │ Strong
AWS              │ EC2 instances, Lambda functions   │ Moderate
GCP              │ GCE instances, Cloud Run          │ Moderate
Azure            │ Azure VMs, AKS workloads          │ Moderate
GitHub           │ GitHub Actions, CI/CD             │ Moderate
JWT/OIDC         │ Any JWT issuer                    │ Strong
Okta             │ Okta SSO integration              │ Strong
RADIUS           │ RADIUS network auth               │ Moderate
SAML             │ Enterprise SSO                    │ Strong (MFA capable)
```

### Performance Specifications

```
Single active node:
├── Read throughput: ~10,000 reads/sec
├── Write throughput: ~500 writes/sec
├── Latency P50: 1-5ms (local storage), 5-15ms (cloud storage)
├── Latency P99: 10-30ms (local), 50-150ms (cloud)
├── Concurrent connections: ~1,000-5,000 (depends on resources)
└── Node specs: 2-4 CPU, 8-16GB RAM (typical)

Performance replication (Enterprise):
├── Scale: near-linear read scaling with more standby nodes
├── Local read: 10K/sec per node, 5 nodes = 50K/sec
├── Replication lag: <500ms within region, <2s cross-region
├── Writes: primary node only, ~500/sec
└── Topology: hub-and-spoke or mesh

Storage backend comparison:
├── Raft (integrated): 500-1000 writes/sec, simple ops, 3-5 nodes min
├── Consul: 1000-2000 writes/sec, requires separate Consul cluster
├── DynamoDB: 500-1000 writes/sec, AWS-only, serverless
├── etcd: 2000+ writes/sec, requires separate etcd cluster
└── File (dev only): single node, no HA, no production use

Vault Agent caching:
├── Cache mode: in-memory, local file, or both
├── TTL: configurable per secret path (default 10min)
├── Cache hit ratio: 80-95% (typical production workload)
├── Cache miss penalty: 1 vault read (10-50ms)
└── Force refresh: SIGHUP or agent API call
```

### Operational Considerations

```
Backup strategy:
├── Raft: snapshot raft directory or use vault operator raft snapshot save
├── Consul: snapshot Consul KV store
├── DynamoDB: backup via DynamoDB export
├── Schedule: every 6 hours for Raft, hourly for critical installs
├── Retention: 7 daily, 4 weekly, 12 monthly (DR scenario)
└── Restore: vault operator raft restore on new cluster

Upgrade procedure:
├── 1. Backup storage backend
├── 2. Upgrade standby nodes one by one
├── 3. Upgrade active node last (step-down first)
├── 4. Verify cluster health after each upgrade
├── 5. Check audit logs for any errors
└── Failure: restore from backup, downgrade binary

Monitoring:
├── Health check: /v1/sys/health (returns 200/429/503)
├── Key metrics: raft.commitTime, token.count, core.unsealed
├── Prometheus: /v1/sys/metrics (configurable)
├── Dashboard: Grafana dashboards available (community + official)
├── Alerts: unseal status, raft leadership, storage errors
└── Logs: JSON format, structured log levels

Disaster recovery:
├── DR replication (Enterprise): warm standby in different region
├── Manual DR: restore storage backend backup to new cluster
├── RTO: <5min with DR replication, 30-60min with manual restore
├── RPO: <1s (DR replication), 6h (backup-based)
├── Failover: update DNS or load balancer to DR cluster
└── Recovery: promote DR cluster, verify, rebuild primary
```

## AWS Secrets Manager Deep Dive

### Architecture Details

```
Secret hierarchy:
├── Secret ARN: arn:aws:secretsmanager:us-east-1:123456789:secret:prod/db/main-abc123
├── Name: prod/db/main (with random suffix for uniqueness)
├── Regions: Regional resource, not global
├── Replication: cross-region read replicas (manual setup)
└── Encryption: envelope encryption with KMS CMK

Rotation process:
├── Trigger: Lambda function (user-provided or AWS-managed)
├── Secret stages: AWSCURRENT, AWSPENDING, AWSPREVIOUS
├── Rotation flow:
│   1. Lambda creates AWSPENDING version
│   2. Lambda updates target service (e.g., RDS) with AWSPENDING
│   3. Lambda tests AWSPENDING credential
│   4. Lambda marks AWSPENDING as AWSCURRENT
│   5. Old AWSCURRENT becomes AWSPREVIOUS
│   6. Lambda removes AWSPENDING label
├── Lambda execution role: required for each rotation
├── Schedule: rate(30 days) or custom cron expression
└── Timeout: rotation Lambda has max 15 minute execution

Cross-account access:
├── Resource-based policy on secret grants access to other accounts
├── IAM role in consuming account has permission to GetSecretValue
├── Requires: both resource policy + IAM policy
├── Cross-account KMS key permission also required
└── Audit: CloudTrail logs cross-account access
```

### Rotation Lambda Examples

```
RDS MySQL rotation:
import boto3
import json
import pymysql

def lambda_handler(event, context):
    secret_arn = event['SecretId']
    token = event['ClientRequestToken']
    step = event['Step']

    service = secrets_manager.get_secret_value(SecretId=secret_arn)
    creds = json.loads(service['SecretString'])

    if step == 'createSecret':
        create_secret(secret_arn, token, creds)
    elif step == 'setSecret':
        set_secret(secret_arn, token, creds)
    elif step == 'testSecret':
        test_secret(secret_arn, token, creds)
    elif step == 'finishSecret':
        finish_secret(secret_arn, token, creds)

def create_secret(arn, token, creds):
    new_password = secrets_manager.get_random_password()
    service = secrets_manager.get_secret_value(SecretId=arn)
    current = json.loads(service['SecretString'])
    current['password'] = new_password
    secrets_manager.put_secret_value(
        SecretId=arn, ClientRequestToken=token,
        SecretString=json.dumps(current), VersionStages=['AWSPENDING']
    )

def set_secret(arn, token, creds):
    pending = secrets_manager.get_secret_value(
        SecretId=arn, VersionStage='AWSPENDING'
    )
    pending_creds = json.loads(pending['SecretString'])
    conn = pymysql.connect(
        host=pending_creds['host'],
        user=pending_creds.get('master-username', pending_creds.get('username')),
        password=pending_creds.get('master-password', pending_creds.get('password'))
    )
    with conn.cursor() as cursor:
        cursor.execute(f"ALTER USER '{pending_creds['username']}'@'%' IDENTIFIED BY '{pending_creds['password']}'")
    conn.close()

def test_secret(arn, token, creds):
    pending = secrets_manager.get_secret_value(
        SecretId=arn, VersionStage='AWSPENDING'
    )
    pending_creds = json.loads(pending['SecretString'])
    conn = pymysql.connect(
        host=pending_creds['host'],
        user=pending_creds['username'],
        password=pending_creds['password']
    )
    conn.close()

def finish_secret(arn, token, creds):
    secrets_manager.update_secret_version_stage(
        SecretId=arn, VersionStage='AWSCURRENT',
        RemoveFromVersionId=token, MoveToVersionId=token
    )
```

### Integration Points

```
AWS Services with native integration:
├── RDS: automatic rotation for MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, Aurora
├── Redshift: automatic rotation for Redshift clusters
├── DocumentDB: automatic rotation for DocumentDB clusters
├── ECS: inject secrets as environment variables or volumes
├── EKS: External Secrets Operator or Secrets Store CSI Driver
├── Lambda: retrieve at startup, cache for invocation lifetime
├── CodeBuild: environment variables from secrets manager
├── CloudFormation: dynamic reference {{resolve:secretsmanager:secret}}
├── SageMaker: notebook environment variables
├── AppConfig: retrieve configuration containing secrets
└── CloudWatch: metric filters for secret access patterns

Service quotas:
├── Secrets per account: 500,000 (default, soft limit)
├── Secret size: 64,768 bytes (64KB + 384 bytes metadata)
├── API requests per second: 10,000 (burst to 20,000)
├── Rotation schedules: 1 per secret
├── Tags per secret: 50
├── Versions per secret: 100 (hard limit)
├── Replica regions per secret: 20 (hard limit)
└── Lambda timeout for rotation: 15 minutes
```

### Pricing Model

```
AWS Secrets Manager pricing (us-east-1, 2025):
├── Per secret per month: $0.40 (first 30 days free per secret)
├── API calls: $0.05 per 10,000 calls
├── Cross-region replication: $0.015 per replica per day
├── Rotation Lambda: standard Lambda pricing (execution + duration)
├── KMS key: $1/month per CMK + $0.03 per 10,000 API calls
│
├── Example: 100 secrets, 10,000 API calls/month
│   ├── Secrets: 100 × $0.40 = $40.00
│   ├── API calls: 10,000 × $0.05/10,000 = $0.05
│   ├── KMS key: $1.00 + $0.03
│   └── Total: ~$41.08/month
│
├── Example: 500 secrets, 50,000 API calls/month
│   ├── Secrets: 500 × $0.40 = $200.00
│   ├── API calls: 50,000 × $0.05/10,000 = $0.25
│   ├── KMS key: $1.00 + $0.15
│   └── Total: ~$201.40/month
│
└── Cost optimization: Reduce secrets count, combine related data
```

## GCP Secret Manager Deep Dive

### Architecture Details

```
Secret model:
├── Secret name: projects/{project}/secrets/{secret-id}
├── Version name: projects/{project}/secrets/{secret-id}/versions/{version}
├── Version state: ENABLED, DISABLED, DESTROYED
├── Single-region: data stays within one region
├── Multi-region: replicated across multiple regions
│   ├── us: us-central1 + us-east1 + us-west1
│   ├── europe: europe-west1 + europe-west4
│   └── asia: asia-east1 + asia-northeast1
└── Encryption: AES-256 with Google-managed keys or CMEK via Cloud KMS

Replication strategy:
├── Automatic: Google manages replication across multiple zones within region
├── Multi-region: replicated across regions as selected location
├── User-managed: use Cloud KMS with specific key location
├── Replication latency: near-immediate within region, ~5s cross-region
└── Disaster recovery: no manual failover needed (multi-region)

IAM integration:
├── roles/secretmanager.secretAccessor: read secret version
├── roles/secretmanager.secretVersionAdder: add new versions
├── roles/secretmanager.secretVersionManager: manage versions
├── roles/secretmanager.admin: full management
├── Conditional IAM: resource name prefix, tags, encryption key
├── Workload Identity Federation: K8s service accounts
└── Audit: Cloud Audit Logs with Admin Read and Data Access
```

### Integration Points

```
GCP Services with native integration:
├── Compute Engine: access via VM service account
├── GKE: Workload Identity + External Secrets / CSI Driver
├── Cloud Run: bind as environment variable or volume mount
├── Cloud Functions: accessible via SDK at runtime
├── App Engine: accessible via service account
├── Cloud Build: substitution variables from Secret Manager
├── Cloud Composer: Airflow variables from Secret Manager
├── Dataflow: pipeline option for secret access
├── BigQuery: remote functions can access secrets
├── Vertex AI: notebook environment secrets
└── Config Connector: Kubernetes CRD for secret management

Service quotas:
├── Secrets per project: 100,000 (default, quota increase available)
├── Versions per secret: 1,000 (default, quota increase available)
├── Secret value size: 64KB (64,768 bytes including metadata)
├── Access requests per second: 10,000 (default project-wide)
├── List secrets: 100 per page
├── Label count: 64 per secret
├── Retention: disabled versions retained for 30 days (configurable)
└── Expiration: TTL or expiration time can be set on secrets
```

### Pricing Model

```
GCP Secret Manager pricing (us-central1, 2025):
├── Per active version per month: $0.06
├── Access operations: $0.03 per 10,000 operations
├── Storage: $0.01 per GB per month (negligible for secrets)
├── Multi-region: 2x to 3x single-region pricing
│
├── Example: 100 secrets with 1 version each, 10,000 access/month
│   ├── Versions: 100 × $0.06 = $6.00
│   ├── Access: 10,000 × $0.03/10,000 = $0.03
│   └── Total: ~$6.03/month
│
├── Example: 500 secrets with 1 version each, 50,000 access/month
│   ├── Versions: 500 × $0.06 = $30.00
│   ├── Access: 50,000 × $0.03/10,000 = $0.15
│   └── Total: ~$30.15/month
│
└── Very cost-effective compared to AWS SM (5-7x cheaper for equivalent usage)
```

## Azure Key Vault Deep Dive

### Architecture Details

```
Vault types:
├── Key Vault (standard): secrets, keys, certificates
│   ├── Standard tier: software-protected keys
│   └── Premium tier: HSM-protected keys (FIPS 140-2 Level 2)
├── Managed HSM: dedicated HSM pool (FIPS 140-2 Level 3)
│   ├── Single-tenant HSM cluster
│   ├── Full key management control
│   └── Higher throughput than Key Vault Premium

Key Vault hierarchy:
├── Vault name: globally unique within Azure
├── DNS: https://{vault-name}.vault.azure.net
├── Objects: secrets, keys, certificates (separate endpoints)
├── Soft-delete: enabled by default, 90-day retention
├── Purge protection: prevents permanent deletion without MFA
└── RBAC: built-in roles (Key Vault Secrets User, Key Vault Secrets Officer, etc.)

Access model:
├── Vault access policy: legacy, per-user/per-app permissions
├── Azure RBAC: newer, role-based access control
├── Conditional access: MFA, location, device compliance
├── Private endpoint: access over VNet
├── Service endpoints: access from VNet without public IP
└── Firewall: restrict to specific IPs and VNets
```

### Integration Points

```
Azure Services with native integration:
├── Azure VMs: managed identity + Key Vault extension
├── AKS: CSI Secrets Store Driver + Workload Identity
├── Azure Functions: app settings from Key Vault references
├── App Service: Key Vault references in configuration
├── Azure DevOps: variable groups linked to Key Vault
├── Azure Pipelines: secret variable from Key Vault task
├── Logic Apps: Key Vault connector
├── Azure Automation: encrypted variables from Key Vault
├── SQL Database: TDE protector key in Key Vault
├── Storage: customer-managed keys in Key Vault
├── Event Grid: Key Vault event notifications
└── Azure Monitor: audit logs, metrics, alerts

Service quotas:
├── Secrets per vault: 25,000
├── Keys per vault: 10,000
├── Certificates per vault: 10,000
├── Secret size: 25KB (25,000 bytes)
├── API transactions: 2,000 per vault per second (Standard)
├── Private endpoints: 1,000 per subscription
├── Soft-delete retention: 90 days (configurable 7-90)
└── Access policies per vault: 1,024
```

### Pricing Model

```
Azure Key Vault pricing (US East, 2025):

Key Vault Standard:
├── Per vault per month: no cost (free)
├── Secrets operations: $0.03 per 10,000 transactions
├── Key operations (software): $0.03 per 10,000 transactions
├── Certificate operations: $0.03 per 10,000 transactions
├── HSM-backed operations (Premium): $0.03 per 10,000 transactions
├── Managed HSM: ~$1/hour (dedicated HSM)
│
├── Example: 100 secrets, 10,000 access/month
│   ├── No per-secret cost (free)
│   ├── Transactions: 10,000 × $0.03/10,000 = $0.03
│   └── Total: ~$0.03/month (basically free)
│
├── Example: 500 secrets, 50,000 access/month
│   ├── No per-secret cost
│   ├── Transactions: 50,000 × $0.03/10,000 = $0.15
│   └── Total: ~$0.15/month
│
└── Significantly cheaper than AWS SM or GCP SM for small workloads
    Cost grows with transaction volume, not secret count
```

## Multi-Platform Strategy

### Vault + Cloud Provider Hybrid

```
Best-of-both-worlds architecture:

Vault for dynamic secrets + cloud SM for static:
├── Vault handles:
│   ├── Database credentials (dynamic, short TTL)
│   ├── Cloud provider credentials (AWS, GCP, Azure dynamic)
│   ├── PKI certificates (auto-issuing, auto-renewal)
│   ├── Transit encryption (encryption-as-a-service)
│   └── SSH certificates (one-time auth)
├── Cloud SM handles:
│   ├── Static API keys for third-party services
│   ├── Long-lived service account keys
│   ├── Vault auto-unseal keys
│   └── Infrastructure bootstrap secrets

Deployment pattern:
├── Cloud SM stores initial Vault unseal keys and root token
├── Vault runs as managed service or self-managed on K8s
├── Applications use Vault Agent or SDK for dynamic secrets
├── Cloud SM used for Vault-bootstrap secrets and static fallback
├── External Secrets Operator syncs from both for K8s workloads
└── Benefits: dynamic secrets where needed, cloud native where appropriate

Example configuration:
# Cloud SM stores Vault bootstrap
resource "aws_secretsmanager_secret" "vault_unseal" {
  name = "infra/vault/unseal-keys"
}

# Vault handles app dynamic credentials
resource "vault_database_secret_backend_role" "app" {
  backend = vault_mount.database.path
  name    = "app-role"
  db_name = vault_database_secret_backend_connection.mysql.name
  creation_statements = [
    "CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}';",
    "GRANT SELECT ON app.* TO '{{name}}'@'%';"
  ]
  default_ttl = 3600
  max_ttl     = 86400
}

# External Secrets syncs from both
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
spec:
  refreshInterval: 300s
  secretStoreRef:
    name: hybrid-store
    kind: ClusterSecretStore
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: database/creds/app-role
        property: password
    - secretKey: THIRD_PARTY_API_KEY
      remoteRef:
        key: arn:aws:secretsmanager:us-east-1:123456:secret:prod/third-party-api
```

### Migration Strategies

```
Vault → Cloud SM migration:

Phase 1: Parallel run
├── Deploy cloud SM secrets alongside Vault
├── Applications read from Vault (primary) and cloud SM (fallback)
├── Validate cloud SM access latency and reliability
├── Duration: 2-4 weeks
└── No application downtime

Phase 2: Cutover
├── Switch application to use cloud SM as primary
├── Keep Vault available for rollback
├── Monitor error rates and latency closely
├── Duration: 1 week with canary deployment
└── Rollback: switch back to Vault at first sign of issues

Phase 3: Decommission
├── Remove Vault read references from all applications
├── Verify zero Vault API calls for 2 weeks
├── Backup Vault data and store for compliance
├── Shut down Vault cluster
└── Destroy Vault storage backend

Cloud SM → Vault migration (reverse):
├── Same three-phase approach
├── Additional consideration: Vault operational overhead
├── Phase 1: Vault runs alongside, applications read from both
├── Phase 2: Switch applications to Vault
├── Phase 3: Decommission cloud SM secrets
└── Benefit: dynamic secrets after migration
```

## Platform Selection Guide

### Decision Matrix

```
Primary criterion: Infrastructure platform
┌────────────────────────────────────────────────────────────────┐
│ If all workloads on:          │ Choose:                        │
├────────────────────────────────────────────────────────────────┤
│ AWS only, no dynamic secrets   │ AWS Secrets Manager           │
│ GCP only, no dynamic secrets   │ GCP Secret Manager            │
│ Azure only, no dynamic secrets │ Azure Key Vault               │
│ Multi-cloud or on-prem         │ HashiCorp Vault               │
│ Kubernetes native              │ Vault (via CSI or ESO)         │
│ All-cloud + K8s                │ Cloud SM + Vault for dynamic  │
└────────────────────────────────────────────────────────────────┘

Secondary criterion: Feature requirements
┌────────────────────────────────────────────────────────────────┐
│ Need dynamic secrets?          │ Choose:                       │
├────────────────────────────────────────────────────────────────┤
│ Database credential rotation    │ Vault (database engine)      │
│ Cloud credential generation     │ Vault (AWS/GCP/Azure engine) │
│ Automatic PKI / cert lifecycle  │ Vault (PKI engine)           │
│ Encryption-as-a-service         │ Vault (transit engine)       │
│ Static secrets only             │ Any cloud SM (cheapest)      │
│ Managed rotation (RDS)          │ AWS Secrets Manager          │
└────────────────────────────────────────────────────────────────┘

Tertiary criterion: Operational maturity
┌────────────────────────────────────────────────────────────────┐
│ Ops capability                  │ Recommended                  │
├────────────────────────────────────────────────────────────────┤
│ Dedicated security/infra team   │ Vault (self-managed)         │
│ Small team, no Vault expertise  │ Cloud SM (managed)           │
│ Compliance-heavy (PCI, HIPAA)   │ Vault + HSM / Managed HSM   │
│ Startup, rapid iteration        │ Cloud SM (zero ops)          │
│ Enterprise, 500+ services       │ Vault (control + cost)       │
│ Cloud-only, managed services    │ Cloud SM (native integration)│
└────────────────────────────────────────────────────────────────┘
```

### Cost Comparison (Real-World Scenarios)

```
Scenario A: Small startup (50 secrets, 5,000 calls/month)
├── AWS Secrets Manager: ~$20.05/month
├── GCP Secret Manager: ~$3.02/month
├── Azure Key Vault: ~$0.02/month
├── Vault (self-hosted on 2 VMs): ~$50-100/month (infra) + ops
└── Winner: Azure KV (cheapest) or GCP SM (best value)

Scenario B: Mid-size company (500 secrets, 100,000 calls/month)
├── AWS Secrets Manager: ~$200.50/month
├── GCP Secret Manager: ~$30.30/month
├── Azure Key Vault: ~$0.30/month
├── Vault (self-hosted on 3 VMs): ~$150-300/month (infra) + ops
└── Winner: Azure KV if small secrets; GCP SM next best

Scenario C: Enterprise (5,000 secrets, 1M calls/month)
├── AWS Secrets Manager: ~$2,005/month
├── GCP Secret Manager: ~$303/month
├── Azure Key Vault: ~$3/month
├── Vault (self-hosted on 5 VMs): ~$500-1,000/month (infra) + ops
└── Winner: Azure KV (dramatically cheaper at scale)

Scenario D: Enterprise with dynamic secrets (Vault + cloud SM)
├── Vault (3 nodes) + AWS SM (500 static): ~$500 + $200 = $700/month
├── Vault (3 nodes) + GCP SM (500 static): ~$500 + $30 = $530/month
├── Vault (3 nodes) alone (all static + dynamic): ~$500-1,000/month
└── Winner: Vault + GCP SM hybrid

Note: Azure KV pricing does not scale with secret count, only with API call volume.
This makes it dramatically cheaper for large secret counts with low access frequency.
```

### Latency Comparison

```
Secret retrieval latency (P50):

Same region:
├── AWS Secrets Manager: 15-25ms
├── GCP Secret Manager: 10-20ms
├── Azure Key Vault: 10-20ms
├── Vault (local, Raft): 1-5ms
├── Vault Agent cache: <1ms
└── Vault (cloud storage backend): 10-30ms

Cross-region:
├── AWS Secrets Manager (replica): 30-60ms
├── GCP Secret Manager (multi-region): 30-50ms
├── Azure Key Vault (geo-replicated): 40-80ms
├── Vault (performance replication): 5-15ms (local node)
└── Vault (DR replication, active-passive): depends on DR state

Cold start (first access):
├── AWS Secrets Manager: 30-50ms (includes KMS decrypt)
├── GCP Secret Manager: 20-40ms
├── Azure Key Vault: 20-40ms
├── Vault: 10-30ms (includes seal decrypt)
└── Vault Agent cache miss: 10-30ms + cache update

Recommendations for latency-sensitive apps:
├── Vault Agent sidecar (in-memory cache): <1ms after warmup
├── Application-level cache: configurable TTL, <1ms
├── Direct Vault SDK with connection pool: 1-5ms
├── Cloud SM: acceptable for most use cases (10-25ms)
└── Avoid: per-request cloud SM calls for latency-sensitive paths
```

## Compliance and Certification

### Certification Matrix

```
Certification          │ Vault     │ AWS SM     │ GCP SM     │ Azure KV
─────────────────────────────────────────────────────────────────────────
SOC 2                  │ ✅        │ ✅         │ ✅         │ ✅
SOC 3                  │ ✅        │ ✅         │ ✅         │ ✅
PCI DSS v4.0           │ ✅        │ ✅         │ ✅         │ ✅
HIPAA / BAA            │ ✅        │ ✅         │ ✅         │ ✅
ISO 27001              │ ✅        │ ✅         │ ✅         │ ✅
FedRAMP (Moderate)     │ ✅        │ ✅         │ ✅         │ ✅
FedRAMP (High)         │ ❌        │ ✅         │ ✅         │ ✅
FIPS 140-2 Level 2     │ ✅        │ ✅ (KMS)   │ ✅ (KMS)   │ ✅ (Premium)
FIPS 140-2 Level 3     │ ✅ (HSM)  │ ❌         │ ❌         │ ✅ (Managed HSM)
GDPR compliant         │ ✅        │ ✅         │ ✅         │ ✅
UK OFFICIAL             │ ❌        │ ✅         │ ❌         │ ✅

Audit logging:
├── Vault: syslog, file, socket (JSON format)
├── AWS SM: CloudTrail (JSON, delivered to S3)
├── GCP SM: Cloud Audit Logs (BigQuery export)
└── Azure KV: Azure Monitor Logs (Log Analytics)

SIEM integration:
├── Vault: forward syslog to Splunk/ELK/Datadog
├── AWS SM: CloudTrail → S3 → SIEM
├── GCP SM: Cloud Audit → Pub/Sub → SIEM
└── Azure KV: Monitor → Event Hub → SIEM
```

### Data Residency

```
Data residency controls:

Vault:
├── Self-managed: full control over data location
├── HCP Vault: select cloud region for deployment
├── Replication: performance replicas in any region
├── Seal: separate KMS per region for data isolation
└── Export control: no automatic cross-border data movement

AWS Secrets Manager:
├── Regional service: data stays in chosen region
├── Cross-region replicas: explicitly created and billed
├── No automatic replication to other regions
├── KMS key per region for encryption
└── GovCloud: available in AWS GovCloud regions only

GCP Secret Manager:
├── Single-region: data confined to one region
├── Multi-region: data replicated across regions in location
├── CMEK: control encryption key location
├── No automatic export to non-selected regions
└── Assured Workloads: compliance-based location controls

Azure Key Vault:
├── Regional service: vault bound to one region
├── Geo-redundant: optional, replicates to paired region
├── Managed HSM: single-region or multi-region (disaster recovery)
├── Sovereign clouds: Azure Government, Azure China
└── Data at rest: within region by default
```

## High Availability and Disaster Recovery

### HA Architecture Comparison

```
Vault HA:
├── Active/passive with automatic failover
├── Standby nodes redirect or proxy to active
├── Raft: integrated consensus, 3-5 nodes
├── Consul: external consensus, 3-5 Consul servers
├── Failover time: 5-30s (leader election)
├── Read scalability: add standby nodes (active handles everything)
├── Performance replication: local reads on standby
└── DR: separate DR cluster with replication

AWS Secrets Manager HA:
├── Fully managed by AWS (multi-AZ)
├── No configuration needed for HA
├── Regional service: unaffected by single-AZ failure
├── Cross-region: manual read replicas
├── Failover: AWS handles transparently
├── SLA: 99.99% uptime
└── DR: replicate to second region manually

GCP Secret Manager HA:
├── Fully managed by Google (multi-zone)
├── Automatic replication between zones in region
├── Multi-region: configurable to replicate across regions
├── Failover: transparent within region
├── SLA: 99.99% uptime (99.999% for multi-region)
└── DR: built-in for multi-region configuration

Azure Key Vault HA:
├── Fully managed by Azure
├── Active within single region (multi-AZ)
├── Geo-replication to paired region
├── Failover: manual or automatic (configurable)
├── SLA: 99.99% uptime
└── DR: paired region within geography
```

### DR Procedure Comparison

```
Vault DR (Enterprise):
├── Replication type: disaster recovery or performance
├── DR cluster: warm standby in different region
├── RTO: <5min (DR promotion via API or UI)
├── RPO: <1s (merkle tree sync, continuous)
├── Cost: additional license per DR node, infrastructure
├── Test: regular DR drills (failover, rollback)
└── Complexity: high (requires dedicated DR planning)

AWS Secrets Manager DR:
├── Replication type: manual cross-region replica
├── DR cluster: read replicas in target region
├── RTO: depends on failover automation (minutes)
├── RPO: near-zero (replication delay <seconds)
├── Cost: per replica per day ($0.015)
├── Test: create replicas, promote, test, reverse
└── Complexity: moderate (replica management + promotion script)

GCP Secret Manager DR:
├── Replication type: multi-region (enabled at creation)
├── DR: built-in, no manual failover needed
├── RTO: <1s (automatic)
├── RPO: <1s (synchronous replication)
├── Cost: 2-3x single-region pricing
├── Test: read from second region
└── Complexity: low (set location = multi-region at creation)

Azure Key Vault DR:
├── Replication type: paired region (same geography)
├── DR cluster: warm standby in paired region
├── RTO: depends on failover procedure (minutes)
├── RPO: synchronous within region, async cross-region
├── Cost: built into service cost
├── Test: request failover via support ticket
└── Complexity: moderate (Azure-managed failover)
```

## Emerging Trends

### Secrets Management Evolution

```
2025+ trends:

1. Workload Identity Federation
├── Replace long-lived service account keys with federated tokens
├── Vault: JWT/OIDC auth with workload identity
├── AWS: IRSA for EKS, Workload Identity Federation for GitHub Actions
├── GCP: Workload Identity Federation for any OIDC issuer
├── Azure: Workload Identity for AKS + external OIDC
└── Goal: eliminate static service account keys entirely

2. Zero-Trust Secrets Access
├── Every access request verified regardless of network
├── Just-in-time access with approval workflows
├── Vault control groups (multi-person approval)
├── Session recording for sensitive operations
├── Behavior-based anomaly detection
└── Continuous verification (not just at auth time)

3. Secrets as Code (GitOps)
├── Secret definitions in YAML, stored in git (not values)
├── Policy as code: OPA / Vault policies in git
├── Auto-generated secrets via operator (External Secrets)
├── Drift detection: vault content vs git definitions
├── Reproducible environments from git
└── Audit trail for all changes (git history)

4. AI-Driven Anomaly Detection
├── ML models learn normal secret access patterns
├── Alerts on unusual retrieval patterns
├── Predictive rotation scheduling
├── Automated false positive reduction
├── Risk scoring per secret access
└── Integration with SOAR for automated response

5. Post-Quantum Cryptography Preparation
├── Vault: transit engine supporting hybrid PQ/TLS
├── Cloud providers: PQ key migration paths
├── Secret size increases (PQ keys are larger)
├── Algorithm agility in secret engines
└── Audit cryptographic inventory for PQ readiness
```

## Conclusion

The secrets management platform decision depends on infrastructure, feature requirements, operational maturity, and budget:

- **HashiCorp Vault**: Best for multi-cloud, on-premises, or need for dynamic secrets, PKI, transit encryption. Highest operational overhead but most flexible and feature-rich. Essential for organizations with diverse infrastructure.

- **AWS Secrets Manager**: Best for AWS-only shops, especially with RDS rotation needs. Simple pricing but expensive at scale. Native AWS integration is the primary advantage.

- **GCP Secret Manager**: Best for GCP-native organizations. Most cost-effective for medium-scale use. Multi-region support is excellent. Lacks rotation automation for most services.

- **Azure Key Vault**: Best for Azure-native organizations. Dramatically cheaper at scale (no per-secret cost). Strong HSM support. Limited secret size (25KB) and no rotation for custom secrets.

- **Hybrid (Vault + Cloud SM)**: Best for organizations that need both dynamic secrets (Vault) and managed infrastructure (cloud SM). This is the most common enterprise pattern.

## References

- HashiCorp Vault Documentation: `developer.hashicorp.com/vault/docs`
- AWS Secrets Manager Documentation: `docs.aws.amazon.com/secretsmanager`
- GCP Secret Manager Documentation: `cloud.google.com/secret-manager/docs`
- Azure Key Vault Documentation: `learn.microsoft.com/azure/key-vault`
- External Secrets Operator: `external-secrets.io`
- Secrets Store CSI Driver: `secrets-store-csi-driver.sigs.k8s.io`
- Vault Enterprise Features: `hashicorp.com/products/vault`
- AWS Secrets Manager Pricing: `aws.amazon.com/secrets-manager/pricing`
- GCP Secret Manager Pricing: `cloud.google.com/secret-manager/pricing`
- Azure Key Vault Pricing: `azure.microsoft.com/pricing/details/key-vault`
