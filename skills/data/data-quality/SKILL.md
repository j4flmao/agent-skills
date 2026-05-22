---
name: data-data-quality
description: >
  Use this skill when asked about data quality, data validation, data profiling, Great Expectations, dbt tests, data observability, data contracts, or schema validation. This skill enforces: data quality dimensions (completeness, uniqueness, timeliness, consistency, accuracy), automated validation with Great Expectations and dbt tests, data observability with monitoring and alerting, and data contract enforcement between producers and consumers. Do NOT use for: ETL pipeline design, data warehouse schema design, or BI dashboard configuration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, quality, phase-10]
---

# Data Data Quality

## Purpose
Build a data quality framework covering quality dimensions, automated validation tests, observability monitoring, and data contract enforcement.

## Agent Protocol

### Trigger
Exact user phrases: "data quality", "data validation", "data profiling", "Great Expectations", "dbt tests", "data observability", "data contract", "schema validation", "data quality check", "data testing", "data monitoring", "quality dimensions", "data freshness", "data completeness".

### Input Context
Before activating, verify:
- Data stack (warehouse, lake, streaming platform)
- Transformation tool (dbt, Spark, custom SQL)
- Data sources and producers (internal, external, partner)
- Existing monitoring and alerting infrastructure
- Critical data assets for business operations

### Output Artifact
Data quality framework with dimension definitions, test configurations, monitoring setup, and contract templates.

### Response Format
```yaml
# Quality dimension definitions
# Great Expectations suite
# dbt test config
# Data contract template
# Alert rules
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Quality dimensions defined with measurement approach
- [ ] Automated validation suite configured (Great Expectations + dbt)
- [ ] Data profiling established for baseline expectations
- [ ] Data observability with monitoring and alerting
- [ ] Data contracts defined between producers and consumers
- [ ] Quality SLAs documented with escalation paths

### Max Response Length
300 lines of configuration.

## Workflow

### Step 1: Quality Dimensions
Completeness: % of non-null values for required columns. Uniqueness: % of distinct values matching expected cardinality — no duplicates in primary key columns. Timeliness: data freshness — time since last update vs expected schedule. Consistency: cross-reference values match between related tables (order total = sum of line items). Accuracy: values fall within expected ranges and distributions. Validity: conforms to format rules (email regex, ISO date, enum values).

### Step 2: Great Expectations
Expectation suites per table: `expect_column_values_to_not_be_null`, `expect_column_values_to_be_unique`, `expect_column_values_to_be_between`, `expect_column_values_to_match_regex`. Profiling: run `GE profile` on sample data to auto-generate expectations. Validation: run in CI on every dbt run, block pipeline if critical expectations fail. Data docs: auto-generated HTML documentation with expectation results per run.

### Step 3: dbt Tests
Singular tests: custom SQL that returns failing rows. Generic tests: `not_null`, `unique`, `accepted_values`, `relationships` (referential integrity). Custom generic: `freshness`, `row_count_threshold`, `distribution_outlier`. Run: `dbt test --select severity:error` in CI, `dbt test --select severity:warn` for informational. Store test results in `dbt_test_results` table for trend analysis.

### Step 4: Data Contracts
Contract between producer (data team, source system) and consumer (analyst, ML model, dashboard). Fields: table schema including column names, types, constraints (NOT NULL, UNIQUE), freshness SLA (data updated by 6am daily), row count range, nullability thresholds. Enforcement: schema validation at ingestion, expectation checks at landing, dbt tests at transformation. Breach: alert producer and consumer, pause downstream pipelines.

### Step 5: Observability
Freshness: time since last successful data load. Volume: row count vs expected range. Schema: detect new or missing columns. Quality: test pass rate over time. Lineage: data flow from source to dashboard. Tools: Monte Carlo, Sifflet, or open-source (dbt + Elementary). Dashboard: quality score per table (weighted by dimension), trend of pass rates, oldest failing test.

### Step 6: Alerting and SLAs
Tiers: critical (financial reporting, customer-facing data) → alert PagerDuty within 5 min. High (operational reports, team dashboards) → alert Slack within 15 min. Medium (internal analysis) → daily digest. Low (exploratory) → weekly report. Escalation: test fails → team channel → on-call engineer → data quality lead. SLA: critical data 99.5% quality score, high 99%, medium 95%.

## Rules
- Every critical table has a data contract
- Automated tests run on every pipeline execution
- Quality dimensions measured and trended weekly
- Freshness SLA defined per table, enforced by monitor
- Data contracts versioned alongside pipeline code
- Pipeline pauses on critical quality failure
- Quality score dashboard visible to data team and stakeholders
- No dashboard or report without quality metadata

## References
- `references/quality-dimensions.md` — Completeness, accuracy, consistency, timeliness, uniqueness measurement
- `references/quality-automation.md` — Great Expectations, dbt tests, observability tools, data contracts, alerting

## Handoff
`data-etl-pipeline` for embedding quality checks into pipeline
`data-bi-tools` for displaying quality metadata on dashboards
