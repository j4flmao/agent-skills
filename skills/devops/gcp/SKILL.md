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

Provision and operate Google Cloud infrastructure using GKE, Cloud Run,
Cloud Functions, Terraform, and GCP-native networking.

## Agent Protocol

### Trigger

Any user message referencing GCP services, GKE, Cloud Run, Cloud Functions,
gcloud CLI, Cloud Build, or Terraform with GCP provider.

### Input Context

GCP service required, region/zone, organization/folder/project hierarchy,
compliance requirements, and budget constraints.

### Output Artifact

Terraform/Deployment Manager configs, gcloud CLI commands, GKE cluster
config, Cloud Run service definitions, networking architecture.

### Response Format

Terraform/gcloud CLI commands with explanations. YAML configs for GKE and
Cloud Run.

No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output — why use many token when few do trick.

### Completion Criteria

GKE cluster running, Cloud Run service deployed, networking secured,
CI/CD pipeline passing, monitoring configured.

### Max Response Length

8000 tokens.

## Workflow

### 1. Core Services

GKE — managed Kubernetes with Autopilot or Standard mode. Cloud Run —
serverless containers scaling to zero (pay-per-request). Cloud Functions —
FaaS with event-driven triggers (HTTP, Pub/Sub, Storage, Firestore). Cloud
SQL — managed MySQL/PostgreSQL/SQL Server. Cloud Storage — unified object
storage with Nearline/Coldline/Archive tiers.

### 2. IaC

Terraform with GCP provider — modular, state-backed to Cloud Storage bucket.
Deployment Manager — native GCP IaC (YAML + Python/Jinja templates). Config
Connector — manage GCP resources via K8s CRDs. Forseti — security scanner
for GCP org policies, IAM, and compliance.

### 3. GKE Operations

Autopilot (serverless K8s — no node management) vs Standard (full control).
Multi-zone clusters for HA. Workload Identity — K8s SA ↔ GCP IAM binding
(no service account keys). Artifact Registry for container images.
GKE Gateway controller (replaces Ingress) for advanced traffic routing.

### 4. Serverless

Cloud Run — container-based, max instances for cost control, concurrency
settings, min instances for cold-start reduction. Cloud Run jobs for batch
processing. Eventarc for event-driven routing to Cloud Run/Functions.
Cloud Tasks for async task queuing with retries and rate limiting.

### 5. Networking

VPC design with Shared VPC for multi-project. Cloud NAT for outbound-only
egress. Cloud Load Balancing — global HTTP/S LB with anycast IP. Cloud CDN
for content caching. Cloud Armor for WAF + DDoS protection. VPC Service
Controls for data exfiltration prevention via perimeters.

## Rules

1. Workload Identity over service account keys for GKE ↔ GCP auth.
2. Cloud Run for stateless services, GKE for stateful workloads.
3. Cloud Armor WAF policies for internet-facing LBs.
4. VPC Service Controls for sensitive data perimeters.
5. Cloud Build + Cloud Deploy for CI/CD with Skaffold.
6. Artifact Registry over Container Registry (new standard).
7. Resource labels for cost allocation and organization.
8. Cloud Audit Logs enabled for all services.

## References

- [GCP GKE](./references/gcp-gke.md) — GKE setup, Workload Identity,
  networking, Autopilot, monitoring
- [GCP Serverless](./references/gcp-serverless.md) — Cloud Run, Cloud
  Functions, Eventarc, Cloud Tasks, cost management

## Handoff

Hand off to GCP for Google Cloud-specific provisioning or CI/CD.
Hand off to terraform for multi-cloud IaC. Hand off to
kubernetes-patterns for workload manifests on GKE.
