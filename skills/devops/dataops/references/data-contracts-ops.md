# Data Contracts Operations

## Data Contract Lifecycle

```
propose → review → publish → enforce → monitor → deprecate
```

| Phase | Activity | Tooling |
|-------|----------|---------|
| Propose | Define schema, semantics, SLAs | PR in Git |
| Review | Peer review, compatibility check | GitHub/GitLab review |
| Publish | Contract registered in schema registry | Schema Registry, Atlan, DataHub |
| Enforce | Validate at write/read time | Schema validation, dbt tests |
| Monitor | Track compliance, freshness, volume | Monte Carlo, Soda, Great Expectations |
| Deprecate | Version out, communicate consumers | Schema Registry versioning |

## Schema Enforcement

```protobuf
// Data contract in Protobuf — enforced at producer side
syntax = "proto3";

message OrderEvent {
  string order_id = 1;
  string customer_id = 2;
  double total_amount = 3;
  OrderStatus status = 4;
  repeated LineItem items = 5;
  google.protobuf.Timestamp created_at = 6;

  enum OrderStatus {
    PENDING = 0;
    CONFIRMED = 1;
    SHIPPED = 2;
    CANCELLED = 3;
  }
}
```

## Schema Registry Operations

| Operation | Command | Effect |
|-----------|---------|--------|
| Register | `POST /subjects/{subject}/versions` | New contract version |
| Validate | `POST /subjects/{subject}/versions` with `?validate=true` | Compatibility only |
| List versions | `GET /subjects/{subject}/versions` | View history |
| Set compatibility | `PUT /config/{subject}` `{"compatibility": "BACKWARD"}` | Enforce rules |
| Delete version | `DELETE /subjects/{subject}/versions/{version}` | Only if no active references |

## Compatibility Modes

| Mode | Definition | Use Case |
|------|------------|----------|
| BACKWARD | New readers can read old data | Safe default |
| BACKWARD_TRANSITIVE | New readers can read all historical data | Critical streams |
| FORWARD | Old readers can read new data | Flexible consumers |
| FORWARD_TRANSITIVE | All historical readers can read new data | Long-lived consumers |
| FULL | Both backward and forward | Maximum compatibility |
| NONE | No validation | Dev/test only |

## Compliance Monitoring

```yaml
# dbt data contract tests
version: 2

models:
  - name: orders
    description: "Orders data contract — SLA: freshness < 1h, accuracy > 99%"
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
          - accepted_type: string
      - name: total_amount
        tests:
          - not_null
          - dbt_expectations.expect_column_values_to_be_between:
              min_value: 0
              max_value: 1000000
    freshness:
      warn_after: { count: 30, period: minute }
      error_after: { count: 60, period: minute }
```

## Alerting

| Event | Severity | Channel | Response |
|-------|----------|---------|----------|
| Schema change (breaking) | Critical | PagerDuty | Rollback change, notify consumers |
| Freshness breach | Warning | Slack | Investigate pipeline |
| Schema change (non-breaking) | Info | Slack | Notify consumers of new fields |
| Contract deprecated | Info | Email | Consumers migrate to new version |
| Production schema drift | Critical | PagerDuty | Block writes, investigate source |
