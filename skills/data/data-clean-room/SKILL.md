---
name: data-clean-room
description: >
  Use this skill when asked about data clean room, AWS Clean Rooms, Snowflake Clean Room, PSI, Private Set Intersection, privacy-preserving data join, data collaboration, secure multi-party computation, differential privacy, privacy-enhancing technologies, or PET. This skill enforces: clean room architecture with privacy guarantees, PSI protocol selection, column-level access policies, differential privacy budget controls, and query constraints for cross-party data collaboration. Do NOT use for: ETL pipeline design, data masking/anonymization for internal use, or standard data sharing without privacy constraints.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, clean-room, privacy, psi, collaboration, phase-11]
---

# Data Clean Room

## Purpose
Enable privacy-preserving data collaboration between multiple parties using clean room architectures, private set intersection, differential privacy, and controlled query environments.

## Agent Protocol

### Trigger
Exact user phrases: "data clean room", "AWS Clean Rooms", "Snowflake Clean Room", "PSI", "Private Set Intersection", "privacy-preserving join", "data collaboration", "secure MPC", "multi-party computation", "differential privacy", "privacy-enhancing technologies", "PET", "clean room query", "privacy budget".

### Input Context
Before activating, verify:
- Clean room platform (AWS Clean Rooms, Snowflake Clean Room, custom PSI, Google Ads Data Hub, Habu, InfoSum)
- Participating parties and data roles (contributor, querier, collaborator)
- Data types (PII, behavioral, transactional, demographic)
- Join keys (email, hashed email, device ID, customer ID)
- Query patterns (aggregation, JOIN, differential privacy)
- Compliance requirements (CCPA, GDPR, HIPAA, financial regulations)

### Output Artifact
Clean room architecture with table schema, join key configuration, query constraints, privacy controls, and collaboration agreement as SQL, YAML, and JSON.

### Response Format
```sql
-- Clean room table schema with privacy configuration
```
```yaml
-- Clean room configuration
```
```json
-- Query constraints and policies
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output.

### Completion Criteria
- [ ] Join key strategy defined (hashed, salted, or PSI-based)
- [ ] Column-level access policies configured per party
- [ ] Query constraints with row count and aggregation limits
- [ ] Differential privacy budget (epsilon) configured
- [ ] Output validation rules documented
- [ ] Audit logging and compliance controls defined

### Max Response Length
4096

## Workflow

### Clean Room Architecture

A clean room is a controlled environment where multiple parties contribute data for collaborative analysis without exposing raw data to each other.

#### Core Components

1. **Join Key Service** — performs private set intersection to find common records without revealing non-matching records
2. **Query Engine** — executes queries within configurable constraints (aggregation only, min row count thresholds)
3. **Policy Engine** — enforces column-level access, output filters, and privacy budget
4. **Audit Logger** — records all queries, results, and policy decisions

### AWS Clean Rooms Example

```yaml
# AWS Clean Rooms configuration
collaboration:
  name: "Ad Campaign Attribution"
  description: "Publisher-advertiser conversion analysis"
  participants:
    - account_id: "111111111111"
      display_name: "Publisher"
      role: contributor
      tables:
        - name: "impressions"
          columns: ["user_id", "campaign_id", "timestamp", "publisher_id"]
        - name: "clicks"
          columns: ["user_id", "campaign_id", "timestamp"]
    - account_id: "222222222222"
      display_name: "Advertiser"
      role: querier
      tables:
        - name: "conversions"
          columns: ["user_id", "order_id", "conversion_timestamp", "revenue"]
        - name: "customer_segments"
          columns: ["user_id", "segment_id", "lifetime_value"]

  policies:
    - name: "PII Protection"
      rules:
        - column: user_id
          access_level: join_only
          transform: SHA256_HASH(email)
        - column: revenue
          access_level: aggregated
          min_row_count: 100
        - column: timestamp
          access_level: binned
          bin_precision: day

  query_constraints:
    min_aggregation_rows: 100
    max_output_rows: 100000
    allow_group_by: ["campaign_id", "segment_id", "date_trunc('day', timestamp)"]
    banned_operations:
      - "SELECT *"
      - "WHERE user_id = "
      - "ORDER BY revenue"
      - "LIMIT 1"
```

```sql
-- AWS Clean Rooms: Allowed query pattern
SELECT
  DATE_TRUNC('day', i.timestamp) AS day,
  i.campaign_id,
  c.segment_id,
  COUNT(DISTINCT i.user_id) AS unique_users,
  COUNT(c.order_id) AS conversions,
  SUM(c.revenue) AS total_revenue
FROM publisher.impressions i
JOIN advertiser.conversions c
  ON i.user_id = c.user_id
  AND i.timestamp BETWEEN c.conversion_timestamp - INTERVAL '30 days'
    AND c.conversion_timestamp
GROUP BY 1, 2, 3
HAVING COUNT(DISTINCT i.user_id) >= 100
```

```sql
-- Banned: Attempting to join on raw PII
SELECT
  i.user_id,
  c.user_id,
  c.revenue
FROM publisher.impressions i
JOIN advertiser.conversions c ON i.user_id = c.user_id
-- This violates: user_id is join_only, revenue is aggregated only
```

### Snowflake Clean Room Example

```sql
-- Snowflake Clean Room: Create clean room with privacy controls
CREATE CLEAN ROOM attribution_clean_room
  WITH
    AUTO_APPROVE_MEMBERSHIP = FALSE
    COMMENT = 'Publisher-Advertiser attribution collaboration';

-- Add publisher data
ALTER CLEAN ROOM attribution_clean_room
  ADD SHARE publisher_share
  WITH DATA = publisher_data.impressions
  LIMIT ROW_COUNT = 10000000;

-- Configure column privacy policies
ALTER CLEAN ROOM attribution_clean_room
  SET COLUMN ACCESS POLICY
    COLUMN user_id RESTRICT TO JOIN_ONLY
    COLUMN revenue RESTRICT TO AGGREGATE MIN_ROW_COUNT = 100
    COLUMN email RESTRICT TO HASH_JOIN_ONLY
    COLUMN phone RESTRICT TO BLOCKED;
```

```yaml
# Snowflake Clean Room collaboration rules
clean_room:
  name: "attribution_clean_room"
  owner:
    role: admin
    account: ACCOUNT_A
  members:
    - account: ACCOUNT_B
      role: contributor
      tables:
        - name: publisher_data.impressions
          join_keys:
            - hashed_email
            - device_id
          policy:
            - column: hashed_email
              privacy: join_key
            - column: device_id
              privacy: join_key
            - column: user_agent
              privacy: blocked
            - column: ip_address
              privacy: blocked
    - account: ACCOUNT_C
      role: querier
      tables:
        - name: advertiser_data.conversions
          join_keys:
            - hashed_email
          policy:
            - column: hashed_email
              privacy: join_key
            - column: order_value
              privacy: aggregated
              min_count: 50
            - column: product_name
              privacy: allowed
  query_rules:
    min_rows_per_output: 50
    max_join_cardinality: 0.7
    allow_cross_join: false
    column_access:
      publisher_data.impressions.hashed_email: join_only
      publisher_data.impressions.device_id: join_only
      advertiser_data.conversions.order_value: aggregated(50)
      advertiser_data.conversions.product_name: visible
```

### Private Set Intersection (PSI) Patterns

PSI allows two parties to find the intersection of their datasets without revealing non-intersecting records.

```python
# Python: PSI using hashed keys with salt
import hashlib
import os
import secrets

def hash_with_salt(identifier: str, salt: bytes) -> str:
    """SHA-256 hash with per-party salt for PSI."""
    return hashlib.sha256(salt + identifier.encode('utf-8')).hexdigest()

# Party A (Publisher): hash their user emails
party_a_salt = secrets.token_bytes(32)
party_a_users = [
    hash_with_salt("alice@example.com", party_a_salt),
    hash_with_salt("bob@example.com", party_a_salt),
]

# Party B (Advertiser): hash their user emails
party_b_salt = secrets.token_bytes(32)
party_b_users = [
    hash_with_salt("alice@example.com", party_b_salt),
    hash_with_salt("charlie@example.com", party_b_salt),
]

# Parties exchange hashed sets
# Intersection found by comparing hashes
# Only "alice@example.com" matches both sets
# Non-matching entries ("bob", "charlie") are never revealed
```

```yaml
# PSI protocol selection guide
psi:
  method: "ECDH-PSI"  # Elliptic Curve Diffie-Hellman PSI
  security_parameter: 128
  protocol:
    - "Each party generates an EC keypair"
    - "Parties hash their identifiers and blind them with their private key"
    - "Parties exchange blinded hashes"
    - "Each party applies their private key to the received set"
    - "Matching double-blinded values indicate intersection"
  advantages:
    - "No trusted third party required"
    - "Reveals only intersection cardinality or common rows"
    - "Linear complexity: O(n) communication"
  alternatives:
    - method: "DH-PSI"
      complexity: "O(n)"
      trust_model: "No TTP"
    - method: "Circuit-PSI"
      complexity: "O(n log n)"
      trust_model: "TTP optional"
    - method: "OPRF-PSI"
      complexity: "O(n)"
      trust_model: "Requires OPRF server"
```

### Differential Privacy Configuration

```sql
-- Configure differential privacy budget per party
ALTER CLEAN ROOM campaign_attribution
  SET DIFFERENTIAL PRIVACY
    EPSILON = 1.0
    DELTA = 1e-6
    PER_PARTY_BUDGET = TRUE
    BUDGET_EXHAUSTION_POLICY = 'strict';

-- Per-query privacy loss tracking
CREATE TABLE clean_room_privacy_budget (
  party_account STRING,
  epsilon_allocated FLOAT,
  epsilon_consumed FLOAT,
  epsilon_remaining FLOAT,
  last_updated TIMESTAMP
);

-- Query-level privacy budget check
-- Before executing, check: epsilon_consumed + query_cost <= epsilon_allocated
```

| Scenario | Recommended Epsilon | Delta | Row Count Threshold |
|---|---|---|---|
| Ad attribution (two parties) | 1.0 | 1e-6 | 100 |
| Market research (three+ parties) | 2.0 | 1e-6 | 50 |
| Healthcare data collaboration | 0.5 | 1e-7 | 200 |
| Financial fraud analysis | 3.0 | 1e-5 | 25 |
| One-time research query | 4.0 | 1e-5 | 100 |

### Query Constraint Patterns

```json
{
  "query_policies": {
    "aggregation_requirements": {
      "min_group_size": 100,
      "min_group_size_for_percentiles": 1000,
      "max_query_rows_returned": 50000
    },
    "banned_patterns": [
      "SELECT\\s+\\*",
      "WHERE\\s+.*\\b(user_id|email|phone)\\b\\s*=",
      "GROUP\\s+BY\\s+.*\\b(user_id|email|phone)\\b",
      "ORDER\\s+BY\\s+.*(revenue|amount|value)",
      "LIMIT\\s+(1|[0-9]|[1-9])$"
    ],
    "allowed_functions": [
      "COUNT", "SUM", "AVG", "MIN", "MAX",
      "APPROX_COUNT_DISTINCT", "DATE_TRUNC",
      "EXTRACT", "CASE"
    ],
    "banned_functions": [
      "PERCENTILE_CONT", "PERCENTILE_DISC",
      "NTILE", "ROW_NUMBER", "RANK",
      "DENSE_RANK", "LAG", "LEAD",
      "FIRST_VALUE", "LAST_VALUE"
    ],
    "output_filters": {
      "drop_singletons": true,
      "round_small_counts": true,
      "suppress_outliers": true,
      "rounding_method": "ceil_to_10"
    }
  }
}
```

### Audit Log Schema

```sql
CREATE TABLE clean_room_audit_log (
  query_id UUID,
  requesting_party STRING,
  query_text STRING,
  query_hash STRING,
  executed_at TIMESTAMP,
  rows_input INT,
  rows_output INT,
  epsilon_consumed FLOAT,
  policy_violations ARRAY<STRING>,
  result_status STRING,  -- ALLOWED, BLOCKED, TRUNCATED
  submitted_by STRING,
  approved_by STRING
);

-- Monitor for policy abuse
SELECT
  requesting_party,
  COUNT(*) AS query_count,
  SUM(rows_output) AS total_rows_returned,
  SUM(epsilon_consumed) AS total_epsilon,
  MAX(executed_at) AS last_query_at
FROM clean_room_audit_log
WHERE result_status = 'ALLOWED'
  AND executed_at >= DATEADD('day', -30, CURRENT_DATE)
GROUP BY requesting_party;
```

## Rules
- Join keys must be hashed or use PSI; never share raw PII between parties
- All queries must use aggregate functions with minimum row count thresholds (>= 100)
- Ban `SELECT *` and row-level filtering on PII columns
- Track privacy budget (epsilon) per party; block queries that exceed the budget
- Log every query with input/output row counts and party identity
- Output must suppress small counts (rounding, ceil, or suppression of cells < threshold)
- Never allow raw data export from the clean room; results must be aggregated
- Set maximum output row limits (default 50,000 rows)
- Validate query patterns against banned operation list before execution
- Support revocation of data contribution; party can withdraw data at any time

## References
  - references/clean-room-architecture.md — Clean Room Architecture
  - references/clean-room-data-types.md — Clean Room Supported Data Types
  - references/clean-room-deployment.md — Clean Room Deployment
  - references/clean-room-ops.md — Clean Room Operations Reference
  - references/clean-room-performance.md — Clean Room Performance Optimization
  - references/clean-room-use-cases.md — Clean Room Use Cases
  - references/privacy-compute-patterns.md — Privacy Compute Patterns
  - references/privacy-compute.md — Privacy Compute Patterns Reference
## Handoff
`data-data-security` for broader data security and encryption patterns
`data-compliance-audit` for regulatory compliance requirements affecting clean rooms
`data-data-sharing` for non-privacy-preserving data sharing patterns
