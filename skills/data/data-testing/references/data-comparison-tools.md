# Data Comparison Tools

## data-diff

Row-level diff across databases for regression detection.

### Installation & Usage
```bash
pip install data-diff data-diff-postgresql data-diff-snowflake
```

```bash
# Compare tables across environments with primary key
data-diff \
  --warehouse-type postgresql --warehouse-type postgresql \
  --warehouse-conn "postgresql://user:pass@prod:5432/warehouse" \
  --warehouse-conn "postgresql://user:pass@staging:5432/warehouse" \
  "SELECT * FROM analytics.fct_orders WHERE order_date >= '2026-05-01'" \
  "SELECT * FROM analytics.fct_orders WHERE order_date >= '2026-05-01'" \
  -k order_id -c order_id,amount,status --output diff.html
```

### Python API
```python
from data_diff import connect_to_table, diff_tables

prod = connect_to_table(prod_db, "analytics.fct_orders", "order_id")
staging = connect_to_table(staging_db, "analytics.fct_orders", "order_id")

for op, row in diff_tables(prod, staging):
    if op == '+': print(f"ADDED: {row}")
    elif op == '-': print(f"DELETED: {row}")
    elif op == '~': print(f"CHANGED: {row}")
```

## datafold

Managed regression monitoring with UI and alerting.

### Setup
```bash
pip install datafold-cli
datafold init --host https://app.datafold.com --api-key $DATAFOLD_API_KEY
```

### Configuration
```yaml
# .datafold/config.yml
environments:
  - name: production
    data_source: prod_warehouse
  - name: staging
    data_source: staging_warehouse

monitors:
  - name: orders_daily
    schedule: "0 7 * * *"
    model: fct_orders
    primary_key: order_id
    alert: {email: [data-team@company.com], slack: "#data-alerts"}
    threshold: {row_count_diff_pct: 1.0, column_diff_pct: 0.1}
```

## Soda

Declarative data quality checks with row count, freshness, constraint validation.

### Check Configuration
```yaml
# soda/checks/orders.yml
checks for fct_orders:
  - row_count between 1000 and 5000000
  - missing_count(order_id) = 0
  - missing_percent(customer_id) < 1
  - duplicate_count(order_id) = 0
  - freshness(order_date) < 24h
  - min(amount) >= 0
  - max(amount) < 1000000
  - values in (status) must be in ('pending', 'completed', 'refunded', 'cancelled')
  - failed rows:
      name: no_orphan_orders
      sql: SELECT o.order_id FROM fct_orders o LEFT JOIN dim_customers c ON o.customer_id = c.customer_id WHERE c.customer_id IS NULL
```
```bash
soda scan -d prod_warehouse checks/orders.yml
```

## Great Expectations

Python-native expectation suite with profiling and data docs.

### Expectation Suite
```python
import great_expectations as ge

def build_suite(context):
    batch = context.get_datasource("prod_wh").add_table_asset("fct_orders").build_batch_request()
    suite = context.add_expectation_suite("fct_orders_quality")

    batch.expect_table_columns_to_match_set(["order_id", "customer_id", "amount", "status", "order_date"], exact_match=False)
    batch.expect_column_values_to_not_be_null("order_id")
    batch.expect_column_values_to_be_unique("order_id")
    batch.expect_column_values_to_be_between("amount", 0, 1000000)
    batch.expect_column_values_to_be_in_set("status", ["pending", "completed", "refunded", "cancelled"])
    batch.expect_column_mean_to_be_between("amount", 20, 200)

    suite.save()
```

### Checkpoint
```yaml
# checkpoints/fct_orders_checkpoint.yml
class_name: SimpleCheckpoint
validations:
  - batch_request: {datasource_name: prod_wh, data_asset_name: fct_orders, options: {schema: analytics}}
    expectation_suite_name: fct_orders_quality
    action_list:
      - {name: store_validation_result, action: {class_name: StoreValidationResultAction}}
      - {name: send_slack_notification, action: {class_name: SlackNotificationAction, slack_webhook: ${SLACK_WEBHOOK}}}
```

## Tool Comparison
| Feature | data-diff | datafold | Soda | GE |
|---|---|---|---|---|
| Row-level diff | Yes | Yes | No | No |
| CI native | Yes | API | Yes | Yes |
| Column profiling | No | Yes | Yes | Yes |
| Freshness checks | No | No | Yes | Yes |
| Distribution drift | Manual | Yes | Custom | Native |

## Best Practices
- Run data-diff as blocking CI check before every prod deploy
- Set alert thresholds at 0.1% row count change on critical models
- Combine Soda freshness + datafold regression monitoring
- Use GE for data contract validation during CI
- Store diff reports as CI artifacts for audit trail
- Limit cross-env diffs to last 7 days for performance
