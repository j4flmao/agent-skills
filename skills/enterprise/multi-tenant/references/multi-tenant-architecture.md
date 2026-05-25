# Multi-Tenant Architecture Patterns

## Isolation Model Comparison

### The Three Primary Patterns: Silo, Pool, Bridge

| Dimension | Silo (DB per Tenant) | Pool (Shared DB) | Bridge (Schema per Tenant) |
|-----------|---------------------|------------------|---------------------------|
| Isolation | Strongest | Weakest | Balanced |
| Cost at scale | Highest | Lowest | Medium |
| Operational complexity | High | Low | Medium |
| Tenant max | Hundreds | Millions | Thousands |
| Compliance fit | HIPAA, PCI, FedRAMP | B2C SaaS | Enterprise SaaS |
| Migration per tenant | Independent | Requires schema changes | Independent |
| Backup/restore | Per tenant | Global | Per tenant |
| Cross-tenant queries | Union across DBs | Native SQL | Union across schemas |

### Pattern Selection Decision Tree
```
Do you handle regulated data (PHI, PII, PCI)?
  ├── Yes → Silo (DB per tenant)
  └── No → How many tenants?
       ├── < 1,000 → Bridge (Schema per tenant)
       └── > 1,000 → Pool (Row-level isolation)
```

## Silo Pattern (Database per Tenant)

### Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Tenant A DB │     │ Tenant B DB │     │ Tenant C DB │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ orders      │     │ orders      │     │ orders      │
│ users       │     │ users       │     │ users       │
│ products    │     │ products    │     │ products    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Connection Routing
```python
def get_db_connection(tenant_id):
    tenant_db_map = {
        "tenant_a": "postgresql://host:5432/tenant_a_db",
        "tenant_b": "postgresql://host:5432/tenant_b_db",
        "tenant_c": "postgresql://host:5432/tenant_c_db",
    }
    connection_string = tenant_db_map[tenant_id]
    return create_engine(connection_string)
```

### Pros and Cons
```
Pros:
- Strongest data isolation
- Per-tenant backup/restore
- Independent upgrades per tenant
- No noisy neighbor issues
- Best for regulated data

Cons:
- Highest infrastructure cost
- Complex cross-tenant operations
- Migration tooling for each tenant
- Connection pool management
- Monitoring overhead per DB
```

## Pool Pattern (Shared Database)

### Architecture
```
┌─────────────────────────────┐
│       Shared Database        │
├─────────────────────────────┤
│ orders                      │
│ ├── tenant_id (indexed)     │
│ ├── order_id                │
│ └── amount                  │
│                             │
│ users                       │
│ ├── tenant_id (indexed)     │
│ ├── user_id                 │
│ └── email                   │
└─────────────────────────────┘
```

### Row-Level Security
```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy filtering by tenant_id
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id'));

-- Set tenant context per session
SET app.tenant_id = 'tenant_a';

-- Queries automatically filter to tenant_a data
SELECT * FROM orders;
-- Only returns orders with tenant_id = 'tenant_a'
```

### Pros and Cons
```
Pros:
- Lowest cost per tenant
- Simple cross-tenant queries
- Single backup/restore point
- Easy schema migrations
- Millions of tenants feasible

Cons:
- Weakest isolation
- Noisy neighbor risk
- Harder tenant data export
- Row-level security overhead
- Compliance limitations
```

## Bridge Pattern (Schema per Tenant)

### Architecture
```
┌──────────────────────────────┐
│        Shared Database        │
├──────────────────────────────┤
│ tenant_a (schema)             │
│ ├── orders                    │
│ ├── users                     │
│ └── products                  │
│                              │
│ tenant_b (schema)             │
│ ├── orders                    │
│ ├── users                     │
│ └── products                  │
└──────────────────────────────┘
```

### Schema Routing
```python
def set_tenant_schema(tenant_id):
    # Set PostgreSQL search_path to tenant schema
    session.execute(f"SET search_path TO {sanitize(tenant_id)}")

# Usage in middleware
@app.before_request
def resolve_tenant():
    tenant_id = get_tenant_id_from_request()
    set_tenant_schema(tenant_id)
```

### Pros and Cons
```
Pros:
- Good isolation per tenant
- Independent schema per tenant
- Balanced cost at scale
- Per-tenant migrations possible
- Stronger than row-level

Cons:
- Schema management overhead
- Connection pool per schema
- Maximum practical tenants ~10,000
- Complex cross-tenant queries
- Requires careful sanitization
```

## Tenant Provisioning Automation

### Provisioning Pipeline
```
Trigger: Tenant signup or admin creates tenant
1. Generate tenant_id (UUID)
2. Create tenant record in registry DB
3. Provision infrastructure (database, schema, or namespace)
4. Apply tenant-specific configuration
5. Create admin user for tenant
6. Set up monitoring and billing
7. Activate tenant
8. Send welcome notification
```

### Idempotent Provisioning with IaC
```hcl
# Example: Provision tenant database with Terraform
resource "aws_rds_cluster" "tenant" {
  for_each = var.new_tenants
  cluster_identifier = "tenant-${each.key}"
  engine = "aurora-postgresql"
  database_name = "tenant_${each.key}"
  master_username = "admin"
  skip_final_snapshot = true
}
```

## Tenant Billing and Metering

### Usage Metering
```
| Tenant | API Calls | Storage (GB) | Compute (hours) | Data Transfer (GB) |
|--------|-----------|--------------|-----------------|-------------------|
| Tenant A | 1,200,000 | 50 | 720 | 200 |
| Tenant B | 850,000 | 35 | 480 | 150 |
| Tenant C | 2,100,000 | 120 | 1,440 | 450 |

Billing Model: Per-resource metering + base subscription
Rate Card: $0.01/1K API calls, $0.10/GB storage, $0.05/compute hour
```

### Showback Reports per Tenant
```
Tenant A Monthly Cost Breakdown:
  Base subscription: $500
  API calls (1.2M × $0.01/1K): $12
  Storage (50 GB × $0.10): $5
  Compute (720h × $0.05): $36
  Data transfer (200 GB × $0.01): $2
  Total: $555
```

## Data Separation Strategies

### Encryption per Tenant
```
Option A: Shared encryption key, tenant_id embedded in encrypted payload
Option B: Per-tenant encryption keys stored in KMS
Option C: Per-tenant HSM for maximum isolation

Recommendation:
- Pool pattern: Option A for performance, Option B for compliance
- Bridge pattern: Option B 
- Silo pattern: Option A (DB-level encryption sufficient)
```

### Cache Isolation
```
Pattern: Prefix all cache keys with tenant ID
```
REDIS_KEY = f"{tenant_id}:{entity_type}:{entity_id}"
SET "tenant_a:user:42" "{...}"
```

Never share cached data across tenant boundaries
Partition Redis instances per tenant for high-security environments
```

### Queue Isolation
```
Strategy | Implementation | Use Case
---------|---------------|----------
Prefix-based | SQS queue per tenant | Silo pattern
Tag-based | Pub/sub with tenant tag filter | Pool pattern
Dedicated | Separate queue infrastructure | Regulated tenants
```
