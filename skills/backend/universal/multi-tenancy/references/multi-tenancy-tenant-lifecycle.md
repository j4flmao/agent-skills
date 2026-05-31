# Multi-Tenancy Tenant Lifecycle

## Overview

The tenant lifecycle encompasses every stage a tenant passes through from initial provisioning to eventual offboarding. A well-designed lifecycle system is the operational backbone of any multi-tenant SaaS application. It determines how quickly new customers can onboard, how reliably tenant data is managed during active use, and how cleanly tenants are removed when they churn. This reference covers the full lifecycle: provisioning, configuration, monitoring, plan changes, suspension, deletion, and data retention.

## Lifecycle Stages

```
[Signup] → [Provisioning] → [Active] → [Plan Change] → [Active]
                                  ↓                          ↓
                             [Suspended]               [Cancelled]
                                  ↓                          ↓
                             [Grace Period]             [Data Retention]
                                  ↓                          ↓
                             [Deleted]                  [Purged]
```

### Stage Definitions

| Stage | Description | Data Access | Billing | Retention |
|-------|-------------|-------------|---------|-----------|
| Provisioning | Infrastructure being created | None | Not started | N/A |
| Trial | Limited access, time-bound | Restricted features | Free | 30 days post-expiry |
| Active | Full production access | Full | Active billing | N/A |
| Suspended | Payment or policy violation | Read-only or blocked | Paused | 90 days |
| Cancelled | Customer-initiated termination | None | Stopped | Configurable (30-365 days) |
| Deleted | Data removed per policy | None | N/A | None |

## Tenant Provisioning

### Provisioning Pipeline

```python
import asyncio
from dataclasses import dataclass
from enum import Enum

class ProvisioningStep(Enum):
    CREATE_TENANT_RECORD = "create_tenant_record"
    CREATE_DATABASE = "create_database"
    RUN_MIGRATIONS = "run_migrations"
    SEED_DEFAULT_DATA = "seed_default_data"
    CONFIGURE_DOMAIN = "configure_domain"
    SETUP_BILLING = "setup_billing"
    SEND_WELCOME = "send_welcome"

@dataclass
class TenantProvisioner:
    tenant_id: str
    plan: str
    isolation_level: str

    async def provision(self) -> Tenant:
        tenant = await self._create_tenant_record()
        await asyncio.gather(
            self._create_infrastructure(tenant),
            self._configure_networking(tenant),
        )
        await self._run_migrations(tenant)
        await self._seed_data(tenant)
        await self._send_welcome_notification(tenant)
        return tenant

    async def _create_infrastructure(self, tenant: Tenant):
        if self.isolation_level == 'database':
            await self._create_database(tenant)
        elif self.isolation_level == 'schema':
            await self._create_schema(tenant)

    async def _create_database(self, tenant: Tenant):
        db_name = f"tenant_{tenant.id}"
        async with self.master_conn() as conn:
            await conn.execute(f"CREATE DATABASE {db_name} TEMPLATE template_{self.plan}")
            await conn.execute(f"GRANT ALL PRIVILEGES ON DATABASE {db_name} TO app_user")

    async def _create_schema(self, tenant: Tenant):
        schema_name = f"tenant_{tenant.id}"
        async with self.shared_conn() as conn:
            await conn.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
            await conn.execute(f"GRANT USAGE ON SCHEMA {schema_name} TO app_user")

    async def _seed_data(self, tenant: Tenant):
        default_data = {
            'settings': {
                'timezone': 'UTC',
                'locale': 'en-US',
                'date_format': 'YYYY-MM-DD',
                'business_hours': '{"mon-fri": "9:00-17:00"}',
            },
            'roles': [
                {'name': 'admin', 'permissions': ['*']},
                {'name': 'member', 'permissions': ['read', 'write']},
                {'name': 'viewer', 'permissions': ['read']},
            ],
            'workflows': [
                {'name': 'Default Onboarding', 'steps': ['welcome_email', 'setup_profile']},
            ],
        }
        await self._insert_default_data(tenant, default_data)
```

### Synchronous vs Asynchronous Provisioning

| Approach | Latency | User Experience | Complexity |
|----------|---------|-----------------|------------|
| Synchronous | 2-10 seconds | Waiting during signup | Low |
| Asynchronous | Instant signup, 30-60s provision | "We are setting up your workspace" screen | Medium |
| Hybrid (sync critical, async non-critical) | < 1 second for critical path | Progressive activation | High |

```typescript
// Hybrid provisioning: critical path sync, extensions async
async function provisionTenant(params: CreateTenantParams): Promise<Tenant> {
  // Synchronous critical path — tenant must have these before first request
  const tenant = await createTenantRecord(params);
  await createTenantSchema(tenant.id);
  await runCriticalMigrations(tenant.id);
  await seedEssentialData(tenant.id);

  // Fire-and-forget non-critical setup — user can start with core features
  provisionQueue.add([
    { type: 'SETUP_DOMAIN', tenant: tenant.id },
    { type: 'CONFIGURE_BILLING', tenant: tenant.id },
    { type: 'SEED_TEMPLATES', tenant: tenant.id },
    { type: 'CREATE_DEFAULT_DASHBOARDS', tenant: tenant.id },
    { type: 'REGISTER_WEBHOOKS', tenant: tenant.id },
    { type: 'SEND_WELCOME_EMAIL', tenant: tenant.id },
  ]);

  return tenant;
}
```

### Idempotent Provisioning
Provisioning must be idempotent. If a provisioning step fails and is retried, it should not create duplicate resources:

```sql
-- Use IF NOT EXISTS for idempotent schema creation
CREATE SCHEMA IF NOT EXISTS tenant_{id};

-- Use upsert for default data
INSERT INTO tenant_{id}.settings (key, value)
VALUES ('timezone', 'UTC')
ON CONFLICT (key) DO NOTHING;

-- Track provisioning state to allow resumption
CREATE TABLE tenant_provisioning_state (
  tenant_id UUID PRIMARY KEY,
  completed_steps TEXT[] NOT NULL DEFAULT '{}',
  failed_step TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT
);
```

## Tenant Configuration

### Configuration Store

Each tenant needs a configuration store that controls feature availability, branding, integration settings, and operational parameters:

```yaml
# Tenant configuration structure
tenant_config:
  metadata:
    name: "Acme Corp"
    slug: "acme-corp"
    plan: "enterprise"
    locale: "en-US"
    timezone: "America/New_York"
  features:
    advanced_analytics: true
    api_access: true
    sso_enabled: true
    audit_log: true
    custom_branding:
      logo_url: "https://cdn.example.com/acme/logo.png"
      primary_color: "#1a73e8"
      favicon_url: "https://cdn.example.com/acme/favicon.ico"
  limits:
    max_users: 500
    max_storage_gb: 100
    api_rate_limit: 10000
    max_workspaces: 10
  integrations:
    slack:
      enabled: true
      webhook_url: "https://hooks.slack.com/services/T00/B00/xxx"
    stripe:
      enabled: true
      account_id: "acct_xxx"
      webhook_secret: "whsec_xxx"
  security:
    ip_whitelist: ["203.0.113.0/24"]
    password_policy:
      min_length: 12
      require_mfa: true
      session_timeout_minutes: 120
    encryption_key_id: "kms-key-tenant-xxx"
```

### Configuration Caching

```python
import aiocache
from typing import Optional

class TenantConfigCache:
    def __init__(self, redis_url: str):
        self.cache = aiocache.RedisCache(endpoint=redis_url, namespace="tenant_config")
        self.ttl = 300  # 5 minutes

    async def get_config(self, tenant_id: str) -> Optional[dict]:
        cache_key = f"config:{tenant_id}"
        config = await self.cache.get(cache_key)
        if config:
            return config

        config = await self._load_from_database(tenant_id)
        if config:
            await self.cache.set(cache_key, config, ttl=self.ttl)
        return config

    async def invalidate(self, tenant_id: str):
        await self.cache.delete(f"config:{tenant_id}")
```

## Tenant Plan Changes

### Upgrade Path

```typescript
interface PlanUpgrade {
  from: string;
  to: string;
  changes: {
    isolationLevel?: string;
    limits: Record<string, number>;
    features: string[];
  };
  requiresDataMigration: boolean;
  estimatedDuration: string;
}

const upgradeMatrix: Record<string, PlanUpgrade> = {
  'free_to_pro': {
    from: 'free',
    to: 'pro',
    changes: {
      isolationLevel: 'schema_per_tenant',  // Migrate from row-level to schema
      limits: { max_users: 50, max_storage_gb: 10 },
      features: ['analytics', 'api_access'],
    },
    requiresDataMigration: true,
    estimatedDuration: '5-10 minutes per 10K rows',
  },
  'pro_to_enterprise': {
    from: 'pro',
    to: 'enterprise',
    changes: {
      isolationLevel: 'database_per_tenant',
      limits: { max_users: 1000, max_storage_gb: 500 },
      features: ['audit_log', 'sso', 'custom_branding'],
    },
    requiresDataMigration: true,
    estimatedDuration: '15-30 minutes per 100K rows',
  },
};
```

### Data Migration for Plan Changes

When upgrading isolation level (e.g., row-level to schema-per-tenant), data must be migrated:

```python
class TenantMigrationEngine:
    async def migrate_row_to_schema(self, tenant_id: str):
        source_schema = 'public'
        target_schema = f'tenant_{tenant_id}'

        # Step 1: Create target schema
        await self.execute(f"CREATE SCHEMA IF NOT EXISTS {target_schema}")

        # Step 2: Copy data tenant by tenant
        tables = ['orders', 'customers', 'products', 'invoices']
        for table in tables:
            await self.execute(f"""
                INSERT INTO {target_schema}.{table}
                SELECT * FROM {source_schema}.{table}
                WHERE tenant_id = $1
            """, tenant_id)

        # Step 3: Create indexes
        for table in tables:
            await self.execute(f"""
                CREATE INDEX idx_{table}_created
                ON {target_schema}.{table}(created_at DESC)
            """)

        # Step 4: Update tenant record
        await self.execute("""
            UPDATE tenants
            SET isolation_level = 'schema',
                migrated_at = now()
            WHERE id = $1
        """, tenant_id)

        # Step 5: Verify row counts match
        await self._verify_migration(tenant_id, source_schema, target_schema, tables)

    async def _verify_migration(self, tenant_id: str, source: str, target: str, tables: list):
        for table in tables:
            source_count = await self.fetchval(f"""
                SELECT COUNT(*) FROM {source}.{table}
                WHERE tenant_id = $1
            """, tenant_id)
            target_count = await self.fetchval(f"""
                SELECT COUNT(*) FROM {target}.{table}
            """)
            if source_count != target_count:
                raise MigrationError(
                    f"Row count mismatch for {table}: "
                    f"source={source_count}, target={target_count}"
                )
```

### Downgrade Handling

Downgrades are more complex than upgrades because features and limits are being removed:

```typescript
async function handleDowngrade(tenantId: string, fromPlan: string, toPlan: string) {
  const downgradeActions = [];

  // Enforce new limits
  if (toPlan === 'free') {
    downgradeActions.push(
      enforceUserLimit(tenantId, 10),        // Archive users beyond limit
      enforceStorageLimit(tenantId, 500),     // 500 MB storage limit
      disableFeature(tenantId, 'analytics_reports'),
      disableFeature(tenantId, 'api_access'),
    );
  }

  // If downgrading isolation level (rare), data consolidation needed
  if (fromPlan === 'enterprise' && toPlan === 'pro') {
    downgradeActions.push(
      consolidateToSchema(tenantId),  // Move from dedicated DB to shared DB schema
    );
  }

  // Execute all actions
  await Promise.all(downgradeActions.map(action => action.catch(logError)));

  // Notify tenant admins
  await sendDowngradeNotification(tenantId, fromPlan, toPlan, downgradeActions);
}
```

## Tenant Suspension

### Suspension Scenarios

| Reason | Data Access | Grace Period | Reactivation |
|--------|-------------|--------------|--------------|
| Payment failure | Read-only | 14 days | Auto on payment |
| Terms violation | Blocked | 7 days (with appeal) | Manual review |
| Abuse detection | Blocked | Immediate | Manual review |
| Inactivity | Read-only | 90 days | Self-service |
| Legal hold | Preserved | Indefinite | Court order |

### Suspension Implementation

```python
async def suspend_tenant(tenant_id: str, reason: str, severity: str):
    tenant = await get_tenant(tenant_id)

    if severity == 'read_only':
        await set_tenant_mode(tenant_id, 'read_only')
        await revoke_write_tokens(tenant_id)
        await notify_admins(tenant_id, f"Access limited to read-only: {reason}")

    elif severity == 'blocked':
        await set_tenant_mode(tenant_id, 'blocked')
        await revoke_all_tokens(tenant_id)
        await schedule_existing_jobs_cancellation(tenant_id)
        await close_active_sessions(tenant_id)
        await notify_admins(tenant_id, f"Access suspended: {reason}")

    # Start grace period timer
    await schedule_action(
        days=GRACE_PERIODS.get(reason, 30),
        action=f"delete_tenant:{tenant_id}"
    )
```

## Tenant Deletion and Data Retention

### Deletion Pipeline

```python
class TenantDeletionPipeline:
    async def delete_tenant(self, tenant_id: str, retention_days: int = 30):
        # Phase 1: Mark for deletion
        await self._mark_for_deletion(tenant_id)

        # Phase 2: Schedule data export (customer may request)
        await self._offer_data_export(tenant_id)

        # Phase 3: Retention period
        await asyncio.sleep(retention_days * 86400)

        # Phase 4: Delete data
        await self._delete_tenant_data(tenant_id)

        # Phase 5: Clean up secondary stores
        await asyncio.gather(
            self._delete_from_search_index(tenant_id),
            self._delete_from_cache(tenant_id),
            self._delete_file_storage(tenant_id),
            self._delete_backups(tenant_id),
        )

        # Phase 6: Remove tenant record
        await self._remove_tenant_record(tenant_id)

    async def _delete_tenant_data(self, tenant_id: str):
        if self.isolation_level == 'database':
            await self.execute(f"DROP DATABASE IF EXISTS tenant_{tenant_id}")
        elif self.isolation_level == 'schema':
            await self.execute(f"DROP SCHEMA IF EXISTS tenant_{tenant_id} CASCADE")
        else:  # row-level
            # Delete tenant data from shared tables
            for table in self.tenant_tables:
                await self.execute(
                    f"DELETE FROM {table} WHERE tenant_id = $1",
                    tenant_id
                )

    async def _delete_file_storage(self, tenant_id: str):
        # S3 prefix deletion
        await self.s3.delete_objects(
            Bucket=self.bucket,
            Delete={
                'Objects': [
                    {'Key': obj['Key']}
                    async for obj in self.s3.list_objects(
                        Bucket=self.bucket,
                        Prefix=f"tenants/{tenant_id}/"
                    )
                ]
            }
        )
```

### Data Retention Policy Configuration

```yaml
retention_policies:
  default:
    active_data: "until tenant deletion"
    deleted_tenant: 90 days
    backups: 30 days after tenant deletion
    audit_logs: 7 years (compliance)
    anonymized_analytics: indefinite (no PII)
  gdpr:
    active_data: "until deletion request"
    deleted_tenant: 30 days
    backups: 90 days (restore window)
    audit_logs: 1 year (minimized)
    anonymized_analytics: indefinite
  hipaa:
    active_data: "6 years from creation"
    deleted_tenant: 6 years
    backups: 6 years
    audit_logs: 6 years
    anonymized_analytics: none (purge completely)
```

### Soft Deletion vs Hard Deletion

```typescript
type DeletionStrategy = 'soft' | 'hard' | 'anonymize';

const deletionStrategies: Record<string, DeletionStrategy[]> = {
  user_data: ['soft', 'anonymize', 'hard'],
  audit_logs: ['soft', 'hard'],  // Never anonymize audit logs
  analytics: ['anonymize', 'hard'],
  backups: ['hard'],
};

async function executeDeletionStrategy(
  tenantId: string,
  strategy: DeletionStrategy
) {
  switch (strategy) {
    case 'soft':
      // Mark as deleted, data remains in database
      await db.query(
        'UPDATE tenants SET status = $1, deleted_at = now() WHERE id = $2',
        ['deleted', tenantId]
      );
      // All queries filter WHERE status != 'deleted'
      break;

    case 'anonymize':
      // Replace PII with hash tokens
      await db.query(`
        UPDATE users
        SET email = CONCAT('anon-', id, '@deleted.example.com'),
            name = 'Deleted User',
            avatar_url = NULL
        WHERE tenant_id = $1
      `, [tenantId]);
      break;

    case 'hard':
      // Permanently remove data
      await deletionPipeline.delete_tenant(tenantId);
      break;
  }
}
```

## Tenant Monitoring and Health

### Health Metrics

```python
class TenantHealthMonitor:
    def __init__(self):
        self.metrics = {
            'api_latency_p50': Histogram('tenant_api_latency_p50', 'API latency P50 per tenant', ['tenant_id']),
            'api_error_rate': Counter('tenant_api_errors', 'API errors per tenant', ['tenant_id', 'status_code']),
            'active_users': Gauge('tenant_active_users', 'Active users per tenant', ['tenant_id']),
            'storage_used': Gauge('tenant_storage_bytes', 'Storage used per tenant', ['tenant_id']),
            'query_latency': Histogram('tenant_db_query_latency', 'DB query latency per tenant', ['tenant_id']),
        }

    def record_request(self, tenant_id: str, duration_ms: float, status: int):
        self.metrics['api_latency_p50'].labels(tenant_id=tenant_id).observe(duration_ms)
        if status >= 400:
            self.metrics['api_error_rate'].labels(tenant_id=tenant_id, status_code=status).inc()

    def check_tenant_health(self, tenant_id: str) -> TenantHealth:
        checks = [
            self._check_database_connectivity(tenant_id),
            self._check_storage_quota(tenant_id),
            self._check_rate_limit_headroom(tenant_id),
            self._check_background_job_queue(tenant_id),
            self._check_recent_error_spike(tenant_id),
        ]
        results = await asyncio.gather(*checks, return_exceptions=True)
        return TenantHealth(
            healthy=all(r.healthy for r in results if not isinstance(r, Exception)),
            checks=[r for r in results if not isinstance(r, Exception)],
        )

    def _define_alerts(self):
        return [
            AlertRule(
                name='tenant_high_error_rate',
                condition='tenant_api_errors > 50 in 5m',
                severity='warning',
                channels=['slack', 'pagerduty'],
            ),
            AlertRule(
                name='tenant_storage_near_limit',
                condition='tenant_storage_bytes > 0.9 * tenant_storage_limit',
                severity='warning',
                channels=['email'],
            ),
            AlertRule(
                name='tenant_query_degradation',
                condition='tenant_db_query_latency_p99 > 5s',
                severity='critical',
                channels=['pagerduty'],
            ),
        ]
```

### Tenant Dashboard

A per-tenant operational dashboard should surface:
- Current plan, status, and days since last activity
- API usage vs. rate limit (percentage)
- Storage usage vs. quota (percentage)
- Active user count (last 7/30 days)
- Error rate trend (last 24 hours)
- P50/P95/P99 API latency (last 24 hours)
- Recent failed payment attempts (last 30 days)
- Background job queue depth

## Multi-Region Tenant Support

For tenants requiring data residency in specific regions:

```python
class RegionRouter:
    def __init__(self):
        self.regions = {
            'us-east-1': {
                'database_url': 'postgresql://...',
                'file_storage': 's3://us-east-1-bucket',
                'search_endpoint': 'https://search-us-east-1...',
            },
            'eu-west-1': {
                'database_url': 'postgresql://...',
                'file_storage': 's3://eu-west-1-bucket',
                'search_endpoint': 'https://search-eu-west-1...',
            },
        }

    def get_region_for_tenant(self, tenant_id: str) -> str:
        tenant = self.get_tenant_record(tenant_id)
        return tenant.region or 'us-east-1'

    def provision_tenant_in_region(self, tenant_id: str, region: str):
        if region not in self.regions:
            raise ValueError(f"Unsupported region: {region}")
        config = self.regions[region]
        # Provision all tenant resources in the target region
        provisioner.create_database(tenant_id, config['database_url'])
        provisioner.create_file_storage(tenant_id, config['file_storage'])
        provisioner.create_search_index(tenant_id, config['search_endpoint'])
```

## References
- references/isolation-strategies.md — Isolation Strategies
- references/data-partitioning.md — Data Partitioning at Scale
- references/tenant-provisioning.md — Tenant Provisioning
- references/tenant-routing.md — Tenant Routing Reference
- references/multi-tenancy-monitoring.md — Multi-Tenancy Monitoring
- references/multi-tenancy-data-isolation.md — Multi-Tenancy Data Isolation
