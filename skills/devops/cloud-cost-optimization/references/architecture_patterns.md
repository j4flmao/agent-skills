# Cost-Aware Architecture Patterns

Architecture decisions fix most of a system's cost long before anyone rightsizes an instance. This reference lists patterns that change the cost structure (what you pay per request, per GB, per hour) and the anti-patterns that silently inflate bills. Tactical optimizations (rightsizing, lifecycle rules, commitments) are in sibling references.

## Cost Model First

Before choosing a pattern, write the cost model of the workload:

```text
monthly_cost = compute(requests, duration, concurrency)
             + storage(GB-month by tier)
             + data_transfer(GB by path: internet egress, cross-region, cross-AZ, NAT)
             + managed_service_fees(per request / per hour / per GB processed)
             + observability(log GB ingested, metrics series, traces)
```

Then identify which term grows with the business driver (users, orders, tenants). A pattern is good when it makes the dominant term grow slower than revenue.

## Compute Patterns

| Pattern | Cost behaviour | Fits | Watch out for |
|---------|----------------|------|---------------|
| Functions (Lambda, Azure Functions, Cloud Run functions) | Pay per invocation x duration x memory; zero at idle | Spiky, low-to-medium steady load, event glue | At sustained high load per-request pricing exceeds containers; cold starts |
| Scale-to-zero containers (Cloud Run, Azure Container Apps, Knative) | Pay while handling requests (or per instance-second) | HTTP services with idle periods | Min instances kill the savings; check per-request vs instance billing mode |
| Containers on shared clusters (EKS/AKS/GKE) | Pay for nodes; efficiency = bin-packing | Many services, steady load | Requests/limits drive node count; idle headroom |
| VMs with autoscaling groups | Pay per instance-hour | Legacy, licensed software, stateful | Scale-in rarely tuned |
| Batch on spot/preemptible | Large discount, interruptible | Fault-tolerant batch, CI, rendering, training with checkpoints | Needs retry and checkpointing |

Break-even check for serverless vs containers: compute monthly cost at the p50 and p95 forecast load for both models. Re-evaluate when traffic grows by an order of magnitude.

## Data Transfer-Aware Topology

Data transfer is the term most often missed in design reviews.

| Path | Typical pricing direction | Pattern to reduce it |
|------|---------------------------|----------------------|
| Internet egress | Charged per GB, tiered | CDN caching, compression, regional edge |
| Cross-region | Charged per GB | Keep chatty services in one region; replicate only what is needed |
| Cross-AZ (AWS, GCP within region) | Charged per GB each direction on AWS | Zone-aware routing, topology-aware hints in Kubernetes |
| NAT gateway | Hourly + per GB processed | VPC gateway endpoints (S3, DynamoDB), interface endpoints for heavy AWS API traffic |
| Ingress | Usually free | n/a |

```yaml
# Kubernetes: prefer same-zone endpoints to cut cross-AZ traffic
apiVersion: v1
kind: Service
metadata:
  name: orders
spec:
  selector: {app: orders}
  ports: [{port: 80, targetPort: 8080}]
  trafficDistribution: PreferClose   # Kubernetes 1.31+ (beta); older: topology-aware hints annotation
```

Keep high availability: zone-local routing must still fail over when a zone has no healthy endpoints.

## Storage and Data Patterns

- **Hot/warm/cold separation**: write to a hot store, move aged data to object storage in a columnar format (Parquet) and query in place (Athena, BigQuery external tables, Synapse serverless).
- **Event log + compaction**: retain raw events briefly, keep compacted aggregates long term.
- **Read replicas vs caching**: a cache in front of a database is often cheaper than another replica for read-heavy, cache-friendly keys.
- **Pre-aggregation**: dashboards querying raw data every load cost more than a scheduled materialized table.

## Multi-Tenant Cost Patterns

| Model | Unit cost | Isolation | Notes |
|-------|-----------|-----------|-------|
| Pooled (shared infra, tenant_id column) | Lowest | Logical | Needs per-tenant metering for showback |
| Bridge (shared compute, separate schema/DB) | Medium | Data | Common for regulated tenants |
| Siloed (account/project per tenant) | Highest | Full | Price it into enterprise tiers |

Emit a per-tenant usage metric (requests, CPU-seconds, GB stored) so shared costs can be allocated proportionally.

## Asynchronous Load Leveling

A queue between producers and workers lets you size workers for average rather than peak load and run them on spot capacity.

```text
API (on-demand, small) -> queue (SQS / Service Bus / Pub/Sub) -> workers (spot, autoscaled on queue depth)
```

Scale workers on backlog per worker (KEDA `aws-sqs-queue`, `azure-servicebus`, `gcp-pubsub` scalers), with a maximum replica cap to bound spend.

## Anti-Patterns

| Anti-pattern | Why it is expensive | Alternative |
|--------------|--------------------|-------------|
| Every service in its own always-on cluster | Control plane and idle node overhead x N | Shared clusters with namespaces and quotas |
| Polling loops (cron every minute hitting APIs/DBs) | Constant compute and request charges | Event notifications, webhooks |
| Logging full request/response bodies | Log ingestion is billed per GB | Sample, truncate, log at DEBUG only on demand |
| Chatty microservices across AZs/regions | Per-GB transfer each hop | Co-locate, batch calls, BFF aggregation |
| NAT for all S3/DynamoDB traffic | Per-GB NAT processing | Gateway endpoints (free) |
| Over-replicated data stores in dev | Prod-sized HA in every environment | Single-AZ, smaller tiers, schedules in non-prod |
| Unbounded autoscaling | Bug or attack becomes a bill | Max replicas, budgets, concurrency limits |

## Design Review Questions

1. What is the business driver, and what is the cost per unit of it?
2. Which cost term dominates at 10x scale?
3. Where does data cross an AZ, region or NAT boundary?
4. What runs when there is no traffic?
5. What is the maximum spend if autoscaling runs away, and what caps it?
6. Which parts can tolerate interruption (spot) or delay (batch, queues)?
7. How will cost be attributed to teams, tenants or features?

## Checklist

- [ ] Cost model written with the dominant term identified
- [ ] Data transfer paths drawn on the architecture diagram
- [ ] Idle cost known (scale-to-zero or scheduled where possible)
- [ ] Autoscaling has upper bounds and budget alerts
- [ ] Per-tenant / per-feature usage metrics emitted
- [ ] Decision recorded in an ADR with the break-even assumptions
