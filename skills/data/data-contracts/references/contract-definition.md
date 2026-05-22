# Data Contract Definition

## Contract Schema Specification

```yaml
openapi: "3.0.0"
info:
  title: "Data Contract - fct_orders"
  version: "1.2.0"
  description: "Daily order fact table produced by orders-engine, consumed by analytics team"
  contact:
    name: "Data Governance"
    email: "dgovernance@org.com"

datasets:
  - name: analytics.fct_orders
    description: "Order fact table at daily grain"
    location:
      platform: snowflake
      database: PROD_DB
      schema: ANALYTICS
      table: FCT_ORDERS
    format: iceberg
    partition: dt (DATE)
    lifecycle:
      retention_days: 730
      archive_after_days: 365

    schema:
      columns:
        - name: order_id
          type: string
          required: true
          unique: true
          semantic_type: ORDER_ID
          pii: false
          tags: [identifiers]
          description: "Unique order identifier (ORD-YYYY-NNNNNN)"
          pattern: "^ORD-\\d{4}-\\d{6}$"
        - name: customer_id
          type: string
          required: true
          semantic_type: CUSTOMER_ID
          pii: true
          pii_category: DIRECT
          tags: [pii, identifiers]
        - name: total_amount
          type: number
          format: decimal(18,2)
          required: true
          semantic_type: MONETARY_VALUE
          constraints:
            minimum: 0
            exclusiveMinimum: false
          tags: [financial]

    sla:
      freshness:
        max_latency_seconds: 3600
        schedule: hourly at :00
        timezone: UTC
        grace_period_minutes: 15
      volume:
        expected_min: 50000
        expected_max: 200000
        warning_deviation_pct: 20
        critical_deviation_pct: 50
      quality:
        required_checks:
          - not_null: [order_id, customer_id, total_amount]
          - unique: [order_id]
          - accepted_values: [currency] -> [USD, EUR, GBP]
        threshold:
          null_rate_max_pct: 1.0
          uniqueness_min_pct: 99.9

    ownership:
      producer:
        team: orders-engine
        contact: oncall-orders@org.com
        pipeline: dbt/analytics/fct_orders
      consumer:
        team: analytics
        contact: oncall-analytics@org.com
        downstream:
          - bi_dashboard: revenue_overview
          - ml_model: revenue_forecast
      governance:
        steward: analytics-stewards@org.com
        escalation: dgovernance@org.com
        review_interval_days: 90
```

## Semantic Type Registry

```yaml
semantic_types:
  ORDER_ID:
    base_type: string
    pattern: "^ORD-\\d{4}-\\d{6}$"
    description: "Order identifier with prefix, year, and sequence"
  CUSTOMER_ID:
    base_type: string
    format: uuid
    description: "UUID v4 customer identifier"
  MONETARY_VALUE:
    base_type: number
    format: decimal(18,2)
    constraints:
      minimum: 0
    description: "Monetary amount in base currency"
  EMAIL:
    base_type: string
    format: email
    pattern: "^[\\w\\.-]+@[\\w\\.-]+\\.\\w{2,}$"
    description: "Email address"
  PHONE:
    base_type: string
    pattern: "^\\+[1-9]\\d{1,14}$"
    description: "Phone number in E.164 format"
  ISO_DATE:
    base_type: string
    format: date
    pattern: "^\\d{4}-\\d{2}-\\d{2}$"
    description: "ISO 8601 date"
```

## dbt Contract Config

```sql
{{ config(
    contract={
        "enforced": true,
        "alias": "fct_orders"
    },
    materialized="incremental",
    incremental_strategy="merge",
    unique_key="order_id"
) }}

SELECT
    order_id,
    customer_id,
    total_amount,
    currency,
    created_at::DATE AS dt
FROM {{ ref('stg_orders') }}
WHERE created_at >= '2026-01-01'
```

When `contract.enforced: true`, dbt validates the exact schema before running. Mismatch in column name, data type, or constraint → build error.

## Contract Versioning

```
v1.0.0 — Initial contract (order_id, customer_id, total_amount)
v1.1.0 — Added currency column (non-breaking, satisfies backward compat)
v2.0.0 — Removed legacy customer_id, replaced with customer_uuid (breaking, MAJOR bump)
v2.1.0 — Added discount_amount column (non-breaking, MINOR bump)
v2.1.1 — Fixed total_amount precision from 16,2 to 18,2 (fix, PATCH)
```
