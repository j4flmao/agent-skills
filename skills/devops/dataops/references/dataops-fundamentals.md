# DataOps Fundamentals

## Overview
DataOps applies DevOps principles to data management, bringing CI/CD, version control, testing, and automation to data pipelines. It improves data quality, delivery speed, and collaboration between data engineers and stakeholders.

## Core Concepts

### Data Pipeline CI/CD
Data pipelines follow the same CI/CD principles as software delivery. Code changes to transformations go through automated build, test, and deployment. Environment promotion ensures changes are validated before reaching production.

### Data as Code
Treat data transformations, schemas, and tests as code. Store in version control. Review changes via pull requests. Version releases for reproducibility. Automate deployment through CI/CD pipelines.

### Data Testing
Data testing validates data quality, schema conformance, and business rules. Types: schema tests (column types, nullability), row tests (uniqueness, referential integrity), volume tests (row count ranges), freshness tests (timeliness of data), custom tests (business logic validation).

### Data Contracts
Data contracts define formal agreements between data producers and consumers. Specify schema, freshness SLAs, row count ranges, and ownership. Enable breaking change detection and downstream impact analysis.

## Key Components

### dbt (data build tool)
SQL-based transformation framework. Write SQL models with Jinja templating. Built-in testing framework (unique, not_null, relationships, custom). Documentation generation from model metadata. Slim CI for incremental builds.

### SQLFluff
SQL linter supporting multiple dialects (BigQuery, Snowflake, Postgres, Redshift). Configurable rule set for style and anti-patterns. dbt-compatible templating support. CI integration for automated linting.

### Great Expectations
Python-based data quality framework. Define expectations (column values, distributions, schema). Profiling generates initial expectations. Validation runs produce detailed results with column-level stats. Integration with Airflow, dbt, and CI/CD.

## Basic dbt Setup

### Project Structure
```
my-dbt-project/
  models/
    staging/      # Raw data cleaned
    intermediate/ # Business logic transformations
    marts/        # Final fact/dim tables
  tests/          # Custom data tests
  macros/         # Reusable SQL functions
  dbt_project.yml # Project configuration
```

### CI Pipeline
```yaml
name: dbt CI
on: [pull_request]
jobs:
  dbt-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install dbt-bigquery sqlfluff
      - run: dbt deps
      - run: sqlfluff lint models/
      - run: dbt build --select state:modified+
```

## Best Practices
- Use slim CI for dbt projects (only build changed models).
- Run SQLFluff linting on every PR.
- Test every model: uniqueness + not_null on primary keys.
- Define data contracts for production-facing models.
- Promote through environments (dev -> staging -> prod).
- Check source freshness before deployments.
- Document models in YAML schema files.
- Version-pin dbt packages for reproducibility.

## References
- dataops-advanced.md -- Advanced DataOps topics
- data-cicd.md -- Data CI/CD
- data-testing.md -- Data Testing
- data-contracts-ops.md -- Data Contracts
- data-observability.md -- Data Observability
