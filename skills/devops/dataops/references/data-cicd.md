# Data CI/CD

## dbt CI/CD

### Slim CI
Build only modified models and their downstream dependencies. Reduces CI time significantly.

```bash
# Production: store manifest.json as artifact
dbt run --target prod

# PR: compare against production manifest
dbt deps
dbt build --select state:modified+ --state prod/manifest.json
```

State comparison uses `manifest.json` from the production environment. Modified models are those with changed SQL or upstream dependencies.

### Model Selection for CI

```bash
# Build everything
dbt build

# Build modified models and their dependents
dbt build --select state:modified+

# Build specific model with upstream and downstream
dbt build --select my_model+

# Build by tag
dbt build --select tag:daily
```

### State Comparison Options
Store production manifest in cloud storage (S3, GCS). Download in CI for comparison. Use `dbt clone` for zero-copy environment creation.

## SQLFluff Linting

### Configuration
```ini
# .sqlfluff
[sqlfluff]
dialect = postgres
max_line_length = 120
indent_unit = space
indent = 4

[sqlfluff:rules:L010]
capitalisation_policy = upper  # Keywords: UPPER

[sqlfluff:rules:L014]
capitalisation_policy = lower  # Unquoted identifiers: lower

[sqlfluff:rules:L016]
ignore_comment_lines = True  # Don't lint comments
```

### CI Integration
```bash
sqlfluff lint models/ --dialect postgres
sqlfluff fix models/ --dialect postgres --show-lint-violations
```

Fail CI on linting errors. Optionally auto-fix on PR. Use `--severity` to set threshold.

## Data Diff

Compare data between environments:

```bash
# dbt-expectations
dbt test --select tag:data_diff

# data-diff tool
data-diff --dbt --prod-branch main --current-branch feature
```

Verify: row counts match, column distributions similar, no unexpected NULLs.

## Schema Change Management

### Backward-Compatible Changes
- Adding nullable columns: safe
- Adding tables: safe
- Increasing column length: safe
- Renaming columns: requires migration period
- Dropping columns: requires deprecation period
- Changing column type: requires migration

### Migration Strategy
1. Add new column (safe)
2. Backfill in dual-write mode
3. Migrate downstream consumers
4. Drop old column after deprecation period

## Environment Promotion

### Dev
- Full build on merge to feature branch
- SQLFluff linting
- dbt test on sample data

### Staging
- Slim CI against production manifest
- dbt test on full data
- Data diff against production
- Schema compatibility check

### Production
- Manual approval gate
- dbt build with --full-refresh on schema change
- `dbt source freshness` check before deploy
- Rollback plan documented

## CI/CD Pipeline Example (GitHub Actions)

```yaml
jobs:
  dbt-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dbt-labs/dbt-action@v1
      - run: dbt deps
      - run: sqlfluff lint models/
      - run: dbt build --select state:modified+ --state prod_manifest/
```
