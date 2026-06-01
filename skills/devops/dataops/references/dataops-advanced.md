# DataOps Advanced Topics

## Introduction
Advanced DataOps covers dbt at scale, real-time data pipeline CI/CD, data mesh implementation, data observability, and automated data contract enforcement.

## dbt at Scale
Model organization: staging (raw), intermediate (business logic), marts (final). Materialization strategy: views for staging, tables for intermediate, incremental for marts. dbt slim CI: build only changed models using state:modified+. Store production manifest in artifact storage. Use dbt build for dependency-ordered execution. dbt exposures for downstream consumer tracking. dbt metrics for centralized metric definitions.

## Real-Time Data Pipeline CI/CD
Streaming pipeline testing with Kafka topic fixtures. Schema registry validation in CI. Stream processing framework testing (Flink, Kafka Streams). Data quality checks on streaming data. Non-production Kafka clusters for testing. CI/CD for stream processing jobs with rollback.

## Data Mesh Implementation
Domain-oriented data ownership: each domain owns its data products. Data as a product: discoverable, addressable, trustworthy, self-describing, interoperable. Self-serve data infrastructure: dbt, Airflow, Great Expectations, data catalog. Federated computational governance: global standards + local autonomy. Cross-domain data contracts: formal agreements between producer and consumer.

## Data Observability
Monitor data freshness (dbt source freshness, table last-updated). Track data volume trends (row count anomalies, sudden drops). Schema change detection (column added/removed/type changed). Data quality score: percentage of passing tests against total. Pipeline health: run duration, failure rate, test pass rate. Data lineage visualization for impact analysis.

## Automated Data Contract Enforcement
Contract as code: define contracts in YAML with automated CI validation. Schema compat: validate column types and nullability on PR. Freshness SLAs: alert when data not updated within window. Row count ranges: alert on abnormal volume changes. Contract registry: central store for all data contracts. Contract versioning and evolution tracking. Breaking change detection with automated downstream notification.

## References
- dataops-fundamentals.md -- Fundamentals
- data-cicd.md -- Data CI/CD
- data-testing.md -- Data Testing
- data-contracts-ops.md -- Data Contracts
- data-observability.md -- Data Observability
