# Database Migration Advanced Topics

## Introduction
Advanced database migration covers zero-downtime migration patterns, heterogeneous schema conversion automation, performance optimization post-migration, data validation, and rollback strategies.

## Zero-Downtime Migration
Phase 1: Dual-write to source and target during migration window. Phase 2: Backfill historical data via CDC. Phase 3: Validate consistency between source and target. Phase 4: Switch reads to target. Phase 5: Stop writes to source. Requires CDC tool (Debezium, AWS DMS, Striim) with low latency. Application must support dual-database writes.

## Schema Conversion Automation
Use AWS Schema Conversion Tool (SCT) or ora2pg for Oracle/PostgreSQL. Create conversion assessment report before migration. Convert stored procedures, functions, and triggers. Handle data type mapping: NUMBER to numeric, VARCHAR2 to varchar, CLOB to text. Manual review of converted code for correctness. Test converted stored procedures with realistic data volumes.

## Post-Migration Performance Optimization
Analyze query plans on target database. Update statistics after data load. Create appropriate indexes based on workload. Tune configuration parameters (shared_buffers, work_mem, max_connections). Test with production load before cutover. Monitor slow query log for regressions. Adjust connection pooling settings.

## Data Validation
Row count comparison between source and target. Checksum/hash of key columns. Sample data comparison (random row sampling). Referential integrity validation. Business rule validation queries. Automated validation in migration pipeline. Reconciliation reports for stakeholders.

## Rollback Strategies
Phase 1: Keep source database running and accepting writes. Phase 2: Stop writes to source during cutover. Phase 3: If rollback needed, redirect writes back to source. Phase 4: Re-sync source with target changes. Phase 5: Re-enable source writes, verify consistency. Rollback windows: 24h (immediate), 1 week (short-term), 1 month (long-term).

## Migration Tools Comparison
AWS DMS: managed, supports CDC, heterogeneous. Azure DMS: managed, online migrations, assessment. Striim: enterprise CDC, real-time streaming. Debezium: open-source CDC, Kafka-based. pgloader: open-source, MySQL/PostgreSQL. ora2pg: open-source, Oracle/PostgreSQL.

## References
- database-migration-fundamentals.md -- Fundamentals
- schema-conversion.md -- Schema Conversion
- cdc-replication.md -- CDC and Replication
- cutover-strategies.md -- Cutover Strategies
