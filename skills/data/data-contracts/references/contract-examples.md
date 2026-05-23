# Data Contract Examples

## Multi-Model dbt Contract

```yaml
version: 2

models:
  - name: fct_orders
    description: "Core orders fact table — source of truth for revenue"
    config:
      contract:
        enforced: true
        alias: fct_orders
    columns:
      - name: order_id
        data_type: string
        description: "Unique order identifier"
        constraints: [not_null, unique]
        tests:
          - unique
          - not_null
        meta:
          semantic_type: ORDER_ID
          sensitivity: high
          pii: false
      - name: customer_id
        data_type: string
        constraints: [not_null]
        tests:
          - not_null
          - relationships:
              to: ref('dim_customers')
              field: customer_id
      - name: total_amount
        data_type: numeric
        description: "Order total in USD"
        constraints: [not_null]
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0
              max_value: 100000
        meta:
          semantic_type: MONETARY_VALUE
      - name: status
        data_type: string
        constraints: [not_null]
        tests:
          - accepted_values:
              values: [pending, completed, cancelled, refunded]
      - name: created_at
        data_type: timestamp
        constraints: [not_null]
        tests:
          - not_null
          - fresh:
              warn_after: { count: 6, period: hour }
              error_after: { count: 24, period: hour }

  - name: dim_customers
    description: "Customer dimension — PII-sensitive"
    config:
      contract:
        enforced: true
    columns:
      - name: customer_id
        data_type: string
        constraints: [not_null, unique]
        tests: [unique, not_null]
      - name: email
        data_type: string
        constraints: [not_null]
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: "email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'"
        meta:
          semantic_type: EMAIL
          pii: true
      - name: created_at
        data_type: timestamp
        constraints: [not_null]
```

## Kafka Avro Contract

```json
{
  "namespace": "com.org.analytics",
  "type": "record",
  "name": "OrderEvent",
  "doc": "Order event emitted after successful placement",
  "fields": [
    { "name": "order_id",     "type": "string",  "doc": "Unique order ID" },
    { "name": "customer_id",  "type": "string",  "doc": "Customer identifier" },
    { "name": "total_amount", "type": "double",  "doc": "Order total in USD" },
    { "name": "currency",     "type": "string",  "default": "USD" },
    { "name": "event_ts",     "type": "string",  "doc": "ISO 8601 event timestamp" },
    { "name": "items",        "type": { "type": "array", "items": {
      "type": "record", "name": "LineItem",
      "fields": [
        { "name": "sku",         "type": "string" },
        { "name": "quantity",    "type": "int" },
        { "name": "unit_price",  "type": "double" }
      ]
    }}}
  ]
}
```

## Contract SLA Template

```yaml
sla:
  freshness: { max_age_seconds: 3600, schedule: hourly }
  volume: { min_rows: 50000, max_rows: 200000 }
  quality:
    completeness: 99.5
    uniqueness: 100.0
    accuracy: 99.9
  ownership:
    producer: team-payments
    consumer: team-analytics
    escalation: data-governance@org.com
  breach:
    notify: [slack, pagerduty]
    action: pause_downstream
    auto_recover: true
```

## Contract Header

Every contract must include: `version`, `dataset` (fully qualified name), `description`, `schema` (columns with types, constraints, semantic types), `sla` (freshness, volume, quality thresholds), `ownership` (producer, consumer, escalation), and `versioning` strategy.
