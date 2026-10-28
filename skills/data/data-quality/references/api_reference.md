# Great Expectations (GX Core 1.x) and Pandera API Reference

Programmatic data validation APIs for Python pipelines. GX Core 1.x replaced the 0.x API (no more `get_validator` + YAML-heavy configs as the primary path); this reference uses the 1.x fluent API. Advanced GX patterns are in `ge-advanced-patterns.md`; Soda checks in `soda-check-examples.md`.

## GX Object Model

| Object | Purpose |
|--------|---------|
| Data Context | Entry point; holds configuration and stores (`gx.get_context()`) |
| Data Source | Connection to pandas, Spark, or a SQL database |
| Data Asset | A table, query, file set, or dataframe within a source |
| Batch Definition | How to slice an asset into batches (whole table, daily partition, etc.) |
| Expectation Suite | Named collection of expectations |
| Validation Definition | Binds a batch definition to a suite |
| Checkpoint | Runs one or more validation definitions and triggers actions |
| Actions | Update Data Docs, notify Slack/email, custom |

## Context

```python
import great_expectations as gx

context = gx.get_context()                     # ephemeral (in-memory) unless a project dir exists
context = gx.get_context(mode="file", project_root_dir="./gx")   # persistent file-backed project
```

Ephemeral contexts suit pipelines that define suites in code; file contexts persist suites, definitions, and checkpoints.

## Validating a pandas DataFrame

```python
import pandas as pd

source = context.data_sources.add_pandas(name="pipeline_frames")
asset = source.add_dataframe_asset(name="orders_df")
batch_def = asset.add_batch_definition_whole_dataframe(name="whole")

suite = context.suites.add(gx.ExpectationSuite(name="orders_suite"))
suite.add_expectation(gx.expectations.ExpectColumnValuesToNotBeNull(column="order_id"))
suite.add_expectation(gx.expectations.ExpectColumnValuesToBeUnique(column="order_id"))
suite.add_expectation(gx.expectations.ExpectColumnValuesToBeBetween(column="amount", min_value=0, max_value=100_000))
suite.add_expectation(gx.expectations.ExpectColumnValuesToBeInSet(column="status", value_set=["NEW", "PAID", "CANCELLED"]))

vd = context.validation_definitions.add(
    gx.ValidationDefinition(name="orders_vd", data=batch_def, suite=suite)
)

result = vd.run(batch_parameters={"dataframe": df})
if not result.success:
    failed = [r.expectation_config.type for r in result.results if not r.success]
    raise ValueError(f"orders validation failed: {failed}")
```

## Validating a SQL Table by Partition

```python
pg = context.data_sources.add_postgres(name="warehouse", connection_string="${WAREHOUSE_DSN}")
orders = pg.add_table_asset(name="orders", table_name="orders", schema_name="analytics")
daily = orders.add_batch_definition_daily(name="daily", column="created_at")

vd = context.validation_definitions.add(
    gx.ValidationDefinition(name="orders_daily_vd", data=daily, suite=suite)
)
result = vd.run(batch_parameters={"year": 2026, "month": 10, "day": 27})
```

- `${VAR}` in connection strings is resolved from environment variables or config variables; never hard-code credentials.
- Query assets (`add_query_asset`) validate the result of a SQL query.
- Expectations run as SQL pushed down to the database for SQL sources.

## Checkpoints and Actions

```python
checkpoint = context.checkpoints.add(
    gx.Checkpoint(
        name="orders_checkpoint",
        validation_definitions=[vd],
        actions=[gx.checkpoint.UpdateDataDocsAction(name="update_docs")],
        result_format={"result_format": "COMPLETE"},
    )
)
cp_result = checkpoint.run(batch_parameters={"year": 2026, "month": 10, "day": 27})
assert cp_result.success, "orders checkpoint failed"
```

`result_format` controls detail: `BOOLEAN_ONLY`, `BASIC` (default-like), `SUMMARY`, `COMPLETE` (includes unexpected values; may expose sensitive data in docs).

## Frequently Used Expectations

| Expectation | Dimension |
|-------------|-----------|
| `ExpectColumnValuesToNotBeNull` (with `mostly=0.99`) | Completeness |
| `ExpectColumnValuesToBeUnique`, `ExpectCompoundColumnsToBeUnique` | Uniqueness |
| `ExpectColumnValuesToBeBetween`, `ExpectColumnValuesToMatchRegex` | Validity |
| `ExpectColumnValuesToBeInSet` | Validity / referential |
| `ExpectTableRowCountToBeBetween` | Volume |
| `ExpectColumnMeanToBeBetween`, `ExpectColumnProportionOfUniqueValuesToBeBetween` | Distribution |
| `ExpectTableColumnsToMatchOrderedList` / `ExpectTableColumnsToMatchSet` | Schema |
| `ExpectColumnPairValuesAToBeGreaterThanB` | Consistency (e.g. `shipped_at > ordered_at`) |
| `UnexpectedRowsExpectation` (custom SQL) | Arbitrary business rules |

`mostly` tolerates a fraction of failures — set it deliberately and document why.

## Pandera (DataFrame Schemas in Code)

Lightweight, type-oriented validation for pandas, Polars, and PySpark DataFrames.

```python
import pandera.pandas as pa      # older versions: import pandera as pa
from pandera.typing import Series

class Orders(pa.DataFrameModel):
    order_id: Series[str] = pa.Field(unique=True, nullable=False)
    amount: Series[float] = pa.Field(ge=0, le=100_000)
    status: Series[str] = pa.Field(isin=["NEW", "PAID", "CANCELLED"])

    @pa.dataframe_check
    def shipped_after_ordered(cls, df) -> Series[bool]:
        return df["shipped_at"].isna() | (df["shipped_at"] >= df["ordered_at"])

    class Config:
        strict = True        # reject unexpected columns
        coerce = True

validated = Orders.validate(df, lazy=True)   # lazy=True collects all failures into SchemaErrors
```

```python
try:
    Orders.validate(df, lazy=True)
except pa.errors.SchemaErrors as err:
    log.error("orders schema failed: %d failure cases", len(err.failure_cases))
    raise
```

## GX vs Pandera vs dbt Tests

| Tool | Best at |
|------|---------|
| GX Core | Rich expectation library, SQL pushdown, Data Docs, checkpoints with actions |
| Pandera | Code-first schemas, type checking in Python pipelines and unit tests |
| dbt tests | Warehouse models; tests live next to transformations |
| Soda | YAML checks (SodaCL), scanning many datasets, monitoring |

## Pitfalls

- Mixing 0.x tutorials (`context.sources`, `get_validator`) with 1.x code.
- `COMPLETE` result format publishing PII into Data Docs.
- Validating entire large tables on every run instead of new partitions.
- Swallowing validation failures in pipelines (log-and-continue) without quarantine.

## Checklist

- [ ] GX 1.x API used consistently; versions pinned
- [ ] Credentials via environment/config variables
- [ ] Validation scoped to new batches/partitions
- [ ] Failures raise or route data to quarantine
- [ ] Result format chosen with data sensitivity in mind
