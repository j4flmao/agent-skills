# Virtualization Platforms

## Trino vs Starburst vs Dremio

| Feature | Trino (OSS) | Starburst | Dremio |
|---|---|---|---|
| **License** | Apache 2.0 | Commercial | Apache 2.0 + Enterprise |
| **SQL Support** | ANSI SQL + extensions | Full + Starburst SQL | ANSI SQL + extensions |
| **Connectors** | 30+ connectors | 50+ (incl. certified) | 15+ connectors |
| **Caching** | None (vanilla) | Starburst Caching (SSD/NVMe) | Reflections (auto-acceleration) |
| **Auth** | Pluggable (LDAP, OAuth via module) | Built-in (RBAC, OAuth, SAML, Kerberos) | Built-in (RBAC, AD/LDAP, OAuth) |
| **Governance** | External (Ranger) | Built-in (Polaris-based, masking, row filter) | Built-in (VDS, row/column-level) |
| **Deployment** | Docker, K8s, bare | Docker, K8s, SaaS (Galaxy) | Docker, K8s, bare |
| **Best For** | Open-source federated query | Enterprise governed lakehouse | BI acceleration, self-service |

## Starburst Caching

```properties
# Starburst cluster config
cache.enabled=true
cache.base-directory=/mnt/nvme/cache
cache.ttl=24h
cache.size-per-node=2TB
cache.type=alluxio

# Auto-reload stale cache entries
cache.automatic-reload-enabled=true
cache.automatic-reload-interval=30m
```

Caches data from slow sources (S3, HDFS) on local NVMe/SSD. Transparent to queries. Common queries served from local cache.

## Dremio Reflections

```yaml
# Reflection definition for BI acceleration
reflections:
  # Aggregate reflection (pre-computed aggregations)
  - name: orders_daily_agg
    type: AGGREGATE
    displayFields:
      - order_date
      - status
    measureFields:
      - total_amount (SUM, COUNT, AVG)
      - order_id (COUNT)
    partition: order_date (YEAR-MONTH)
    distribution: HASH(order_id)

  # Raw reflection (columnar layout + sort for fast scans)
  - name: orders_raw
    type: RAW
    displayFields:
      - order_id
      - customer_id
      - total_amount
      - status
      - created_at
    sort: created_at DESC
    partition: created_date (YEAR-MONTH)
```

Reflections are materialized views in Dremio's columnar format. Auto-refreshed incrementally. Queries automatically rewritten to use reflections.

## Security Configuration

```properties
# Trino TLS
http-server.https.enabled=true
http-server.https.port=8443
http-server.https.keystore.path=/etc/trino/keystore.jks
http-server.https.keystore.key=password

# Trino LDAP auth
http-server.authentication.type=LDAP
http-server.authentication.ldap.url=ldaps://ldap.internal:636
http-server.authentication.ldap.user-bind-pattern=uid=${USER},ou=users,dc=org,dc=com

# Starburst RBAC
starburst.access-control=file
starburst.access-control.config-file=/etc/starburst/rules.json

# System access (admin only)
system-rules:
  - schema: system
    privileges:
      - SELECT
    users:
      - admin
```

## Deployment Topology

```yaml
# docker-compose.trino.yaml
services:
  coordinator:
    image: trinodb/trino:450
    ports:
      - "8080:8080"
    volumes:
      - ./etc:/etc/trino:ro
    command: coordinator

  worker:
    image: trinodb/trino:450
    volumes:
      - ./etc:/etc/trino:ro
    deploy:
      replicas: 5
      resources:
        limits:
          memory: 32G
          cpus: "16"
    environment:
      - JAVA_TOOL_OPTIONS=-Xmx24G
    command: worker
```

## Connector Comparison

| Source | Trino Connector | Pushdown | Use Case |
|---|---|---|---|
| **Hive/Iceberg** | Native | Filter, partition, LIMIT | Data lake queries |
| **PostgreSQL** | JDBC | Filter, aggregation, LIMIT | OLTP read replicas |
| **MySQL** | JDBC | Filter, LIMIT | Web app databases |
| **MongoDB** | Native | Filter, project | Document stores |
| **Elasticsearch** | Native | Filter, aggregation | Log analytics |
| **Kafka** | Native | Topic filter only | Real-time streaming |
| **BigQuery** | Native | Filter, aggregation, join | Cloud DW |
| **Snowflake** | JDBC | Filter, aggregation, LIMIT | Cloud DW |
| **ClickHouse** | JDBC | Filter, aggregation | Real-time analytics |
