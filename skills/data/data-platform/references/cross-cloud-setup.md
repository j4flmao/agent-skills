# Cross-Cloud Data Platform Setup

## Multi-Cloud Storage Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  AWS (us-east)  │     │  GCP (us-central)│     │  Azure (eastus) │
│  ┌───────────┐ │     │  ┌───────────┐ │     │  ┌───────────┐ │
│  │ S3: data-lake│ │     │  │ GCS: data-lake│ │     │  │ ADLS: data-lake│ │
│  │ └── bronze/  │ │     │  │ └── bronze/  │ │     │  │ └── bronze/  │ │
│  │ └── silver/  │ │     │  │ └── silver/  │ │     │  │ └── silver/  │ │
│  │ └── gold/    │ │     │  │ └── gold/    │ │     │  │ └── gold/    │ │
│  └───────────┘ │     │  └───────────┘ │     │  └───────────┘ │
└─────────────┘     └─────────────┘     └─────────────┘
        │                  │                    │
        └──────────────────┴────────────────────┘
                    Iceberg via REST Catalog
                           │
                    Trino Federation
                    (single endpoint)
```

## Iceberg REST Catalog (Cross-Cloud)

```yaml
# iceberg-rest-catalog-config.yaml
catalog:
  type: rest
  uri: https://iceberg-catalog.internal/v1
  warehouse: s3a://data-lake/warehouse
  io-impl: org.apache.iceberg.aws.s3.S3FileIO
  clients: 10
  s3:
    endpoint: https://s3.dualstack.us-east-1.amazonaws.com
    region: us-east-1
    path-style-access: true
    access-key-id: ${AWS_ACCESS_KEY_ID}
    secret-access-key: ${AWS_SECRET_ACCESS_KEY}
  gcs:
    project-id: data-platform-prod
    service-account-file: /etc/gcp/sa-key.json
  azure:
    storage-account: datalakeprod
    container: warehouse
    sas-token: ${AZURE_SAS_TOKEN}

auth:
  type: OAuth2
  client-id: iceberg-client
  client-secret: ${ICEBERG_CLIENT_SECRET}
  oauth-server-uri: https://auth.internal/token
```

## Trino Federation Setup

```properties
# etc/catalog/iceberg.properties
connector.name=iceberg
iceberg.catalog.type=rest
iceberg.rest-catalog.uri=https://iceberg-catalog.internal/v1
iceberg.rest-catalog.warehouse=s3a://data-lake/warehouse
iceberg.file-format=PARQUET
hive.metastore.uri=thrift://hive-metastore:9083

# etc/catalog/gcs.properties
connector.name=iceberg
iceberg.catalog.type=rest
iceberg.rest-catalog.uri=https://iceberg-catalog.internal/v1
iceberg.rest-catalog.warehouse=gs://data-lake-gcs/warehouse
iceberg.file-format=PARQUET

# etc/catalog/postgresql.properties
connector.name=postgresql
connection-url=jdbc:postgresql://prod-db.internal:5432/analytics
connection-user=${PG_USER}
connection-password=${PG_PASSWORD}
```

## Cross-Cloud Data Sync (S3 ↔ GCS)

```yaml
# airflow-dag-cross-cloud-sync.yaml
dag:
  id: cross_cloud_sync
  schedule: "0 2 * * *"
  tasks:
    - id: sync_incremental
      operator: S3ToGCSOperator
      params:
        source_bucket: s3://data-lake/silver/commerce/
        dest_bucket: gs://data-lake-gcs/silver/commerce/
        transform: "SELECT * FROM source WHERE event_date > '{{ ds }}'"
        format: PARQUET
        compression: ZSTD

    - id: verify_checksum
      operator: PythonOperator
      params:
        script: |
          for src, dst in sync_pairs:
            assert md5(src) == md5(dst), f"Checksum mismatch: {src}"
```
