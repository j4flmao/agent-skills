# Data Testing

## Great Expectations in CI

### Setup

```python
# great_expectations.yml
config_version: 3.0
datasources:
  my_database:
    class_name: Datasource
    execution_engine:
      class_name: SqlAlchemyExecutionEngine
      credentials: ${DB_CONNECTION_STRING}
```

### Expectations Suite

```python
expectation_suite = [
    # Column presence
    ExpectColumnToExist("order_id"),
    ExpectColumnToExist("customer_id"),

    # Null rates
    ExpectColumnValuesToNotBeNull("order_id"),
    ExpectColumnValuesToMatchRegex("email", r".+@.+\..+"),

    # Range checks
    ExpectColumnValuesToBeBetween("amount", min_value=0, max_value=10000),

    # Set membership
    ExpectColumnValuesToBeInSet("status", ["pending", "shipped", "delivered"]),

    # Row count
    ExpectTableRowCountToBeBetween(min_value=100, max_value=1000000)
]
```

### CI Integration
Run Great Expectations as separate step in CI pipeline. Check: data freshness, row count, null rates, distribution shifts.

```bash
great_expectations checkpoint run my_checkpoint
```

## dbt Tests

### Generic Tests

```yaml
# schema.yml
models:
  - name: orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: status
        tests:
          - accepted_values:
              values: ["pending", "shipped", "delivered", "cancelled"]
      - name: customer_id
        tests:
          - relationships:
              to: ref('customers')
              field: customer_id
```

### Custom Generic Tests

```sql
-- tests/generic/assert_positive_total.sql
{% test assert_positive_total(model, column_name) %}
select *
from {{ model }}
where {{ column_name }} < 0
{% endtest %}
```

### Singular Tests

```sql
-- tests/assert_order_amount_consistency.sql
-- Orders total must match line_items sum
select o.order_id, o.total, sum(li.amount) as line_total
from {{ ref('orders') }} o
join {{ ref('line_items') }} li on o.order_id = li.order_id
group by o.order_id, o.total
having abs(o.total - sum(li.amount)) > 0.01
```

## Data Contract Validation

### Contract Definition

```yaml
# contracts/orders.yaml
name: orders
version: "1.2.0"
schema:
  order_id: string
  customer_id: string
  total: decimal(10,2)
  status: string
  created_at: timestamp
constraints:
  order_id: { unique: true, not_null: true }
  total: { min: 0, max: 100000 }
  status: { enum: ["pending", "shipped", "delivered", "cancelled"] }
freshness:
  sla: 1h
  check: "max(created_at) > now() - interval '1 hour'"
row_count:
  min: 100
  max: 10000000
owner: "data-engineering@company.com"
```

### Validation in CI
Check schema compatibility: new columns added are nullable, no columns removed, types are compatible. Check freshness: source data meets SLA. Check row count: within expected range.

## Pipeline Rollback

### Rollback Triggers
- Schema validation failure
- Row count anomaly (> 50% deviation)
- Freshness SLA breach
- Downstream consumer alert

### Rollback Procedure
1. Flag deployment as failed
2. Revert to previous production manifest (dbt)
3. Validate reversion with data diff
4. Notify stakeholders
5. Root cause analysis

```bash
# Rollback dbt deployment
dbt build --select tag:deployed --vars '{deployment_id: previous_deployment}'
```

## Monitoring

After deployment, monitor: test pass rate trends, data freshness, row count anomalies, schema drift, consumer complaints. Automated alerts on test failure rate > 1%.
