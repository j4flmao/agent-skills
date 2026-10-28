# Testing Strategies for Lakehouse Pipelines

How to test lakehouse code and data: unit tests on transforms, integration tests against a local catalog, dbt tests, data quality checks in production, and audits before publishing.

## 1. Test Pyramid for Data

| Level | Tests | Runs | Data |
|---|---|---|---|
| Unit | Pure transforms, UDFs, SQL logic | Every commit, seconds | Hand-built DataFrames |
| Integration | Read/write against real table format + catalog | Every PR, minutes | Local MinIO + REST catalog or temp warehouse |
| Model tests | dbt `data_tests`, unit tests | PR (CI schema) and every run | CI or production data |
| Data quality | Freshness, volume, validity, uniqueness | Every production run | Production data |
| Audit / reconciliation | Totals vs source, cross-table consistency | Before publish (WAP) | Staged production data |

## 2. Unit Tests (pytest + local Spark)

```python
# tests/conftest.py
import pytest
from pyspark.sql import SparkSession

@pytest.fixture(scope="session")
def spark():
    s = (SparkSession.builder.master("local[2]")
         .config("spark.sql.shuffle.partitions", "2")
         .config("spark.sql.session.timeZone", "UTC")
         .getOrCreate())
    yield s
    s.stop()
```

```python
# tests/unit/test_orders.py
from datetime import datetime
from lakehouse.transforms.orders import latest_per_key

def test_latest_per_key_keeps_newest_row(spark):
    # Arrange
    rows = [(1, "pending", datetime(2026, 10, 1)), (1, "paid", datetime(2026, 10, 2)),
            (2, "paid", datetime(2026, 10, 1))]
    df = spark.createDataFrame(rows, "order_id INT, status STRING, updated_at TIMESTAMP")

    # Act
    result = {r.order_id: r.status for r in latest_per_key(df, "order_id", "updated_at").collect()}

    # Assert
    assert result == {1: "paid", 2: "paid"}

def test_latest_per_key_empty_input_returns_empty(spark):
    # Arrange
    df = spark.createDataFrame([], "order_id INT, status STRING, updated_at TIMESTAMP")

    # Act
    result = latest_per_key(df, "order_id", "updated_at")

    # Assert
    assert result.count() == 0
```

Use `pyspark.testing.assertDataFrameEqual` (Spark 3.5+) for whole-frame comparisons. Cover nulls, duplicates, late data, time-zone boundaries, and schema drift.

## 3. Integration Tests

Run against the real format and a local catalog:

```python
@pytest.fixture(scope="session")
def lake_spark(tmp_path_factory):
    wh = tmp_path_factory.mktemp("warehouse")
    return (SparkSession.builder.master("local[2]")
            .config("spark.jars.packages", "org.apache.iceberg:iceberg-spark-runtime-3.5_2.12:<version>")
            .config("spark.sql.extensions",
                    "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions")
            .config("spark.sql.catalog.test", "org.apache.iceberg.spark.SparkCatalog")
            .config("spark.sql.catalog.test.type", "hadoop")
            .config("spark.sql.catalog.test.warehouse", str(wh))
            .getOrCreate())

def test_merge_is_idempotent(lake_spark):
    # Arrange
    lake_spark.sql("CREATE TABLE test.db.orders (order_id INT, status STRING, updated_at TIMESTAMP) USING iceberg")
    batch = lake_spark.createDataFrame([(1, "paid", datetime(2026, 10, 2))],
                                       "order_id INT, status STRING, updated_at TIMESTAMP")

    # Act
    merge_into(lake_spark, "test.db.orders", batch, key="order_id", order_col="updated_at")
    merge_into(lake_spark, "test.db.orders", batch, key="order_id", order_col="updated_at")

    # Assert
    assert lake_spark.table("test.db.orders").count() == 1
```

Replace `<version>` with the pinned Iceberg version from the project's lock/config. The `hadoop` catalog is fine for tests; for production-like behaviour use the REST fixture from `lakehouse-ecosystem-tools.md`.

Integration targets: MERGE idempotency, schema evolution handling, partition overwrite scope, quarantine routing, retry on simulated commit conflicts.

## 4. dbt Tests

```yaml
# models/marts/schema.yml
models:
  - name: fct_orders
    columns:
      - name: order_id
        data_tests: [unique, not_null]
      - name: customer_id
        data_tests:
          - relationships: { to: ref('dim_customer'), field: customer_id }
      - name: status
        data_tests:
          - accepted_values: { values: ['pending', 'paid', 'refunded', 'void'] }

unit_tests:
  - name: test_revenue_excludes_void
    model: fct_daily_revenue
    given:
      - input: ref('fct_orders')
        rows:
          - {order_id: 1, amount: 10, status: paid, order_date: 2026-10-01}
          - {order_id: 2, amount: 99, status: void, order_date: 2026-10-01}
    expect:
      rows:
        - {order_date: 2026-10-01, revenue: 10}
```

dbt unit tests (dbt 1.8+) test SQL logic with fixtures; data tests check real data. Use `severity: warn` for checks that should not block.

## 5. Production Data Quality

Checks per table, written to a results table and alerting on failure:

| Dimension | Example check |
|---|---|
| Freshness | `max(updated_at) > now() - interval 2 hours` |
| Volume | Today's row count within historical band |
| Completeness | Null rate of key columns below threshold |
| Uniqueness | No duplicate business keys in silver |
| Validity | Values in allowed sets/ranges |
| Referential | Fact keys exist in dimensions |
| Reconciliation | Sum of amounts equals source system total |

Tools: Great Expectations, Soda Core, dbt tests, Lakeflow expectations, Lakehouse Monitoring, or plain SQL assertions in the pipeline.

```python
def assert_unique(spark, table: str, key: str) -> None:
    dupes = spark.sql(f"SELECT {key}, count(*) c FROM {table} GROUP BY {key} HAVING c > 1 LIMIT 5").collect()
    if dupes:
        raise AssertionError(f"{table}: duplicate {key} values, sample={[r[key] for r in dupes]}")
```

## 6. Audit Before Publish

Run quality checks on the WAP branch (or staging table) and publish only on pass (see `deployment_strategies.md`). Blocking checks: uniqueness, reconciliation, volume. Non-blocking (warn): distribution drift, new categorical values.

## Pitfalls

- Testing only with clean fixtures; real failures come from nulls, duplicates, and late data.
- Integration tests depending on cloud resources, making CI slow and flaky.
- Quality checks that only log; nobody sees them.
- Test data copied from production containing PII.

## Checklist

- [ ] Transforms unit-tested with edge cases (nulls, dupes, empty input, time zones).
- [ ] Integration tests cover MERGE idempotency and schema evolution on the real format.
- [ ] dbt data and unit tests on all gold models.
- [ ] Production checks per table with alerting.
- [ ] Critical tables audited before publish.
- [ ] Test data synthetic or anonymized.
