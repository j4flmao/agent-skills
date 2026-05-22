# Data Mesh Principles

## The Four Principles

### 1. Domain Ownership

Each business domain owns its data end-to-end — ingestion, transformation, serving, quality.

| Domain | Data Products Owned | Pipeline Ownership |
|---|---|---|
| **Commerce** | orders, products, carts, returns | Commerce engineering team |
| **Finance** | revenue, invoices, payments, budgets | Finance engineering team |
| **Marketing** | campaigns, leads, attribution, segments | Marketing engineering team |
| **Customer** | profiles, 360, interactions, churn | Customer platform team |

No centralized data team builds pipelines for domains. Platform team provides tools, domains build data products.

### 2. Data as a Product

Every dataset is a product with: schema, documentation, SLA, ownership, versioning, discoverability.

**Data product anatomy:**

```
┌─────────────────────────────────────┐
│         Data Product                 │
│  ┌──────────┐    ┌───────────────┐  │
│  │ Input    │    │ Output        │  │
│  │ Ports    │───▶│ Ports         │  │
│  │          │    │               │  │
│  │ - JDBC   │    │ - Tables      │  │
│  │ - Kafka  │    │ - API         │  │
│  │ - S3     │    │ - Stream      │  │
│  └──────────┘    │ - Catalog     │  │
│                   └───────────────┘  │
│  Metadata: schema, version, owner,   │
│  SLA, quality, lineage, docs         │
└─────────────────────────────────────┘
```

**Product thinking applied to data:** treat data like any product — understand users, measure adoption, gather feedback, invest in quality, version and deprecate responsibly.

### 3. Self-Serve Data Platform

Platform provides infrastructure, domains self-serve:

| Platform Service | Domain Consumes As |
|---|---|
| Compute (Spark, Trino) | Namespace with quota |
| Storage (S3, Iceberg) | Buckets with lifecycle |
| Catalog (DataHub) | Registration API |
| Schema Registry | Subject CRUD API |
| Orchestration (Airflow) | Managed DAG execution |
| Monitoring | Dashboard + alerts |
| Data product API | GraphQL endpoint |

### 4. Federated Governance

```
Global Policies (Governance Council)
├── Schema compatibility standard: BACKWARD
├── PII classification: 3-tier
├── Retention minimum: 90 days
├── Data product template
└── Access control framework: RBAC

Domain Policies (Domain Teams)
├── Column naming conventions
├── Data refresh schedules
├── Specific quality thresholds
├── SLA targets within tier
└── Domain-specific semantic types
```

## Domain Decomposition

### Bottom-up Domain Discovery

```
1. List all business capabilities
2. Group capabilities by business function
3. Identify data produced by each group
4. Verify: each domain's data produced and consumed independently
5. Check: Conway's Law — team structure matches domain boundaries
6. Validate: domain can own data without cross-domain dependencies
```

### Domain Boundary Rules

| Valid Boundary | Invalid Boundary |
|---|---|
| Domain maps to business capability | Domain maps to technology (e.g., "Spark domain") |
| Domain owns data lifecycle | Domain shares data ownership |
| Domain can operate independently | Domain requires another domain to function |
| Domain has clear producer/consumer | Domain produces data it never uses |
| Domain team size 5-9 engineers | Single-person domain |

## Data Product Blueprint

```yaml
blueprint:
  id: "dp-{domain}-{name}-v{major}"
  required_fields:
    - name
    - domain
    - version
    - description
    - output_ports (at least 1)
    - schema
    - sla
    - ownership
  optional_fields:
    - input_ports
    - tags
    - documentation_url
    - quality_checks
    - deprecation_date
  validation:
    - output_ports not empty
    - schema has at least 1 column
    - ownership has producer team and contact
    - sla has freshness target
```
