# Organizing Data Quality Code and Checks

How to structure data quality checks in repositories so they are discoverable, owned, reviewable, and cheap to maintain: dbt tests, GX suites, Soda checks, shared rule libraries, and naming and tagging conventions.

## Principles

1. Checks live next to the asset they protect (same repo, same folder as the model or pipeline).
2. Every check has an owner and a severity.
3. Generic rules are reused, not copy-pasted.
4. Check definitions are declarative where possible (YAML), code only for complex logic.
5. Checks run in CI on representative data before production.

## dbt Project Layout

```
dbt_project/
├── models/
│   ├── staging/stripe/
│   │   ├── _stripe__sources.yml       # sources + source freshness + source tests
│   │   ├── _stripe__models.yml        # staging model tests
│   │   └── stg_stripe__charges.sql
│   ├── intermediate/
│   └── marts/finance/
│       ├── _finance__models.yml       # contracts + tests for marts
│       └── fct_revenue.sql
├── tests/
│   ├── generic/                       # custom generic tests (reusable macros)
│   │   └── test_is_positive.sql
│   └── singular/finance/
│       └── assert_revenue_reconciles_with_ledger.sql
├── macros/
└── packages.yml                       # dbt_utils, dbt_expectations, elementary
```

- One YAML file per folder, prefixed with `_` so it sorts first.
- Singular tests named `assert_<what_must_be_true>.sql` and grouped by domain.

### Custom Generic Test

```sql
-- tests/generic/test_is_positive.sql
{% test is_positive(model, column_name) %}
select {{ column_name }}
from {{ model }}
where {{ column_name }} <= 0
{% endtest %}
```

```yaml
models:
  - name: fct_revenue
    columns:
      - name: amount
        data_tests:
          - is_positive
          - not_null
```

A generic test passes when its query returns zero rows.

### Packages

| Package | Provides |
|---------|----------|
| `dbt-labs/dbt_utils` | `unique_combination_of_columns`, `expression_is_true`, `recency`, `accepted_range` |
| `metaplane/dbt_expectations` | GX-style expectations as dbt tests (the former calogica package is now maintained by Metaplane) |
| `elementary-data/elementary` | Anomaly tests, test result history, reports |

Pin package versions in `packages.yml`.

## Great Expectations Project Layout

```
quality/
├── gx/                         # file-backed context (great_expectations.yml, stores)
├── suites/
│   ├── orders.py               # suite builders in code
│   └── customers.py
├── checkpoints.py              # validation definitions + checkpoints
├── rules/                      # shared rule factories
│   └── common.py
└── tests/                      # unit tests for suites against fixture data
```

Build suites in code for reviewability:

```python
# rules/common.py
import great_expectations as gx

def primary_key(column: str) -> list:
    return [gx.expectations.ExpectColumnValuesToNotBeNull(column=column),
            gx.expectations.ExpectColumnValuesToBeUnique(column=column)]

# suites/orders.py
def build_orders_suite(context):
    suite = context.suites.add(gx.ExpectationSuite(name="orders"))   # ephemeral context per run
    for exp in primary_key("order_id"):
        suite.add_expectation(exp)
    suite.add_expectation(gx.expectations.ExpectColumnValuesToBeInSet(
        column="status", value_set=["NEW", "PAID", "CANCELLED"]))
    return suite
```

## Soda Layout

```
soda/
├── configuration.yml            # data source connections (env-var credentials)
└── checks/
    ├── billing/invoices.yml
    └── sales/orders.yml
```

One checks file per dataset, in a folder per domain, mirroring ownership.

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Singular dbt test | `assert_<invariant>` | `assert_no_orders_before_customer_signup` |
| GX suite | `<dataset>` or `<dataset>__<layer>` | `orders__silver` |
| Checkpoint | `<pipeline>__<dataset>` | `daily_ingest__orders` |
| Quarantine table | `dq.<dataset>_quarantine` | `dq.orders_quarantine` |
| Alert name | `[dq][<severity>] <dataset>: <check>` | `[dq][error] orders: order_id unique` |

## Severity and Tagging

```yaml
models:
  - name: fct_revenue
    config:
      tags: ["tier1", "finance"]
      meta: { owner: "finance-data", slack: "#finance-data-alerts" }
    columns:
      - name: revenue_id
        data_tests:
          - unique:
              config: { severity: error }
          - not_null:
              config: { severity: error }
      - name: discount_code
        data_tests:
          - relationships:
              arguments: { to: ref('dim_discounts'), field: code }
              config: { severity: warn }
```

- Tag by tier (`tier1` = business-critical) to select test runs: `dbt test --select tag:tier1`.
- `meta.owner` drives alert routing in observability tools.
- Newer dbt versions nest generic test arguments under `arguments:`; older versions put them directly under the test name. Follow the convention of your dbt version consistently.

## Testing the Tests

- Fixtures with known-good and known-bad rows; assert checks pass and fail as expected.
- dbt unit tests (`unit_tests:`, dbt 1.8+) verify model logic on mocked inputs, separate from data tests on real data.
- Run checks in CI against a sampled or ephemeral dataset (dbt `--defer` with state for slim CI).

```bash
dbt build --select state:modified+ --defer --state ./prod-manifest
```

## Code Review Checklist for New Checks

- Does the check protect a stated requirement or contract rule?
- Is the severity justified (does failure really need to block)?
- Is the threshold documented (`mostly`, `warn_if`, `error_if`)?
- Is it incremental (filtered to new partitions) for large tables?
- Who receives the alert?

## Pitfalls

- A central "dq" repo far from models, so engineers forget to update checks.
- Duplicated rules in dbt, GX, and Soda for the same table with different thresholds.
- Untagged checks, making it impossible to run critical subsets.
- Checks with no owner that stay red for weeks.

## Checklist

- [ ] Checks co-located with models/pipelines
- [ ] Shared generic tests or rule factories for common patterns
- [ ] Naming and tagging conventions documented
- [ ] Severity and owner on every check
- [ ] Checks tested with fixtures; slim CI on changed models
