# Lakehouse Catalog Integration

## Catalog Architecture
The catalog serves as the central metadata repository for lakehouse tables, enabling discovery and multi-engine access.

## Catalog Options
- Unity Catalog: Databricks ecosystem, fine-grained access control, lineage tracking
- Hive Metastore: Traditional catalog, SQL-based metadata, wide compatibility
- AWS Glue Catalog: Serverless, AWS-native, Apache Iceberg integration
- Nessie: Git-like branching for Iceberg, cross-engine compatibility

## Multi-Engine Access
- Configure catalog for read/write by multiple engines (Spark, Trino, Flink, Presto)
- Ensure consistent transaction isolation
- Manage concurrent writes across engines
- Handle schema evolution from different engines
- Monitor catalog performance and availability

## Key Points
- Choose catalog based on engine ecosystem and access patterns
- Ensure catalog supports multi-engine access requirements
- Implement consistent governance across catalog and storage
- Monitor catalog performance as table count grows
- Plan for catalog migration if needs change