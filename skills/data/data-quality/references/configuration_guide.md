# dbt Test and Freshness Configuration Guide

Configuration reference for data quality in dbt: generic and singular data tests, severity thresholds, storing failures, scoping with `where`, source freshness, unit tests, and selecting what runs where. Targets dbt Core 1.8+ / dbt Fusion-era projects; note version differences where they matter.

## Test Types

| Type | Defined in | Purpose |
|------|-----------|---------|
| Generic data test | YAML under `data_tests:` | Reusable assertions (`unique`, `not_null`, `accepted_values`, `relationships`, package tests) |
| Singular data test | `tests/*.sql` | One-off query that must return zero rows |
| Unit test | YAML under `unit_tests:` (1.8+) | Verify model logic on mocked inputs |
| Model contract | `contract: {enforced: true}` | Enforce output column names and types |
| Source freshness | YAML `freshness` on sources | Detect late-arriving data |

dbt 1.8 renamed the YAML key `tests:` to `data_tests:` (the old key still works but is deprecated).

## Built-in Generic Tests

```yaml
models:
  - name: fct_orders
    columns:
      - name: order_id
        data_tests: [unique, not_null]
      - name: status
        data_tests:
          - accepted_values:
              arguments:
                values: ["new", "paid", "cancelled"]
      - name: customer_id
        data_tests:
          - relationships:
              arguments:
                to: ref('dim_customers')
                field: customer_id
```

In dbt versions before the `arguments:` property was introduced, place `values`, `to`, and `field` directly under the test name.

## Severity and Thresholds

```yaml
- name: email
  data_tests:
    - not_null:
        config:
          severity: error
          warn_if: ">0"
          error_if: ">100"
```

| Config | Meaning |
|--------|---------|
| `severity` | `error` (default) or `warn` |
| `warn_if` / `error_if` | Conditions on the failure count (defaults `!=0`) |
| `where` | SQL filter applied to the tested model before the test |
| `limit` | Cap failing rows returned |
| `store_failures` | Persist failing rows to a table in the audit schema |
| `store_failures_as` | `table`, `view`, or `ephemeral` |
| `tags`, `meta` | Selection and alert routing |
| `enabled` | Disable conditionally (e.g. per target) |

Logic: with `severity: error`, dbt evaluates `error_if` first, then `warn_if`. With `severity: warn`, only `warn_if` applies.

## Scoping Tests to Recent Data

```yaml
- name: fct_events
  data_tests:
    - dbt_utils.unique_combination_of_columns:
        arguments:
          combination_of_columns: [event_id, event_date]
        config:
          where: "event_date >= current_date - 3"
```

Large fact tables should be tested incrementally; full-table uniqueness checks can be the most expensive queries in the warehouse.

## Project-Level Defaults

```yaml
# dbt_project.yml
data_tests:
  +store_failures: true
  +schema: dq_audit
  my_project:
    marts:
      +severity: error
    staging:
      +severity: warn
```

## Storing Failures

- `store_failures: true` writes failing rows to `<audit_schema>.<test_name>` tables, useful for triage and quarantine views.
- These tables may contain sensitive data; apply the same access controls as the source models and set retention.

## Source Freshness

```yaml
sources:
  - name: stripe
    database: raw
    schema: stripe
    config:
      loaded_at_field: _loaded_at
      freshness:
        warn_after: { count: 6, period: hour }
        error_after: { count: 24, period: hour }
    tables:
      - name: charges
      - name: refunds
        config:
          freshness:
            warn_after: { count: 1, period: day }
```

```bash
dbt source freshness --select source:stripe
```

- Older dbt versions declare `freshness` and `loaded_at_field` directly on the source or table instead of under `config:`; use the form your version documents.
- `loaded_at_field` should be the ingestion timestamp, not an event timestamp that can legitimately be old.
- Set `freshness: null` on tables that are static.

## Unit Tests (dbt 1.8+)

```yaml
unit_tests:
  - name: test_revenue_excludes_refunded_orders
    model: fct_revenue
    given:
      - input: ref('stg_orders')
        rows:
          - { order_id: 1, amount: 100, status: paid }
          - { order_id: 2, amount: 50, status: refunded }
    expect:
      rows:
        - { order_id: 1, revenue: 100 }
```

Run unit tests in CI only (`dbt test --select test_type:unit`); they do not need production data. Exclude them from production runs (`--exclude-resource-type unit_test` on `dbt build`).

## Selection Recipes

| Goal | Command |
|------|---------|
| Build and test in DAG order, skipping children on failure | `dbt build` |
| Only tests for one model and its parents | `dbt test --select +fct_revenue` |
| Critical tier only | `dbt test --select tag:tier1` |
| Only data tests (no unit tests) | `dbt test --select test_type:data` |
| Changed models and descendants in CI | `dbt build --select state:modified+ --defer --state prod-artifacts/` |
| Re-run failures | `dbt retry` |

## Results and Alerting

- `target/run_results.json` holds each test's status and failure count; parse it in orchestration or ship it to an observability tool (Elementary, dbt Cloud/Platform alerts, Monte Carlo, Datafold).
- Route alerts using `meta.owner` / `meta.slack`.
- Track test pass rates and runtime; slow tests are candidates for `where` scoping.

## Pitfalls

- Everything at `severity: error` → pipelines blocked by low-value checks; everything at `warn` → nobody notices failures.
- `relationships` tests on huge tables without `where`.
- Freshness based on `updated_at` columns that change on backfills.
- `store_failures` exposing PII in a broadly readable schema.

## Checklist

- [ ] `data_tests:` key used; argument style consistent with dbt version
- [ ] Severity and thresholds set per test with rationale
- [ ] Large-table tests scoped with `where`
- [ ] Source freshness on every ingested source
- [ ] Unit tests for complex model logic, run in CI only
- [ ] Results parsed and routed to owners
