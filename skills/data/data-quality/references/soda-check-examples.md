# Soda Check Examples

## Table-Level Checks

```yaml
checks for analytics.fct_orders:
  - freshness(created_at) < 6h
  - row_count between 10000 and 5000000
  - duplicate_count(order_id) = 0
  - schema:
      name: Schema validation
      fail:
        when required column missing: [order_id, customer_id, total_amount]
        when wrong column type:
          order_id: string
          total_amount: numeric
          created_at: timestamp
  - missing_count(order_id) = 0
  - missing_percent(customer_id) < 0.1
```

## Column-Level Checks

```yaml
checks for analytics.fct_orders:
  - avg(total_amount) > 0
  - min(total_amount) >= 0
  - max(total_amount) <= 100000
  - stddev(total_amount) < 500
  - values in (status) must_exist_in [pending, completed, cancelled, refunded]
  - invalid_count(email) = 0:
      valid format: email
  - avg_length(customer_id) between 10 and 50
  - distinct(customer_id) > 1000
  - min(created_at) >= '2024-01-01'
  - max(created_at) <= CURRENT_DATE()
```

## Cross-Table Checks

```yaml
checks for analytics.fct_orders:
  - values in (customer_id) must_exist_in analytics.dim_customers (customer_id)
  - values in (product_id) must_exist_in analytics.dim_products (product_id)

checks for analytics.fct_line_items:
  - values in (order_id) must_exist_in analytics.fct_orders (order_id)
  - sum(quantity * unit_price) = referential sum(analytics.fct_orders.total_amount):
      lookup: order_id
```

## Anomaly Detection

```yaml
checks for analytics.fct_orders:
  - anomaly detection for row_count:
      sensitivity: normal
      training_period: 30
  - anomaly detection for avg(total_amount):
      sensitivity: high
      training_period: 60
  - anomaly detection for missing_percent(customer_id):
      sensitivity: low
      training_period: 90
```

## Soda Configuration

```yaml
data_source warehouse:
  type: postgres
  connection:
    host: ${POSTGRES_HOST}
    port: 5432
    database: analytics
    schema: analytics

soda_cloud:
  host: cloud.soda.io
  api_key_id: ${SODA_API_KEY_ID}
  api_key_secret: ${SODA_API_KEY_SECRET}
```
