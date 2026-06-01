# Data Governance Advanced Topics

## Introduction
Advanced data governance covers automated policy enforcement, data mesh governance, data contracts, privacy engineering, ML data governance, and governance-as-code.

## Automated Policy Enforcement

### Policy-as-Code for Data
Define data policies in code and enforce them programmatically. Examples: "All S3 buckets containing PII must have encryption enabled", "All databases must have automated backups", "All datasets must have an assigned owner."

Enforcement points: data platform API gateway, ETL pipeline CI/CD, data catalog registration, query engine (Trino/Athena query rewrite for access control).

### Automated Classification Pipelines
Scan new data sources on ingestion. Run PII detection across sample records. Automatically tag columns with classification level. Notify data owners of classification assignments. Escalate unclassifiable data to governance team.

### Compliance Scanning
Schedule automated scans: data classification compliance (% of datasets classified), retention compliance (% of datasets with purge automation), access control compliance (Restricted data access reviewed), quality SLA compliance (datasets meeting SLAs).

## Data Mesh Governance

### Federated Ownership
Data mesh distributes data ownership to domain teams. Each domain owns its data products. Central governance sets standards: classification scheme, quality framework, catalog schema, access control model.

### Data Product Standards
Every data product must have: clear schema with documentation, defined quality SLAs, access control policy, data lineage, owner contact, and change notification process.

### Cross-Domain Data Contracts
When one domain's data product is consumed by another domain, a data contract defines: schema, freshness SLA, expected row count bounds, change notification process, backward compatibility requirements.

## Data Contracts

### Contract Components
| Component | Description | Example |
|-----------|-------------|---------|
| Schema | Data structure and types | Avro schema with fields |
| SLAs | Freshness, completeness, availability | 60s freshness, 99.9% completeness |
| Semantics | Business meaning of fields | "Amount in USD, excluding tax" |
| Quality gates | Automated validation rules | No null IDs, positive amounts |
| Change process | Notification and migration | 14 days notice for breaking changes |

### Contract Enforcement
Validate contracts in producer CI/CD: schema change undergoes compatibility check, quality gates pass before deployment, SLA changes notify consumers. Consumer CI/CD: validate that consumer can handle latest schema version.

## Privacy Engineering

### Privacy by Design
Build privacy controls as default system behavior: minimize data collection, provide user access and deletion mechanisms, conduct privacy impact assessments, implement purpose limitation in data pipelines.

### Data Minimization
Collect only what is needed. Delete when no longer needed. Anonymize or pseudonymize where possible. Default: do not log PII in application logs. Use tokenization for credit card storage (PCI compliance).

### Right to Erasure (GDPR Art. 17)
Automated deletion pipeline: receive deletion request -> verify identity -> identify all data stores containing subject's data -> execute deletion -> verify completeness -> confirm to requester. Complete within 30 days.

## ML Data Governance

### Training Data Governance
Track training data provenance: source, transformations, labeling process, version. Monitor training data quality: label accuracy, class balance, drift from production distribution. Document model cards with training data characteristics.

### Feature Store Governance
Govern feature definitions, computation logic, and freshness. Prevent training/serving skew by ensuring production features match training features. Version features and track which model versions use which feature versions.

### Model Data Lineage
Track which training data produced which model, and which models serve predictions for which consumers. Enable impact analysis: "If this training data source changes, which models are affected?"

## Governance-as-Code

### Infrastructure for Data Governance
Define governance resources in IaC: data catalog schemas, classification rules, quality monitors, retention policies, access control policies. Code review for governance changes. CI/CD pipeline validates governance before deployment.

### Automated Governance Reviews
Quarterly governance review is automated: identify unowned datasets (no owner assigned in 90 days), flag classification drift (dataset content changed but classification did not), detect orphaned assets (no reads in 6 months), report quality SLA trends.

## Incident Response for Data Governance

### Data Quality Incident Response
1. Detect: automated monitoring triggers alert
2. Assess: determine impact scope and affected consumers
3. Contain: stop propagation of bad data (block downstream consumers)
4. Investigate: root cause analysis
5. Remediate: fix source, recalculate derived data
6. Verify: validate data is correct post-fix
7. Document: incident report and preventive measures

### Data Breach Response (Governance Perspective)
1. Identify which datasets were accessed
2. Determine classification of affected data
3. Execute legal hold if litigation anticipated
4. Preserve forensic evidence of access
5. Assess regulatory notification requirements
6. Document breach for audit trail
7. Implement preventive controls

## Key Points
- Policy-as-code enables consistent, automated enforcement across all data platforms
- Data mesh distributes ownership but centralizes standards for consistency
- Data contracts prevent breaking changes between producers and consumers
- Privacy by design minimizes compliance risk at the architecture level
- ML data governance extends traditional governance to training data and features
- Governance-as-code makes governance reviewable, testable, and deployable
- Automated quality incident response minimizes impact of data quality failures
- Breach response must include governance assessment of affected data classification