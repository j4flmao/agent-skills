# Data Governance Fundamentals

## Overview
Data governance defines who can do what with which data, under what conditions. This covers data classification, cataloging, lineage, quality monitoring, and retention — the pillars of any governance program.

## Core Concepts

### Data Classification Levels
| Level | Definition | Examples | Controls |
|-------|------------|----------|----------|
| Public | No harm if exposed | Marketing content, product names | None |
| Internal | Internal use only | Employee directories, org charts | Auth required, error event audit |
| Confidential | Business sensitive | Financial results, business plans | Encryption at rest + transit, role-based access, all access logged |
| Restricted | Regulated/PII | SSN, credit cards, PHI, credentials | Field-level encryption, explicit approval, immutable audit trail |

Default classification: Internal. Escalate to Restricted only when automated PII detection confirms sensitive data. Over-classification renders classification meaningless.

### Data Catalog
A data catalog is the central inventory of data assets. Every dataset should have: name, description, owner, classification, schema, lineage, quality metrics, retention policy. Maintain schema registry with business glossary.

Data catalog components: schema registry (technical schema), business glossary (business terms), data ownership (who is responsible), lineage (source -> transform -> consume), quality metrics (completeness, accuracy, timeliness).

### Data Ownership Model
| Role | Responsibilities |
|------|-----------------|
| Business Owner | Defines data meaning, approves classification and retention, responds to quality breaches |
| Technical Steward | Implements pipelines, maintains schema, manages technical quality |
| Data Custodian | Manages storage, backup, access controls, retention enforcement |

RACI per dataset: Business Owner is Accountable. Technical Steward is Responsible. Data Custodian is Consulted. Consumers are Informed.

### Data Lineage
Map data flow from source through transformations to consumption. Capture at column level for critical data domains. Enable impact analysis: "Which reports break if this column changes?" 

Lineage should include: source system, transformation steps (with logic), intermediate storage, consuming systems, and reports/dashboards. Automate lineage capture using dbt docs, Airflow integration, or custom instrumentation.

### Data Quality Dimensions
| Dimension | Definition | Example Metric |
|-----------|------------|----------------|
| Completeness | No nulls required | % of records with all required fields |
| Accuracy | Matches source of truth | % of records matching verified reference |
| Timeliness | Within SLA from source | % of records delivered within freshness SLA |
| Consistency | Same value across systems | % of records with matching values across systems |
| Uniqueness | No duplicates | % of records with unique identifiers |
| Validity | Conforms to format | % of records passing format validation |

## Governance Operating Model

| Model | Decision Authority | Best For |
|-------|-------------------|----------|
| Centralized | Single governance team | Small-medium, strict compliance |
| Federated | Domain teams with central standards | Large orgs with domain expertise |
| Hybrid | Central framework + domain execution | Regulated enterprises |

Recommended: Start centralized for consistency. Transition to hybrid as the organization scales. Federated only when domains have mature governance capabilities.

## Data Retention and Purge

### Retention Schedules
| Data Class | Retention | Purge Method |
|------------|-----------|--------------|
| PII | 6 years (GDPR) | Soft delete -> hard delete after 30 days |
| Application logs | 90 days | Delete |
| Financial records | 7 years (SOX) | Archive to cold storage |
| Business records | Varies (3-7 years) | Archive then delete |
| Analytics aggregates | 2 years | Delete |
| Session data | 30 days | Delete |

### Purge Automation
Retention without automated purge is just documentation. Implement automated purge pipelines with: dry-run mode (first month), row count reconciliation, audit trail of all purge operations, legal hold override mechanism.

## Common Pitfalls

### Governance Without Automation
Manual classification, manual quality checks, and manual lineage capture fail as data grows. Automate classification scanning, use dbt for lineage, schedule quality monitoring, automate retention purge.

### Over-Classification
Classifying everything as Restricted renders classification meaningless. Reserve Restricted for actual sensitive data. Default to Internal. Use data discovery to identify sensitive data automatically.

### Neglecting Data Ownership
Without clear ownership, no one is accountable for quality, classification, or retention. Assign business owner, technical steward, and data custodian per dataset. Review ownership quarterly.

## Key Points
- Classification levels must have corresponding access controls and retention policies
- Default to Internal, escalate to Restricted only when PII/PHI/PCI is detected
- Data catalog is the single source of truth for dataset metadata and ownership
- Data lineage enables impact analysis for schema changes
- Quality monitoring without SLAs is noise — set specific, measurable targets per dataset
- Retention policies must be enforced with automated purge, not just documented
- Data contracts between producers and consumers prevent breaking changes
- Quarterly governance review with classification, ownership, and quality trend review