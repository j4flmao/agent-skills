# Catalog API Examples

## DataHub GraphQL API

### Search datasets

```graphql
{
  search(input: { type: DATASET, query: "fct_orders", start: 0, count: 10 }) {
    total
    searchResults {
      entity {
        urn
        type
        ... on Dataset {
          name
          properties { description }
          ownership { owners { owner { urn } } }
          schemaMetadata { fields { fieldPath nativeDataType } }
        }
      }
    }
  }
}
```

### Get column-level lineage

```graphql
{
  dataset(urn: "urn:li:dataset:(urn:li:dataPlatform:snowflake,analytics.fct_orders,PROD)") {
    upstreamLineage {
      upstreams {
        dataset { urn name }
        type
        auditStamp { time actor }
      }
    }
    fineGrainedLineages {
      upstreamFields { fieldPath }
      downstreamFields { fieldPath }
      transformationDescription
    }
  }
}
```

### Emit metadata via REST

```bash
# Register a dataset
curl -X POST "http://datahub-gms:8080/entities/v1" \
  -H "Content-Type: application/json" \
  -d '{
    "entityType": "dataset",
    "entityKeyAspects": ["dataPlatformInstance"],
    "aspects": {
      "dataPlatformInstance": {
        "platform": "urn:li:dataPlatform:snowflake",
        "instance": "prod"
      },
      "datasetProperties": {
        "name": "fct_orders",
        "description": "Processed order fact table",
        "tags": ["critical"]
      },
      "ownership": {
        "owners": [{"owner": "urn:li:corpuser:data-eng", "type": "DATAOWNER"}]
      }
    }
  }'
```

## Amundsen REST API

```bash
# Get table detail
GET /table/snowflake/prod/analytics/fct_orders

# Update table description
PUT /table/snowflake/prod/analytics/fct_orders/description
Body: {"description": "Fact table for processed orders, updated hourly"}

# Get popular tables (last 30 days)
GET /table/snowflake/prod/analytics/popular_tables?limit=20

# Get table owner
GET /table/snowflake/prod/analytics/fct_orders/owner
# Response: {"owner": "data-engineering@org.com"}

# Get column statistics
GET /table/snowflake/prod/analytics/fct_orders/column/total_amount/stats
```

## OpenMetadata REST API

```bash
# Search entities
GET /api/v1/search/query?q=fct_orders&index=table_search_index&from=0&size=10

# Create a table entity
POST /api/v1/tables
{
  "name": "fct_orders",
  "databaseSchema": "analytics",
  "service": "snowflake_prod",
  "columns": [
    {"name": "order_id", "dataType": "VARCHAR", "dataLength": 64},
    {"name": "total_amount", "dataType": "NUMERIC", "precision": 12, "scale": 2}
  ],
  "owner": {"id": "user-data-eng-id"},
  "tags": [{"tagFQN": "Tier.Critical"}]
}

# Get lineage
GET /api/v1/tables/urn:table-id/lineage?upstreamDepth=3&downstreamDepth=3

# Add glossary term
PUT /api/v1/tables/urn:table-id/glossaryTerms
{
  "glossaryTerms": [
    {"tagFQN": "glossary.financial-metrics.revenue"}
  ]
}
```

## Common API Patterns

| Operation | DataHub | Amundsen | OpenMetadata |
|---|---|---|---|
| Search | GraphQL `search` | `GET /search` | `GET /api/v1/search/query` |
| Read entity | GraphQL `dataset` | `GET /table/{db}/{cluster}/{schema}/{table}` | `GET /api/v1/tables/{id}` |
| Create entity | `POST /entities/v1` | `PUT /table` | `POST /api/v1/tables` |
| Add lineage | `POST /entities/v1?action=upsert` | `PUT /table/lineage` | `PUT /api/v1/tables/{id}/lineage` |
| Add tag | GraphQL `addTag` mutation | `PUT /table/{id}/tag/{tag}` | `PUT /api/v1/tables/{id}/tags` |
| Add owner | Aspect `ownership` | `PUT /table/{id}/owner` | `PUT /api/v1/tables/{id}/owner` |
