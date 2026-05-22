# Catalog Platforms Comparison

## Platform Selection Matrix

| Feature | DataHub | OpenMetadata | Amundsen | Apache Atlas |
|---|---|---|---|---|
| **Deployment** | Docker/K8s, Helm | Docker/K8s, bare | Docker/K8s | Docker/K8s, Ambari |
| **Lineage** | Column-level, UI | Column-level, UI | Table-level only | Process-level |
| **Search** | Elasticsearch, GraphQL | Elasticsearch | Elasticsearch, Neo4j | Solr |
| **Glossary** | Business glossary, multi-domain | Glossary, classification | Tags only | Tag-based |
| **Ingestion** | Python CLI, Kafka push | Python connectors | Python (lyft) | REST API + hooks |
| **Auth** | OIDC, JAX, RBAC | OIDC, Basic, SSO | OIDC, Flask | Kerberos, Ranger |
| **API** | GraphQL + REST | REST + OpenAPI | REST | REST |
| **Real-time** | Kafka-based push | REST push | Polling | Hook-based |

## DataHub Deployment

```yaml
# docker-compose.datahub.yml
version: "3.8"
services:
  datahub-gms:
    image: acryldata/datahub-gms:v0.12.1
    ports:
      - "8080:8080"
    environment:
      - EBEAN_DATASOURCE_URL=jdbc:mysql://mysql:3306/datahub?useSSL=false
      - EBEAN_DATASOURCE_USERNAME=datahub
      - EBEAN_DATASOURCE_PASSWORD=datahub
      - KAFKA_BOOTSTRAP_SERVER=broker:29092
      - ELASTICSEARCH_HOST=elasticsearch
    depends_on:
      - mysql
      - elasticsearch
      - broker

  datahub-frontend:
    image: acryldata/datahub-frontend:v0.12.1
    ports:
      - "9002:9002"
    environment:
      - DATAHUB_GMS_HOST=datahub-gms
      - DATAHUB_GMS_PORT=8080
```

### Ingestion Recipe (Snowflake → DataHub)

```yaml
source:
  type: snowflake
  config:
    account_id: xy12345.us-east-1
    warehouse: COMPUTE_WH
    role: DATAHUB_INGESTION
    include_views: true
    include_tables: true
    database_pattern:
      allow: ["PROD_DB", "ANALYTICS_DB"]
    schema_pattern:
      deny: ["INFORMATION_SCHEMA"]

sink:
  type: datahub-rest
  config:
    server: "http://localhost:8080"
```

## OpenMetadata Ingestion

```yaml
source:
  type: snowflake
  serviceName: snowflake_prod
  serviceConnectionType: Snowflake
  config:
    account: xy12345.us-east-1
    warehouse: COMPUTE_WH
    username: openmetadata
    password: ${OM_PASSWORD}
    database: PROD_DB
    connectionOptions: {}
    connectionArguments: {}
sink:
  type: metadata-rest
  config:
    apiEndpoint: http://localhost:8585/api
```

## Column-Level Lineage via OpenLineage

```python
from openlineage.client import OpenLineageClient
from openlineage.client.run import RunEvent, Run, Job, Dataset
from openlineage.client.transport.http import HttpTransport

client = OpenLineageClient(transport=HttpTransport(url="http://datahub-gms:8080"))

# Emit lineage event
event = RunEvent(
    eventType="COMPLETE",
    eventTime="2026-05-22T10:00:00Z",
    run=Run(runId="etl-run-001"),
    job=Job(namespace="dbt", name="fct_orders"),
    inputs=[Dataset(namespace="snowflake://prod", name="public.order_items")],
    outputs=[Dataset(namespace="snowflake://prod", name="analytics.fct_orders")],
    producer="dbt-openlineage/1.0"
)
client.emit(event)
```
