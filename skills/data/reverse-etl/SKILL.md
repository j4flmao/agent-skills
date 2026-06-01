---
name: data-reverse-etl
description: >
  Use this skill when asked about reverse ETL, Census, Hightouch, Grouparoo, operational analytics, syncing data from warehouse to SaaS, warehosue-to-SaaS, operational data activation, data warehouse as source, sync configs, idempotent syncs, audience export, or data activation. This skill enforces: warehouse-first sync architecture with idempotent writes, incremental and full-refresh sync modes, API rate-limit aware scheduling, and destination-specific deduplication strategies. Do NOT use for: traditional ETL (warehouse as target), streaming CDC, or data ingestion pipelines.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, reverse-etl, operational-analytics, phase-11]
---

# Reverse ETL

## Purpose
Sync aggregated, transformed data from a data warehouse to operational SaaS tools (CRM, marketing, support) to power customer-facing and internal operational workflows.

## Agent Protocol

### Trigger
Exact user phrases: "reverse ETL", "Census", "Hightouch", "Grouparoo", "operational analytics", "warehouse to SaaS", "data activation", "warehouse sync", "audience export", "sync config", "operational data", "warehouse-first", "sync identity resolution".

### Input Context
Before activating, verify:
- Source warehouse (Snowflake, BigQuery, Redshift, Databricks, Postgres)
- Destination SaaS tools (Salesforce, HubSpot, Marketo, Braze, Amplitude, Zendesk, Google Ads, Facebook Audiences)
- Sync frequency (real-time, hourly, daily, batch window)
- Identity resolution strategy (unique keys, merge rules, foreign key mapping)
- Volume (rows per sync, daily active records)
- Idempotency requirements (upsert vs replace vs append)

### Output Artifact
Reverse ETL pipeline config with SQL source query, sync schedule, identity mapping, and destination-specific operation config as YAML and SQL.

### Response Format
```yaml
# Sync configuration with identity mapping
```
```sql
-- Source query
```
```json
-- Destination field mapping
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Source SQL query with deduplication and incremental filtering
- [ ] Identity resolution keys defined for each destination
- [ ] Sync schedule with rate-limit awareness configured
- [ ] Destination operation mode (upsert/replace/append) specified
- [ ] Error handling with retry and alerting defined
- [ ] Data freshness SLA documented

### Max Response Length
4096

## Workflow

### Sync Model Architecture

Reverse ETL operates in three stages:
1. **Source query** — SQL that extracts and transforms warehouse data into the desired shape
2. **Identity resolution** — mapping warehouse keys to destination object IDs
3. **Destination sync** — API calls to create/update/delete records in the target system

The source SQL should be idempotent: running it multiple times produces the same result set. Use `QUALIFY ROW_NUMBER()` or equivalent to deduplicate on the identity key.

#### Incremental Sync Pattern

```sql
-- Snowflake incremental sync with watermark
WITH latest_customers AS (
  SELECT
    customer_id,
    email,
    full_name,
    lifetime_value,
    last_order_date,
    customer_tier,
    updated_at
  FROM analytics.customers_v2
  WHERE updated_at > (
    SELECT MAX(last_synced_at) FROM sync_watermarks
    WHERE sync_name = 'customers_to_salesforce'
  )
    AND is_active = TRUE
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY customer_id ORDER BY updated_at DESC
  ) = 1
)
SELECT * FROM latest_customers
```

#### Full Refresh Pattern

```sql
-- BigQuery full refresh for audience export
SELECT
  user_id AS external_id,
  email,
  ARRAY_AGG(DISTINCT product_category) AS viewed_categories,
  MAX(order_completed) AS has_ordered,
  SUM(revenue) AS total_revenue
FROM `analytics.user_events`
WHERE event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY user_id, email
HAVING SUM(revenue) > 0 OR MAX(order_completed) = TRUE
```

### Identity Resolution

Identity resolution maps warehouse rows to destination object IDs. Destinations use different matching strategies:

| Destination | Match Key | Sync Mode | Dedup Strategy |
|---|---|---|---|
| Salesforce | `external_id__c` or email | Upsert | Custom External ID field |
| HubSpot | email or `hs_object_id` | Upsert | Email dedup rule |
| Marketo | email or `foreignKey` | Upsert | Email dedup |
| Braze | `external_id` or `alias_name` | Merge | External ID |
| Amplitude | `user_id` or `device_id` | Merge | User ID merge |
| Zendesk | email or `external_id` | Upsert | External ID |
| Google Ads | `hashed_email` or `hashed_phone` | Upload (CUID) | SHA-256 hashing |
| Facebook Audiences | `email` or `pixel_id` | Upload (CAPI) | SHA-256 hashing |

```yaml
# Census sync config example
sync:
  name: "Customer Tier Sync to Salesforce"
  source:
    type: snowflake
    object: analytics.customers_v2
    query: "SELECT customer_id, email, full_name, customer_tier, lifetime_value FROM analytics.customers_v2 WHERE updated_at > {{last_synced_at}}"
    incremental: true
    incremental_key: updated_at
  destination:
    type: salesforce
    object: Contact
    operation: upsert
    external_id: external_id__c
  mapping:
    - from: customer_id
      to: external_id__c
    - from: email
      to: Email
    - from: full_name
      to: Name
    - from: customer_tier
      to: Customer_Tier__c
    - from: lifetime_value
      to: Lifetime_Value__c
  schedule:
    frequency: hourly
    interval_minutes: 60
    retry_on_failure: true
    max_retries: 3
    backoff_minutes: 5
```

### Idempotency Patterns

Idempotency ensures running a sync twice does not create duplicate records:

1. **Upsert by external ID** — warehouse provides a stable unique key mapped to a destination custom field. Sync matches on that key and updates if exists, creates if not.
2. **Upsert by email** — email is the natural dedup key for contact/user objects. Destinations enforce email uniqueness.
3. **Append with dedup window** — for event data, append new rows and deduplicate by a time-windowed unique key post-sync.
4. **Replace by primary key** — full-refresh truncates and replaces the destination table. Use only for small reference data.

```yaml
# Hightouch sync config with idempotency
sync:
  name: "Product Catalog to Shopify"
  source:
    type: postgres
    table: catalog.products
    primary_key: product_sku
  destination:
    type: shopify
    resource: Product
    operation: upsert
    mapping:
      - from: product_sku
        to: sku
        is_primary_key: true
      - from: title
        to: title
      - from: price
        to: price
      - from: inventory_count
        to: inventory_quantity
  idempotency:
    strategy: primary_key
    dedup_on_source: true
    dedup_window_hours: 24
    ignore_deletes: false
```

```python
# Python idempotency check in custom sync pipeline
import hashlib
from datetime import datetime, timedelta

def build_sync_signature(sync_name: str, batch: list[dict]) -> str:
    """Create deterministic hash for sync batch dedup."""
    content = "".join(
        f"{row['id']}:{row['updated_at']}" for row in sorted(batch, key=lambda x: x['id'])
    )
    return hashlib.sha256(f"{sync_name}:{content}".encode()).hexdigest()

def check_already_synced(warehouse_conn, sync_name: str, signature: str) -> bool:
    """Check if a sync batch was already processed."""
    result = warehouse_conn.execute(
        "SELECT 1 FROM sync_log WHERE sync_name = %s AND batch_signature = %s",
        (sync_name, signature)
    )
    return result.fetchone() is not None
```

### Operational Analytics Patterns

#### Customer Health Scoring

```sql
-- Snowflake: customer health score for Salesforce sync
WITH customer_metrics AS (
  SELECT
    c.customer_id,
    c.email,
    c.company_name,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(o.revenue) AS total_revenue,
    MAX(o.order_date) AS last_order_date,
    COUNT(DISTINCT t.ticket_id) AS support_tickets_90d,
    AVG(t.satisfaction_score) AS avg_csat,
    DATEDIFF('day', MAX(o.order_date), CURRENT_DATE) AS days_since_last_order
  FROM analytics.customers c
  LEFT JOIN analytics.orders o ON c.customer_id = o.customer_id
    AND o.order_date >= DATEADD('month', -12, CURRENT_DATE)
  LEFT JOIN analytics.support_tickets t ON c.customer_id = t.customer_id
    AND t.created_date >= DATEADD('day', -90, CURRENT_DATE)
  GROUP BY c.customer_id, c.email, c.company_name
)
SELECT
  *,
  CASE
    WHEN total_revenue > 10000 AND total_orders > 5 AND days_since_last_order < 30
      THEN 'healthy'
    WHEN total_revenue > 1000 AND days_since_last_order < 90
      THEN 'at_risk'
    WHEN days_since_last_order > 90 OR support_tickets_90d > 10
      THEN 'churned'
    ELSE 'new'
  END AS health_score
FROM customer_metrics
```

#### Audience Segmentation for Ad Platforms

```sql
-- BigQuery: audience export for Google Ads Customer Match
SELECT
  u.user_id,
  LOWER(TRIM(u.email)) AS email,
  LOWER(TRIM(u.phone)) AS phone,
  INITCAP(TRIM(u.first_name)) AS first_name,
  INITCAP(TRIM(u.last_name)) AS last_name,
  CONCAT(u.city, ', ', u.state) AS city_state,
  u.zip_code,
  SPLIT(u.country, '|')[OFFSET(0)] AS country
FROM analytics.users u
WHERE u.is_active = TRUE
  AND u.has_purchased = TRUE
  AND u.opted_in_marketing = TRUE
  AND u.email IS NOT NULL
LIMIT 100000
```

### Destination-Specific Operation Modes

| Mode | Behavior | Use Case |
|---|---|---|
| `upsert` | Create or update by match key | Customer profiles, CRM contacts |
| `append` | Always insert new rows | Event data, audit logs |
| `replace` | Truncate destination and insert all rows | Small reference tables |
| `merge` | Match and merge fields (Braze, Amplitude) | User identity resolution |
| `mirror` | Full reconciliation: insert, update, delete to match source exactly | Product catalogs, inventory |

### Scheduling and Rate Limiting

```yaml
# Rate-limit aware schedule for HubSpot
schedule:
  frequency: custom
  interval_minutes: 30
  rate_limit:
    max_requests_per_second: 10
    max_requests_per_minute: 100
    max_batch_size: 100
    backoff_strategy: exponential
    initial_backoff_seconds: 10
    max_backoff_minutes: 30
  time_window:
    start: "06:00"
    end: "22:00"
    timezone: America/New_York
```

### Advanced Sync Patterns

#### Orchestrated Multi-Destination Sync

```yaml
sync_pipeline:
  name: "customer_360_sync"
  schedule: "0 */6 * * *"  # Every 6 hours
  
  steps:
    - step: 1
      action: "Extract from warehouse"
      query: |
        SELECT c.customer_id, c.email, c.name, c.tier,
               o.last_order_date, o.lifetime_value,
               ARRAY_AGG(DISTINCT s.segment) as segments
        FROM customers c
        LEFT JOIN order_summary o ON c.customer_id = o.customer_id
        LEFT JOIN customer_segments s ON c.customer_id = s.customer_id
        WHERE c.updated_at >= '{{ last_sync }}'
        GROUP BY ALL
      target: "staging.customer_sync_batch"
    
    - step: 2
      action: "Apply identity resolution"
      logic: "Merge duplicate customer records by email, phone, external_id"
    
    - step: 3
      action: "Sync to Salesforce"
      if: "customer.tier IN ('platinum', 'gold')"
      destination: "salesforce.Contact"
      mapping: |
        salesforce.Email = customer.email
        salesforce.Description = CONCAT(tier, ' | Last order: ', last_order_date)
    
    - step: 4
      action: "Sync to HubSpot"
      destination: "hubspot.contacts"
      column_mapping:
        email: customer.email
        hs_lead_status: CASE WHEN tier = 'platinum' THEN 'ACTIVE' ELSE 'WARM' END
    
    - step: 5
      action: "Sync to Segment"
      destination: "segment.traits"
      payload: |
        { "userId": customer_id, "traits": { "tier": tier, "lifetime_value": lifetime_value } }
```

#### Identity Resolution for Reverse ETL

```yaml
identity_resolution:
  challenge: "Warehouse and destination use different identity systems"
  
  strategies:
    - name: "warehouse_primary_with_destination_mapping"
      description: "Map warehouse keys to destination keys via lookup table"
      implementation: |
        CREATE TABLE identity_mapping (
          warehouse_id STRING PRIMARY KEY,
          destination_id STRING,
          destination_type STRING,
          last_synced TIMESTAMP
        );
      pros: "Clean separation, full control"
      cons: "Requires initial mapping, needs refresh when destination changes"
    
    - name: "external_id_as_primary_key"
      description: "Use destination external_id field to store warehouse FK"
      implementation: |
        # Most SaaS tools support external_id or custom_id field
        # Store warehouse PK in external_id for idempotent syncs
      pros: "No mapping table needed, idempotent"
      cons: "Limited to fields that support external_id"
    
    - name: "email_as_join_key"
      description: "Use email as primary join key between warehouse and destination"
      implementation: |
        WHERE customer.email IS NOT NULL  -- Email required as join key
      pros: "Works across all platforms, human-readable"
      cons: "Breaks on email change, not unique in all systems"
```

### Decision Tree

#### Sync Strategy Selection
```
Destination type?
├── CRM (Salesforce, HubSpot)
│   ├── < 1M records → Full refresh nightly
│   └── > 1M records → Incremental upsert on external_id
├── Ad platforms (Google Ads, Facebook)
│   ├── Audiences → Full refresh (replace list)
│   └── Conversions → Incremental append (deduplicated by click_id)
├── Marketing automation (Marketo, Braze)
│   ├── Profile updates → Incremental upsert on email/external_id
│   └── Event data → Append-only (streaming preferred)
├── Data warehouses (downstream)
│   └── Mirror sync (delete+insert to match source exactly)
└── Custom API
    ├── Supports upsert → Incremental batch
    └── Append only → Incremental with dedup window
```

## Rules
- Source SQL must be idempotent with deduplication on identity key
- Use incremental sync for tables > 10K rows; full refresh only for reference data < 10K rows
- Always define a primary key / external ID mapping for each destination
- Respect destination API rate limits with exponential backoff
- Monitor sync failure rate; alert on > 5% failure rate per sync
- Log every sync batch with signature for idempotency verification
- Do not sync PII without explicit opt-in and hashing where required (ads platforms require SHA-256)
- Test sync queries on a 100-row sample before activating production sync
- Set incremental watermark columns with appropriate types (TIMESTAMP not DATE for precision)
- Document field mappings between warehouse column names and destination API fields
- Build identity resolution mapping before activating sync
- Orchestrate multi-destination syncs in dependency order
- Monitor destination API changes that may break field mappings

## References
  - references/identity-resolution.md — Identity Resolution Reference
  - references/identity-strategies.md — Identity Strategies for Reverse ETL
  - references/reverse-etl-monitoring.md — Reverse ETL Monitoring
  - references/reverse-etl-patterns.md — Reverse ETL Patterns
  - references/sync-config-examples.md — Sync Configuration Examples
  - references/warehouse-activation.md — Warehouse Activation Reference
## Handoff
`data-data-warehouse` for warehouse data modeling and transformation needed before sync
`data-etl-pipeline` for traditional batch ETL (warehouse as target, not source)
`data-quality` for validating warehouse data before operational sync
