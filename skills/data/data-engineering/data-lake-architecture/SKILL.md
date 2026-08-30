# Data Lake & Big Data Architecture

## Core Concepts

Modern data architectures separate compute from storage to process Petabytes of data affordably.

### 1. Data Lake vs Data Warehouse
- **Data Warehouse:** Structured data, Schema-on-Write (ETL). Expensive, fast queries (Snowflake, BigQuery).
- **Data Lake:** Raw, unstructured data, Schema-on-Read (ELT). Cheap storage in AWS S3/GCS using optimized columnar formats like Apache Parquet.

### 2. Lakehouse Architecture (Delta Lake / Apache Iceberg)
Combines the cheap storage of Data Lakes with the ACID transactions of Data Warehouses. It allows you to run `UPDATE` and `DELETE` commands directly on Parquet files in S3 by maintaining a transaction log.

### Data Pipeline Map

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%
flowchart TD
    subgraph Ingestion ["Data Sources"]
        A["Postgres (CDC via Debezium)"]
        B["App Logs (Kafka)"]
    end
    
    subgraph Storage ["Data Lake (S3/GCS)"]
        C["Bronze (Raw JSON/CSV)"]
        D["Silver (Cleaned Parquet)"]
        E["Gold (Aggregated Delta Lake)"]
    end
    
    subgraph Compute ["Spark / Databricks"]
        F["Batch Processing Job"]
        G["Streaming Processing Job"]
    end
    
    A --> C
    B --> C
    C -->|"Extract & Clean"| F
    F -->|"Load"| D
    D -->|"Aggregate"| G
    G -->|"Load"| E
```
