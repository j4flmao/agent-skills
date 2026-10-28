# Deploying Batch Jobs: Platforms, Packaging and Release Process

How to package, deploy and promote batch jobs (Spark and similar engines) across environments, and how to choose between managed platforms. Orchestration integration is in `integration_guide.md`.

## Platform Options

| Platform | Model | Strengths | Trade-offs |
|----------|-------|-----------|------------|
| Databricks Jobs / Lakeflow | Managed Spark, job clusters or serverless | Delta integration, Unity Catalog governance, Asset Bundles | Vendor platform pricing (DBUs) |
| AWS EMR (EC2, EKS, Serverless) | Managed Hadoop/Spark | EMR Serverless removes cluster management; EMR on EKS shares K8s capacity | Configuration surface varies by mode |
| AWS Glue | Serverless Spark ETL | Integrated catalog, simple for small/medium jobs | Less control over Spark versions and tuning |
| Google Dataproc / Dataproc Serverless | Managed Spark | Fast cluster start, serverless batches | GCP-specific |
| Azure Databricks / Synapse / Fabric Spark | Managed Spark | Azure integration | Product overlap; check roadmap |
| Spark on Kubernetes (Spark Operator, `spark-submit` to K8s) | Self-managed | Portability, shared cluster capacity, spot nodes | You operate it: images, shuffle, logs, history server |
| SQL engines (dbt on warehouse) | SQL-only batch | Simplest for transformation in a warehouse | Limited to SQL and warehouse compute |

Choose the simplest platform that meets governance and cost needs; many teams run SQL transformations in the warehouse and Spark only for heavy or non-SQL processing.

## Ephemeral vs Long-Running Clusters

| Option | Use |
|--------|-----|
| Ephemeral job cluster per run | Production batch; isolation, reproducibility, pay per run |
| Serverless batch | Spiky or infrequent jobs; no cluster tuning |
| Shared long-running cluster | Interactive development; avoid for scheduled production jobs |

## Packaging

### Python (PySpark)

```text
my_pipeline/
  pyproject.toml
  src/my_pipeline/
    __init__.py
    jobs/daily_orders.py      # entry point with argument parsing
    transforms/orders.py      # pure functions: DataFrame -> DataFrame
  tests/
```

- Build a wheel (`uv build`) and ship it with the job (`--py-files dist/*.whl`, Databricks wheel task, EMR Serverless `spark.archives` with a packed virtual environment).
- Or bake dependencies into a container image (Spark on Kubernetes, EMR on EKS custom images, Dataproc custom containers).
- Pin dependency versions; the cluster's Python and Spark versions must match what tests ran against.

### JVM (Scala/Java)

- Build an assembly (fat) JAR with Spark marked `provided`; shade conflicting libraries (for example Jackson, Guava).
- Match Scala binary version to the Spark distribution (2.12 or 2.13).

## Spark on Kubernetes with the Spark Operator

```yaml
apiVersion: sparkoperator.k8s.io/v1beta2
kind: SparkApplication
metadata:
  name: daily-orders-20261026
  namespace: data-jobs
spec:
  type: Python
  mode: cluster
  image: registry.example.com/data/pipelines:1.12.0
  mainApplicationFile: local:///opt/app/jobs/daily_orders.py
  arguments: ["--run-date", "2026-10-26"]
  sparkVersion: "3.5.3"
  restartPolicy:
    type: OnFailure
    onFailureRetries: 2
    onFailureRetryInterval: 60
  driver:
    cores: 1
    memory: 4g
    serviceAccount: spark-driver
  executor:
    instances: 10
    cores: 4
    memory: 16g
    nodeSelector:
      karpenter.sh/capacity-type: spot
  dynamicAllocation:
    enabled: true
    minExecutors: 2
    maxExecutors: 40
```

Keep the driver on on-demand capacity: losing the driver fails the job, losing executors only retries tasks.

## Databricks Asset Bundles (example)

```yaml
# databricks.yml
bundle:
  name: orders-pipeline
targets:
  dev:
    mode: development
    workspace: {host: https://adb-123.azuredatabricks.net}
  prod:
    mode: production
    workspace: {host: https://adb-456.azuredatabricks.net}
resources:
  jobs:
    daily_orders:
      name: daily-orders
      tasks:
        - task_key: run
          python_wheel_task:
            package_name: my_pipeline
            entry_point: daily_orders
          libraries: [{whl: ./dist/*.whl}]
```

```bash
databricks bundle validate -t prod
databricks bundle deploy -t prod
```

## Environment Promotion

```text
feature branch -> CI (lint, unit tests, build artifact)
              -> dev   (deploy artifact, run on sample data)
              -> staging (same artifact, production-like data volume, data quality checks)
              -> prod  (same artifact, approval gate)
```

Rules:
- Build once, promote the same artifact (wheel, JAR or image digest) through environments.
- Environment differences come from configuration (catalog names, paths, cluster sizes), not code branches.
- Separate catalogs/schemas or buckets per environment; dev jobs must not be able to write production tables (enforce with IAM / catalog permissions).

## Releasing Logic Changes Safely

| Technique | Use |
|-----------|-----|
| Shadow run | New version writes to a parallel table; compare outputs (row counts, aggregates, sample diffs) before switching |
| Write-Audit-Publish | Validate output before publishing to consumers |
| Versioned output tables or views | Consumers read a view; switch the view to the new table atomically |
| Backfill plan | When logic changes historical results, schedule backfill and communicate to consumers |

## Rollback

- Code: redeploy the previous artifact version.
- Data: table formats support time travel (`RESTORE TABLE ... TO VERSION AS OF` in Delta, Iceberg `rollback_to_snapshot`); otherwise re-run the previous version for affected partitions.
- Keep snapshot retention long enough to cover the rollback window.

## Observability for Deployed Jobs

- Persist Spark event logs to object storage and run a History Server (or use the platform's UI).
- Emit job-level metrics: duration, input/output rows, bytes, failures, retries, data freshness.
- Alert on SLA misses (data not ready by the expected time), not only on failures.

## Checklist

- [ ] Platform chosen with cost and governance rationale
- [ ] Ephemeral or serverless compute for scheduled production jobs
- [ ] Single versioned artifact promoted across environments
- [ ] Environment isolation enforced by permissions
- [ ] Shadow runs or WAP for logic changes
- [ ] Rollback path for code and data documented
- [ ] Event logs, metrics and SLA alerts in place
