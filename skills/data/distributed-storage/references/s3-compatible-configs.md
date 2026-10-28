# S3-Compatible Storage Client and Bucket Configuration

Ready-to-adapt configuration for connecting tools to S3 and S3-compatible endpoints (MinIO, Ceph RGW, R2, B2): AWS CLI, boto3, Spark S3A, Trino, DuckDB, rclone, plus bucket policies and lifecycle rules. Credentials come from environment, instance roles or secret managers, never from committed files.

## AWS CLI Profile for a Custom Endpoint

```ini
# ~/.aws/config
[profile minio]
region = us-east-1
endpoint_url = https://minio.internal:9000
s3 =
  addressing_style = path
request_checksum_calculation = when_required
response_checksum_validation = when_required
```

```bash
aws --profile minio s3 ls
aws --profile minio s3 cp ./data s3://lake/raw/ --recursive
```

`endpoint_url` in profiles is supported by recent AWS CLI v2 and SDK versions; older versions need `--endpoint-url` on each command.

## boto3

```python
import os
import boto3
from botocore.config import Config

s3 = boto3.client(
    "s3",
    endpoint_url=os.environ["S3_ENDPOINT"],          # omit for AWS
    region_name=os.environ.get("AWS_REGION", "us-east-1"),
    config=Config(
        s3={"addressing_style": "path"},
        retries={"max_attempts": 5, "mode": "adaptive"},
        connect_timeout=5,
        read_timeout=60,
        max_pool_connections=50,
        request_checksum_calculation="when_required",
        response_checksum_validation="when_required",
    ),
)

s3.upload_file("local.parquet", "lake", "silver/orders/part-0000.parquet")

# create-if-absent (conditional write); requires provider support
s3.put_object(Bucket="lake", Key="locks/job-42", Body=b"", IfNoneMatch="*")
```

Credentials resolve from env vars (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`), profiles, or IAM roles. The checksum options exist in botocore releases from 2025 onward.

## Spark (Hadoop S3A)

```properties
# spark-defaults.conf
spark.hadoop.fs.s3a.endpoint                     https://minio.internal:9000
spark.hadoop.fs.s3a.path.style.access            true
spark.hadoop.fs.s3a.connection.ssl.enabled       true
spark.hadoop.fs.s3a.aws.credentials.provider     software.amazon.awssdk.auth.credentials.EnvironmentVariableCredentialsProvider
spark.hadoop.fs.s3a.connection.maximum           200
spark.hadoop.fs.s3a.threads.max                  64
spark.hadoop.fs.s3a.fast.upload                  true
spark.hadoop.fs.s3a.multipart.size               128M
spark.hadoop.fs.s3a.committer.name               magic
spark.hadoop.fs.s3a.committer.magic.enabled      true
spark.sql.sources.commitProtocolClass            org.apache.spark.internal.io.cloud.PathOutputCommitProtocol
spark.sql.parquet.output.committer.class         org.apache.spark.internal.io.cloud.BindingParquetOutputCommitter
```

Notes:
- Hadoop 3.4+ S3A uses AWS SDK v2, so credential provider class names are `software.amazon.awssdk...`; Hadoop 3.3 used SDK v1 class names (`com.amazonaws.auth...`). Match your Hadoop version.
- The magic committer avoids rename-based commits; requires the `spark-hadoop-cloud` module on the classpath.
- Table formats (Delta, Iceberg) manage commits themselves; the committer settings matter for plain Parquet writes.
- Iceberg can use its own `S3FileIO` (`io-impl=org.apache.iceberg.aws.s3.S3FileIO`, with `s3.endpoint`, `s3.path-style-access`) instead of S3A.

## Trino (native S3 file system)

```properties
# etc/catalog/lake.properties
connector.name=iceberg
iceberg.catalog.type=rest
iceberg.rest-catalog.uri=https://catalog.internal
fs.native-s3.enabled=true
s3.endpoint=https://minio.internal:9000
s3.region=us-east-1
s3.path-style-access=true
s3.aws-access-key=${ENV:S3_ACCESS_KEY}
s3.aws-secret-key=${ENV:S3_SECRET_KEY}
```

Recent Trino versions replace the legacy Hive `hive.s3.*` properties with native file system `s3.*` properties.

## DuckDB

```sql
INSTALL httpfs; LOAD httpfs;
CREATE SECRET lake (
    TYPE s3,
    KEY_ID getenv('S3_ACCESS_KEY'),
    SECRET getenv('S3_SECRET_KEY'),
    ENDPOINT 'minio.internal:9000',
    URL_STYLE 'path',
    USE_SSL true,
    REGION 'us-east-1'
);
SELECT count(*) FROM read_parquet('s3://lake/silver/orders/*/*.parquet');
```

If `getenv` is unavailable in your DuckDB build/context, use `PROVIDER credential_chain` to load from the AWS credential chain.

## rclone

```ini
# rclone.conf (keys supplied via env: RCLONE_CONFIG_MINIO_ACCESS_KEY_ID, ..._SECRET_ACCESS_KEY)
[minio]
type = s3
provider = Minio
endpoint = https://minio.internal:9000
env_auth = false

[r2]
type = s3
provider = Cloudflare
endpoint = https://<account_id>.r2.cloudflarestorage.com
```

```bash
rclone sync minio:lake/raw r2:archive/raw --checksum --transfers 32 --progress
```

## Bucket Policy: Read-Only Role and TLS-Only

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AnalyticsRead",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123456789012:role/analytics-reader" },
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::lake", "arn:aws:s3:::lake/silver/*"]
    },
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::lake", "arn:aws:s3:::lake/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    }
  ]
}
```

`s3:ListBucket` applies to the bucket ARN; object actions to `bucket/*`. Restrict listing to prefixes with the `s3:prefix` condition if needed. MinIO and Ceph accept AWS-style policy JSON with differences in supported conditions.

## Lifecycle Rules

```json
{
  "Rules": [
    {
      "ID": "expire-raw-after-90d",
      "Filter": { "Prefix": "raw/" },
      "Status": "Enabled",
      "Expiration": { "Days": 90 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    },
    {
      "ID": "tier-archive",
      "Filter": { "Prefix": "archive/" },
      "Status": "Enabled",
      "Transitions": [
        { "Days": 30, "StorageClass": "STANDARD_IA" },
        { "Days": 180, "StorageClass": "GLACIER_IR" }
      ]
    }
  ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration --bucket lake --lifecycle-configuration file://lifecycle.json
```

Always include `AbortIncompleteMultipartUpload`; orphaned parts are billed but invisible in normal listings. Transition rules are provider-specific; many compatible stores support expiry only.

## MinIO Client (mc)

```bash
mc alias set lake https://minio.internal:9000 "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"
mc mb --with-lock lake/compliance          # Object Lock must be enabled at creation
mc version enable lake/lake
mc ilm rule add lake/lake --prefix raw/ --expire-days 90
mc admin info lake
```

## Checklist

- [ ] Endpoint, region and addressing style set consistently across tools
- [ ] Retries, timeouts and connection pools configured
- [ ] SDK checksum behavior compatible with provider
- [ ] Hadoop/SDK version-matched credential providers and committers
- [ ] Least-privilege policies; TLS enforced
- [ ] Lifecycle includes multipart cleanup and noncurrent version expiry
- [ ] Secrets from env/secret store only
