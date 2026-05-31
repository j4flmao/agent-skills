---
name: data-data-mesh
description: >
  Use this skill when asked about data mesh, data product, domain ownership, self-serve data platform, federated governance, data-as-a-product, compute-plane architecture, or data topology. This skill enforces: data mesh four principles (domain ownership, data as product, self-serve platform, federated governance), data product definition with input/output ports, domain decomposition, cross-domain data sharing, and platform capability mapping. Do NOT use for: centralized data warehouse design, monolithic data platform architecture, or ETL pipeline implementation within a single domain.
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, mesh, architecture, phase-11]
---

# Data Data Mesh

## Purpose
Design data mesh architecture with domain-owned data products, self-serve platform capabilities, and federated governance — enabling decentralized data ownership at scale.

## Agent Protocol

### Trigger
Exact user phrases: "data mesh", "data product", "domain ownership", "self-serve data platform", "federated governance", "data as a product", "compute plane", "data topology", "domain decomposition", "cross-domain data sharing".

### Input Context
- Organizational domains and team topology
- Current data platform maturity
- Data sharing patterns and pain points
- Governance and compliance requirements
- Number of data producers and consumers
- Technology stack and cloud providers

### Output Artifact
Data mesh architecture with domain boundaries, data product designs (input/output ports), platform capability map, cross-domain data sharing model, and federated governance framework.

### Response Format
```yaml
# Domain decomposition map
# Data product blueprint (ports, schema, SLA)
# Platform capability matrix
# Cross-domain sharing model
# Governance policies
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Domain decomposition aligned with business capabilities
- [ ] Data product definition with input/output ports, schema, and SLA
- [ ] Self-serve platform capabilities mapped to infrastructure
- [ ] Cross-domain data sharing with discovery and access control
- [ ] Federated governance model with global + local policies
- [ ] Data mesh maturity assessment with improvement roadmap

### Max Response Length
350 lines of configuration.

## Workflow

### Step 1: Decompose by Domain

| Domain | Business Capability | Data Products |
|---|---|---|
| **Commerce** | Order management, product catalog, cart | `orders`, `products`, `carts` |
| **Finance** | Revenue, billing, invoicing | `revenue`, `invoices`, `payments` |
| **Marketing** | Campaigns, attribution, leads | `campaigns`, `attribution`, `leads` |
| **Operations** | Inventory, fulfillment, logistics | `inventory`, `shipments`, `suppliers` |
| **Customer** | Profiles, segmentation, engagement | `customer_360`, `segments`, `interactions` |

Each domain owns all data it produces. No centralized data team owns domain data. Platform team owns infrastructure, not data.

Domain decomposition follows bounded context mapping from domain-driven design. Identify domains by business capability, not by organizational chart. One domain can span multiple teams. One team can own multiple domains only if they are small and related. Avoid splitting a single business capability across domains — this creates cross-domain join hell.

Decision tree for domain boundaries:
- Question: Does this team own the source system? If yes, it produces the data product.
- Question: Does this team understand the data semantics without consulting another team? If yes, it owns the domain.
- Question: Would merging two proposed domains create a team larger than two pizza teams (6-8 people)? If yes, split.
- Question: Is the data lifecycle coupled? If two datasets are always created, updated, and deleted together, keep them in the same domain.

#### Domain Decomposition Example

```yaml
domain_decomposition:
  domain: commerce
  bounded_context: order_fulfillment
  capabilities:
    - name: order_management
      data_produced:
        - entity: orders
          volume: "500K/day"
          source: shop-api
        - entity: order_items
          volume: "1.2M/day"
          source: shop-api
      data_consumed:
        - entity: products
          from: catalog-domain
        - entity: customer_360
          from: customer-domain
    - name: cart_management
      data_produced:
        - entity: carts
          volume: "800K/day"
          source: web-app
      data_consumed:
        - entity: inventory
          from: operations-domain
  domain_team:
    size: 7
    roles: [data-engineer(2), backend(3), analytics(1), product-manager(1)]
    slack: "#domain-commerce"
  maturity_assessment:
    data_product_readiness: 4/5
    documentation_coverage: 60%
    sla_compliance: 99.2%
```

### Step 2: Design Data Products

```yaml
data_product:
  name: orders
  domain: commerce
  version: "2.1.0"
  description: "Order data product — all order transactions and line items"

  input_ports:
    - name: source_postgres
      type: JDBC
      config:
        connection_string: "${POSTGRES_ORDERS_URI}"
        sync_frequency: hourly
    - name: events_topic
      type: KAFKA
      config:
        topic: orders.events
        consumer_group: dp-orders-ingestion

  output_ports:
    - name: analytics_tables
      type: SNOWFLAKE
      config:
        database: PROD_DB
        schema: COMMERCE_ORDERS
      tables:
        - fct_orders
        - dim_order_items
    - name: api
      type: GRAPHQL
      config:
        endpoint: "https://data.orders.internal/v1/graphql"
        authentication: mTLS
    - name: stream
      type: KAFKA
      config:
        topic: data-product.orders.published
        retention_days: 30

  schema:
    format: AVRO
    compatibility: BACKWARD
    registry: "http://schema-registry:8081"

  sla:
    freshness: 15 minutes
    availability: 99.9%
    max_latency_ms: 500

  ownership:
    domain: commerce
    team: orders-engine
    steward: orders-dp@org.com
```

Each data product must have: input ports (how data is ingested), output ports (how data is consumed), schema, SLA, and ownership. Output ports must be discoverable via the catalog.

Data product design patterns:
- Source-aligned: wraps a source system table directly. Simplest, best for exposing canonical data.
- Aggregate: joins multiple source entities into a single product. Use when consumers need a unified view.
- Consumer-aligned: shaped for a specific consumer use case. Most coupled, use sparingly.
- Fit-for-purpose: each data product optimized for its consumption pattern (analytics vs ML vs real-time).

### Step 3: Define Platform Capabilities

| Capability | Tool | Owned By |
|---|---|---|
| **Compute** | Spark on K8s, Trino | Platform team |
| **Storage** | S3, Iceberg tables | Platform team |
| **Orchestration** | Airflow, Dagster | Platform team |
| **Catalog** | DataHub | Platform team |
| **Schema Registry** | Confluent SR | Platform team |
| **Data Product API** | Backstage + GraphQL | Platform team |
| **Infrastructure** | Terraform + Helm | Platform team |
| **Monitoring** | Monte Carlo, Prometheus | Platform team + domain |
| **Governance** | Global policies + domain policies | Governance council |

Platform provides the infrastructure and APIs. Domains use platform to build and operate their data products. Platform team does NOT own any domain's data.

Platform capability classification:
- Storage plane: object storage, table formats, metastore
- Compute plane: batch processing, streaming, query engine, notebook
- Lifecycle plane: orchestration, CI/CD, test environments
- Discovery plane: catalog, schema registry, data product API
- Observability plane: monitoring, logging, alerting, cost tracking
- Governance plane: policy engine, access control, audit logging

Define a clear interface contract between each plane and the domains. The platform team evolves these planes independently. Domains consume planes via APIs, not by accessing infrastructure directly.

### Step 4: Cross-Domain Sharing

Cross-domain sharing rules: consumer discovers data product via catalog. Producer grants access via ACL. Consumer agrees to contract terms. Producer notifies consumers of changes. All cross-domain data is read-only to consumers.

Data sharing topologies:
- Hub-and-spoke: central catalog, point-to-point data access. Most common in early mesh.
- Mesh: fully distributed, every domain discovers and connects to every other. Requires mature catalog.
- Hybrid: global catalog + local caches for latency-sensitive consumers.

Never allow cross-domain direct database access. Only access through data product output ports. This preserves encapsulation.

Cross-domain data access patterns:
- Batch consumers: use output port batch tables (e.g., Snowflake, S3). Scheduled sync, high throughput.
- Real-time consumers: use output port streams (e.g., Kafka). Low latency, event-driven.
- Ad-hoc query consumers: use output port API (e.g., GraphQL). On-demand, query-fined.

Each cross-domain data sharing relationship must have a documented data contract specifying schema, SLA, terms of use, and notification cadence for changes. The catalog serves as the contract registry.

### Step 5: Federated Governance

| Policy | Global (Platform) | Local (Domain) |
|---|---|---|
| **Schema compatibility** | BACKWARD mode required | Extension-specific |
| **PII classification** | Standard categories | Domain-level tagging |
| **Retention** | Min 90 days, max 7 years | Domain-specific |
| **Format** | Iceberg + AVRO | Column naming conv |
| **SLA tiers** | Critical/High/Medium/Low | Thresholds within tier |
| **Access control** | RBAC framework | Domain-managed ACLs |

Global policies set by governance council (data architects + domain leads + compliance). Local policies defined per domain within global constraints.

Governance operating model:
1. Council defines global policies (minimum standards)
2. Domains extend policies within global constraints
3. Platform automatically enforces global policies
4. Domain stewards enforce local policies
5. Quarterly policy review cycle
6. Escalation path for policy conflicts

### Step 6: Enable Discovery

All data products registered in catalog with: `name`, `domain`, `description`, `owner`, `schema`, `output_ports`, `SLA`, `tags`, `quality_score`. Consumers search catalog, view contract, request access. Access request → approved by domain owner → provisioned automatically.

### Step 7: Assess Maturity

| Level | Characteristics |
|---|---|
| **1: Centralized** | Single data team owns all pipelines, data warehouse |
| **2: Domain-aware** | Domain teams own some data, but platform is centralized |
| **3: Data mesh lite** | Domain data products exist, platform self-serve enabled |
| **4: Full mesh** | All domains have data products, federated governance active |
| **5: Optimized mesh** | Automated data product lifecycle, AI-assisted governance |

### Step 8: Data Contracts in the Mesh

Every data product must have a data contract that specifies schema, SLA, semantics, and ownership. The contract is the agreement between the producer domain and the consumer domain. Contracts are versioned, immutable after publication, and enforced automatically. The data contract is registered in the catalog alongside the data product metadata.

### Step 9: Observability for the Mesh

Monitor data product health across all domains: SLA compliance per data product, cross-domain data flow latency, data quality score trends, and catalog search effectiveness. Each domain monitors its own data products. The platform team monitors plane health. The governance council monitors overall mesh health.

## Architecture / Decision Trees

### Platform vs Domain Boundaries

```
New data sharing requirement
  ├── Single domain? → Keep internal, no data product needed
  ├── Cross-domain, read-only? → Consumer-aligned data product
  ├── Cross-domain, write-back? → Source-aligned data product + API
  └── External partner? → Consumer-aligned + Delta Sharing
```

### Data Product Lifecycle State Machine

```
DRAFT → PUBLISHED (catalog visible) → ACTIVE (serving consumers)
  → DEPRECATED (30-day notice) → RETIRED (decommissioned)
```

Each state transition requires governance approval. DRAFT to PUBLISHED requires schema review and SLA definition. DEPRECATED triggers consumer notification. RETIRED removes output ports and archives metadata.

### Cost Attribution Model

| Cost Type | Owner | Allocation Method |
|---|---|---|
| Storage | Platform | Per-domain usage (bytes stored) |
| Compute | Platform | Per-pipeline CPU-hours |
| Platform overhead | Platform | Flat charge per domain |
| Domain pipeline dev | Domain | Self-funded |
| Data product operation | Domain | Self-funded |

## Common Pitfalls

1. **Domain too narrow or too wide**: domain boundaries that don't match business capabilities create unnatural splits. Fix: use event storming to discover bounded contexts.
2. **Platform team as bottleneck**: if the platform team must approve every domain decision, the mesh collapses. Fix: platform provides self-serve APIs, not approval gates.
3. **Data product proliferation without standards**: every domain creates data products with different naming, schema, and SLA formats. Fix: enforce global naming conventions and required metadata fields.
4. **Cross-domain joins via shared infrastructure**: domains sharing a database or table bypass encapsulation. Fix: only allow data product output port access.
5. **No global schema compatibility enforcement**: domains make breaking changes that cascade to consumers. Fix: enforce compatibility checks in CI/CD on data product schema changes.
6. **Treating data mesh as a technology project**: data mesh is primarily organizational. Without domain ownership buy-in, it fails regardless of technology.
7. **Ignoring existing data contracts**: domain data products may duplicate existing centrally-managed datasets. Fix: inventory existing data assets before domain decomposition.
8. **No consumer feedback loop**: data product owners don't know if consumers are satisfied. Fix: quarterly consumer satisfaction survey, data product usage analytics.
9. **Centralized data team resisting decomposition**: existing data team loses control. Fix: retrain central team as platform team, emphasize career growth in platform engineering.
10. **No cost transparency**: domains can't see their platform costs. Fix: implement chargeback/showback with per-domain cost dashboards.
11. **Data product SLA not monitored**: SLA exists in contract but no monitoring. Fix: automate SLA monitoring with alerting on breach.
12. **Platform not truly self-serve**: domain teams still need tickets to provision infrastructure. Fix: every platform capability must have a self-serve API.

## Best Practices

- Start with 2-3 domains. Prove the model before expanding to all domains.
- Data product must have at least one consumer before becoming ACTIVE.
- Global policies enforced by platform automatically (CI/CD gates, schema validation).
- Domain stewards meet biweekly in governance council.
- Data product SLA includes freshness, availability, and quality dimensions.
- Every data product has exactly one owning domain.
- Cross-domain data contracts are versioned and reviewed jointly.
- Platform team runs an internal developer portal (Backstage) for data product lifecycle management.
- Monitor data product consumption metrics: active consumers, query volume, data freshness compliance.
- Run data mesh retrospectives quarterly with domain and platform representatives.
- Deprecation period of at least 30 days for breaking changes.
- Use data product templates with required metadata to enforce consistency.
- Catalog must support both technical metadata (schema, lineage) and business metadata (description, owner, SLA).
- Automate data product provisioning: template → CI/CD → catalog registration → monitoring.
- Chargeback model: domains pay for their compute and storage. Platform overhead shared proportionally.
- Document the data mesh journey: publish decision logs, architecture decisions, and lessons learned.

## Compared With

| Approach | Data Ownership | Governance | Best For |
|---|---|---|---|
| **Data Mesh** | Domain-owned | Federated | Large orgs, many domains, diverse data |
| **Data Warehouse** | Centralized IT | Centralized | BI/reporting, single source of truth |
| **Data Lake** | Centralized platform | Minimal | Data science exploration |
| **Data Lakehouse** | Centralized catalog | Centralized with RBAC | Unified batch + streaming |
| **Data Fabric** | Virtual integration | Automated | Heterogeneous sources, real-time |

Data mesh differs from data lakehouse primarily in ownership: mesh distributes ownership to domains, lakehouse centralizes under a data platform team. They can coexist: use lakehouse as the platform infrastructure, data mesh as the organizational model.

Data mesh vs data fabric: mesh requires domain ownership and organizational change. Fabric provides a virtual integration layer without changing ownership. Mesh is更适合 for organizations willing to reorganize around domains. Fabric is更适合 for organizations that want technical integration without org change.

## Performance

- Data product output port latency: API < 500ms, stream < 10s, batch < 15min.
- Catalog search: index metadata for sub-second search across 10,000+ data products.
- Cross-domain data access: prefer stream/batch over API for bulk consumers to avoid thundering herd.
- Data product API response pagination: mandatory for any output port returning > 1000 records.
- Cache frequent queries: domain can cache cross-domain data locally with max TTL of 24h.
- Platform compute auto-scales on queue depth, not CPU utilization.
- Data product freshness SLA determines compute priority: < 1min → streaming, < 1h → micro-batch, < 1d → batch.
- Catalog API rate limits: 1000 requests/min per domain for discovery, 100 requests/min for metadata updates.
- Platform API gateway caches catalog responses with 30-second TTL.
- Data product API edge caching: use CDN for static data products, cache at API gateway for dynamic ones.

Scalability: data mesh scales with domain count. Each domain operates independently so there is no central bottleneck. The catalog becomes the primary scalability concern — ensure catalog can handle metadata for 10,000+ data products. Platform compute plane auto-scales independently per workload type.

## Tooling

| Tool | Purpose | Integration Point |
|---|---|---|
| **Backstage** | Developer portal, data product lifecycle | Data product API, catalog |
| **DataHub** | Metadata catalog, lineage | Output port registration |
| **Confluent SR** | Schema registry, compatibility | Data product schema |
| **Terraform** | Infrastructure provisioning | Platform capability plane |
| **Dagster/Airflow** | Orchestration | Pipeline scheduling |
| **Monte Carlo/Soda** | Observability, quality | Data product SLA monitoring |
| **OpenPolicyAgent** | Policy engine | Global governance enforcement |
| **GraphQL Federation** | Data product API gateway | Cross-domain data access |
| **dbt** | Data transformation | Within-domain data product implementation |
| **Trino** | Federated query across domains | Cross-domain analytics |
| **Delta Sharing** | Cross-org data sharing | External partner access |

The platform tool stack must expose self-serve APIs. Domains should not need to know the underlying tool — they interact through abstractions (data product API, catalog UI, monitoring dashboard).

## Rules
- Domains own their data — platform owns infrastructure
- Every data product has at least one output port
- Cross-domain data accessed only via data products (no direct DB access)
- All data products registered in catalog with discoverable metadata
- Global policies define minimum standards, domains extend
- No centralized data lake or warehouse — data stays in domains
- Breaking changes communicated to consumers with 30-day notice
- Data products must have at least one consumer before ACTIVE state
- Platform team does not touch domain-owned data
- Data product SLA monitored and reported to governance council quarterly
- Every data product has exactly one owning domain
- All cross-domain data sharing requires a data contract
- Domain stewards attend biweekly governance council
- Platform capabilities exposed as self-serve APIs, not tickets
- Cost allocated per domain with transparent chargeback/showback
- Data products have a documented deprecation policy with consumer notification

## References
  - references/data-product-template.md — Data Product Template
  - references/domain-decomposition-patterns.md — Domain Decomposition Patterns
  - references/mesh-data-product-implementation.md — Data Product Implementation
  - references/mesh-data-product-lifecycle.md — Data Product Lifecycle
  - references/mesh-federated-governance.md — Federated Governance Operating Model
  - references/mesh-governance-operating-model.md — Mesh Governance Operating Model
  - references/mesh-implementation.md — Data Mesh Implementation
  - references/mesh-principles.md — Data Mesh Principles
  - references/data-mesh-federated-governance.md — Data Mesh Federated Governance Deep Dive
  - references/data-mesh-infrastructure-platform.md — Data Mesh Infrastructure Platform
## Handoff
`data-data-platform` for platform infrastructure. `data-data-catalog` for discovery. `data-data-contracts` for data product contracts. `data-data-observability` for cross-domain monitoring. `data-data-quality` for quality standards.
