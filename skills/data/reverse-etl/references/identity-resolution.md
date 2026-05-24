# Identity Resolution Reference

## Customer 360 Architecture

Identity resolution unifies customer records across disparate systems into a single customer profile.

```sql
-- Snowflake: Unified customer view with ID mapping
CREATE TABLE identity.customer_id_map (
    source_system STRING,
    source_id STRING,
    unified_customer_id STRING,
    match_confidence FLOAT,
    merged_at TIMESTAMP,
    is_active BOOLEAN,
    PRIMARY KEY (source_system, source_id)
);

CREATE TABLE identity.customer_360 (
    unified_customer_id STRING PRIMARY KEY,
    primary_email STRING,
    primary_phone STRING,
    full_name STRING,
    segments ARRAY<STRING>,
    total_orders INT,
    lifetime_value DECIMAL(18,2),
    first_order_date DATE,
    last_order_date DATE,
    last_updated TIMESTAMP
);
```

## Profile Unification

### Deterministic Matching

```sql
-- Deterministic: exact match on email or phone
WITH exact_matches AS (
    SELECT
        COALESCE(a.email, b.email) AS email,
        COALESCE(a.phone, b.phone) AS phone,
        a.customer_id AS customer_a_id,
        b.customer_id AS customer_b_id
    FROM system_a.customers a
    FULL OUTER JOIN system_b.customers b
        ON a.email = b.email OR a.phone = b.phone
    WHERE a.email IS NOT NULL AND b.email IS NOT NULL
        OR a.phone IS NOT NULL AND b.phone IS NOT NULL
)
SELECT
    email,
    phone,
    COUNT(DISTINCT customer_id) AS matched_profile_count
FROM (
    SELECT email, phone, customer_a_id AS customer_id FROM exact_matches
    UNION
    SELECT email, phone, customer_b_id AS customer_id FROM exact_matches
)
GROUP BY email, phone
HAVING COUNT(DISTINCT customer_id) > 1;
```

### Probabilistic Matching

```python
import recordlinkage

# Compare records across datasets
indexer = recordlinkage.Index()
indexer.block('postal_code')  # Reduce comparison space

pairs = indexer.index(df_a, df_b)

# Compare fields with fuzzy matching
compare = recordlinkage.Compare()
compare.string('first_name', 'first_name', method='jarowinkler', label='first_name')
compare.string('last_name', 'last_name', method='jarowinkler', label='last_name')
compare.string('email', 'email', method='jarowinkler', label='email')
compare.exact('postal_code', 'postal_code', label='postal_code')

features = compare.compute(pairs, df_a, df_b)

# Score matches
score_threshold = 0.85
matches = features[features.sum(axis=1) / len(features.columns) >= score_threshold]
```

## Merge Rules

### Survivorship Rules

| Rule | Description | Example |
|---|---|---|
| Most recent | Keep value from most recent record | `last_updated` wins |
| Highest confidence | Keep from system with highest trust | CRM > web app |
| Longest value | Keep the longest non-null string | Full name over nickname |
| Concatenate | Merge values from multiple sources | Tag segments: loyalty + web |
| Majority vote | Use value that appears most often | Address across 3/5 systems |
| System priority | Pre-defined system hierarchy | Billing > CRM > Marketing |

```sql
-- Snowflake merge rule implementation
MERGE INTO identity.customer_360 AS target
USING (
    SELECT
        unified_customer_id,
        -- Most recent email wins
        LAST_VALUE(primary_email IGNORE NULLS)
            OVER (PARTITION BY unified_customer_id ORDER BY last_updated) AS email,
        -- Highest priority system for phone
        FIRST_VALUE(primary_phone IGNORE NULLS)
            OVER (PARTITION BY unified_customer_id
                  ORDER BY CASE source_system
                      WHEN 'crm' THEN 1
                      WHEN 'billing' THEN 2
                      WHEN 'marketing' THEN 3
                      ELSE 99 END) AS phone,
        -- Concatenate unique segments
        ARRAY_UNION_AGG(segments)
            OVER (PARTITION BY unified_customer_id) AS all_segments
    FROM identity.staged_profiles
) AS source
ON target.unified_customer_id = source.unified_customer_id
WHEN MATCHED THEN UPDATE SET
    target.email = source.email,
    target.phone = source.phone,
    target.segments = source.all_segments
WHEN NOT MATCHED THEN INSERT (...);
```

## ID Mapping Strategies

### Deterministic Hashing

```python
import hashlib, uuid

def generate_resolved_id(email: str, phone: str) -> str:
    """Generate deterministic UUID from multiple identifiers."""
    combined = f"{email}|{phone}".lower().strip()
    hash_bytes = hashlib.sha256(combined.encode()).digest()
    return str(uuid.UUID(bytes=hash_bytes[:16]))
```

### Graph-Based Resolution

```sql
-- Recursive CTE for graph traversal of connected identities
WITH RECURSIVE identity_graph AS (
    -- Seed: all IDs for a given identifier
    SELECT source_id, source_system, 0 AS depth
    FROM identity.customer_id_map
    WHERE source_id = :starting_id

    UNION ALL

    -- Traverse: find IDs that share a unified customer
    SELECT m.source_id, m.source_system, g.depth + 1
    FROM identity_graph g
    JOIN identity.customer_id_map m
        ON m.unified_customer_id IN (
            SELECT unified_customer_id
            FROM identity.customer_id_map
            WHERE source_id = g.source_id
        )
    WHERE g.depth < 5
)
SELECT DISTINCT source_id, source_system
FROM identity_graph;
```

## Rules
- Deterministic matching for high-confidence exact matches (email, phone)
- Probabilistic matching for fuzzy name/address matching
- Define explicit system priority hierarchy before merging
- Track merge history for audit and rollback
- Use graph traversal to resolve transitive identity links
- Set confidence thresholds for automatic vs manual merges
- Re-resolve identities periodically (daily) as new data arrives
- Handle self-joins: same person in same system with different IDs
- Expose merge/split API for manual identity corrections
- Log all identity resolution decisions for compliance audits
