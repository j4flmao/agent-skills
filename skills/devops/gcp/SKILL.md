---
name: devops-gcp
description: |
  Trigger: "GCP", "Google Cloud", "Google Kubernetes Engine", "GKE",
  "Cloud Run", "Cloud Functions", "Cloud Storage", "Cloud SQL",
  "Terraform GCP", "gcloud CLI", "Cloud Build"
  Exclusion: Not for AWS or Azure — use those specific skills.
version: 1.0.0
author: j4flmao
license: MIT
compatibility:
  cli: true
  core: true
  editor: true
  api: true
tags: [devops, cloud, gcp, phase-7]
---

# devops-gcp

## Purpose
Provision and operate Google Cloud infrastructure using GKE, Cloud Run, Cloud Functions, Terraform, and GCP-native networking with cost optimization, IAM security, and observability.

## Agent Protocol

### Trigger
Any user message referencing GCP services, GKE, Cloud Run, Cloud Functions, gcloud CLI, Cloud Build, or Terraform with GCP provider.

### Input Context
GCP service required, region/zone, organization/folder/project hierarchy, compliance requirements, and budget constraints.

### Output Artifact
Terraform/Deployment Manager configs, gcloud CLI commands, GKE cluster config, Cloud Run service definitions, networking architecture, IAM policies, monitoring setup.

### Response Format
Terraform/gcloud CLI commands with explanations. YAML configs for GKE and Cloud Run.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
GKE cluster running, Cloud Run service deployed, networking secured, CI/CD pipeline passing, monitoring configured, IAM least-privilege enforced, cost budgets active.

### Max Response Length
8000 tokens.

## Components

### Core Services (Detailed)
Compute Engine: VMs with sole-tenant nodes, preemptible instances (60-91% discount), machine type families — E2 (general), N2 (balanced), C2 (compute), M1/M2 (memory), G2 (GPU). GKE: managed Kubernetes with Autopilot (serverless, no node management, PSA enforced) or Standard (custom node pools, taints, machine types). Cloud Storage: unified object storage with Standard, Nearline (>30d), Coldline (>90d), Archive (>365d) tiers, object versioning, retention policies, object holds. Cloud SQL: managed MySQL/PostgreSQL/MS SQL with automatic failover, read replicas, cross-region replication, backup retention up to 365 days. BigQuery: serverless data warehouse with slot reservations (flex/ flat/ annual), BI Engine for real-time dashboards, streaming buffer for real-time ingestion, DDL/DML support. Pub/Sub: async messaging with exactly-once delivery, schema registry, topic retention, dead-letter queues, pull/push subscriptions. Cloud Run: container-based, scale-to-zero, pay-per-request, max instances for cost control, VPC egress, secrets integration. Cloud Functions: FaaS 2nd gen (event-driven), supports HTTP, Pub/Sub, Storage, Firestore, Firebase triggers.

### IAM and Organization
Resource hierarchy: organization node -> folders (dept/team) -> projects (service/env) -> resources. IAM roles: basic (owner/editor/viewer — avoid), predefined (service-specific curated roles like roles/storage.objectViewer), custom (fine-grained permission sets, least privilege). IAM Conditions: restrict access by resource.name, resource.service, IP address range, request time. Policy Analyzer: audit effective permissions for any principal. Privileged Access Manager: JIT elevation with approval and auto-expiration. Service accounts: per-microservice identity with automatic key rotation, workload identity federation for on-prem.

### Networking (Detailed)
Shared VPC: host project hosts VPC, service projects attach subnets — centralized NAT, firewall, and VPN management. Cloud NAT: outbound-only egress, static IP support, NAT gateway logging. Cloud Load Balancing: global HTTP/S LB (anycast IP, 1M+ QPS), internal TCP/UDP LB (private traffic), network passthrough LB (high-throughput), SSL proxy (TLS termination). Cloud CDN: global content cache, signed URLs/ cookies, cache invalidation, negative caching. Cloud Armor: WAF rules (OWASP top 10), DDoS protection (L3/L7), rate limiting, IP allow/deny lists, geo-based access control. VPC Service Controls: data exfiltration prevention via perimeters around managed services. Private Google Access: on-prem access to GCP APIs via private IP. Hybrid connectivity: Cloud VPN (IPsec, 99.9% SLA), Dedicated Interconnect (10-100 Gbps, 99.99% SLA), Partner Interconnect (50-10 Gbps).

### GKE Cluster Design (Detailed)
Autopilot: no node management, PSA enforced, cluster autoscaling included, pay-per-pod, ideal for most stateless workloads. Standard: system vs user node pools, taints/tolerations, custom machine types (including GPUs, high-mem), node auto-upgrade/repair, sole-tenant nodes. Multi-region clusters: regional cluster with nodes in 3 zones for HA. Workload Identity: K8s SA annotated with IAM SA email — no service account keys in pods. Cluster autoscaler: adds/removes nodes based on pod resource requests. VPA: recommends container resource requests, auto-applies in Auto mode. HPA: scales replicas based on CPU/memory or custom metrics. Priority classes: critical system pods preempt batch work. GKE Gateway Controller: multi-cluster, multi-tenant ingress with traffic splitting and canary.

### Cloud Build CI/CD (Detailed)
Workers: standard (1-32 CPU, 4-128 GB) or custom machine types. Triggers: push to branch, new PR, tag creation, schedule (cron). Kaniko cache: build images in GCR/AR without Docker daemon, layer caching for speed. Cloud Deploy: delivery pipeline with targets (dev -> staging -> prod), approval gates, canary/blue-green rollout strategies via Skaffold. Artifact Registry: stores container images, Maven/Gradle packages, npm modules, Python packages. Binary Authorization: enforce deployment attestation from specific signers only. Secret Manager: store and manage API keys, passwords, certificates — access controlled via IAM.

### Infrastructure as Code (Detailed)
Terraform: modular configuration with remote state in GCS bucket (state locking via object versioning), provider version pinning, multiple environments via workspaces. Deployment Manager: native GCP IaC with YAML config + Python/Jinja templates, preview mode for dry-run. Config Controller (ACM): fleet-level OPA/Gatekeeper policy enforcement. Config Connector: manage GCP resources (projects, IAM, networks, Cloud SQL) via K8s CRDs — GitOps-friendly. Forseti: security scanner for org policy violations, IAM audit, and compliance checks.

### Cost Management (Detailed)
Budgets: per-project or per-service budgets with alerts at 50%, 80%, 100%, 150% — Pub/Sub notifications for automation. CUD: committed use discounts for 1yr or 3yr on vCPU, memory, GPUs — 20-60% discount. Preemptible/Spot: 60-91% discount, max 24h runtime for spot, preemptible has no max. Labels: mandatory cost-allocation labels propagated to billing export. Billing export to BigQuery: granular hourly cost and usage data for custom reporting. Recommender: idle VM, oversized VM, underutilized disk, and CUD recommendations.

### Monitoring and Observability (Detailed)
Cloud Monitoring: metrics ingestion, custom dashboards with MQL, alerting policies with notification channels (email, SMS, PagerDuty, Slack), uptime checks (HTTP/ TCP) from global locations. Cloud Logging: structured JSON logging, log-based metrics (count, distribution, boolean), log buckets with retention (30d to 365d), log exports to BigQuery (analysis) and Pub/Sub (streaming). Cloud Trace: distributed tracing with auto-instrumentation via OpenTelemetry, trace sampling rate configurable. Cloud Profiler: continuous CPU and heap profiling for Go, Java, Python, Node.js — identifies performance bottlenecks with no code changes. Error Reporting: automatic exception grouping and deduplication, real-time alerts.

## Best Practices and Design Patterns

### Compute Pattern Selection
Stateless HTTP services: Cloud Run (simplest, scale-to-zero) or GKE (more control, stateful neighbors). Stateful workloads: GKE with StatefulSets, PVCs, or Cloud SQL managed. Event-driven processing: Cloud Functions for simple triggers, Pub/Sub + Cloud Run for complex pipelines, Eventarc for multi-source routing. Batch/worker: Cloud Run jobs (containerized batch), GKE spot node pools (large-scale), Cloud Tasks (async queues). Data warehouse: BigQuery with slot commitments for predictable cost, BI Engine for latency-sensitive dashboards.

### Networking Patterns
Hub-and-spoke VPC: shared VPC host project centrally manages networks, firewall, NAT, and VPN. Service projects attach to subnets. VPC Service Controls: perimeter around sensitive data (Cloud Storage, BigQuery) prevents exfiltration to non-perimeter resources. Private Google Access: on-prem workloads access GCP APIs via internal IP without public internet. Hybrid networking: Cloud VPN (IPsec) for low-cost, Dedicated Interconnect for high-throughput/low-latency, Partner Interconnect for medium bandwidth.

### Security Patterns
Workload Identity: K8s SA annotated with IAM SA — no service account keys. Binary Authorization: enforce attestation for all container deployments — only signed images deploy to production. Cloud Armor WAF: OWASP top 10 rules, rate limiting per IP, geo-allow/deny lists, pre-configured rules for known attack vectors. VPC Service Controls: create perimeters around Cloud Storage, BigQuery, Cloud SQL — deny access from outside perimeter. IAM Conditions: restrict service account usage to specific IP ranges, resource types, and time windows.

### Resiliency Patterns
Multi-zone GKE: regional cluster with nodes spread across 3 zones within region. Multi-region Cloud SQL: cross-region replica with automated failover for Tier 1 databases. Cloud Storage dual-region: synchronous replication across two regions within continent — 15min RPO. Application load balancing: global HTTP/S LB with failover across backend service groups in different regions. Cloud CDN with origin failover: primary origin + backup origin for static content.

### Migration Patterns
Lift-and-shift: Migrate for Compute Engine (formerly Velostrata) moves VMs with minimal downtime. Container migration: Migrate for Anthos converts VM to container running on GKE. Database migration: Database Migration Service for homogeneous (Cloud SQL to Cloud SQL) and heterogeneous (Oracle to Cloud SQL) migrations. Storage migration: Storage Transfer Service for large-scale data movement from on-prem or other clouds. Data warehouse migration: BigQuery Data Transfer Service, ALZ for warehouse schema conversion.

## Deployment Guides

### GKE Cluster Deployment Steps
1. Create VPC with secondary CIDR ranges for pods and services
2. Create Cloud Router and Cloud NAT for private cluster egress
3. Create GKE cluster (Autopilot or Standard) with Workload Identity enabled
4. Configure node pools: system pool (critical addons), user pool (workloads), spot pool (batch/fault-tolerant)
5. Enable Workload Identity: annotate K8s SA with IAM SA email
6. Configure cluster autoscaler, VPA, and HPA
7. Enable Managed Prometheus for cluster monitoring
8. Configure GKE Gateway Controller for ingress

### Cloud Run Deployment Steps
1. Build container image with Cloud Build (kaniko cache for speed)
2. Push to Artifact Registry in same region as Cloud Run service
3. Deploy with gcloud: set max-instances (cost control), min-instances (cold-start), concurrency, CPU, memory, VPC connector, service account
4. Configure Cloud Scheduler + Cloud Tasks for async job scheduling
5. Set up Eventarc triggers for event-driven invocation
6. Enable Cloud Run for Anthos for hybrid deployment on GKE
7. Configure revision traffic splitting for canary deployments

### Cloud SQL High Availability Setup
1. Enable high availability: create primary in one zone, standby in another zone within same region
2. Configure automated backups: daily backup window during low traffic, retention based on compliance
3. Enable point-in-time recovery: transaction log retention for second-level restore granularity
4. Set up cross-region read replica for read scaling and DR failover target
5. Configure maintenance window: weekly maintenance during off-peak hours
6. Use Cloud SQL Proxy or private IP for secure connections from Cloud Run and GKE
7. Enable deletion protection to prevent accidental instance deletion

### Cloud Storage Best Practices
1. Object lifecycle management: transition to Nearline at 30d, Coldline at 90d, Archive at 365d
2. Object versioning: retain previous versions for data protection, expire noncurrent after N days
3. Retention policies: WORM compliance via retention policies and bucket locks for regulated data
4. Signed URLs: time-limited URLs for temporary object access without IAM, expire after 1-60 minutes
5. CORS configuration: allow cross-origin requests from your web application domain only
6. Pub/Sub notifications: notify downstream systems on object create/delete in storage bucket
7. Requester pays: shift egress costs to requestors for shared datasets

### Cloud Build CI/CD Pipeline Steps
1. Set up Cloud Build trigger: push to main branch builds and deploys to dev environment
2. Add Kaniko cache: store layer cache in Artifact Registry for faster builds
3. Configure Cloud Build workers: use private pool for VPC access, e2-highcpu-8 for build performance
4. Add Cloud Deploy delivery pipeline: dev -> staging (auto) -> prod (manual approval gate)
5. Integrate Skaffold: local development builds to Cloud Run, continuous deployment via Cloud Deploy
6. Set up Binary Authorization attestation: only images signed by CI can deploy to prod
7. Configure Secret Manager: database passwords, API keys mounted as environment variables

## Rules
1. Workload Identity over service account keys for GKE <-> GCP auth.
2. Cloud Run for stateless services, GKE for stateful workloads.
3. Cloud Armor WAF policies for internet-facing LBs.
4. VPC Service Controls for sensitive data perimeters.
5. Cloud Build + Cloud Deploy for CI/CD with Skaffold.
6. Artifact Registry over Container Registry (new standard).
7. Resource labels for cost allocation and organization.
8. Cloud Audit Logs enabled for all services.
9. IAM least privilege — custom roles over predefined where possible.
10. Budget alerts configured before any production deployment.
11. Shared VPC over peering for multi-project networking.
12. Preemptible/Spot for stateless batch and worker workloads.
13. Cloud NAT for private cluster egress — never assign public IPs to nodes.
14. Managed Prometheus for GKE monitoring — unmanaged Prometheus creates admin burden.
15. VPC-native clusters for pod IP addressability via secondary ranges.
16. Regional clusters over zonal for workload HA.
17. Secret Manager for secrets — never in configmaps or env vars.
18. Cloud Deploy for progressive delivery — never direct kubectl to production.

## References
- [GCP GKE](./references/gcp-gke.md) — GKE setup, Workload Identity, networking, Autopilot, monitoring
- [GCP Serverless](./references/gcp-serverless.md) — Cloud Run, Cloud Functions, Eventarc, Cloud Tasks, cost management
- [GCP Compute](./references/gcp-compute.md) — GCE, GKE Autopilot, Cloud Run, Cloud Functions, App Engine, Batch
- [GCP Data & AI](./references/gcp-data-ai.md) — BigQuery, Dataflow, Pub/Sub, Vertex AI, Cloud Storage, Dataproc

## Handoff
Hand off to GCP for Google Cloud-specific provisioning or CI/CD. Hand off to terraform for multi-cloud IaC. Hand off to kubernetes-patterns for workload manifests on GKE.
