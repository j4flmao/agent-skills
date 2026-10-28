---
name: high-scale-ecommerce
description: Playbook for building a High-Scale E-Commerce platform.
---

## Purpose
Reference architecture for a high-scale e-commerce platform: edge-rendered programmatic SEO, headless API-first checkout, resilient payment flow, and Kubernetes-based infrastructure.

## Agent Protocol

### Trigger
User phrases: "high-scale ecommerce playbook", "build a scalable store", "headless checkout architecture", "programmatic SEO storefront".

### Input Context
- Product requirements, scale targets, and existing stack.
- Constraints (budget, compliance, team size).

### Output Artifact
Architecture guidance and component choices (no files unless requested).

### Response Format
```
Layer: {storefront | checkout | infra}
Choice: {component + why}
Scale concern: {latency, inventory, peak}
```


# High-Scale E-Commerce Playbook

**AUTHORITATIVE. DENSE. MẠNH.**

## 1. Core Architecture
- **Programmatic SEO**: Edge-rendered, dynamically generated product pages for max indexability.
- **Headless Checkout**: API-first, decoupled payment flow. Sub-second latency.
- **Database Sharding**: Write-heavy order flows distributed across physical shards. Zero single point of failure.

## 2. System Flow

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%
flowchart TD
    SEO[Organic SEO Traffic] --> CDN[Edge CDN / WAF]
    CDN --> LB[Load Balancer]
    LB --> FE[Headless Frontend]
    FE --> CO[Checkout Service API]
    CO --> S1[(DB Shard 1)]
    CO --> S2[(DB Shard 2)]
    CO --> S3[(DB Shard 3)]
```

## 3. Infrastructure (Kubernetes)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-service
spec:
  replicas: 20
  selector:
    matchLabels:
      app: checkout
  template:
    metadata:
      labels:
        app: checkout
    spec:
      containers:
      - name: checkout-app
        image: registry/checkout:latest
        resources:
          limits:
            cpu: "4"
            memory: "8Gi"
        env:
        - name: SHARDING_STRATEGY
          value: "REGION_BASED"
```
