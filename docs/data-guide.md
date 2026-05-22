# Data Skills Guide

5 skills covering the data lifecycle: extraction, transformation, loading, warehousing, streaming, BI, and quality.

## Skills Overview

| Skill | Directory | Focus |
|-------|-----------|-------|
| ETL Pipeline | `skills/data/etl-pipeline/` | Extract, transform, load workflows with Airflow, dbt, custom pipelines |
| Data Warehouse | `skills/data/data-warehouse/` | Dimensional modeling, Snowflake, BigQuery, Redshift schema design |
| Streaming | `skills/data/streaming/` | Real-time data with Kafka, Flink, Kinesis, stream processing |
| BI Tools | `skills/data/bi-tools/` | Dashboards, Metabase, Superset, Looker, reporting |
| Data Quality | `skills/data/data-quality/` | Great Expectations, data contracts, validation, monitoring |

## Decision Flow

```
Need to move data?
  ├─ Batch, scheduled, transform-heavy → ETL Pipeline
  ├─ Real-time, sub-second latency     → Streaming
  └─ One-time migration                → ETL Pipeline

Need to store/query?
  ├─ Analytical queries, large volumes → Data Warehouse
  └─ Operational, real-time dashboards → Streaming + BI Tools

Need to visualize?
  ├─ Internal dashboards, ad-hoc       → BI Tools
  └─ Embedded analytics                → BI Tools

Need to trust data?
  └─ Data Quality
```

## How They Compose

The canonical data pipeline:

```
Source Systems
      ↓
  ETL Pipeline  ──cleanse, transform, load──→  Data Warehouse
      ↓                                               ↓
  Streaming  ──real-time enrichment──→  BI Tools (dashboards)
      ↓                                               ↓
  Data Quality (validate at every stage)     Stakeholders
```

### Typical Flow
1. **ETL Pipeline** ingests from APIs, databases, files into raw storage
2. **Data Warehouse** models the cleaned data into facts and dimensions
3. **Streaming** handles real-time events alongside the batch path
4. **BI Tools** query the warehouse for dashboards and reports
5. **Data Quality** monitors every step: source validation, pipeline checks, warehouse freshness

## When to Use Each

**ETL Pipeline**: Data needs transformation, multiple sources, scheduled batch processing, backfill capability.

**Data Warehouse**: Analytical reporting, business intelligence, historical trends, SQL-based exploration.

**Streaming**: Real-time dashboards, event-driven pipelines, monitoring/alerting, low-latency requirements.

**BI Tools**: Stakeholder dashboards, ad-hoc analysis, embedded analytics, self-service reporting.

**Data Quality**: Trust is critical, data drives decisions, regulatory compliance, ML data pipelines.
