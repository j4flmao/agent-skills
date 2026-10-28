# Warehouse Programmatic Access APIs

Client APIs for running queries and moving data in and out of Snowflake, BigQuery, and Amazon Redshift from application code and pipelines, plus Arrow-based access. Covers connections, parameter binding, bulk loading, async execution, and result handling.

## Choosing an Interface

| Need | Snowflake | BigQuery | Redshift |
|------|-----------|----------|----------|
| SQL from Python | `snowflake-connector-python` | `google-cloud-bigquery` | `redshift_connector`, psycopg (PostgreSQL protocol) |
| Serverless HTTP (no persistent connection) | SQL API (REST) | REST / client libraries | Redshift Data API |
| DataFrame pushdown | Snowpark | BigQuery DataFrames (`bigframes`) | — |
| Bulk load | `PUT` + `COPY INTO`, Snowpipe, Snowpipe Streaming | Load jobs, Storage Write API | `COPY` from S3 |
| Bulk read | Arrow result batches | Storage Read API (Arrow/Avro) | `UNLOAD` to S3 (Parquet) |
| Arrow-native | ADBC Snowflake driver | ADBC BigQuery driver | — |

## Snowflake (Python Connector)

```python
import os
import snowflake.connector

conn = snowflake.connector.connect(
    account=os.environ["SF_ACCOUNT"],
    user=os.environ["SF_USER"],
    authenticator="SNOWFLAKE_JWT",                # key-pair auth for services
    private_key_file=os.environ["SF_PRIVATE_KEY_PATH"],
    warehouse="TRANSFORM_WH",
    database="ANALYTICS",
    schema="MARTS",
    role="SVC_REPORTING",
    session_parameters={"QUERY_TAG": "reporting-service", "STATEMENT_TIMEOUT_IN_SECONDS": 300},
)

with conn.cursor() as cur:
    cur.execute(
        "SELECT order_id, amount FROM fct_orders WHERE customer_id = %(cid)s AND order_date >= %(since)s",
        {"cid": customer_id, "since": since},
    )
    for batch in cur.fetch_arrow_batches():          # requires the pandas/pyarrow extra
        process(batch)
```

- Bind parameters; never format values into SQL strings.
- Use key-pair or OAuth/workload identity for services; Snowflake is phasing out single-factor password sign-in for users, so do not build new integrations on passwords.
- `QUERY_TAG` attributes cost and queries to the calling service.
- Async: `cur.execute_async(sql)` returns a query ID; poll with `conn.get_query_status(qid)` and fetch with `cur.get_results_from_sfqid(qid)`.

### Bulk load

```python
cur.execute("PUT file:///tmp/orders_20261027.parquet @%ORDERS_RAW AUTO_COMPRESS=FALSE")
cur.execute("""
    COPY INTO ORDERS_RAW
    FROM @%ORDERS_RAW
    FILE_FORMAT = (TYPE = PARQUET)
    MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
    ON_ERROR = ABORT_STATEMENT
""")
```

For pandas, `snowflake.connector.pandas_tools.write_pandas(conn, df, "ORDERS_RAW")` stages Parquet and runs `COPY` for you.

## Snowpark

```python
from snowflake.snowpark import Session
from snowflake.snowpark.functions import col, sum as sum_

session = Session.builder.configs(connection_params).create()
revenue = (session.table("FCT_ORDERS")
           .filter(col("ORDER_DATE") >= "2026-10-01")
           .group_by("CUSTOMER_ID")
           .agg(sum_("AMOUNT").alias("REVENUE")))
revenue.write.save_as_table("CUSTOMER_REVENUE_OCT", mode="overwrite")
```

Snowpark builds SQL lazily and executes inside Snowflake; avoid `to_pandas()` on large results.

## BigQuery (Python Client)

```python
from google.cloud import bigquery

client = bigquery.Client(project="acme-analytics")       # Application Default Credentials

job_config = bigquery.QueryJobConfig(
    query_parameters=[
        bigquery.ScalarQueryParameter("cid", "STRING", customer_id),
        bigquery.ScalarQueryParameter("since", "DATE", since),
    ],
    labels={"service": "reporting"},
    maximum_bytes_billed=50 * 1024**3,                      # fail if the query would scan more
)
rows = client.query(
    "SELECT order_id, amount FROM `acme-analytics.marts.fct_orders` "
    "WHERE customer_id = @cid AND order_date >= @since",
    job_config=job_config,
).result()

df = rows.to_dataframe()          # uses the BigQuery Storage Read API when installed
```

- `maximum_bytes_billed` protects against accidental full scans (on-demand pricing).
- Dry runs (`QueryJobConfig(dry_run=True, use_query_cache=False)`) estimate bytes scanned before running.
- Labels propagate to billing exports for cost attribution.

### Loading

```python
load_config = bigquery.LoadJobConfig(
    source_format=bigquery.SourceFormat.PARQUET,
    write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
    time_partitioning=bigquery.TimePartitioning(field="order_date"),
)
client.load_table_from_uri("gs://acme-landing/orders/2026-10-27/*.parquet",
                           "acme-analytics.raw.orders", job_config=load_config).result()
```

- Load jobs from GCS are free of ingestion charges; streaming uses the Storage Write API (exactly-once with committed streams), which replaces the legacy `insertAll` streaming API for new work.

## Redshift Data API

```python
import boto3, time

rsd = boto3.client("redshift-data")
resp = rsd.execute_statement(
    WorkgroupName="analytics",                 # Redshift Serverless; use ClusterIdentifier for provisioned
    Database="analytics",
    SecretArn=os.environ["REDSHIFT_SECRET_ARN"],
    Sql="SELECT order_id, amount FROM marts.fct_orders WHERE customer_id = :cid",
    Parameters=[{"name": "cid", "value": customer_id}],
)
qid = resp["Id"]
while (status := rsd.describe_statement(Id=qid)["Status"]) not in ("FINISHED", "FAILED", "ABORTED"):
    time.sleep(1)
if status != "FINISHED":
    raise RuntimeError(f"Redshift statement {qid} ended with {status}")
result = rsd.get_statement_result(Id=qid)
```

- No connection management, IAM-based auth, good for Lambdas and event-driven jobs.
- Results are paginated (`NextToken`) and size-limited; use `UNLOAD` to S3 for large exports.

```sql
COPY marts.orders_stage FROM 's3://acme-landing/orders/2026-10-27/'
IAM_ROLE 'arn:aws:iam::123456789012:role/redshift-load'
FORMAT AS PARQUET;

UNLOAD ('SELECT * FROM marts.fct_orders WHERE order_date = ''2026-10-27''')
TO 's3://acme-exports/fct_orders/2026-10-27/'
IAM_ROLE 'arn:aws:iam::123456789012:role/redshift-unload'
FORMAT AS PARQUET;
```

## ADBC (Arrow Database Connectivity)

ADBC drivers return Arrow data directly, avoiding row-by-row conversion:

```python
import adbc_driver_snowflake.dbapi as adbc

with adbc.connect(uri) as conn, conn.cursor() as cur:
    cur.execute("SELECT * FROM FCT_ORDERS WHERE ORDER_DATE = ?", parameters=(day,))
    table = cur.fetch_arrow_table()
```

Polars, DuckDB, and pandas (via pyarrow) consume Arrow tables with zero or minimal copies.

## Cross-Cutting Practices

| Practice | Why |
|----------|-----|
| Parameter binding | SQL injection and plan caching |
| Query tags / labels / application name | Cost attribution and debugging |
| Statement timeouts and byte limits | Runaway query protection |
| Idempotent loads (`MERGE` on keys, load history checks) | Safe retries |
| Retry only on transient errors with backoff | Avoid duplicate side effects |
| Service identities with least-privilege roles | Blast radius |

## Pitfalls

- Fetching millions of rows through a row-based cursor into Python lists.
- `SELECT *` from application code; schema changes break consumers and scan more data.
- Leaving Snowflake warehouses running from long-lived idle connections (set auto-suspend on the warehouse).
- Using the legacy BigQuery streaming API for new high-volume ingestion.

## Checklist

- [ ] Service auth via key pair, OAuth, workload identity, or IAM (no shared passwords)
- [ ] Bound parameters everywhere
- [ ] Timeouts, byte limits, and query tags set
- [ ] Bulk paths (COPY/load jobs/UNLOAD/Storage API) for large data
- [ ] Arrow-based fetching for analytical results
