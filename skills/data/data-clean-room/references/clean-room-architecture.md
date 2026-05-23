# Clean Room Architecture

## Deployment Models

### AWS Clean Rooms

AWS Clean Rooms is a managed service enabling privacy-preserving data collaboration without sharing raw data between parties.

#### Architecture

```
Party A (Publisher) ───┐
                       ├──► AWS Clean Rooms ───► Queries & Analysis
Party B (Advertiser) ──┘     │
                             ├── Join Key Service (PSI)
                             ├── Query Engine (constrained)
                             ├── Policy Engine (column-level)
                             └── Audit Logger (full query log)
```

#### Configuration Example

```yaml
collaboration:
  name: "Cross-Publisher Attribution"
  description: "Measure overlapping audience reach across publishers"
  participants:
    - account_id: "111111111111"
      display_name: "Publisher A"
      role: contributor
      tables:
        - name: "reach_data"
          columns:
            - name: user_id
              type: STRING
              access: join_only
            - name: campaign_id
              type: STRING
              access: allowed
            - name: impressions
              type: INT
              access: allowed
            - name: reach_date
              type: DATE
              access: allowed
    - account_id: "222222222222"
      display_name: "Publisher B"
      role: contributor
      tables:
        - name: "reach_data"
          columns:
            - name: user_id
              type: STRING
              access: join_only
            - name: campaign_id
              type: STRING
              access: allowed
            - name: impressions
              type: INT
              access: allowed
            - name: reach_date
              type: DATE
              access: allowed
    - account_id: "333333333333"
      display_name: "Advertiser"
      role: querier
      query_privileges:
        - run_analysis
        - receive_results

  query_constraints:
    allowed_join_conditions:
      - type: equality
        columns: [user_id]
    aggregation_rules:
      min_aggregation_rows: 100
      max_output_rows: 100000
    restricted_sql_patterns:
      - "SELECT \\*"
      - "UNION"
      - "UNION ALL"
```

### Snowflake Clean Room

```sql
-- Create Snowflake clean room with contributor role
USE ROLE CLEAN_ROOM_ADMIN;

CREATE CLEAN ROOM campaign_analytics
  AUTO_APPROVE_MEMBERSHIP = FALSE
  COMMENT = 'Multi-party campaign measurement';

-- Add publisher A's data
ALTER CLEAN ROOM campaign_analytics
  ADD SHARE publisher_a_share
  WITH DATA = publisher_a.impressions
  LIMIT ROW_COUNT = 50000000;

-- Add publisher B's data
ALTER CLEAN ROOM campaign_analytics
  ADD SHARE publisher_b_share
  WITH DATA = publisher_b.impressions
  LIMIT ROW_COUNT = 50000000;

-- Configure column-level privacy policies
ALTER CLEAN ROOM campaign_analytics
  SET COLUMN ACCESS POLICY
    COLUMN user_id RESTRICT TO JOIN_ONLY
    COLUMN email RESTRICT TO HASH_JOIN_ONLY
    COLUMN ip_address RESTRICT TO BLOCKED
    COLUMN revenue RESTRICT TO AGGREGATE MIN_ROW_COUNT = 100;

-- Invite members
ALTER CLEAN ROOM campaign_analytics
  ADD MEMBER ACCOUNT = 'PUBLISHER_B_ACCOUNT_LOCATOR'
  ROLE = contributor;

ALTER CLEAN ROOM campaign_analytics
  ADD MEMBER ACCOUNT = 'ADVERTISER_ACCOUNT_LOCATOR'
  ROLE = querier;
```

### Custom PSI Clean Room

For full control over the privacy guarantees, a custom clean room can be built using PSI libraries:

```python
# Minimal PSI-based clean room server
import hashlib
import secrets
from typing import Set

class PSICleanRoom:
    """Server that coordinates private set intersection between parties."""

    def __init__(self):
        self.salt = secrets.token_hex(32)
        self.parties = {}

    def register_party(self, party_id: str, hashed_set: Set[str]):
        """Party submits SHA-256 hashed identifiers."""
        self.parties[party_id] = hashed_set

    def compute_intersection(self, party_a: str, party_b: str) -> int:
        """Return only the cardinality (count) of the intersection."""
        if party_a not in self.parties or party_b not in self.parties:
            raise ValueError("Unknown party")
        intersection = self.parties[party_a] & self.parties[party_b]
        return len(intersection)

    def compute_overlap(self, party_a: str, party_b: str) -> Set[str]:
        """Return intersection elements (only if policy allows)."""
        if party_a not in self.parties or party_b not in self.parties:
            raise ValueError("Unknown party")
        return self.parties[party_a] & self.parties[party_b]
```

## Join Key Strategies

| Strategy | Privacy Level | Performance | Setup Complexity |
|---|---|---|---|
| Raw ID | None | Fast | None |
| SHA-256 Hash | Medium | Fast | Hash function |
| Salted Hash | High | Fast | Generate per-party salt |
| ECDH-PSI | Very High | Medium | EC key exchange |
| Circuit-PSI | Maximum | Slow | Circuit generator |

### Salted Hash Join Key Example

```python
import hashlib
import hmac

def generate_join_key(identifier: str, salt: bytes = None) -> str:
    """Generate a salted SHA-256 join key."""
    if salt is None:
        salt = secrets.token_bytes(32)
    return hmac.new(salt, identifier.encode('utf-8'), hashlib.sha256).hexdigest()

# Each party generates their own salt
publisher_salt = secrets.token_bytes(32)
advertiser_salt = secrets.token_bytes(32)

# Publisher hashes their user emails
publisher_join_keys = {
    generate_join_key("alice@example.com", publisher_salt): "alice@example.com",
    generate_join_key("bob@example.com", publisher_salt): "bob@example.com",
}

# Advertiser hashes their user emails
advertiser_join_keys = {
    generate_join_key("alice@example.com", advertiser_salt): "alice@example.com",
    generate_join_key("charlie@example.com", advertiser_salt): "charlie@example.com",
}

# Intersection is computed on hashed values only
# Neither party knows the other's salt, so they cannot reverse hashes
```

## Query Constraint Layer

The query constraint layer validates every query before execution:

```json
{
  "constraint_engine": {
    "pre_checks": [
      {"type": "pattern_scan", "banned": ["SELECT *", "UNION"]},
      {"type": "column_access", "check": "user_id can only be used in JOIN ON"},
      {"type": "aggregation_required", "check": "all SELECT columns must be aggregated"},
      {"type": "row_count_check", "check": "GROUP BY must have HAVING COUNT(*) >= 100"}
    ],
    "post_checks": [
      {"type": "row_count_threshold", "min": 100},
      {"type": "suppress_small_cells", "threshold": 10},
      {"type": "rounding", "precision": "nearest_10"}
    ],
    "audit": [
      {"type": "log_query", "fields": ["party", "sql", "timestamp", "rows_returned"]},
      {"type": "budget_check", "epsilon_per_query": 0.1}
    ]
  }
}
```

## Audit Logging Schema

```sql
CREATE TABLE collaboration_audit_log (
    log_id UUID DEFAULT UUID_STRING(),
    collaboration_id STRING,
    party_id STRING,
    party_role STRING,
    query_text STRING,
    query_hash STRING,
    query_type STRING,      -- 'join', 'aggregate', 'export'
    executed_at TIMESTAMP,
    duration_ms INT,
    rows_input INT,
    rows_joined INT,
    rows_output INT,
    policy_decisions ARRAY<STRING>,
    policy_violations ARRAY<STRING>,
    result_status STRING,   -- 'allowed', 'blocked', 'truncated', 'error'
    submitted_by STRING,
    approved_by STRING,
    epsilon_consumed FLOAT,
    ip_address STRING
);

-- Partition for audit retention
ALTER TABLE collaboration_audit_log
CLUSTER BY (executed_date, collaboration_id);

-- Monthly audit report
SELECT
    collaboration_id,
    DATE_TRUNC('month', executed_at) AS month,
    party_id,
    COUNT(*) AS query_count,
    COUNT(CASE WHEN result_status = 'blocked' THEN 1 END) AS blocked_queries,
    SUM(rows_output) AS total_rows_returned,
    SUM(epsilon_consumed) AS total_epsilon
FROM collaboration_audit_log
WHERE executed_at >= DATEADD('month', -12, CURRENT_DATE)
GROUP BY 1, 2, 3
ORDER BY 1, 2;
```
