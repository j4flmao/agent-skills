# Data Product Template

## Complete Data Product Spec

```yaml
apiVersion: data.mesh/v1
kind: DataProduct
metadata:
  id: dp-commerce-orders-v2
  name: orders
  domain: commerce
  version: 2.1.0
  description: |
    All order transactions including header, line items, payments, and status history.
    Primary data product for revenue reporting, fulfillment, and customer analytics.
  created: 2026-01-15
  updated: 2026-05-20
  tags:
    - critical
    - pii:payment
    - gdpr:transactional
spec:
  schema:
    format: AVRO
    compatibility: BACKWARD
    registry: https://schema-registry.internal:8081
    subject: commerce.orders-value
    columns:
      - name: order_id
        type: STRING
        required: true
        description: "UUID v4 order identifier"
        pii: false
      - name: customer_id
        type: STRING
        required: true
        pii: true
        encryption: AES-256
      - name: total_amount
        type: DECIMAL(12,2)
        required: true
        description: "Order total in USD (tax + shipping + line items)"
      - name: status
        type: STRING
        required: true
        enum: [pending, confirmed, shipped, delivered, cancelled, returned]
      - name: created_at
        type: TIMESTAMP_MILLIS
        required: true

  input_ports:
    - name: source_postgres
      type: JDBC
      description: "Primary OLTP database for order transactions"
      config:
        connection_string: "${POSTGRES_ORDERS_URI}"
        sync_mode: INCREMENTAL
        sync_key: updated_at
        sync_frequency: EVERY_15_MINUTES
        retry_policy:
          max_retries: 3
          backoff: EXPONENTIAL
      schema:
        tables: [orders, order_items, order_payments, order_status_history]

    - name: events_topic
      type: KAFKA
      description: "Real-time order events from microservices"
      config:
        topic: orders.events
        consumer_group: dp-orders-ingestion
        starting_offset: EARLIEST
        deserialization: AVRO
      schema:
        subject: orders.events-value
        compatibility: BACKWARD

  output_ports:
    - name: analytics_tables
      type: SNOWFLAKE
      description: "Consumption tables for BI and analytics"
      config:
        database: PROD_DB
        schema: COMMERCE_ORDERS
        cluster_by: [order_date, status]
      tables:
        - name: fct_orders
          description: "Order fact table, one row per order"
          columns: [order_id, customer_id, total_amount, status, created_at]
        - name: dim_order_items
          description: "Order line items dimension"
          columns: [order_item_id, order_id, product_id, quantity, unit_price]

    - name: api
      type: GRAPHQL
      description: "Real-time order data API for internal services"
      config:
        endpoint: https://data.orders.internal/v1/graphql
        authentication: mTLS
        rate_limit: 1000 req/min
        cache_ttl_seconds: 60

    - name: stream
      type: KAFKA
      description: "Published data product for cross-domain consumption"
      config:
        topic: data-product.orders.published
        partitions: 12
        replication_factor: 3
        retention_days: 30
        compaction: true

  sla:
    freshness: 15 minutes
    availability: 99.9%
    max_latency_ms: 500
    bulk_latency_p99_minutes: 30
    data_completeness: 99.99%

  quality:
    checks:
      - name: no_negative_amounts
        type: SQL
        query: "SELECT COUNT(*) FROM output WHERE total_amount < 0"
        threshold: 0
        severity: CRITICAL
      - name: referential_integrity
        type: SQL
        query: "SELECT COUNT(*) FROM output o LEFT JOIN dim_customers c
                ON o.customer_id = c.id WHERE c.id IS NULL"
        threshold: 0.001  # 0.1% allowed
        severity: HIGH
      - name: completeness
        type: SQL
        query: "SELECT COUNT(*) FROM output WHERE order_id IS NULL"
        threshold: 0
        severity: CRITICAL

  ownership:
    domain: commerce
    team: orders-engine
    producer: orders-dp@org.com
    steward: commerce-steward@org.com
    escalation: commerce-dir@org.com

  contract:
    terms:
      breaking_changes_notice_days: 30
      deprecated_versions_supported: 2
      data_retention_days: 730
    consumers:
      - domain: finance
        product: revenue
        contact: finance-dp@org.com
        since: 2026-02-01
      - domain: customer
        product: customer_360
        contact: cust-dp@org.com
        since: 2026-03-15
```
