# Data Partitioning at Scale Reference

## Per-Tenant vs Pooled Databases

### Comparison

| Factor | Pooled (Shared DB) | Schema-Per-Tenant | DB-Per-Tenant |
|--------|-------------------|-------------------|---------------|
| Isolation | Minimal | Good | Complete |
| Cost | Lowest | Medium | Highest |
| Max tenants | Unlimited | 1000-5000 | 100-500 |
| Maintenance | Single DB to manage | Per-schema migrations | Per-DB migrations |
| Cross-tenant queries | Easy | Moderate | Difficult |
| Backup/restore | All tenants | Per schema | Per DB |
| Connection management | Single pool | Per-schema routing | Connection per tenant |
| Recovery point | All or nothing | Per tenant | Per tenant |

### Decision Matrix

```yaml
tenant_count:
  range: "< 100"
  strategy: "DB-per-tenant"
  reasoning: "Simple, full isolation, easy backups"

tenant_count:
  range: "100 - 1000"
  strategy: "Schema-per-tenant"
  reasoning: "Good balance of isolation and operational complexity"

tenant_count:
  range: "1000 - 10000"
  strategy: "Pooled (with tenant_id index)"
  reasoning: "Only scalable option at this count"

tenant_count:
  range: "> 10000"
  strategy: "Pooled + sharding"
  reasoning: "Single DB won't handle volume"
```

## Shard Management

### Shard Key Selection

```typescript
// Shard by tenant ID hash
function getShard(tenantId: string, numShards: number): number {
  const hash = murmur3_32(tenantId);
  return hash % numShards;
}

// Shard routing table
class ShardRouter {
  private shards: Array<{ host: string; port: number; db: string }>;

  getConnection(tenantId: string): DatabasePool {
    const shardIndex = getShard(tenantId, this.shards.length);
    const shard = this.shards[shardIndex];
    return this.pools[shardIndex];
  }
}
```

### Rebalancing Shards

```sql
-- 1. Add new shard
ALTER SYSTEM ADD SHARD shard4 HOST 'db4.example.com';

-- 2. Mark virtual shards for migration
UPDATE shard_map SET status = 'MIGRATING'
WHERE shard_id IN (SELECT shard_id FROM virtual_shards WHERE current_shard = 'shard1' AND tenant_count < threshold);

-- 3. Copy data (async)
SELECT migrate_tenant_data('tenant_abc', 'shard1', 'shard4');

-- 4. Verify consistency
SELECT COUNT(*) FROM tenants.tenant_abc.orders;
-- Compare with source

-- 5. Switch routing
UPDATE shard_map SET current_shard = 'shard4', status = 'ACTIVE'
WHERE tenant_id = 'tenant_abc';

-- 6. Remove old data (after verification window)
DROP SCHEMA IF EXISTS tenants.tenant_abc;
```

## Tenant Migration

### Migration Strategies

```yaml
migration_strategy:
  name: "Live migration with cutover window"
  steps:
    phase_1_prepare:
      - "Create destination schema/DB"
      - "Apply same schema version"
      - "Set up replication (logical if possible)"
    
    phase_2_sync:
      - "Initial copy of all data (pg_dump / export)"
      - "Continuous replication for catching up"
    
    phase_3_cutover:
      duration: "5-15 minutes (read-only window)"
      steps:
        - "Enable read-only mode for tenant"
        - "Wait for replication lag to reach 0"
        - "Verify data consistency"
        - "Switch DNS/connection string"
        - "Disable read-only mode"
    
    phase_4_verify:
      - "Run integrity checks"
      - "Monitor error rates"
      - "Keep old data for 30 days"
```

```typescript
async function migrateTenant(
  tenantId: string,
  targetConfig: DatabaseConfig
): Promise<void> {
  // 1. Create target schema
  await createSchema(targetConfig, tenantId);

  // 2. Set up logical replication
  const subscription = await setupReplication(tenantId, targetConfig);

  // 3. Wait for initial sync
  await waitForReplicationLag(subscription, '< 1s');

  // 4. Enable maintenance mode
  await setTenantMaintenanceMode(tenantId, true);

  // 5. Final sync (should be near-instant)
  await waitForReplicationLag(subscription, 0);

  // 6. Verify row counts
  const sourceCount = await countRows(tenantId);
  const targetCount = await countRowsOnTarget(targetConfig, tenantId);
  if (sourceCount !== targetCount) throw new Error('Data mismatch');

  // 7. Switch routing
  await routingTable.update(tenantId, targetConfig);

  // 8. Disable maintenance mode
  await setTenantMaintenanceMode(tenantId, false);
}
```

## Cross-Tenant Analytics

### Options

| Approach | Freshness | Cost | Complexity |
|----------|-----------|------|------------|
| Federated queries | Real-time | Low | High |
| ETL to warehouse | Daily | Medium | Medium |
| Streaming events | Near-real-time | High | High |
| Per-tenant analytics DB | Real-time per tenant | Medium | Low |

### ETL Pattern
```yaml
cross_tenant_analytics:
  pipeline:
    extract:
      method: "Logical replication or scheduled export"
      frequency: "Hourly for hot data, daily for cold"
      scope: "All tenants, tagged with tenant_id"
    
    transform:
      - "Anonymize PII (hash user emails, mask IPs)"
      - "Normalize schemas (handle tenant-specific variations)"
      - "Deduplicate across tenants"
    
    load:
      target: "ClickHouse / BigQuery / Snowflake"
      schema: "with tenant_id dimension"
      partitioning: "By time (daily) + tenant_id"
    
  access:
    - "Product analytics: aggregated across tenants"
    - "Billing: per-tenant breakdown with totals"
    - "Usage trends: tenant cohorts, percentile distributions"
```

## Noisy Neighbor Mitigation

A "noisy neighbor" is one tenant consuming disproportionate resources, impacting others.

### Detection
```sql
-- Identify resource-hungry tenants
SELECT
  tenant_id,
  COUNT(*) as query_count,
  SUM(total_time) as total_db_time,
  AVG(total_time) as avg_query_time,
  SUM(shared_buffers_hit) as buffer_hits,
  SUM(shared_buffers_read) as buffer_reads
FROM pg_stat_statements
JOIN tenant_map ON query ~ ('tenant_id = ''' || tenant_map.tenant_id || '''')
GROUP BY tenant_id
ORDER BY total_db_time DESC
LIMIT 10;
```

### Mitigation Techniques

| Technique | Implementation | Effectiveness |
|-----------|---------------|---------------|
| Connection pooling | Per-tenant connection limits | Medium |
| Statement timeout | `SET statement_timeout = '5s'` per tenant | High |
| Resource groups | cgroups / PostgreSQL resource groups | High |
| Read replicas | Route heavy-read tenants to replicas | Medium |
| Priority queuing | Tenant tier determines query priority | Medium |
| Shard isolation | Move noisy neighbors to dedicated shards | Very High |

```sql
-- PostgreSQL: set per-tenant resource limits
ALTER ROLE tenant_acme SET statement_timeout = '30s';
ALTER ROLE tenant_acme SET idle_in_transaction_session_timeout = '5min';
ALTER ROLE tenant_acme SET work_mem = '16MB';  -- Limit per-operation memory
```

## Data Partitioning Best Practices

- **Always include tenant_id in indexes**: Every query scoped to tenant needs the tenant_id index
- **Plan for rebalancing**: No shard strategy is permanent — design for migration from day one
- **Monitor per-tenant storage**: Alert on tenants growing faster than 90th percentile
- **Backup strategy**: Per-tenant restorability is a requirement for enterprise SLAs
- **Connection limits**: Hard limit connections per tenant to prevent runaway connection exhaustion
- **Query budget**: Define max query complexity per tenant tier (free vs enterprise)
