# Data Mesh Infrastructure Platform

## Overview

The data mesh infrastructure platform provides the self-serve capabilities that enable domain teams to build, operate, and share data products independently. This reference covers the architecture, implementation, and operation of the platform infrastructure layer in a data mesh.

## Platform Architecture

### Plane Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Governance Plane                       │
│  Policy Engine  │  Audit Log  │  Compliance Checks      │
├─────────────────────────────────────────────────────────┤
│                   Discovery Plane                         │
│  Catalog  │  Schema Registry  │  Data Product API        │
├─────────────────────────────────────────────────────────┤
│                   Lifecycle Plane                         │
│  CI/CD  │  Orchestration  │  Test Environments           │
├─────────────────────────────────────────────────────────┤
│                   Compute Plane                           │
│  Batch (Spark)  │  Streaming (Flink)  │  Query (Trino)   │
├─────────────────────────────────────────────────────────┤
│                   Storage Plane                           │
│  Object Store  │  Table Format  │  Metastore             │
└─────────────────────────────────────────────────────────┘
```

Each plane exposes self-serve APIs. Domains interact with planes through these APIs, never directly accessing underlying infrastructure.

### Plane Isolation

Each plane is independently scalable, deployable, and versioned. This allows the platform team to upgrade individual components without affecting domain operations. Planes communicate through well-defined APIs with versioned contracts.

## Storage Plane

### Object Storage Architecture

```
┌────────────────────────────────────────────┐
│              Object Store (S3)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Domain A │ │ Domain B │ │ Platform │   │
│  │   data   │ │   data   │ │   data   │   │
│  └──────────┘ └──────────┘ └──────────┘   │
│  Bucket policies per domain prefix         │
│  No cross-domain bucket access             │
│  Platform manages bucket lifecycle         │
└────────────────────────────────────────────┘
```

Storage layout:
```
s3://data-lake/
  domain=commerce/
    data-product=orders/
      bronze/  (raw ingestion)
      silver/  (cleaned, validated)
      gold/    (aggregated, read-optimized)
    data-product=products/
      ...
  domain=finance/
    data-product=revenue/
      ...
  platform/
    catalog-metadata/
    schema-registry-backup/
    audit-logs/
    shared-models/
```

### Bucket Policy Template

```terraform
resource "aws_s3_bucket_policy" "domain_storage" {
  bucket = var.bucket_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyCrossDomainAccess"
        Effect = "Deny"
        Principal = "*"
        Action   = "s3:GetObject"
        Resource = "arn:aws:s3:::${var.bucket_name}/domain=*/data-product=*/*"
        Condition = {
          StringNotLike = {
            "s3:prefix": ["domain=${var.domain_name}/"]
          }
        }
      }
    ]
  })
}
```

### Storage Configuration for Data Products

```yaml
storage_config:
  format: iceberg
  compression: zstd
  partition_frequency: daily
  file_size_target_mb: 256
  encryption:
    algorithm: AES256
    key_source: aws_kms
    key_id: alias/data-lake-key
  lifecycle:
    bronze_retention_days: 30
    silver_retention_days: 365
    gold_retention_days: 2555
    expired_data_action: delete_without_recovery
  compaction:
    schedule: daily
    target_file_size_mb: 512
    enable_sort: true
    sort_columns:
      - name: order_date
        order: desc
      - name: customer_id
        order: asc
```

## Compute Plane

### Compute Resource Management

```yaml
compute_plane:
  cluster_templates:
    - name: batch-small
      executor_cores: 4
      executor_memory: 16g
      max_executors: 5
      max_runtime_minutes: 60
      cost_per_hour: 2.50
    - name: batch-large
      executor_cores: 8
      executor_memory: 32g
      max_executors: 20
      max_runtime_minutes: 480
      cost_per_hour: 12.00
    - name: streaming
      executor_cores: 4
      executor_memory: 16g
      min_executors: 2
      max_executors: 10
      checkpoint_location: "s3://data-lake/platform/checkpoints/"

  auto_scaling:
    metric: "pending_tasks"
    scale_up_threshold: 100
    scale_down_threshold: 10
    cooldown_seconds: 120

  resource_quotas:
    per_domain:
      max_concurrent_jobs: 10
      max_total_cores: 100
      max_total_memory_gb: 400
    per_data_product:
      max_concurrent_jobs: 3
```

### Self-Serve Compute API

```python
# Platform API: submit compute job
import requests

def submit_job(domain: str, data_product: str, job_spec: dict) -> str:
    resp = requests.post(
        "https://platform.internal/api/v1/jobs",
        json={
            "domain": domain,
            "data_product": data_product,
            "cluster_template": job_spec.get("template", "batch-small"),
            "pipeline_script": job_spec["script_path"],
            "parameters": job_spec.get("parameters", {}),
            "schedule": job_spec.get("schedule"),
            "dependencies": job_spec.get("dependencies", []),
        },
        headers={
            "Authorization": f"Bearer {get_domain_token(domain)}"
        }
    )
    resp.raise_for_status()
    return resp.json()["job_id"]
```

## Lifecycle Plane

### CI/CD Pipeline for Data Products

```yaml
# Platform-provided CI/CD template
pipeline_template:
  stages:
    - stage: validate
      steps:
        - schema_compatibility_check
        - metadata_completeness_check
        - policy_compliance_check
        - unit_tests

    - stage: build
      steps:
        - compile_transforms
        - generate_schema
        - package_artifacts

    - stage: deploy_dev
      environment: dev
      approval: automatic
      steps:
        - deploy_to_dev_catalog
        - deploy_compute_jobs
        - run_integration_tests

    - stage: deploy_staging
      environment: staging
      approval: domain_lead
      steps:
        - deploy_to_staging_catalog
        - run_quality_checks
        - data_diff_from_prod

    - stage: deploy_prod
      environment: production
      approval: domain_steward
      steps:
        - deploy_to_prod_catalog
        - activate_output_ports
        - notify_consumers
```

### Orchestration Configuration

```yaml
orchestration:
  tool: dagster
  deployment: platform-managed

  per_domain:
    code_location: "s3://data-lake/domain=commerce/code/"
    schedules:
      - name: hourly_orders_ingest
        cron: "0 * * * *"
        job: commerce.orders.ingest
      - name: daily_orders_clean
        cron: "0 3 * * *"
        job: commerce.orders.clean

  observability:
    metrics:
      - job_sla_compliance_rate
      - job_failure_rate
      - data_freshness
      - data_volume_trend
    alerts:
      - on_failure: notify_domain_oncall
      - on_sla_breach: notify_domain_steward
      - on_data_quality_failure: notify_domain_lead
```

## Discovery Plane

### Catalog Integration

```yaml
catalog:
  tool: datahub
  platform_managed: true

  data_product_registration:
    required_fields:
      - name
      - domain
      - description
      - owner
      - schema
      - output_ports
      - sla
      - quality_score
    auto_generated:
      - lineage
      - usage_statistics
      - freshness_metrics

  search_configuration:
    ranking_factors:
      - popularity_weight: 0.4
      - freshness_weight: 0.3
      - documentation_score: 0.2
      - quality_score: 0.1
    facets:
      - domain
      - owner_team
      - output_port_type
      - sla_tier
      - pii_classification
```

### Data Product API Gateway

```yaml
api_gateway:
  tool: graphql-federation

  data_product_api:
    base_url: "https://data.products.internal/v1"
    authentication: mTLS
    rate_limiting:
      per_consumer:
        requests_per_second: 100
        burst: 200
      per_data_product:
        requests_per_second: 1000
    caching:
      enabled: true
      ttl_seconds: 60
      max_cache_size_gb: 10

  output_port_types:
    - type: graphql
      config:
        endpoint: "https://data.products.internal/v1/graphql"
        max_query_depth: 5
        max_batch_size: 1000
    - type: grpc
      config:
        endpoint: "data.products.internal:443"
        max_message_size_mb: 50
    - type: kafka
      config:
        bootstrap_servers: "kafka.platform.internal:9092"
        default_retention_days: 30
    - type: s3
      config:
        bucket: "data-products-output"
        path_template: "/{domain}/{data_product}/{date}/"
        format: "parquet"
```

## Observability Plane

### Monitoring Architecture

```
Data Product Metrics
  ├── Freshness: time since last successful update
  ├── Volume: row count, data size
  ├── Quality: null rate, uniqueness, distribution drift
  ├── Availability: output port uptime
  ├── Latency: API p50/p95/p99 response times
  └── Cost: storage + compute cost per data product

Platform Metrics
  ├── Plane utilization (compute, storage, API)
  ├── Domain resource consumption
  ├── CI/CD pipeline success rate
  ├── Catalog search performance
  └── Policy compliance rate

Aggregation: Prometheus → Grafana dashboards
Alerting: PagerDuty for CRITICAL, Slack for WARNING
```

### Data Product Health Dashboard

```python
# Platform dashboard data product health check
def get_data_product_health(domain: str, product: str) -> dict:
    metrics = {
        "freshness": check_freshness_sla(domain, product),
        "volume": check_volume_bounds(domain, product),
        "quality": check_quality_thresholds(domain, product),
        "availability": check_output_port_availability(domain, product),
        "latency": check_api_latency(domain, product),
    }
    score = calculate_health_score(metrics)
    return {
        "data_product": f"{domain}.{product}",
        "health_score": score,
        "metrics": metrics,
        "status": "healthy" if score > 0.8 else "degraded" if score > 0.5 else "unhealthy",
        "last_checked": datetime.utcnow().isoformat(),
    }
```

## Infrastructure Provisioning

### Terraform Module for Domain Onboarding

```terraform
# Domain onboarding module
resource "platform_domain" "domain" {
  name               = var.domain_name
  storage_quota_gb   = var.storage_quota_gb
  compute_quota_cores = var.compute_quota_cores
  steward_emails     = var.steward_emails
}

resource "platform_storage_prefix" "domain_storage" {
  domain    = platform_domain.domain.name
  path      = "domain=${platform_domain.domain.name}/"
  retention_policy = var.retention_policy
}

resource "platform_catalog_namespace" "domain_catalog" {
  domain      = platform_domain.domain.name
  description = "Data products for ${var.domain_name} domain"
  steward     = var.steward_emails[0]
}

resource "platform_monitoring_dashboard" "domain_dashboard" {
  domain    = platform_domain.domain.name
  templates = ["health", "cost", "usage"]
}
```

### Helm Chart for Platform Services

```yaml
# values.yaml for data mesh platform
global:
  environment: production
  domain_count: 10
  data_product_count: 200

storage-plane:
  enabled: true
  object_store:
    provider: aws
    bucket_name: "data-lake-prod"
    region: us-east-1
  metastore:
    type: glue
    catalog_id: "123456789012"

compute-plane:
  enabled: true
  spark:
    image: "spark:3.5.0"
    default_executor_memory: "16g"
    default_executor_cores: 4
  trino:
    replicas: 3
    memory_per_node: "64g"
  flink:
    replicas: 2
    jobmanager_memory: "8g"
    taskmanager_memory: "16g"

lifecycle-plane:
  enabled: true
  orchestration: dagster
  runner: k8s
  max_concurrent_runs: 50

discovery-plane:
  enabled: true
  catalog: datahub
  schema_registry:
    type: confluent
    replicas: 3
  api_gateway:
    type: graphql-federation
    rate_limit_per_second: 10000

governance-plane:
  enabled: true
  policy_engine: opa
  audit_log_retention_days: 730
```

## Platform Operations

### Incident Response

| Severity | Definition | Response Time | Escalation |
|---|---|---|---|
| SEV1 | Storage plane unavailable | 5 min | Platform lead |
| SEV2 | Compute plane degraded | 15 min | Platform engineer |
| SEV3 | Single domain data product down | 30 min | Domain + platform |
| SEV4 | Catalog search slow | 2 hours | Platform team |

### Platform Capacity Planning

- Storage: provision 3x current usage with 90-day growth projection
- Compute: auto-scaling with max cap per domain (prevents runaway costs)
- API gateway: plan for 5x peak traffic, load test quarterly
- Catalog: index size = 10% of metadata size, plan accordingly
- Schema registry: version count grows unbounded, archive schemas > 2 years old

### Cost Management

```yaml
cost_allocation:
  model: chargeback
  dimensions:
    - domain
    - data_product
    - plane

  rates:
    storage:
      bronze: "$0.023/GB/month"
      silver: "$0.023/GB/month"
      gold: "$0.023/GB/month"
    compute:
      batch_small: "$2.50/hour"
      batch_large: "$12.00/hour"
      streaming: "$8.00/hour"
    network:
      cross_domain_egress: "$0.09/GB"
      external_egress: "$0.12/GB"

  budget_alerts:
    - threshold: 80%
      action: notify_domain_steward
    - threshold: 100%
      action: block_new_jobs
    - threshold: 120%
      action: auto_scale_down
```

## Security

### Access Control Matrix

| Operation | Domain Team | Platform Team | Consumer | Governance |
|---|---|---|---|---|
| Write domain data | yes | no | no | no |
| Read domain data | yes | no | with ACL | audit only |
| Deploy compute job | yes | no | no | no |
| Configure output port | yes | no | no | no |
| Manage platform infra | no | yes | no | no |
| View audit logs | own domain | yes | no | yes |
| Override policy | request | no | no | approve |
| Grant cross-domain access | yes | no | request | audit |

### Network Security

- All inter-plane communication over mTLS
- Domains isolated in separate namespaces/K8s tenants
- Cross-domain traffic goes through API gateway only
- No direct pod-to-pod communication across domains
- Egress to internet: platform-restricted proxy
- Storage bucket access: IAM roles with condition keys

## Disaster Recovery

### Recovery Objectives

| Plane | RPO | RTO |
|---|---|---|
| Storage | 5 min | 1 hour |
| Compute | 15 min | 30 min |
| Catalog | 5 min | 15 min |
| Schema Registry | 5 min | 15 min |
| API Gateway | 0 (stateless) | 10 min |

### Backup Strategy

- Storage plane: cross-region replication, versioning enabled
- Catalog metadata: daily export to storage plane
- Schema registry: continuous backup
- Platform configuration: Terraform state in versioned bucket
- Audit logs: immutable WORM storage

## Platform Team Staffing

| Role | Count | Responsibility |
|---|---|---|
| Platform lead | 1 | Architecture, roadmap |
| Infrastructure engineer | 2-3 | Storage, compute, networking |
| Data platform engineer | 2-3 | Catalog, schema registry, API |
| SRE | 1-2 | Monitoring, incident response |
| Security engineer | 1 | Access control, encryption, audit |
| Developer experience | 1 | CI/CD templates, documentation, self-serve UX |

Recommended ratio: 1 platform engineer per 3-5 domain teams.

## Migration from Centralized Platform

### Phase 1: Foundation (Month 1-2)

- Deploy storage plane with domain isolation
- Set up CI/CD pipeline templates
- Create initial platform API (compute + storage)
- Onboard 1 pilot domain

### Phase 2: Core Services (Month 2-4)

- Deploy catalog with domain namespaces
- Deploy schema registry
- Implement data product API gateway
- Onboard 2-3 pilot domains

### Phase 3: Self-Serve (Month 4-6)

- Deploy governance plane with OPA
- Implement monitoring dashboards
- Create chargeback model
- All domains onboarded

### Phase 4: Optimization (Month 6-12)

- Auto-scaling tuned per workload
- Cost optimization
- Performance benchmarking
- Platform retro and roadmap refinement

## Common Challenges

1. **Platform team becomes bottleneck**: too many manual operations. Fix: invest in self-serve APIs and automation before scaling.
2. **Cost explosion from unchecked compute**: domains run inefficient jobs. Fix: per-domain quotas, cost visibility dashboards, chargeback.
3. **Catalog becomes stale**: metadata quality degrades. Fix: automated metadata harvesting, mandatory fields, quarterly steward audits.
4. **Network egress costs**: cross-domain data transfer grows. Fix: locality-aware scheduling, data product API caching.
5. **Platform version fragmentation**: domains on different platform versions. Fix: backward-compatible APIs, deprecation policy with notice.
6. **Compliance gaps across planes**: each plane has its own compliance posture. Fix: unified governance plane with cross-plane policy enforcement.

## Tools Reference

| Tool | Plane | Purpose |
|---|---|---|
| Terraform | Infrastructure | Provisoning |
| Helm | Infrastructure | K8s deployment |
| Spark | Compute | Batch processing |
| Flink | Compute | Stream processing |
| Trino | Compute | Interactive query |
| Dagster | Lifecycle | Orchestration |
| DataHub | Discovery | Metadata catalog |
| Confluent SR | Discovery | Schema registry |
| Apollo GraphQL | Discovery | API gateway |
| OPA | Governance | Policy engine |
| Prometheus + Grafana | Observability | Monitoring |
| Monte Carlo | Observability | Data observability |

## References

- Domain decomposition patterns
- Data product template and lifecycle
- Federated governance operating model
- Data mesh implementation guide
- Data mesh principles
- Lakehouse architecture for platform storage
