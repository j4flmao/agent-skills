# Lineage Automation
Automating lineage collection ensures comprehensive coverage without manual documentation effort.

## Automated Collection
- OpenLineage integration with Airflow, Spark, dbt
- SQL parsing with sqllineage, sqlglot
- Spark physical plan extraction for column-level lineage
- dbt catalog and manifest parsing for model lineage
- API-based lineage from custom applications

## Custom Instrumentation
- Emit OpenLineage events from custom code
- Implement lineage decorators for Python functions
- Tag data assets with lineage metadata
- Build custom extractors for proprietary systems
- Schedule periodic lineage collection jobs

## Key Points
- Automate lineage collection from all data processing systems
- Use OpenLineage as the standard for cross-tool lineage
- Parse SQL for column-level lineage granularity
- Instrument custom code for complete coverage
- Validate automated lineage against expected flows