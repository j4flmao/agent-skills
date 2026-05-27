# Batch Processing Patterns

## Batch Processing Fundamentals
Batch processing involves processing large volumes of data in discrete groups at scheduled intervals. It is the foundation of ETL pipelines, data warehousing, reporting, and analytical workloads.

## Batch vs Stream Processing
| Aspect | Batch Processing | Stream Processing |
|--------|-----------------|------------------|
| Latency | Minutes to hours | Milliseconds to seconds |
| Data Volume | Large (GB-TB per batch) | Continuous small records |
| Processing Model | Bounded datasets | Unbounded streams |
| Complexity | Simpler, deterministic | Complex state management |
| Error Handling | Retry entire batch | Per-record handling |
| Cost | Lower compute cost | Higher sustained cost |
| Use Cases | Reporting, ML training | Real-time dashboards, alerts |

## Batch Processing Frameworks

### Apache Spark
```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, window, count

spark = SparkSession.builder \
    .appName("BatchProcessor") \
    .config("spark.sql.adaptive.enabled", "true") \
    .config("spark.sql.adaptive.coalescePartitions.enabled", "true") \
    .getOrCreate()

# Read batch data
orders = spark.read.parquet("s3://data-bucket/orders/dt=2024-01-15/")

# Transform
daily_summary = orders.groupBy(
    "customer_id",
    window("order_date", "1 day")
).agg(
    count("*").alias("order_count"),
    sum("total_amount").alias("total_spent")
)

# Write results
daily_summary.write \
    .mode("overwrite") \
    .partitionBy("customer_id") \
    .parquet("s3://data-bucket/daily_summary/")
```

### Apache Flink Batch Mode
```java
// Flink batch execution
ExecutionEnvironment env = ExecutionEnvironment.getExecutionEnvironment();
env.setRuntimeMode(RuntimeExecutionMode.BATCH);

DataSet<Order> orders = env.readCsvFile("hdfs://orders/2024-01/")
    .pojoType(Order.class, "id", "customerId", "amount", "date");

DataSet<Tuple2<String, Double>> totals = orders
    .groupBy("customerId")
    .aggregate(Aggregations.SUM, "amount");

totals.writeAsCsv("hdfs://output/customer_totals/");
env.execute("Batch Processing Job");
```

## Optimizing Batch Performance

### Partition Pruning
```python
# Bad: Full scan
df = spark.read.parquet("s3://data/orders/")
result = df.filter(col("order_date") == "2024-01-15")

# Good: Partition pruning
df = spark.read.parquet("s3://data/orders/")
result = df.filter(col("order_date") == "2024-01-15")
# Spark automatically prunes when reading partitioned data
```

### Bucketing
```sql
-- Create bucketed table for efficient joins
CREATE TABLE orders_bucketed (
    order_id BIGINT,
    customer_id INT,
    order_date DATE,
    total_amount DECIMAL(10,2)
)
USING parquet
CLUSTERED BY (customer_id) INTO 64 BUCKETS;

-- Join with customer table (also bucketed on customer_id)
SELECT c.name, SUM(o.total_amount) as lifetime_value
FROM orders_bucketed o
JOIN customers_bucketed c ON o.customer_id = c.customer_id
GROUP BY c.name;
```

### Adaptive Query Execution
```python
# Spark AQE optimizations
spark.conf.set("spark.sql.adaptive.enabled", "true")
spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
spark.conf.set("spark.sql.adaptive.maxShuffledHashJoinLocalMapThreshold", "64MB")
```

## Incremental Processing

### Watermarking for Batch
```python
# Track processing watermarks
class BatchWatermark:
    def __init__(self, table_name, watermark_column):
        self.table_name = table_name
        self.watermark_column = watermark_column

    def get_last_processed(self):
        # Read from metadata table
        return spark.sql(f"""
            SELECT MAX({self.watermark_column}) as watermark
            FROM metadata.batch_watermarks
            WHERE table_name = '{self.table_name}'
        """).collect()[0]["watermark"]

    def update_watermark(self, value):
        spark.sql(f"""
            MERGE INTO metadata.batch_watermarks AS target
            USING (SELECT '{self.table_name}' as table_name) AS source
            ON target.table_name = source.table_name
            WHEN MATCHED THEN UPDATE SET watermark = '{value}'
            WHEN NOT MATCHED THEN INSERT (table_name, watermark)
                VALUES ('{self.table_name}', '{value}')
        """)
```

## Error Handling and Retries

### Batch-Level Retry Strategy
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=60, max=600),
)
def process_batch(batch_id, data_path):
    try:
        df = spark.read.parquet(data_path)
        result = transform(df)
        result.write.mode("overwrite").parquet(f"output/batch={batch_id}/")
        log_success(batch_id, result.count())
    except Exception as e:
        log_failure(batch_id, str(e))
        raise
```

### Dead Letter Queue Pattern
```python
def process_with_dlq(batch_df):
    success = []
    failed = []

    for row in batch_df.collect():
        try:
            process_row(row)
            success.append(row)
        except Exception as e:
            failed.append({"row": row, "error": str(e)})

    # Write failed records to DLQ
    if failed:
        failed_df = spark.createDataFrame(failed)
        failed_df.write.mode("append").parquet("dlq/batch_errors/")

    return len(success), len(failed)
```

## Scheduling and Orchestration

### Cron-Based Scheduling
```yaml
# Kubernetes CronJob for batch
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-batch
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: batch-processor
            image: myrepo/batch-processor:latest
            resources:
              requests:
                memory: "4Gi"
                cpu: "2"
              limits:
                memory: "8Gi"
                cpu: "4"
          restartPolicy: OnFailure
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
```

## Monitoring Batch Jobs
```python
# Prometheus metrics for batch
from prometheus_client import Histogram, Counter, Gauge

BATCH_DURATION = Histogram(
    'batch_job_duration_seconds',
    'Batch job duration',
    ['job_name', 'status'],
    buckets=[60, 300, 600, 1800, 3600, 7200]
)

BATCH_ROWS = Counter(
    'batch_rows_processed_total',
    'Total rows processed',
    ['job_name', 'status']
)

BATCH_LAG = Gauge(
    'batch_processing_lag_seconds',
    'Time since last successful batch',
    ['job_name']
)
```

## Key Points
- Choose batch or stream based on latency requirements and data volume
- Leverage partition pruning and bucketing for optimal query performance
- Implement incremental processing with watermark tracking to reduce reprocessing
- Use Adaptive Query Execution in Spark for automatic optimization
- Implement retry logic with exponential backoff for transient failures
- Use dead letter queues for records that fail processing
- Schedule batch jobs considering data availability and business SLAs
- Monitor batch duration, row counts, and processing lag
- Right-size compute resources based on data volume characteristics
- Test batch jobs with production-scale data volumes
