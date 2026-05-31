# Data Catalog Metadata Management

## Overview

Metadata management is the practice of collecting, organizing, governing, and maintaining metadata about data assets across the enterprise. A data catalog serves as the central platform for metadata management, enabling data discovery, lineage tracking, governance, and collaboration. This reference covers metadata models, ingestion strategies, lifecycle management, and operational practices.

## Metadata Model

### Core Entities

```yaml
metadata_model:
  datasets:
    attributes:
      - name: URN (unique identifier)
      - name: name
      - name: description
      - name: platform (Snowflake, S3, Kafka)
      - name: schema (columns, types, descriptions)
      - name: ownership (owner, steward)
      - name: lineage (upstream, downstream)
      - name: tags (PII, GDPR, certified)
      - name: tier (critical, important, operational)
      - name: usage (query count, user count)
      - name: freshness (last updated)
      - name: quality (completeness, uniqueness)

  columns:
    attributes:
      - name: name
      - name: type (VARCHAR, INT, TIMESTAMP)
      - name: nullable
      - name: description
      - name: tags (PII, sensitive)
      - name: glossary_term_id
      - name: lineage (column-level upstream/downstream)
      - name: profiling (distinct values, null %, min, max)
      - name: usage (query frequency)

  jobs:
    attributes:
      - name: URN
      - name: name
      - name: type (spark, dbt, airflow, python)
      - name: owner
      - name: schedule
      - name: inputs (list of dataset URNs)
      - name: outputs (list of dataset URNs)
      - name: last_run (status, duration, timestamp)
      - name: code_url (link to source)

  glossary_terms:
    attributes:
      - name: id
      - name: name
      - name: description
      - name: domain (commerce, finance, marketing)
      - name: synonyms
      - name: related_terms
      - name: owner/steward
      - name: datasets (linked entities)
```

### DataHub Metadata Graph

DataHub stores metadata as a property graph with entities (nodes) and relationships (edges):

```
Dataset: orders
  ├── hasColumn: order_id (type: STRING, nullable: false)
  ├── hasColumn: total (type: DOUBLE, nullable: true)
  ├── taggedWith: PII
  ├── ownedBy: user:orders-team
  ├── downstreamOf: Job:staging_orders_transform
  │   ├── consumes: Dataset:staging.raw_orders
  │   ├── consumes: Dataset:staging.customers
  │   └── produces: Dataset:analytics.fct_orders
  └── glossaryTerm: Order (linked from Commerce domain)
```

## Metadata Ingestion Architecture

### Push vs Pull

| Approach | Mechanism | Use Case |
|---|---|---|
| **Push** | API call from pipeline | Real-time metadata (Spark, Airflow, dbt) |
| **Pull** | Scheduled ingestion job | Warehouse, BI tools, static sources |
| **Hybrid** | Push for real-time, pull for warehouse | Most production deployments |

### Ingestion Pipeline Design

```yaml
ingestion_pipeline:
  scheduling:
    tool: Airflow / Prefect / Dagster

  sources:
    - name: snowflake_warehouse
      method: pull  # JDBC connector
      frequency: daily (02:00 UTC)
      profile_tables: critical only
      capture_lineage: query-based

    - name: dbt_artifacts
      method: push  # Post-dbt run webhook
      frequency: per model run
      artifacts: [manifest.json, catalog.json, run_results.json]
      capture_column_lineage: yes  # from manifest.json

    - name: spark_streaming
      method: push  # OpenLineage SparkListener
      frequency: per job completion
      capture: [inputs, outputs, job properties]

    - name: kafka_schemas
      method: pull  # Schema Registry poll
      frequency: hourly
      capture: [topic schemas, subject versions]

    - name: tableau_server
      method: pull  # Tableau Metadata API
      frequency: daily (04:00 UTC)
      capture: [workbooks, datasources, dashboards, lineage]
```

### DataHub Ingestion Recipes

```yaml
# recipe.yml for Snowflake + dbt + Tableau
source:
  type: snowflake
  config:
    account_id: xy12345
    warehouse: COMPUTE_WH
    role: DATAHUB_ROLE
    profiling:
      enabled: true
      profile_table_level_only: false
      profile_pattern:
        allow: ["PROD_DB.ANALYTICS.%"]
    capture_table_lineage: true
    capture_column_lineage: true

transformers:
  - type: simple_add_dataset_ownership
    config:
      owner_urns:
        - "urn:li:corpuser:data-platform"
      ownership_type: TECHNICAL_OWNER
  - type: pattern_add_ownership
    config:
      owner_pattern:
        rules:
          ".*\.finance\..*": "urn:li:corpuser:finance-team"
          ".*\.commerce\..*": "urn:li:corpuser:commerce-team"

sink:
  type: datahub-rest
  config:
    server: http://datahub-gms:8080
```

### Ingestion Error Handling

```python
class ResilientIngestionRunner:
    def __init__(self, sources, sink, retry_count=3):
        self.sources = sources
        self.sink = sink
        self.retry_count = retry_count

    def run_ingestion(self):
        results = {"success": [], "failed": [], "skipped": []}

        for source in self.sources:
            try:
                metadata = source.extract(retries=self.retry_count)
                self.sink.emit(metadata)
                results["success"].append(source.name)
            except SourceConnectionError as e:
                results["failed"].append({
                    "source": source.name,
                    "error": str(e),
                    "action": "retry_next_run"
                })
                self._alert_on_failure(source.name, str(e))
            except SchemaCompatibilityError as e:
                results["failed"].append({
                    "source": source.name,
                    "error": f"Schema incompatibility: {e}",
                    "action": "manual_review_required"
                })
            except DataHubConnectionError as e:
                results["skipped"].append({
                    "source": source.name,
                    "error": f"DataHub unavailable: {e}",
                    "action": "auto_retry_in_5min"
                })

        self._update_health_dashboard(results)
        return results
```

## Metadata Quality

### Quality Dimensions

| Dimension | Definition | Target | Check |
|---|---|---|---|
| Completeness | All required fields populated | > 95% | Automated scan |
| Accuracy | Metadata matches source system | 100% | Periodic reconciliation |
| Freshness | Last updated within window | < 7 days | Age check |
| Consistency | Same terms used consistently | > 90% | Glossary term audit |
| Lineage coverage | % of datasets with lineage | > 80% | Lineage graph analysis |
| Ownership | % with documented owner | 100% | Ownership field check |

### Quality Monitoring

```python
# Metadata quality check
def check_metadata_quality(catalog_api_url: str) -> dict:
    """Run quality checks on catalog metadata."""
    report = {}

    # 1. Check completeness
    datasets = get_all_datasets(catalog_api_url)
    missing_owner = [d for d in datasets if not d.get("owner")]
    missing_desc = [d for d in datasets if not d.get("description")]
    report["completeness"] = {
        "total_datasets": len(datasets),
        "missing_owner": len(missing_owner),
        "missing_description": len(missing_desc),
        "owner_coverage_pct": (len(datasets) - len(missing_owner)) / len(datasets) * 100,
    }

    # 2. Check freshness
    stale_threshold = datetime.utcnow() - timedelta(days=7)
    stale_datasets = [
        d for d in datasets
        if d.get("last_ingested") and d["last_ingested"] < stale_threshold
    ]
    report["freshness"] = {
        "stale_count": len(stale_datasets),
        "stale_ratio": len(stale_datasets) / len(datasets) * 100,
    }

    # 3. Check lineage coverage
    critical_datasets = [d for d in datasets if d.get("tier") == "critical"]
    lineage_coverage = sum(
        1 for d in critical_datasets
        if d.get("upstream_lineage") or d.get("downstream_lineage")
    )
    report["lineage_coverage"] = {
        "critical_with_lineage": lineage_coverage,
        "critical_total": len(critical_datasets),
        "coverage_pct": lineage_coverage / len(critical_datasets) * 100,
    }

    return report
```

## Metadata Lifecycle

### Versioning

```yaml
metadata_versioning:
  strategy: event-sourced  # every change is a new event

  dataset_version:
    major: schema breaking change
    minor: additive schema change
    patch: description/tag update

  retention:
    versions_kept: 100 per entity
    version_archive_after_days: 365

  schema_change_detection:
    - new_column_added (minor)
    - column_dropped (major)
    - column_type_changed (major)
    - column_nullability_changed (minor)
```

### Deprecation and Deletion

```python
def deprecate_dataset(urn: str, reason: str, replacement_urn: str = None):
    """Mark a dataset as deprecated in the catalog."""
    deprecated_metadata = {
        "urn": urn,
        "deprecated": True,
        "deprecation_note": reason,
        "decommission_time": (datetime.utcnow() + timedelta(days=90)).isoformat(),
        "replacement": replacement_urn,
    }

    # Emit deprecation event
    catalog_api.emit_deprecation(deprecated_metadata)

    # Notify consumers
    consumers = get_dataset_consumers(urn)
    for consumer in consumers:
        notify_consumer(
            consumer,
            f"Dataset {urn} will be decommissioned in 90 days. "
            f"Replacement: {replacement_urn or 'None'}"
        )


def cleanup_deleted_datasets(catalog_api_url: str):
    """Remove metadata for deleted datasets beyond retention."""
    deleted = []
    datasets = get_all_datasets(catalog_api_url)

    for ds in datasets:
        if ds.get("decommission_time") and \
           datetime.fromisoformat(ds["decommission_time"]) < datetime.utcnow():
            # Archive before removal
            archive_metadata(ds)
            catalog_api.delete_entity(ds["urn"])
            deleted.append(ds["urn"])

    return deleted
```

## Catalog API Usage

### DataHub GraphQL API

```graphql
# Search datasets
query SearchDatasets($query: String!, $start: Int, $count: Int) {
  search(input: { type: DATASET, query: $query, start: $start, count: $count }) {
    total
    searchResults {
      entity {
        ... on Dataset {
          urn
          name
          platform { name }
          description
          ownership { owners { owner { ... on CorpUser { username } } } }
          tags { tags { tag { name } } }
          glossaryTerms { terms { term { name } } }
          schema {
            fields { fieldPath, type, description, nullable }
          }
        }
      }
    }
  }
}

# Get full lineage
query GetLineage($urn: String!, $depth: Int) {
  lineage(input: { urn: $urn, direction: UPSTREAM, depth: $depth }) {
    relationships { type, entity { urn, type, name } }
  }
}

# Update ownership
mutation UpdateOwnership($urn: String!, $owners: [OwnerInput!]!) {
  updateOwnership(input: { urn: $urn, owners: $owners })
}
```

### OpenMetadata REST API

```python
import requests

BASE_URL = "http://openmetadata-server:8585/api/v1"

# Search entities
response = requests.get(
    f"{BASE_URL}/search/query",
    params={"q": "orders", "index": "table_search_index", "from": 0, "size": 50},
    headers={"Authorization": f"Bearer {JWT_TOKEN}"}
)

# Add lineage
lineage_payload = {
    "edge": {
        "fromEntity": {
            "id": "table_source_id",
            "type": "table"
        },
        "toEntity": {
            "id": "table_target_id",
            "type": "table"
        }
    }
}
response = requests.post(
    f"{BASE_URL}/lineage",
    json=lineage_payload,
    headers={"Authorization": f"Bearer {JWT_TOKEN}"}
)

# Update description
response = requests.patch(
    f"{BASE_URL}/tables/{table_id}",
    json=[{"op": "replace", "path": "/description", "value": "New description"}],
    headers={
        "Authorization": f"Bearer {JWT_TOKEN}",
        "Content-Type": "application/json-patch+json"
    }
)
```

## Metadata Enrichment

### Automated Tagging

```python
def auto_tag_pii_columns(schema_fields: list) -> list:
    """Automatically tag PII columns based on naming patterns."""
    pii_patterns = {
        "email": r".*email.*|.*e_mail.*",
        "ssn": r".*ssn.*|.*social_security.*",
        "phone": r".*phone.*|.*mobile.*|.*telephone.*",
        "address": r".*address.*|.*street.*|.*city.*|.*zip.*",
        "credit_card": r".*cc.*|.*credit_card.*|.*card_number.*",
        "ip": r".*ip_address.*|.*ip_addr.*",
    }

    for field in schema_fields:
        for pii_type, pattern in pii_patterns.items():
            if re.match(pattern, field["name"], re.IGNORECASE):
                field["tags"].append({
                    "tag": f"PII_{pii_type.upper()}",
                    "auto_classified": True,
                })
                field["pii_classification"] = "restricted"

    return schema_fields
```

### Usage-Based Popularity

```python
def compute_dataset_popularity(query_log: list, window_days: int = 30) -> dict:
    """Compute dataset popularity from query logs."""
    popularity = {}
    cutoff = datetime.utcnow() - timedelta(days=window_days)

    for entry in query_log:
        if entry["timestamp"] < cutoff:
            continue

        for table in entry["tables_accessed"]:
            if table not in popularity:
                popularity[table] = {
                    "query_count": 0,
                    "unique_users": set(),
                    "last_accessed": entry["timestamp"],
                }
            popularity[table]["query_count"] += 1
            popularity[table]["unique_users"].add(entry["user"])
            if entry["timestamp"] > popularity[table]["last_accessed"]:
                popularity[table]["last_accessed"] = entry["timestamp"]

    # Calculate popularity score (0-100)
    max_queries = max(p["query_count"] for p in popularity.values()) if popularity else 1
    for table, stats in popularity.items():
        stats["popularity_score"] = round(stats["query_count"] / max_queries * 100, 1)
        stats["unique_user_count"] = len(stats["unique_users"])
        stats["unique_users"] = list(stats["unique_users"])

    return popularity
```

## Governance Integration

### Metadata-Driven Governance

```yaml
governance_rules:
  - rule: PII datasets must have documented retention
    check: if dataset.tags contains "PII", then retention_policy is not null
    enforcement: warning in catalog UI, blocking in CI/CD

  - rule: Critical datasets must have documented owner
    check: if dataset.tier == "critical", then ownership is not null
    enforcement: blocking in catalog + CI/CD

  - rule: All datasets must have description
    check: dataset.description is not null and len > 20
    enforcement: warning, auto-reminder to owner

  - rule: Column-level lineage for tier 1 datasets
    check: if dataset.tier == "critical", then column_lineage is not empty
    enforcement: reporting only
```

### Access Request Integration

```python
def process_access_request(request: dict) -> dict:
    """Process data access request through catalog."""
    dataset = get_dataset_metadata(request["dataset_urn"])
    owner = dataset["ownership"]["owner"]

    # Create access request ticket
    ticket = {
        "requester": request["user"],
        "dataset": request["dataset_urn"],
        "purpose": request.get("purpose", ""),
        "requested_access": request.get("access_type", "read"),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
    }

    # Auto-approve for certain patterns
    if request["user"] in owner.get("auto_approve_users", []):
        ticket["status"] = "approved"
        provision_access(request["dataset_urn"], request["user"])
        notify_user(request["user"], f"Access approved for {request['dataset_urn']}")
    else:
        notify_owner(owner, f"Access request for {request['dataset_urn']} from {request['user']}")

    return ticket
```

## Operations

### Health Dashboard

```python
def catalog_health_check() -> dict:
    """Run comprehensive health check on catalog."""
    return {
        "ingestion": {
            "last_successful_run": get_last_ingestion_time(),
            "failed_sources": get_failed_sources(last_24h=True),
            "pending_sources": get_pending_sources(),
        },
        "metadata_quality": check_metadata_quality(),
        "search": {
            "avg_latency_ms": get_search_latency_p50(),
            "p99_latency_ms": get_search_latency_p99(),
            "error_rate": get_search_error_rate(),
            "index_size_gb": get_index_size(),
        },
        "api": {
            "requests_per_minute": get_api_rpm(),
            "error_rate": get_api_error_rate(),
        },
        "storage": {
            "total_entities": get_entity_count(),
            "total_relationships": get_relationship_count(),
            "storage_gb": get_storage_size_gb(),
        },
    }
```

## References

- Catalog search and discovery patterns
- Metadata ingestion patterns
- Catalog API examples
- Catalog governance framework
- Catalog platform comparison
- Catalog metadata automation
- DataHub operations guide
- OpenMetadata documentation
