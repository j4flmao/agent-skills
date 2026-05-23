# Great Expectations Advanced Patterns

## Multi-Layer Expectation Suite

```yaml
expectations:
  - expectation_type: expect_column_values_to_not_be_null
    kwargs:
      column: order_id
      mostly: 1.0
    meta:
      dimension: completeness
      critical: true

  - expectation_type: expect_column_values_to_be_unique
    kwargs:
      column: order_id
    meta:
      dimension: uniqueness
      critical: true

  - expectation_type: expect_column_values_to_be_between
    kwargs:
      column: total_amount
      min_value: 0
      max_value: 100000
    meta:
      dimension: accuracy
      critical: true

  - expectation_type: expect_column_value_lengths_to_be_between
    kwargs:
      column: order_id
      min_value: 15
      max_value: 20

  - expectation_type: expect_column_proportion_of_unique_values_to_be_between
    kwargs:
      column: customer_id
      min_value: 0.1
      max_value: 1.0

  - expectation_type: expect_table_row_count_to_be_between
    kwargs:
      min_value: 1000
      max_value: 5000000
    meta:
      dimension: volume

  - expectation_type: expect_column_pair_values_to_be_equal
    kwargs:
      column_A: currency
      column_B: currency_code
    meta:
      dimension: consistency
```

## Custom Expectation

```python
from great_expectations.expectations.expectation import ColumnExpectation

class ExpectColumnMedianToBeBetween(ColumnExpectation):
    metric_dependencies = ("column.median",)
    success_keys = ("min_value", "max_value")

    def _validate(self, metrics, runtime_configuration, execution_engine):
        median = metrics.get("column.median")
        min_val = self._get_success_kwargs().get("min_value")
        max_val = self._get_success_kwargs().get("max_value")
        return {
            "success": min_val <= median <= max_val,
            "result": {"observed_value": median}
        }
```

## Checkpoint Configuration

```yaml
name: orders_checkpoint
config_version: 1.0
class_name: SimpleCheckpoint
validations:
  - batch_request:
      datasource_name: warehouse
      data_connector_name: default_inferred_data_connector_name
      data_asset_name: analytics.fct_orders
      data_connector_query:
        index: -1
    expectation_suite_name: orders_suite
    action_list:
      - name: store_validation_result
        action:
          class_name: StoreValidationResultAction
      - name: update_data_docs
        action:
          class_name: UpdateDataDocsAction
      - name: send_slack_notification
        action:
          class_name: SlackNotificationAction
          slack_webhook: ${SLACK_WEBHOOK}
          notify_on: failure
      - name: block_pipeline
        action:
          class_name: block_pipeline
          notify_on: failure
```

## Data Docs Hosting

```bash
great_expectations docs build --site-name s3_site

aws s3 sync great_expectations/uncommitted/data_docs/s3_site/ \
  s3://ge-data-docs/ \
  --delete --cache-control "max-age=3600"
```

## CI Integration

```yaml
# .github/workflows/ge-validation.yml
jobs:
  ge-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Great Expectations
        run: |
          great_expectations checkpoint run orders_checkpoint
      - name: Upload Data Docs
        if: always()
        run: |
          aws s3 sync great_expectations/uncommitted/data_docs/ s3://ge-data-docs/
```
