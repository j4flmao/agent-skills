# Clean Room Operations Reference

## Snowflake Clean Rooms

Snowflake Clean Rooms enable privacy-preserving collaboration between Snowflake accounts without exposing raw data.

### Architecture

```
Snowflake Account A          Snowflake Account B
(Publisher)                  (Collaborator)
┌──────────────────┐        ┌──────────────────┐
│  Clean Room Owner│        │  Clean Room       │
│  - Creates CR    │        │  Member           │
│  - Shares data   │        │  - Views data     │
│  - Sets policies │        │  - Runs queries   │
│  - Approves Qrys │        │  - Downloads agg  │
└────────┬─────────┘        └────────┬──────────┘
         │                           │
         └──────────┬────────────────┘
                    │
         ┌──────────▼──────────┐
         │  Clean Room Engine   │
         │  (Snowflake compute) │
         │  - Query constraints │
         │  - Policy enforcement│
         │  - Audit logging    │
         └─────────────────────┘
```

### Clean Room Setup

```sql
-- Create a clean room
CREATE CLEAN ROLE analytics_collaboration
  WITH
    AUTO_APPROVE_MEMBERSHIP = FALSE
    COMMENT = 'Publisher-Advertiser attribution analysis';

-- Grant ownership
GRANT OWNERSHIP ON CLEAN ROLE analytics_collaboration
  TO ROLE clean_room_admin;

-- Add publisher data
ALTER CLEAN ROLE analytics_collaboration
  ADD SHARE publisher_share
  WITH DATA = publisher_schema.impressions
  LIMIT ROW_COUNT = 50000000;
```

### Policy Configuration

```sql
-- Column-level policies
ALTER CLEAN ROLE analytics_collaboration
  SET COLUMN ACCESS POLICY
    COLUMN user_id RESTRICT TO JOIN_ONLY
    COLUMN email RESTRICT TO HASH_JOIN_ONLY
    COLUMN phone RESTRICT TO HASH_JOIN_ONLY
    COLUMN revenue RESTRICT TO AGGREGATE MIN_ROW_COUNT = 100
    COLUMN impressions RESTRICT TO AGGREGATE MIN_ROW_COUNT = 50
    COLUMN device_id RESTRICT TO BLOCKED;

-- Query constraints
ALTER CLEAN ROLE analytics_collaboration
  SET QUERY CONSTRAINTS
    MIN_AGGREGATION_ROWS = 100
    MAX_OUTPUT_ROWS = 50000
    MAX_JOIN_CARDINALITY = 0.75;
```

### Query Approval Flow

```sql
-- Member submits a query
CALL SYSTEM$SUBMIT_CLEAN_ROOM_QUERY(
  'analytics_collaboration',
  'SELECT campaign_id, COUNT(DISTINCT user_id) as unique_users, SUM(revenue) as total_revenue
   FROM publisher_schema.impressions i
   JOIN advertiser_schema.conversions c ON i.user_id = c.user_id
   GROUP BY campaign_id HAVING COUNT(DISTINCT user_id) >= 100'
);

-- Owner approves the query
CALL SYSTEM$APPROVE_CLEAN_ROOM_QUERY(
  'analytics_collaboration',
  'query_id_here'
);

-- Auto-approval for pre-approved query patterns
ALTER CLEAN ROLE analytics_collaboration
  SET AUTO_APPROVED_QUERY_PATTERNS = (
    'SELECT campaign_id, COUNT(DISTINCT user_id), SUM(revenue) FROM publisher_schema.impressions ... GROUP BY campaign_id HAVING COUNT(DISTINCT user_id) >= ?'
  );
```

## AWS Clean Rooms

AWS Clean Rooms provides privacy-preserving data collaboration within AWS.

### Configuration Template

```yaml
# aws-clean-rooms-config.yaml
Collaboration:
  Name: campaign_attribution
  Description: "Cross-party ad attribution analysis"
  CreatorMemberAbilities:
    - CAN_QUERY
    - CAN_RECEIVE_RESULTS

Members:
  - AccountId: "111111111111"
    DisplayName: "Publisher"
    MemberAbilities:
      - CAN_QUERY

  - AccountId: "222222222222"
    DisplayName: "Advertiser"
    MemberAbilities:
      - CAN_QUERY
      - CAN_RECEIVE_RESULTS

ConfiguredTable:
  - Name: publisher_impressions
    TableReference:
      DatabaseName: publisher_db
      TableName: impressions
    AllowedColumns:
      - hashed_user_id
      - campaign_id
      - timestamp
      - publisher_id
    AnalysisRules:
      - Name: aggregation_rule
        Type: AGGREGATION
        Aggregation:
          AggregateColumns:
            - ColumnName: hashed_user_id
              Function: COUNT_DISTINCT
          DimensionColumns:
            - campaign_id
            - DATE_TRUNC('day', timestamp)
          JoinColumns:
            - hashed_user_id
          OutputConstraints:
            - Type: COUNT_DISTINCT
              Minimum: 100
```

### Query Patterns

```sql
-- AWS Clean Rooms allowed query
SELECT
    DATE_TRUNC('day', i.timestamp) AS day,
    i.campaign_id,
    COUNT(DISTINCT i.hashed_user_id) AS unique_impressions,
    COUNT(DISTINCT c.order_id) AS conversions,
    SUM(c.revenue) AS total_revenue
FROM publisher.publisher_impressions i
JOIN advertiser.advertiser_conversions c
    ON i.hashed_user_id = c.hashed_user_id
    AND i.timestamp BETWEEN c.conversion_timestamp - INTERVAL '30 days'
        AND c.conversion_timestamp
GROUP BY 1, 2
HAVING COUNT(DISTINCT i.hashed_user_id) >= 100;

-- Banned pattern: attempting to identify individual users
-- SELECT * FROM publisher.publisher_impressions WHERE hashed_user_id = '<specific_hash>'
```

## Azure Confidential Compute

Azure offers confidential computing environments for clean room workloads using Trusted Execution Environments (TEE).

### Configuration

```yaml
# Azure confidential clean room
confidential_compute:
  vm_size: Standard_DC4s_v3
  enclave_type: Intel_SGX
  image: clean-room-image:latest

  data_sources:
    - name: publisher_data
      storage: publisher_storage
      container: impressions
      access: sas_token

    - name: advertiser_data
      storage: advertiser_storage
      container: conversions
      access: managed_identity

  security:
    attestation_url: https://shareduks.uks.attest.azure.net
    enclave_policy:
      debug: false
      hyperthreading: false
      measurement: "expected_mrz_enclave_measurement"
```

## Differential Privacy Budget

### Budget Tracking

```sql
CREATE TABLE privacy_budget_tracker (
    clean_room_name STRING,
    party_name STRING,
    epsilon_allocated DECIMAL(5,2),
    epsilon_consumed DECIMAL(5,2) DEFAULT 0,
    delta_allocated DECIMAL(10,8),
    delta_consumed DECIMAL(10,8) DEFAULT 0,
    last_query_time TIMESTAMP,
    query_count INT DEFAULT 0
);

-- Check remaining budget before query
SELECT
    party_name,
    epsilon_allocated - epsilon_consumed AS epsilon_remaining,
    delta_allocated - delta_consumed AS delta_remaining
FROM privacy_budget_tracker
WHERE clean_room_name = 'campaign_attribution';
```

### Budget Allocation Strategies

```yaml
budget_strategies:
  per_party:
    description: "Each party gets their own budget"
    implementation: "Track epsilon per party, block when exhausted"
    use_case: "Multi-party collaborations with unequal contributions"

  per_query:
    description: "Each query consumes from shared pool"
    implementation: "Fixed epsilon cost per query type"
    use_case: "Known query patterns with predictable privacy loss"

  adaptive:
    description: "Budget consumption scales with result accuracy"
    implementation: "More accurate = more epsilon, less accurate = less epsilon"
    use_case: "Exploratory analysis with varied precision needs"
```

## Query Approval Flows

### Approval Workflow

```
1. Member submits query
   ├── Syntax validation (auto)
   ├── Policy compliance check (auto)
   │   ├── Allowed operations only?
   │   ├── Min aggregation threshold met?
   │   └── No banned patterns?
   ├── Budget check (auto)
   │   ├── Epsilon remaining sufficient?
   │   └── Delta within limits?
   └── Passes auto-checks?
       ├── YES → Execute immediately
       └── NO → Manual approval required

2. Owner reviews query
   ├── Check query intent
   ├── Verify result utility
   ├── Approve or reject
   └── Provide reason if rejected

3. Execute and deliver
   ├── Apply differential privacy noise
   ├── Suppress small cells
   ├── Deliver aggregated result
   └── Log query in audit trail
```

### Approval API

```python
class CleanRoomQueryApproval:
    """API for clean room query approval workflow."""

    def submit_query(self, clean_room_id: str, query_text: str, requester: str) -> dict:
        if self._auto_approve(clean_room_id, query_text):
            result = self._execute_query(clean_room_id, query_text)
            return {"status": "approved", "result": result}
        else:
            approval_id = self._create_approval(clean_room_id, query_text, requester)
            self._notify_owner(approval_id)
            return {"status": "pending_approval", "approval_id": approval_id}

    def approve_query(self, approval_id: str, owner: str) -> dict:
        approval = self._get_approval(approval_id)
        result = self._execute_query(approval.clean_room_id, approval.query_text)
        self._notify_requester(result)
        return {"status": "executed", "result": result}

    def _auto_approve(self, clean_room_id: str, query_text: str) -> bool:
        """Check auto-approval criteria."""
        policies = self._get_policies(clean_room_id)
        if any(pattern in query_text for pattern in policies.banned_patterns):
            return False
        return self._check_budget(clean_room_id, query_text)
```

## Rules
- Always hash PII join keys (SHA-256) before sharing data in clean rooms
- Set minimum aggregation thresholds to prevent re-identification (>= 100 rows)
- Auto-approve only pre-registered query patterns; all others require manual review
- Track epsilon budget per party; block queries that would exceed allocation
- Apply differential privacy noise before delivering results
- Suppress small cell counts (round to nearest 10, suppress < threshold cells)
- Log all queries, approvals, and results for compliance auditing
- Never allow raw data export; results must be aggregated only
- Test query policies with synthetic data before production
- Review and update privacy budgets quarterly
