# Data Contract Architecture

Data contracts formalize what a producer promises to consumers: schema, semantics, quality rules, SLAs, and ownership. This reference covers contract contents, enforcement points, versioning, and tooling. In-pipeline quality gates are in `architecture-patterns.md`.

## Why Contracts

Most data incidents start upstream: a service renames a column, changes units, or starts emitting nulls, and analytics breaks days later. Contracts move these guarantees to the producer and make breaking changes visible before deployment.

## What a Contract Contains

| Section | Content |
|---------|---------|
| Identity | Dataset/topic name, domain, version, owner team, contacts |
| Schema | Fields, types, nullability, keys, enums, units, PII classification |
| Semantics | Business definitions ("`amount` is gross, in minor units, EUR") |
| Quality | Rules: uniqueness, ranges, referential checks, freshness, volume bounds |
| SLA / SLO | Delivery time, availability, latency, support hours |
| Lifecycle | Compatibility policy, deprecation notice period, change process |
| Access | Classification, allowed uses, retention |

## Example (Open Data Contract Standard style YAML)

The Open Data Contract Standard (ODCS, maintained under the Linux Foundation's Bitol project) provides a common YAML format. Field names vary by version; the example shows the typical shape.

```yaml
apiVersion: v3.0.0
kind: DataContract
id: billing-invoices
name: invoices
version: 2.1.0
status: active
domain: billing
team: billing-platform
description:
  purpose: Issued invoices for revenue reporting and collections.
schema:
  - name: invoices
    physicalName: billing.invoices_v2
    properties:
      - name: invoice_id
        logicalType: string
        required: true
        unique: true
        primaryKey: true
      - name: customer_id
        logicalType: string
        required: true
        classification: internal
      - name: amount_minor
        logicalType: integer
        required: true
        description: Gross amount in minor currency units
        quality:
          - rule: mustBeGreaterOrEqualTo
            mustBeGreaterOrEqualTo: 0
      - name: currency
        logicalType: string
        required: true
      - name: issued_at
        logicalType: timestamp
        required: true
slaProperties:
  - property: frequency
    value: 1
    unit: h
  - property: latency
    value: 2
    unit: h
```

Choose one format (ODCS, the Data Contract Specification used by `datacontract-cli`, or an internal schema) and validate contract files themselves in CI.

## Enforcement Points

```
Producer repo (CI) ──► Schema registry / catalog ──► Pipeline runtime ──► Consumer CI
   contract tests        compatibility checks          quality checks        contract-aware tests
```

| Point | Mechanism |
|-------|-----------|
| Producer CI | Generate schema from code or validate code against the contract; fail on breaking changes |
| Event streams | Schema Registry compatibility (BACKWARD/FULL) blocks incompatible schemas at registration |
| Database CDC | Contract on the outbox/event table, not on internal tables |
| Batch tables | dbt model contracts (`contract: {enforced: true}`) enforce column names and types at build time |
| Runtime | Quality rules in the contract compiled into GX/Soda/dbt tests |
| Consumer CI | Tests pinned to the contract version they depend on |

### dbt model contracts

```yaml
models:
  - name: invoices
    config:
      contract: { enforced: true }
    columns:
      - name: invoice_id
        data_type: varchar
        constraints: [{ type: not_null }, { type: primary_key }]
      - name: amount_minor
        data_type: bigint
```

With an enforced contract, `dbt run` fails if the model's SQL output does not match declared names and types. Use model `versions` for breaking changes.

### datacontract-cli

```bash
datacontract lint invoices.odcs.yaml
datacontract test invoices.odcs.yaml          # runs schema and quality checks against the server defined in the contract
datacontract breaking invoices-v1.yaml invoices-v2.yaml
datacontract export --format dbt invoices.odcs.yaml
```

## Versioning and Change Management

| Change | Classification | Process |
|--------|---------------|---------|
| Add optional field | Non-breaking | Minor version |
| Add enum value | Potentially breaking (consumers with exhaustive matching) | Announce; minor or major by policy |
| Rename/remove field, change type or units | Breaking | New major version; run old and new in parallel; deprecation window |
| Tighten nullability | Non-breaking for consumers | Minor |
| Loosen nullability | Breaking for consumers | Major |

- Publish v2 alongside v1 (new topic or table suffix) and give consumers a migration window.
- Track consumers per contract (catalog lineage or registration) so producers know whom a change affects.

## Organizational Model

- Producer team owns the contract and its SLA; platform team provides tooling and templates.
- Contracts live in the producer's repository, reviewed with code changes that affect them.
- Consumers propose changes through PRs or issues against the contract.
- Start with the highest-impact interfaces (revenue, regulatory, ML features), not every table.

## Contract Violations at Runtime

| Severity | Response |
|----------|----------|
| Schema violation | Reject at registry or quarantine at ingest; page producer on-call |
| Quality rule breach | Quarantine rows or block publish per rule severity |
| SLA breach (late data) | Notify consumers; mark downstream assets stale |

Record violations as metrics per contract to report producer reliability.

## Pitfalls

- Contracts written once as documentation and never enforced.
- Contracts on internal OLTP tables instead of stable published interfaces.
- No consumer registry, so breaking changes cannot be assessed.
- Overly strict quality rules that fail on normal business variation.

## Checklist

- [ ] Contract format chosen and validated in CI
- [ ] Contracts owned by producers, stored with producer code
- [ ] Breaking-change detection in producer CI and schema registry
- [ ] Runtime checks generated from contract rules
- [ ] Versioning policy with deprecation windows
- [ ] Consumers registered per contract
