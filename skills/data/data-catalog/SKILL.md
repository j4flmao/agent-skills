---
name: data-data-catalog
description: >
  Use this skill when asked about data catalog, DataHub, Amundsen, Apache Atlas, OpenMetadata, metadata management, data discovery, business glossary, data lineage, data ownership, or column-level lineage. This skill enforces: metadata ingestion pipelines, column-level lineage tracking, business glossary management, data discovery with search, catalog API usage, data ownership and stewardship models, and usage analytics. Do NOT use for: data quality testing, pipeline orchestration, or data storage design.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, catalog, metadata, phase-11]
---

# Data Data Catalog

## Purpose
Design and deploy a data catalog platform with metadata ingestion, column-level lineage, business glossary, data discovery, ownership model, and usage analytics.

## Agent Protocol

### Trigger
Exact user phrases: "data catalog", "DataHub", "Amundsen", "Apache Atlas", "OpenMetadata", "metadata management", "data discovery", "business glossary", "data lineage", "data ownership", "column-level lineage", "metadata ingestion".

### Input Context
- Existing data stack (warehouse, lake, BI tools)
- Data catalog tool in consideration (if any)
- Data governance maturity level
- Number of data assets and teams
- Compliance requirements (GDPR, SOX, HIPAA)
- Current metadata sources (alerts, logs, metastore)

### Output Artifact
Data catalog architecture with platform selection, metadata ingestion pipeline design, governance model with glossary and ownership, and usage analytics framework.

### Response Format
```yaml
# Catalog platform selection matrix
# Metadata ingestion pipeline
# Business glossary structure
# Ownership & stewardship model
# Usage analytics schema
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Catalog platform selected with rationale
- [ ] Metadata ingestion pipelines configured for all sources
- [ ] Column-level lineage established for critical datasets
- [ ] Business glossary defined with domains and terms
- [ ] Data ownership assigned with stewardship workflow
- [ ] Search and discovery configured with facets
- [ ] Usage analytics tracking enabled

### Max Response Length
350 lines of configuration.

## Workflow

### Step 1: Select Catalog Platform

| Platform | Strengths | Weaknesses | Best For |
|---|---|---|---|
| **DataHub** | Column-level lineage, real-time push, GraphQL API | Complex deployment | ML-first orgs, real-time metadata |
| **Amundsen** | Simple search, good Tableau integration | Limited lineage, Python-only | Search-first use cases |
| **OpenMetadata** | Ingestion framework, role-based access, UI | Newer ecosystem, smaller community | Organizations wanting all-in-one |
| **Apache Atlas** | Hadoop-native, tag-based policies | Outdated UX, heavy | Existing Hadoop ecosystem |

Default: DataHub for lineage-heavy, OpenMetadata for governance-heavy. Amundsen only if search is primary need and lineage secondary.

### Step 2: Metadata Ingestion

| Source | Method | Frequency | Tool |
|---|---|---|---|
| **Snowflake/BigQuery/Redshift** | JDBC connector | Daily | DataHub ingestion CLI |
| **dbt** | dbt artifacts (manifest.json, catalog.json) | On dbt run | DataHub dbt ingestion |
| **Spark** | OpenLineage + SparkListener | Real-time | OpenLineage Spark integration |
| **Airflow** | OpenLineage + Airflow plugin | Per DAG run | OpenLineage Airflow integration |
| **Kafka** | Schema Registry poll | Real-time | DataHub Kafka connector |
| **Tableau/PowerBI** | Metadata API | 6-hourly | DataHub BI ingestion |

#### DataHub Ingestion YAML

```yaml
# datahub-ingestion-recipe.yaml
source:
  type: snowflake
  config:
    account_id: xy12345.us-east-1
    warehouse: COMPUTE_WH
    role: DATAHUB_ROLE
    include_views: true
    include_tables: true
    database_pattern:
      allow: ["PROD_DB", "ANALYTICS_DB"]
    schema_pattern:
      deny: ["INFORMATION_SCHEMA"]
    profiling:
      enabled: true
      profile_table_level_only: false
    capture_table_lineage:
      enabled: true
    capture_column_lineage:
      enabled: true
sink:
  type: datahub-rest
  config:
    server: "http://datahub-gms:8080"
```

#### Amundsen Metadata API Calls

```bash
# Register a table in Amundsen
curl -X PUT "http://amundsen:5002/table" \
  -H "Content-Type: application/json" \
  -d '{
    "table_name": "fct_orders",
    "schema": "analytics",
    "database": "snowflake",
    "cluster": "prod",
    "description": "Fact table containing processed order transactions",
    "tags": ["critical", "finance"],
    "owners": ["data-engineering@org.com"],
    "columns": [
      {"name": "order_id", "type": "VARCHAR", "description": "Unique order identifier"},
      {"name": "total_amount", "type": "NUMBER(12,2)", "description": "Order total in USD"}
    ]
  }'

# Get table lineage
curl -X GET "http://amundsen:5002/table/snowflake/prod/analytics/fct_orders/lineage?depth=3"

# Search for tables by column
curl -X GET "http://amundsen:5002/search?query=order_id&page_index=0"

# Add tag to table
curl -X PUT "http://amundsen:5002/table/snowflake/prod/analytics/fct_orders/tag/pii"
```

#### OpenMetadata Connector Config

```yaml
# openmetadata-ingestion-config.yml
source:
  type: snowflake
  serviceName: snowflake_prod
  serviceConnectionType: Snowflake
  sourceConfig:
    config:
      type: DatabaseMetadata
      markDeletedTables: true
      includeTables: true
      includeViews: true
      includeTags: true
      databaseFilterPattern:
        includes: ["PROD_DB"]
      schemaFilterPattern:
        excludes: ["INFORMATION_SCHEMA"]
      tableFilterPattern:
        includes: ["fct_%", "dim_%", "stg_%"]
sink:
  type: metadata-rest
  config:
    apiEndpoint: http://openmetadata-server:8585/api
workflowConfig:
  loggerLevel: INFO
  openMetadataServerConfig:
    hostPort: http://openmetadata-server:8585/api
    authProvider: openmetadata
    securityConfig:
      jwtToken: ${OM_JWT_TOKEN}
```

### Step 3: Column-Level Lineage

```
Source Table (order_items)
  Columns: order_id, product_id, quantity, unit_price, line_total
    ↓
Transformation: dbt model `fct_orders`
  SQL: SELECT order_id, SUM(line_total) as total_amount ...
    ↓
Target Table (fct_orders)
  Columns: order_date, total_amount, order_count
```

Configure via OpenLineage for Spark/Airflow. Use dbt `catalog.json` + `manifest.json` for dbt models. For SQL-based ETL, use DataHub SQL parser to extract column-level lineage from query logs.

### Step 4: Business Glossary

| Domain | Term | Definition | Synonyms | Steward |
|---|---|---|---|---|
| **Commerce** | Customer | Person or entity that places an order | Client, Buyer | data.owner@org.com |
| **Commerce** | Order | Transaction containing one or more items | Purchase, Invoice | data.owner@org.com |
| **Finance** | Revenue | Total income from sales before deductions | Gross Revenue, Top Line | finance.owner@org.com |
| **Marketing** | Attribution | Assignment of credit to marketing touchpoints | Credit Assignment | marketing.owner@org.com |

Glossary terms linked to tables and columns via `schemaField` tags. Terms inherit from parent to child datasets.

### Step 5: Ownership & Stewardship

| Role | Responsibility | Coverage |
|---|---|---|
| **Data Owner** | Quality, access, lifecycle of datasets | Every dataset must have owner |
| **Data Steward** | Glossary, documentation, metadata quality | Per domain |
| **Data Custodian** | Technical implementation, pipeline health | Per pipeline |
| **Data Consumer** | Usage, feedback, reporting issues | Read-only |

Ownership stored as `ownershipMetadata` on each dataset entity. Stewards review metadata quarterly. Escalation: steward → domain owner → data governance council.

### Step 6: Search & Discovery

| Facet | Example Values |
|---|---|
| **Platform** | Snowflake, BigQuery, S3, Kafka |
| **Domain** | Commerce, Finance, Marketing |
| **Owner** | team-analytics, team-marketing |
| **Tier** | Critical, Important, Operational |
| **Tag** | PII, GDPR, Sensitive, Certified |
| **Last Updated** | Last 7 days, Last 30 days, Last 90 days |

Search rankings: popularity > freshness > completeness > documentation score.

### Step 7: Usage Analytics

Track: `dataset_queries`, `column_access_frequency`, `top_users`, `search_queries`. Store in catalog's usage database. Publish dashboard: most queried datasets, orphan datasets (no reads in 90 days), top searches without results, data owners by query volume.

## Rules
- Every production dataset documented in catalog with owner
- Column-level lineage tracked for all critical data assets
- Business glossary terms reviewed quarterly by domain stewards
- Metadata freshness monitored — stale entries flagged within 7 days
- Access requests routed through catalog (not ad-hoc)
- Deprecated datasets marked with expiration date and replacement
- No undocumented dataset promoted to production

## References
- `references/catalog-platforms.md` — DataHub vs Amundsen vs OpenMetadata vs Atlas, ingestion, lineage, search
- `references/metadata-management.md` — Business glossary, ownership, stewardship, usage analytics, certification

## Handoff
`data-data-platform` for platform infrastructure. `data-data-quality` for linking quality metadata to catalog. `data-data-observability` for freshness monitoring. `data-data-contracts` for contract metadata in catalog.
