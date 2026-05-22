# Data Platform Architecture

## Layered Architecture

```
┌─────────────────────────────────────────┐
│           Self-Serve Layer              │
│  Backstage / Portal / Notebooks / Docs  │
├─────────────────────────────────────────┤
│         Orchestration Layer              │
│  Airflow / Dagster / Prefect / Argo WF  │
├─────────────────────────────────────────┤
│            Access Layer                  │
│  Trino / Athena / SQL Endpoints / APIs  │
├─────────────────────────────────────────┤
│            Compute Layer                 │
│  Spark / Flink / Dask / Ray / Kubeflow  │
├─────────────────────────────────────────┤
│            Storage Layer                 │
│  S3/ADLS/GCS / MinIO / HDFS / Iceberg   │
└─────────────────────────────────────────┘
│        Infrastructure Layer (K8s)       │
│  EKS/AKS/GKE / Terraform / Helm / Istio │
└─────────────────────────────────────────┘
```

**Design principles**: each layer communicates via well-defined APIs only. No layer reaches into another's internals. Layers scale independently. Storage is the foundation — all compute reads/writes from storage, no compute-to-compute data transfer.

## Multi-Tenancy Patterns

### Namespace-per-Team (Default)

| Concern | Mechanism |
|---|---|
| **Compute isolation** | `ResourceQuota` per namespace |
| **Network isolation** | `NetworkPolicy` deny-all default |
| **Access control** | `RBAC` with `RoleBinding` per team |
| **Secrets isolation** | Namespace-scoped secrets, External Secrets |
| **Cost tracking** | Labels: `team`, `cost-center`, `env` |

### Cluster-per-Environment

| Environment | Isolation | Cost Model |
|---|---|---|
| **dev/test** | Namespace isolation, spot | Showback only |
| **staging** | Namespace isolation, on-demand | Showback |
| **production** | Dedicated node pool + namespaces | Chargeback |

### Capacity Planning Model

| Workload Type | vCPU/Node | Mem/Node | GPU | Autoscaling |
|---|---|---|---|---|
| **Batch ETL** | 8-16 | 32-64Gi | No | Spot, Karpenter |
| **Interactive SQL** | 16-32 | 64-128Gi | No | On-demand, Cluster Autoscaler |
| **Streaming** | 8-16 | 32-64Gi | No | On-demand, steady |
| **ML Training** | 16-32 | 128-256Gi | A10G/A100 | Spot, Karpenter |

Formula: `node_count = ceil(max(workload_cpu_sum / node_cpu, workload_mem_sum / node_mem) * 1.3)`.

## Self-Serve Provisioning

### Data Source Onboarding Flow

```
Developer → Backstage form → PR to infra repo → 
  Terraform plan → Approval (platform team) → 
  Apply → Provision namespace, buckets, service accounts, secrets → 
  Notification to developer with connection string
```

### Platform API

```yaml
POST /api/v1/namespace
  body: { team: "analytics", environment: "dev", quotas: { cpu: "16", memory: "64Gi" } }
  response: { namespace: "team-analytics-dev", serviceAccount: "team-analytics-dev-sa" }

POST /api/v1/datasource
  body: { type: "postgres", name: "prod-db", connectionSecret: "db-credentials" }
  response: { datasourceId: "ds-123", catalogEntry: "datahub://..." }

GET /api/v1/cost?team=analytics&period=monthly
  response: { total: 12450.32, breakdown: { compute: 8340, storage: 3110, network: 1000.32 } }
```
