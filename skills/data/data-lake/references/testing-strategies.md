# Testing Lake Pipelines

How to test transformations, table writes and data quality for lake pipelines: unit tests on local Spark, integration tests against real table formats in a temporary warehouse, data quality gates in production, and regression comparisons.

## Test Pyramid for Data

| Level | Scope | Runs |
|---|---|---|
| Unit | Pure DataFrame/SQL transformation logic | Every commit, seconds |
| Integration | Job writes/reads real Iceberg/Delta tables (MERGE, schema evolution, idempotency) | Every PR, minutes |
| Data quality (runtime) | Assertions on produced data in each run | Every pipeline run, blocks publish |
| Regression / reconciliation | Compare new vs current outputs, source vs lake counts | Before cutover, scheduled |

## Local Spark Fixture (pytest)

```python
# tests/conftest.py
from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from pyspark.sql import SparkSession


@pytest.fixture(scope="session")
def spark(tmp_path_factory: pytest.TempPathFactory) -> Iterator[SparkSession]:
    warehouse: Path = tmp_path_factory.mktemp("warehouse")
    session = (
        SparkSession.builder.master("local[2]")
        .appName("tests")
        .config("spark.sql.shuffle.partitions", "2")
        .config("spark.sql.extensions",
                "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions")
        .config("spark.sql.catalog.lake", "org.apache.iceberg.spark.SparkCatalog")
        .config("spark.sql.catalog.lake.type", "hadoop")        # fine for single-process tests
        .config("spark.sql.catalog.lake.warehouse", str(warehouse))
        .config("spark.jars.packages", "org.apache.iceberg:iceberg-spark-runtime-3.5_2.12:1.10.0")
        .getOrCreate()
    )
    yield session
    session.stop()
```

Pin the runtime version to what production uses. In CI, pre-download JARs into the image rather than resolving packages on each run.

## Unit Test (AAA)

```python
from decimal import Decimal

from lakejobs.jobs.silver_orders import transform


def test_transform_drops_null_keys_and_dedupes(spark):
    # Arrange
    rows = [(1, "10.50", 100), (1, "10.50", 100), (None, "3.00", 101)]
    bronze = spark.createDataFrame(rows, "order_id BIGINT, amount STRING, source_lsn BIGINT")

    # Act
    result = transform(bronze).collect()

    # Assert
    assert len(result) == 1
    assert result[0].amount == Decimal("10.50")
```

## Integration Tests: Behaviors Worth Testing

```python
def test_merge_is_idempotent(spark):
    # Arrange
    spark.sql("CREATE TABLE lake.t.orders (order_id BIGINT, amount INT, source_lsn BIGINT) USING iceberg")
    batch = spark.createDataFrame([(1, 10, 5)], "order_id BIGINT, amount INT, source_lsn BIGINT")

    # Act
    merge_by_key(batch, target="lake.t.orders", keys=["order_id"], version_col="source_lsn")
    merge_by_key(batch, target="lake.t.orders", keys=["order_id"], version_col="source_lsn")

    # Assert
    assert spark.table("lake.t.orders").count() == 1


def test_older_change_does_not_overwrite_newer(spark):
    # Arrange
    spark.sql("CREATE TABLE lake.t.accts (order_id BIGINT, amount INT, source_lsn BIGINT) USING iceberg")
    newer = spark.createDataFrame([(1, 20, 9)], "order_id BIGINT, amount INT, source_lsn BIGINT")
    older = spark.createDataFrame([(1, 10, 5)], "order_id BIGINT, amount INT, source_lsn BIGINT")

    # Act
    merge_by_key(newer, target="lake.t.accts", keys=["order_id"], version_col="source_lsn")
    merge_by_key(older, target="lake.t.accts", keys=["order_id"], version_col="source_lsn")

    # Assert
    assert spark.table("lake.t.accts").collect()[0].amount == 20
```

Integration tests should cover at minimum:
- Replaying the same batch twice changes nothing.
- Out-of-order (older LSN) updates are ignored.
- Deletes in CDC input remove rows.
- New nullable column in source is handled per schema policy.
- Empty input produces no commit (or an empty, harmless one).
- Null and boundary values (zero amounts, far-future dates) survive typing.

For Delta, the same tests run with `delta-spark` configured in the fixture; for engines other than Spark, DuckDB can read the produced tables for assertions.

## Runtime Data Quality Gates

Run checks on the produced snapshot before publishing (WAP, see `deployment_strategies.md`):

| Check | Example |
|---|---|
| Schema | Columns and types match the contract |
| Keys | No duplicate `order_id`; no null keys |
| Volume | Row count within expected band vs previous runs |
| Freshness | Max event time within SLA |
| Referential | Every `customer_id` exists in `dim_customer` (or known-late tolerance) |
| Values | Amount ≥ 0, enum columns in allowed set |

Tools: Great Expectations, Soda Core (SodaCL), dbt tests, Deequ/PyDeequ, or plain SQL assertions that raise on failure.

```sql
-- Fails the job when duplicates exist
SELECT order_id, count(*) c FROM lake.silver.orders.branch_audit GROUP BY order_id HAVING c > 1;
```

## Regression and Reconciliation

- Source-to-lake: compare daily counts and checksums (e.g. sum of amounts) between source DB and silver.
- Old vs new logic: full outer join on keys with diffs per column (see shadow runs in `deployment_strategies.md`).
- Snapshot pinning makes comparisons reproducible: run both versions against the same input snapshot IDs.

## Test Data

- Small, hand-written fixtures for unit tests (readable, covering edge cases).
- Masked or synthetic samples for integration tests; never copy production PII into CI.
- Golden datasets checked into the repo for regression of complex transformations.

## Pitfalls
- Tests that only cover the happy path; idempotency and ordering bugs ship to production.
- Using the Hadoop catalog in tests and a REST catalog in prod without one integration test on the real catalog type.
- Quality checks that log warnings but never fail the pipeline.
- Flaky tests from `local[*]` nondeterminism in ordering; sort before comparing.

## Checklist
- [ ] Transformations unit-tested with edge cases (nulls, duplicates, boundaries)
- [ ] Integration tests cover MERGE idempotency, ordering, deletes and schema change
- [ ] Runtime quality gates block publish
- [ ] Reconciliation against sources scheduled
- [ ] Test data free of production PII
