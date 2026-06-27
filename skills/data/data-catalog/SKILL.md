---
name: data-data-catalog
description: >
  Use this skill when asked about data catalog, DataHub, Amundsen, Apache Atlas, OpenMetadata, metadata management, data discovery, business glossary, data lineage, data ownership, or column-level lineage. This skill enforces: metadata ingestion pipelines, column-level lineage tracking, business glossary management, data discovery with search, catalog API usage, data ownership and stewardship models, and usage analytics. Do NOT use for: data quality testing, pipeline orchestration, or data storage design.
version: "1.1.0"
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

Decision tree:
- Need real-time column-level lineage? → DataHub
- Need built-in governance workflows? → OpenMetadata
- Existing Hadoop/Hive ecosystem? → Apache Atlas
- Simple search, small team? → Amundsen

### Step 2: Metadata Ingestion

| Source | Method | Frequency | Tool |
|---|---|---|---|
| **Snowflake/BigQuery/Redshift** | JDBC connector | Daily | DataHub ingestion CLI |
| **dbt** | dbt artifacts (manifest.json) | On dbt run | DataHub dbt ingestion |
| **Spark** | OpenLineage + SparkListener | Real-time | OpenLineage Spark integration |
| **Airflow** | OpenLineage + Airflow plugin | Per DAG run | OpenLineage Airflow integration |
| **Kafka** | Schema Registry poll | Real-time | DataHub Kafka connector |
| **Tableau/PowerBI** | Metadata API | 6-hourly | DataHub BI ingestion |

#### DataHub Ingestion YAML

```yaml
source:
  type: snowflake
  config:
    account_id: xy12345.us-east-1
    warehouse: COMPUTE_WH
    role: DATAHUB_ROLE
    include_views: true
    include_tables: true
    profiling:
      enabled: true
      profile_table_level_only: false
    capture_column_lineage:
      enabled: true
sink:
  type: datahub-rest
  config:
    server: "http://datahub-gms:8080"
```

#### OpenMetadata Connector Config

```yaml
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
sink:
  type: metadata-rest
  config:
    apiEndpoint: http://openmetadata-server:8585/api
```

### Step 3: Column-Level Lineage

Configure via OpenLineage for Spark/Airflow. Use dbt `catalog.json` + `manifest.json` for dbt models. For SQL-based ETL, use DataHub SQL parser to extract column-level lineage from query logs.

```yaml
# DataHub lineage extraction from SQL
source:
  type: glue
  config:
    aws_region: us-east-1
    extract_transforms: true
    sql_parser:
      enabled: true
      lineage_type: COLUMN
```

Column-level lineage enables impact analysis: "which dashboards break if I change this column?" and root cause analysis: "which source column caused this data quality issue?"

### Step 4: Business Glossary

| Domain | Term | Definition | Steward |
|---|---|---|---|
| **Commerce** | Customer | Person or entity that places an order | data.owner@org.com |
| **Finance** | Revenue | Total income from sales before deductions | finance.owner@org.com |
| **Marketing** | Attribution | Assignment of credit to marketing touchpoints | marketing.owner@org.com |

Glossary terms linked to tables and columns via `schemaField` tags. Terms inherit from parent to child datasets.

### Step 5: Ownership & Stewardship

| Role | Responsibility | Coverage |
|---|---|---|
| **Data Owner** | Quality, access, lifecycle of datasets | Every dataset must have owner |
| **Data Steward** | Glossary, documentation, metadata quality | Per domain |
| **Data Custodian** | Technical implementation, pipeline health | Per pipeline |

Ownership stored as metadata on each dataset entity. Stewards review metadata quarterly.

### Step 6: Search & Discovery

| Facet | Example Values |
|---|---|
| **Platform** | Snowflake, BigQuery, S3, Kafka |
| **Domain** | Commerce, Finance, Marketing |
| **Owner** | team-analytics, team-marketing |
| **Tier** | Critical, Important, Operational |
| **Tag** | PII, GDPR, Sensitive, Certified |

Search rankings: popularity > freshness > completeness > documentation score.

### Step 7: Usage Analytics

Track: `dataset_queries`, `column_access_frequency`, `top_users`, `search_queries`. Publish dashboard: most queried datasets, orphan datasets (no reads in 90 days), top searches without results.

### Step 8: DataHub API Integration

```python
from datahub.ingestion.graph.client import DataHubGraph

graph = DataHubGraph(
    server="http://datahub-gms:8080",
    token="<personal-access-token>",
)

# Search datasets
results = graph.search_entities(
    type="dataset",
    query="orders",
    facets=["platform", "domain", "owner"],
    start=0, count=20,
)
for dataset in results.entities:
    print(dataset.urn, dataset.properties.name)

# Get lineage
lineage = graph.get_lineage(
    urn="urn:li:dataset:(urn:li:dataPlatform:snowflake,PROD_DB.COMMERCE.FCT_ORDERS,O)",
    depth=2, direction="UPSTREAM",
)
```

### Step 9: Catalog Governance Workflows

Implement data access request workflows through the catalog. When a consumer finds a dataset, they click "Request Access" which creates a ticket for the data owner. The owner approves or denies. On approval, permissions are provisioned automatically. Catalog tracks access grants and flags stale permissions for quarterly review.

### Step 10: Automated Metadata Quality Scoring

Score each dataset on metadata completeness: description (exists, > 50 chars), owner (assigned), glossary terms (linked), lineage (column-level), documentation score (fields documented). Publish scores on catalog dashboard. Domain stewards responsible for improving low-scoring datasets.

## Architecture / Decision Trees

### Catalog Platform Selection

```
Need data catalog?
  ├── Real-time column lineage required? → DataHub
  ├── Built-in governance + glossary workflows? → OpenMetadata
  ├── Existing Hadoop/Hive infrastructure? → Apache Atlas
  ├── Simple search, limited resources? → Amundsen
  └── Need managed service? → DataHub Cloud / Atlan / Alation
```

### Metadata Ingestion Priority

```
Which sources first?
  ├── Tier 1: Critical BI datasets (Snowflake, BigQuery, Redshift)
  ├── Tier 2: Transformation layer (dbt, Spark, Airflow)
  ├── Tier 3: Streaming (Kafka, Schema Registry)
  └── Tier 4: BI tools (Tableau, PowerBI, Looker)
```

## Common Pitfalls

1. **Metadata staleness**: ingestion pipelines fail silently and metadata becomes stale. Monitor ingestion health and alert on failures.
2. **No ownership assigned**: datasets without owners become orphaned. Enforce ownership requirement in ingestion.
3. **Glossary disconnected from technical metadata**: business terms not linked to columns. Ensure lineage connection.
4. **Over-instrumentation**: ingesting every column from every table creates noise. Focus on critical data assets first.
5. **Catalog as shelf-ware**: catalog deployed but no one uses it. Invest in search quality and usage analytics.
6. **Permission model not defined**: catalog must respect data access policies or risk exposing sensitive metadata.
7. **Lineage depth too shallow**: only table-level lineage without column-level for critical datasets.
8. **No enforcement of metadata requirements**: datasets in catalog without required fields degrade trust.
9. **Ingestion pipeline not monitoring source changes**: schema changes in source break ingestion silently.
10. **Search not optimized**: poor search rankings make catalog useless. Tune based on user behavior.

## Best Practices

- Start with 2-3 critical data sources and expand incrementally.
- Enforce ownership for every production dataset during ingestion.
- Conduct quarterly metadata health reviews with domain stewards.
- Monitor ingestion pipeline health and alert on failures within 24 hours.
- Link business glossary terms to technical columns for complete discoverability.
- Use catalog as the access request gateway for all data assets.
- Tier data assets: Critical (C-level reports), Important (team dashboards), Operational (internal tools).
- Purge metadata for deleted datasets within 30 days.
- Catalog should support both push (real-time API) and pull (scheduled ingestion) metadata collection.
- Implement metadata quality scoring to drive improvement.
- Use catalog API for automated metadata operations in CI/CD.
- Set up catalog access for all data consumers (analysts, engineers, scientists).
- Publish catalog usage dashboards to demonstrate ROI.

## Compared With

| Feature | DataHub | OpenMetadata | Amundsen | Apache Atlas |
|---|---|---|---|---|
| Column lineage | Yes (real-time) | Yes | No | Limited |
| Business glossary | Yes | Yes (native) | Yes | Yes |
| Search | Full-text + faceted | Full-text + faceted | Simple full-text | Basic |
| Real-time ingestion | Push API + pull | Pull only | Pull only | Pull only |
| dbt integration | Native | Native | Custom | Custom |
| BI tool lineage | Tableau, PowerBI | Tableau, PowerBI | Tableau | None |
| Access control | RBAC | RBAC + SSO | Basic | Tag-based |
| API | GraphQL + REST | REST | REST | REST |

Data catalog vs schema registry: catalog manages business metadata, ownership, and discovery. Schema registry manages technical schema, compatibility, and serialization. They integrate: schema registry feeds schemas to the catalog as technical metadata.

Data catalog vs data quality tools: catalog is about discovery and governance. Quality tools (Great Expectations, Soda) validate data against expectations. They integrate: quality results feed into catalog as dataset health scores.

## Performance

- Metadata ingestion: DataHub push API handles 1000+ events/second per instance.
- Search latency: < 200ms for 10M+ indexed entities with Elasticsearch backend.
- Lineage graph queries: < 1s for full lineage of highly-connected datasets.
- Profiling: enable on critical tables only (expensive on large tables).
- Ingestion pipeline: schedule during off-peak hours to minimize load on source systems.
- Catalog storage: multiply number of datasets by 10KB for metadata storage estimate.
- Batch ingestion: 10K-50K entities/hour per ingestion worker.
- Real-time ingestion (push): < 1s end-to-end from emit to searchable.
- API rate limits: 100 req/s for GraphQL, 500 req/s for REST (configurable).
- Elasticsearch cluster sizing: 3 nodes minimum for HA, index per entity type.

Scalability: DataHub scales horizontally by adding GMS instances. Search scales with Elasticsearch cluster. For 100K+ datasets, partition by domain and use tiered storage for older metadata.

## Tooling

| Tool | Purpose |
|---|---|
| DataHub | Metadata platform, lineage, search |
| OpenMetadata | All-in-one catalog with governance |
| Amundsen | Search-focused catalog |
| Apache Atlas | Hadoop-native metadata management |
| OpenLineage | Open standard for lineage collection |
| dbt | Transformation metadata source |
| Marquez | OpenLineage implementation |
| Atlan / Alation | Commercial catalog platforms |
| SQLGlot | SQL parser for lineage extraction |
| Great Expectations | Data quality for catalog integration |

### Catalog Implementation Patterns

#### DataHub Ingestion Pipeline

```yaml
# DataHub ingestion recipe: snowflake + dbt + tableau
datahub_ingestion:
  source:
    type: snowflake
    config:
      account_id: "xyz12345"
      warehouse: "transforming"
      include_views: true
      include_tables: true
      profiling:
        enabled: true
        profile_table_level_only: false
        profile_pattern:
          allow: ["analytics.*"]
  
  source:
    type: dbt
    config:
      manifest_path: "./target/manifest.json"
      catalog_path: "./target/catalog.json"
      sources_path: "./target/sources.json"
      enable_meta_mapping: true
      node_type_pattern:
        allow: ["model", "source", "test"]
  
  source:
    type: tableau
    config:
      connect_uri: "https://10ay.online.tableau.com"
      site: "my-site"
      projects: ["default", "executive"]
      extract_lineage: true
      ingest_dashboards: true
  
  sink:
    type: datahub-rest
    config:
      server: "http://datahub-gms:8080"
```

#### Metadata Model

```yaml
metadata_model:
  dataset:
    required_fields:
      - id: "fully qualified name"
      - name: "human-readable name"
      - schema: { columns: [{ name, type, description, nullable }] }
      - owner: "team or individual"
      - tier: [1, 2, 3]
      - domain: "business domain tag"
    
    optional_fields:
      - glossary_terms: ["term1", "term2"]
      - tags: ["PII", "FINANCIAL", "EXPERIMENTAL"]
      - lineage: { upstream: [], downstream: [] }
      - quality: { score: 0.95, last_checked: "2026-05-01" }
      - usage: { weekly_queries: 500, top_users: [] }
      - profile: { row_count: 5000000, size_bytes: 1073741824 }
  
  glossary_term:
    required_fields:
      - id: "term_id"
      - name: "term_name"
      - description: "term definition"
      - domain: "responsible domain"
    
    optional_fields:
      - synonyms: ["also_known_as"]
      - related_terms: ["parent", "child"]
      - stewardship: { owner: "data_governance@org.com" }

  tag:
    required_fields:
      - name: "tag_name"
      - description: "tag purpose"
    optional_fields:
      - color: "#hex"
      - inherit_from_dataset: true
```

#### Catalog API Usage

```python
# DataHub GraphQL queries for catalog integration
import requests

def search_datasets(keyword, domain=None, tier=None):
    query = """
    query searchDatasets($query: String!, $filters: [FacetFilterInput!]) {
        search(input: { type: DATASET, query: $query, filters: $filters }) {
            total results { entity { urn type ...on Dataset { name platform { name } } } }
        }
    }
    """
    variables = {"query": keyword, "filters": []}
    if domain: variables["filters"].append({"field": "domains", "value": domain})
    if tier: variables["filters"].append({"field": "tier", "value": str(tier)})
    
    response = requests.post(
        "http://datahub-gms:8080/api/graphql",
        json={"query": query, "variables": variables},
        headers={"Authorization": "Bearer <token>"}
    )
    return response.json()

def update_metadata(dataset_urn, metadata):
    """Update dataset description and tags via DataHub API"""
    mutation = """
    mutation updateDataset($urn: String!, $input: DatasetUpdateInput!) {
        updateDataset(urn: $urn, input: $input) { urn }
    }
    """
    variables = {
        "urn": dataset_urn,
        "input": {
            "editableProperties": {
                "description": metadata.get("description", ""),
                "tags": metadata.get("tags", [])
            }
        }
    }
    return requests.post("http://datahub-gms:8080/api/graphql",
        json={"query": mutation, "variables": variables})
```

### Decision Trees

#### Catalog Implementation
```
Team size and metadata requirements?
├── Small team (< 10), need quick data discovery
│   └── Amundsen (simple, search-focused)
├── Mid-size team, need lineage + governance
│   ├── Python/Spark/Airflow stack → DataHub (best lineage support)
│   └── dbt-native stack → OpenMetadata (dbt integration)
├── Large enterprise, compliance-driven
│   └── DataHub or Atlan (strong governance, RBAC, audit)
└── Hadoop/Hive-centric ecosystem
    └── Apache Atlas (native Hive/HBase/Spark integration)
```

## Rules
- Every production dataset documented in catalog with owner
- Column-level lineage tracked for all critical data assets
- Business glossary terms reviewed quarterly by domain stewards
- Metadata freshness monitored — stale entries flagged within 7 days
- Access requests routed through catalog (not ad-hoc)
- Deprecated datasets marked with expiration date and replacement
- No undocumented dataset promoted to production
- Ingestion pipeline health monitored and alerted
- Catalog search optimized with usage analytics feedback
- Metadata quality scored and published for accountability
- Glossary terms linked to columns, not just tables
- Catalog used as single entry point for data discovery
- Automate metadata ingestion from data sources, dbt, and BI tools
- Link glossary terms, tags, and ownership for searchable metadata
- Expose catalog via API for integration with other tools

## References
  - references/catalog-api-examples.md — Catalog API Examples
  - references/catalog-data-discovery.md — Catalog Data Discovery
  - references/catalog-governance.md — Catalog Governance
  - references/catalog-metadata-automation.md — Catalog Metadata Automation
  - references/catalog-platforms.md — Catalog Platforms Comparison
  - references/catalog-search-discovery.md — Catalog Search and Discovery
  - references/metadata-ingestion-patterns.md — Metadata Ingestion Patterns
  - references/metadata-management.md — Metadata Management
  - references/data-catalog-metadata-management.md — Metadata Management Deep Dive
  - references/data-catalog-search-discovery.md — Search Discovery Reference
## Architecture Decision Trees

```
Catalog Platform Selection
├── Cloud-native SaaS desired?
│   ├── Yes → Atlan / Datahub Cloud / Alation
│   └── No → Open-source self-hosted (Datahub, Amundsen)
├── dbt integration required?
│   ├── Yes → Datahub (dbt ingestion native)
│   └── No → Evaluate feature completeness
├── Real-time metadata sync?
│   ├── Yes → Datahub with Kafka-based ingestion
│   └── No → Batch ingestion (daily cron)
└── Schema drift detection needed?
    ├── Yes → Datahub with column-level lineage
    └── No → Basic table/column catalog (Amundsen)
```

**Decision criteria**: Evaluate metadata freshness, integration depth, operating cost, and team size for administration.

## Implementation Patterns

### Metadata Ingestion Pattern
```python
# data_catalog/ingestion.py
from dataclasses import dataclass
from datetime import datetime

@dataclass
class TableMetadata:
    database: str
    schema: str
    table: str
    columns: list[dict]
    row_count: int
    last_updated: datetime
    description: str

class MetadataIngestor:
    def __init__(self, catalog_api: str, token: str):
        self.api = catalog_api
        self.headers = {"Authorization": f"Bearer {token}"}

    async def ingest_table(self, metadata: TableMetadata):
        payload = {
            "urn": f"urn:li:dataset:{metadata.database}.{metadata.schema}.{metadata.table}",
            "schema": metadata.columns,
            "last_updated": metadata.last_updated.isoformat(),
            "description": metadata.description,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{self.api}/entities", json=payload, headers=self.headers)
            resp.raise_for_status()
```

### Search Index Pattern
```yaml
# data_catalog/search_config.yml
index:
  name: data_catalog
  fields:
    - name: table_name
      type: text
      boost: 3.0
    - name: description
      type: text
      boost: 1.5
    - name: tags
      type: keyword
      boost: 2.0
  synonyms:
    - ["user", "customer", "account"]
    - ["revenue", "sales", "income"]
```

## Production Considerations

- **Ingestion reliability**: Use dead-letter queues for failed metadata syncs; retry with exponential backoff.
- **Schema versioning**: Store schema history to track column additions, removals, and type changes.
- **Access control**: Restrict sensitive table discovery by role (PII tables hidden from non-privileged users).
- **Crawl scheduling**: Set full crawl daily, incremental crawl every 15 min for high-priority sources.
- **Search optimization**: Index descriptions, column names, and tags; boost popular tables in results.
- **Ownership tracking**: Require each dataset to have a steward; alert on unowned datasets > 7 days.

## Anti-Patterns

| Anti-Pattern | Consequence | Solution |
|---|---|---|
| Manual metadata entry | Stale catalog, low adoption | Automate all ingestion from sources |
| No column-level lineage | Trust issues with data | Enable field-level lineage tracking |
| Over-permissive discovery | Sensitive data exposed | Implement role-based access on catalog |
| No freshness indicators | Users distrust stale tables | Add last-updated badges and alert on staleness |
| Ignoring dbt model metadata | Catalog misses transformation logic | Ingest dbt manifest and docs |

## Performance Optimization

- **Search indexing**: Use Elasticsearch with field boosting; reindex on schema change only.
- **API caching**: Cache catalog API responses at reverse proxy (Varnish/nginx, TTL 60s).
- **Batch ingestion**: Bulk ingest 500 tables per API call instead of individual requests.
- **Query optimization**: Index the catalog database on (database, schema, table) and last_updated.
- **Thumbnail generation**: Pre-generate data preview thumbnails during ingestion, not on request.

## Security Considerations

- **PII classification**: Auto-tag columns with PII/PCI using regex patterns; restrict discovery by role.
- **Audit trail**: Log all catalog searches, views, and ownership changes for compliance.
- **API security**: Require service tokens with least privilege; rotate tokens every 90 days.
- **Data masking**: Preview queries run on sampled masked data; never expose raw sensitive values.
- **RBAC integration**: Sync catalog roles from enterprise IdP (Okta, Azure AD) via SCIM.

## Handoff
`data-data-platform` for platform infrastructure. `data-data-quality` for linking quality metadata to catalog. `data-data-observability` for freshness monitoring. `data-data-contracts` for contract metadata in catalog.
