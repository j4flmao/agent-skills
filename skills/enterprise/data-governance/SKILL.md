---
name: enterprise-data-governance
description: >
  Use this skill when implementing data governance frameworks: classification, cataloging, lineage, quality, and retention.
  This skill enforces: data classification, schema registry, lineage tracking, quality monitoring.
  Do NOT use for: database administration, ETL implementation, data pipeline engineering.
version: "1.1.0"
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
{domain} -> {dataset} -> {schema} -> {ownership}

### Lineage: {source} -> {transform} -> {consume}

### Quality Metrics
{metric} | {target} | {current} | {owner}

### Retention Schedule
{data class} | {retention period} | {purge method}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output -- why use many token when few do trick.

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
Define classification levels: Public (no harm if exposed), Internal (internal use only), Confidential (business sensitive), Restricted (PII, PHI, PCI, credentials). Mark each data field with classification. Apply controls per level: Restricted requires encryption at rest, access logging, quarterly access review. Automate classification detection: scan for PII patterns (SSN, credit card, email, phone). Use data discovery tools to tag fields automatically. Maintain a classification register.

### Step 2: Data Cataloging
Deploy schema registry (Schema Registry, Atlan, DataHub). Define business glossary with standard terms. Assign data ownership (business owner, technical steward, data custodian). Document data contracts between producer and consumer. Catalog should include: dataset name, description, owner, classification, schema, lineage, quality metrics, retention policy.

### Step 3: Data Lineage
Map data flow from source -> transformation -> consumption. Capture at column level for critical data. Enable impact analysis for schema changes. Track upstream dependencies before migrations. Document transformation logic per pipeline step. Automate lineage capture using dbt docs, Airflow integration, or custom instrumentation. Maintain lineage artifact per environment.

### Step 4: Data Quality Monitoring
Define quality dimensions: completeness (no nulls required), accuracy (matches source of truth), timeliness (within SLA), consistency (same value across systems), uniqueness (no duplicates), validity (conforms to format). Set targets per dataset. Monitor with automated pipelines (Great Expectations, dbt tests, custom checks). Report quality scorecards. Alert on SLA breaches.

### Step 5: Data Retention and Purge
Define retention schedules per classification (PII: 6 years, logs: 90 days, business records: 7 years). Implement automated purge pipeline. Legal hold overrides retention. Verify purge completeness with reconciliation. Dry-run mode before execution. Maintain audit trail of all purge operations. Schedule quarterly retention review.

## Architecture / Decision Trees

### Governance Implementation Models

| Model | Description | Best For |
|---|---|---|
| Centralized | Single governance team owns all policies | Small-medium orgs, strict compliance |
| Federated | Each domain owns governance with central standards | Large orgs, domain expertise |
| Hybrid | Central framework + domain execution | Enterprises, regulated industries |

### Data Catalog Tool Decision Tree

| Tool | Type | Strengths | Weaknesses |
|---|---|---|---|
| DataHub | Open source | Lineage, ML models, active development | Requires infrastructure |
| Atlan | SaaS | User-friendly, collaboration, automated | Cost at scale |
| Collibra | Enterprise | Comprehensive, workflow, compliance | High cost, complex |
| Apache Atlas | Open source | Hadoop-native, lineage, classification | Complex setup, limited UI |
| Alation | Enterprise | ML-powered, query log analysis | Cost, closed source |

### Classification Level Access Controls

| Level | Encryption | Access Control | Audit | Retention |
|---|---|---|---|---|
| Public | None | None | None | Optional |
| Internal | At rest (default) | Auth required | Error events | 90 days |
| Confidential | At rest + transit | Role-based | All access logged | 3 years |
| Restricted | At rest + transit + field-level | Explicit approval per use | Immutable audit trail | Per regulation |

### Quality Dimension Priority

| Priority | Dimension | Why |
|---|---|---|
| 1 | Completeness | Missing data breaks downstream processes |
| 2 | Accuracy | Wrong data is worse than no data |
| 3 | Timeliness | Stale data leads to wrong decisions |
| 4 | Consistency | Conflicting data erodes trust |
| 5 | Uniqueness | Duplicate records cause incorrect aggregates |
| 6 | Validity | Format errors break ETL and analytics |

## Common Pitfalls

### Pitfall 1: Governance Without Automation
Manual governance processes don't scale. Classification by hand, manual quality checks, and manual lineage capture fail as data volume grows. Automate classification scanning. Use dbt for lineage capture. Schedule quality monitoring. Automate retention purge.

### Pitfall 2: Over-Classification
Classifying everything as Restricted renders classification meaningless. Reserve Restricted for actual sensitive data (PII, PHI, PCI, secrets). Default to Internal. Use data discovery to identify sensitive data. Periodically review classification assignments.

### Pitfall 3: Neglecting Data Ownership
Without clear data ownership, no one is accountable for quality, classification, or retention. Assign business owner (who defines what data means), technical steward (who implements pipelines), and data custodian (who manages storage) per dataset.

### Pitfall 4: Quality Monitoring Without SLAs
Quality checks without targets are noise. Set specific SLAs: completeness > 99.9%, timeliness < 15min from source, accuracy matches source of truth > 99.99%. Track SLA adherence in dashboards. Escalate breaches to data owners.

### Pitfall 5: Retention Without Purge Automation
Defining retention policies without automated purge is just documentation. Data accumulates beyond retention. Implement automated purge pipelines. Dry-run mode for first month. Verify purge completeness. Maintain audit trail.

### Pitfall 6: Ignoring Data Contracts
Without data contracts, producers change schemas and break consumers. Define contracts between producer and consumer: schema, freshness SLA, row count bounds. Validate contracts in CI. Notify consumers of pending changes.

### Pitfall 7: Lineage Only for Critical Paths
Trying to capture lineage for every dataset is overwhelming. Start with critical data domains (financial reports, customer data, compliance metrics). Expand incrementally. Use automated lineage capture where possible. Document manually where automation is not feasible.

## Best Practices

### Classification Implementation
- Automate PII detection with regex and ML pattern matching
- Tag sensitive fields at the column level in schema registry
- Apply classification labels in data catalog
- Review classification assignment quarterly
- Default to Internal, escalate to Restricted only when necessary
- Mask Restricted data in non-production environments

### Data Catalog Management
- Populate catalog from IaC and schema registry
- Maintain business glossary with standard terms
- Link datasets to business processes
- Track data ownership with RACI matrix
- Catalog versions for schema evolution history
- Enable self-service discovery for business users

### Quality Monitoring
- Define SLAs per dataset based on criticality
- Automate quality checks in CI/CD
- Schedule daily quality monitoring for critical datasets
- Weekly quality scorecard for each domain
- Monthly governance review with quality trends
- Alert data owners on SLA breaches

### Retention Automation
- Per-classification retention schedules in IaC
- Dry-run mode before purge execution
- Legal hold mechanism overrides retention
- Purge verification with reconciliation count
- Immutable audit trail of all purge operations
- Quarterly retention policy review

## Compared With

### Data Governance vs Data Management
Data Governance: policies, standards, controls, and ownership for data assets (WHO should do WHAT with data). Data Management: technical implementation of storing, processing, and moving data (HOW data is stored/processed). Governance sets the rules; management executes them. Both are needed for effective data programs.

### Data Governance vs Data Quality
Data Governance is the framework of policies, roles, and standards. Data Quality is a specific activity within governance measuring completeness, accuracy, timeliness. Governance enables quality; quality validates governance.

### Data Governance vs Master Data Management (MDM)
Data Governance: policies for all data in the enterprise. MDM: specialized practice for master data entities (customer, product, employee). MDM operates within the governance framework. MDM requires stronger governance for golden record management.

## Operations & Maintenance

### Governance Review Cadence
- Daily: automated quality monitoring, compliance scanning
- Weekly: data steward review of quality alerts and exceptions
- Monthly: quality scorecards, retention compliance report
- Quarterly: classification review, ownership review, policy updates
- Annually: full governance framework audit

### Data Owner Responsibilities
- Define data meaning and business rules
- Approve classification and retention
- Respond to quality SLA breaches
- Review access requests for sensitive data
- Maintain data documentation
- Participate in quarterly governance review

### Incident Response for Data Quality
1. Detect: automated monitoring triggers alert
2. Assess: determine impact and affected consumers
3. Contain: stop propagation of bad data
4. Investigate: root cause analysis
5. Remediate: fix source, recalculate derived data
6. Verify: validate data is correct post-fix
7. Document: incident report and preventive measures

### Compliance Audit Preparation
1. Maintain data classification register
2. Document retention schedules and purge logs
3. Keep lineage documentation for critical data
4. Record data quality SLAs and breach history
5. Maintain access review logs
6. Document data ownership assignments
7. Store governance policy versions

## Rules
- All data must have an assigned classification level
- PII detection must be automated in CI/CD pipelines
- Schema changes must pass through registry with backward compatibility check
- Data lineage must be updated when pipelines change
- Quality dashboards visible to data owners and stewards
- Retention purge must have dry-run mode before execution
- Legal hold must be irrevocable until manually removed
- Data contracts enforced between producer and consumer services
- Classification default is Internal, never unclassified
- Quality SLAs must have specific measurable targets
- Automated scanning for sensitive data must run weekly
- Access reviews for Restricted data conducted quarterly
- Retention schedules reviewed and updated annually
- All purge operations logged with immutable audit trail

## References
- references/data-governance-fundamentals.md -- Data Governance Fundamentals
- references/data-governance-advanced.md -- Data Governance Advanced Topics
- references/data-classification.md -- Data Classification Framework
- references/data-lineage.md -- Data Lineage Tracking
- references/data-policies.md -- Data Policies Framework
- references/data-governance-framework.md -- Data Governance Framework
- references/data-governance-framework-implementation.md -- Governance Framework Implementation
- references/data-governance-tools.md -- Data Governance Tools

## Handoff
For compliance requirements on data handling, hand off to `enterprise-compliance-audit`. For multi-tenant data isolation, hand off to `enterprise-multi-tenant`.
