---
name: data-data-mesh
description: >
  Use this skill when asked about data mesh, data product, domain ownership, self-serve data platform, federated governance, data-as-a-product, compute-plane architecture, or data topology. This skill enforces: data mesh four principles (domain ownership, data as product, self-serve platform, federated governance), data product definition with input/output ports, domain decomposition, cross-domain data sharing, and platform capability mapping. Do NOT use for: centralized data warehouse design, monolithic data platform architecture, or ETL pipeline implementation within a single domain.
version: "1.0.0"
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

### Step 4: Cross-Domain Sharing

```
Commerce Domain
  └── Output: orders data product
       ├── Published to catalog (DataHub)
       ├── Schema: AVRO, compatibility BACKWARD
       ├── SLA: 15min freshness, 99.9% availability
       └── Access: Commerce team grants read to Finance
            ↓
Finance Domain
  └── Input: reads orders data product via API
  └── Output: revenue data product (joins orders + invoices)
```

Cross-domain sharing rules: consumer discovers data product via catalog. Producer grants access via ACL. Consumer agrees to contract terms. Producer notifies consumers of changes. All cross-domain data is read-only to consumers.

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

#### Governance Policy JSON

```json
{
  "schema_compatibility": {
    "global": { "mode": "BACKWARD", "enforced": true },
    "domain_overrides": {
      "marketing": { "mode": "FORWARD", "justification": "Rapid iteration on campaign schemas" }
    }
  },
  "pii_classification": {
    "tiers": [
      { "level": "public", "storage": "unrestricted" },
      { "level": "internal", "storage": "encrypted-at-rest" },
      { "level": "restricted", "storage": "encrypted-at-rest-and-transit" },
      { "level": "critical", "storage": "encrypted, access-audited, mask-on-read" }
    ],
    "default_tier": "internal",
    "auto_tag_rules": [
      { "pattern": ".*email.*", "tier": "restricted", "columns": true },
      { "pattern": ".*ssn.*", "tier": "critical", "columns": true },
      { "pattern": ".*amount.*", "tier": "internal", "columns": true }
    ]
  },
  "retention": {
    "global_min_days": 90,
    "global_max_days": 2555,
    "overrides": {
      "logs": { "max_days": 180 },
      "transactions": { "min_days": 365, "max_days": 2555 }
    }
  },
  "access_control": {
    "framework": "RBAC",
    "roles": ["producer", "consumer", "steward", "admin"],
    "cross_domain": {
      "default": "deny",
      "request_workflow": "catalog-based",
      "auto_approve_patterns": [
        { "producer": "commerce", "consumer": "finance", "product": "orders" }
      ]
    }
  },
  "sla_defaults": {
    "critical": { "freshness_p99": "15m", "availability": 99.99 },
    "high": { "freshness_p99": "1h", "availability": 99.9 },
    "medium": { "freshness_p99": "1d", "availability": 99.0 },
    "low": { "freshness_p99": "7d", "availability": 95.0 }
  },
  "governance_council": {
    "members": ["chief-data-architect", "domain-lead-commerce", "domain-lead-finance",
                "compliance-officer", "platform-lead"],
    "meeting_frequency": "biweekly",
    "escalation_path": "chief-data-officer"
  }
}
```

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

## Rules
- Domains own their data — platform owns infrastructure
- Every data product has at least one output port
- Cross-domain data accessed only via data products (no direct DB access)
- All data products registered in catalog with discoverable metadata
- Global policies define minimum standards, domains extend
- No centralized data lake or warehouse — data stays in domains
- Breaking changes communicated to consumers with 30-day notice

## References
  - references/data-product-template.md — Data Product Template
  - references/domain-decomposition-patterns.md — Domain Decomposition Patterns
  - references/mesh-data-product-implementation.md — Data Product Implementation
  - references/mesh-data-product-lifecycle.md — Data Product Lifecycle
  - references/mesh-federated-governance.md — Federated Governance Operating Model
  - references/mesh-governance-operating-model.md — Mesh Governance Operating Model
  - references/mesh-implementation.md — Data Mesh Implementation
  - references/mesh-principles.md — Data Mesh Principles
## Handoff
`data-data-platform` for platform infrastructure. `data-data-catalog` for discovery. `data-data-contracts` for data product contracts. `data-data-observability` for cross-domain monitoring. `data-data-quality` for quality standards.
