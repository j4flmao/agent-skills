# Database Migration Fundamentals

## Overview
Database migration moves data from one database system to another while maintaining data integrity, minimizing downtime, and ensuring application compatibility. Migrations can be homogeneous (same engine) or heterogeneous (different engines).

## Core Concepts

### Migration Types
Homogeneous migration: same database engine (MySQL to MySQL, PostgreSQL to PostgreSQL). Simpler, fewer compatibility issues. Use native replication or dump/restore.

Heterogeneous migration: different database engines (Oracle to PostgreSQL, SQL Server to MySQL). Complex. Requires schema conversion, data type mapping, and application changes. Use AWS SCT, Azure DMS, ora2pg, pgloader.

### Migration Approaches
Big bang: migrate all data at once during maintenance window. Simplest, longest downtime. Best for small databases or when downtime is acceptable.

Tick (trickle) migration: migrate in phases, keep source and target in sync via CDC. Minimal downtime, more complex. Best for large databases with limited maintenance windows.

Blue-green migration: maintain both databases, switch traffic. Requires dual-write strategy. Enables quick rollback.

### CDC (Change Data Capture)
CDC captures ongoing changes from source database and applies to target. Enables near-zero downtime migrations. Tools: Debezium, AWS DMS (CDC mode), Striim, Qlik Replicate. Captures inserts, updates, deletes via transaction logs.

## Key Tools

### AWS DMS
Managed migration service supporting homogeneous and heterogeneous migrations. Full load + CDC for minimal downtime. Supports most major databases. Schema conversion with AWS SCT.

### pgloader
Open-source PostgreSQL migration tool. Supports MySQL, SQLite, MSSQL to PostgreSQL. Automatic data type mapping, parallel loading. Fast for medium-sized databases.

### ora2pg
Open-source Oracle to PostgreSQL migration. Converts Oracle schema, data, PL/SQL to PostgreSQL. Supports stored procedures, triggers, views.

### Database Migration Service (Azure)
Managed Azure migration service. Supports SQL Server, MySQL, PostgreSQL, Oracle to Azure. Online (CDC) and offline modes. Assessment and SKU recommendation.

## Basic Migration

### pgloader MySQL to PostgreSQL Command
```bash
pgloader mysql://user:pass@source-host/source_db postgresql://user:pass@target-host/target_db
```

### AWS DMS Task
```hcl
resource "aws_dms_replication_task" "migrate" {
  replication_task_id = "mysql-to-pg"
  source_endpoint_arn = aws_dms_endpoint.source.arn
  target_endpoint_arn = aws_dms_endpoint.target.arn
  migration_type      = "full-load-and-cdc"
}
```

## Best Practices
- Test migration with production data volume in staging.
- Validate data integrity post-migration (row counts, checksums).
- Test application against target database before cutover.
- Plan rollback strategy: keep source database accessible.
- Monitor CDC lag during continuous replication.
- Convert and test stored procedures early in process.
- Document data type mapping decisions and schema changes.

## References
- database-migration-advanced.md -- Advanced Database Migration topics
- schema-conversion.md -- Schema Conversion
- cdc-replication.md -- CDC and Replication
- cutover-strategies.md -- Cutover Strategies
