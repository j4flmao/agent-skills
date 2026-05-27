---
name: devops-azure
description: |
  Trigger: "Azure", "Microsoft Azure", "Azure DevOps", "Azure Kubernetes",
  "AKS", "Azure Functions", "Azure App Service", "Azure Storage", "Azure SQL",
  "ARM template", "Bicep", "Azure CLI", "Azure pipeline"
  Exclusion: Not for generic cloud design — use cloud-agnostic patterns.
version: 1.0.0
author: j4flmao
license: MIT
compatibility:
  cli: true
  core: true
  editor: true
  api: true
tags: [devops, cloud, azure, phase-7]
---

# devops-azure

## Purpose

Provision and operate Azure infrastructure using Bicep, AKS, Azure DevOps
pipelines, and Azure-native networking with security best practices.

## Agent Protocol

### Trigger

Any user message referencing Azure services, AKS, Bicep, ARM templates,
Azure DevOps pipelines, or Azure networking.

### Input Context

Azure service required, region, resource naming convention, cost tier,
compliance requirements, and existing resource group structure.

### Output Artifact

Bicep/ARM templates, Azure DevOps YAML pipeline definitions, AKS cluster
config, and networking architecture.

### Response Format

Bicep/ARM JSON/YAML with inline explanations. Azure CLI commands where
applicable.

No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output — why use many token when few do trick.

### Completion Criteria

Infrastructure deployed via Bicep, AKS cluster operational, pipeline passing,
networking secured with private endpoints and NSG rules.

### Max Response Length

8000 tokens.

## Workflow

### 1. Core Services

AKS — managed Kubernetes with Azure AD integration and Azure CNI networking.
Azure Functions — event-driven serverless with consumption/premium/dedicated
plans. App Service — fully managed web apps with automated scaling and
deployment slots. Azure SQL — managed relational DB with auto-tuning and
geo-replication. Blob Storage — tiered object storage (hot/cool/cold/archive)
with lifecycle management.

### 2. IaC with Bicep

Bicep — domain-specific language compiling to ARM JSON. Modules for reusable
infrastructure (parameterized, published to registries). Deployment Stacks
for managing resource lifecycle as a single unit. Linter and `what-if`
deployment preview for safety.

### 3. Azure DevOps Pipelines

YAML pipelines with multi-stage (build → deploy → smoke test). Variable
groups linked to Key Vault for secrets. Self-hosted agents with required
tooling. Environments with manual validation gates for prod deployments.
Approvals and branch policies gating pipeline execution.

### 4. AKS Operations

Cluster creation via `az aks create` with system/node user node pools.
Azure AD integration for K8s RBAC. Azure CNI for pod networking (VNet
integration). Managed identity for pods (aad-pod-identity or workload
identity). Azure Policy for admission control (Gatekeeper).

### 5. Networking

VNet design with hub-spoke topology. NSG rules for subnet-level traffic
filtering. Azure Firewall for egress filtering. Application Gateway ingress
controller (AGIC) for HTTP/S routing. Private Link for PaaS services
(private IP access). Front Door for global HTTP/S load balancing with WAF.

## Rules

1. Bicep over ARM JSON for all new IaC.
2. Managed identities over service principals for Azure resource auth.
3. Private endpoints for all PaaS services (SQL, Storage, ACR).
4. Azure Policy for compliance enforcement at resource creation.
5. AKS with Azure CNI and Azure AD integration.
6. Cost allocation via resource tags — every resource gets mandatory tags.
7. Deployment slots for zero-downtime App Service deployments.
8. Diagnostic settings enabled on all services for audit and monitoring.

## References
  - references/azure-advanced.md — Azure Advanced Topics
  - references/azure-aks.md — Azure AKS
  - references/azure-compute.md — Azure Compute
  - references/azure-devops-pipelines.md — Azure DevOps Pipelines
  - references/azure-fundamentals.md — Azure Fundamentals
  - references/azure-iac.md — Azure IaC
  - references/azure-networking.md — Azure Networking
  - references/azure-resource-management.md — Azure Resource Management
## Handoff

Hand off to Azure when provisioning Azure-specific infrastructure or
pipelines. Hand off to terraform for multi-cloud IaC. Hand off to
monitoring for Azure Monitor configuration.
