---
name: enterprise-data-governance
description: >
  Use this skill when implementing data governance frameworks: classification, cataloging, lineage, quality, and retention.
  This skill enforces: data classification, schema registry, lineage tracking, quality monitoring.
  Do NOT use for: database administration, ETL implementation, data pipeline engineering.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [enterprise, data, governance, phase-8]
---

# Data Governance Agent

## Purpose
Implements data governance across classification, cataloging, lineage, quality, and retention.

## Agent Protocol

### Trigger
Exact user phrases: data governance, data quality, data catalog, data lineage, data classification, PII, data retention, data ownership, master data, data stewardship, data dictionary, business glossary, data policy.

### Input Context
- What data classifications are needed (public/internal/confidential/restricted)?
- Is there an existing schema registry or data catalog?
- What PII/PHI/PCI data is stored and where?
- What are the regulatory retention requirements?

### Output Artifact
Data governance framework document with classification scheme, catalog structure, lineage model, and retention schedules.

### Response Format
```
## Data Governance Framework
### Classification Levels
{level} | {definition} | {examples} | {controls}

### Data Catalog Structure
{domain} → {dataset} → {schema} → {ownership}

### Lineage: {source} → {transform} → {consume}

### Quality Metrics
{metric} | {target} | {current} | {owner}

### Retention Schedule
{data class} | {retention period} | {purge method}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Data classification scheme defined with all levels
- [ ] Data catalog populated with schema registry
- [ ] Data lineage mapped for critical data domains
- [ ] Quality metrics defined with targets and owners
- [ ] Retention schedules enforced with automated purge
- [ ] Legal hold mechanism implemented
- [ ] Data ownership assigned per dataset
- [ ] Quarterly governance review scheduled

### Max Response Length
7000 tokens

## Workflow

### Step 1: Data Classification
Define classification levels: Public (no harm if exposed), Internal (internal use only), Confidential (business sensitive), Restricted (PII, PHI, PCI, credentials). Mark each data field with classification. Apply controls per level: Restricted requires encryption at rest, access logging, quarterly access review.

### Step 2: Data Cataloging
Deploy schema registry (Schema Registry, Atlan, DataHub). Define business glossary with standard terms. Assign data ownership (business owner, technical steward, data custodian). Document data contracts between producer and consumer.

### Step 3: Data Lineage
Map data flow from source → transformation → consumption. Capture at column level for critical data. Enable impact analysis for schema changes. Track upstream dependencies before migrations. Document transformation logic per pipeline step.

### Step 4: Data Quality Monitoring
Define quality dimensions: completeness (no nulls required), accuracy (matches source of truth), timeliness (within SLA), consistency (same value across systems). Set targets per dataset. Monitor with automated pipelines. Report quality scorecards.

### Step 5: Data Retention and Purge
Define retention schedules per classification (PII: 6 years, logs: 90 days, business records: 7 years). Implement automated purge pipeline. Legal hold overrides retention. Verify purge completeness with reconciliation.

## Rules
- All data must have an assigned classification level.
- PII detection must be automated in CI/CD pipelines.
- Schema changes must pass through registry with backward compatibility check.
- Data lineage must be updated when pipelines change.
- Quality dashboards visible to data owners and stewards.
- Retention purge must have dry-run mode before execution.
- Legal hold must be irrevocable until manually removed.
- Data contracts enforced between producer and consumer services.

## References
- `references/data-classification.md` — Classification levels and control mapping
- `references/data-lineage.md` — Lineage tracking and impact analysis
- `references/data-policies.md` — Data governance policy templates and compliance mappings
- `references/data-governance-framework.md` — DAMA-DMBOK framework, data stewardship, catalog, quality, ownership models

## Handoff
For compliance requirements on data handling, hand off to `enterprise-compliance-audit`. For multi-tenant data isolation, hand off to `enterprise-multi-tenant`.
