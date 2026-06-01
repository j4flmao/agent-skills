---
name: enterprise-data-governance
description: >
  Use this skill when implementing data governance frameworks: classification, cataloging, lineage, quality, and retention.
  This skill enforces: data classification, schema registry, lineage tracking, quality monitoring.
  Do NOT use for: database administration, ETL implementation, data pipeline engineering.
version: "2.0.0"
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

## Framework/Methodology

### GOVERN-DATA Framework
A five-pillar methodology for enterprise data governance:

Pillar 1 - Classify: Define data classification levels and automate detection of sensitive data. Apply labels at column level. Maintain classification register with ownership.

Pillar 2 - Catalog: Deploy data catalog with schema registry and business glossary. Assign data owners and stewards. Document data contracts between producers and consumers.

Pillar 3 - Trace: Map end-to-end data lineage from source to consumption. Enable impact analysis for schema changes. Automate lineage capture in pipelines.

Pillar 4 - Measure: Define quality dimensions and SLAs per dataset. Implement automated quality monitoring. Report quality scorecards and alert on breaches.

Pillar 5 - Retain: Define retention schedules per classification. Implement automated purge with dry-run mode. Support legal hold overrides. Maintain audit trail.

### Data Governance Operating Model
| Model | Decision Authority | Best For |
|-------|-------------------|----------|
| Centralized | Single governance team | Small orgs, strict compliance |
| Federated | Domain teams with central standards | Large orgs with domain expertise |
| Hybrid | Central framework + domain execution | Regulated enterprises |

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

Automated PII detection patterns:
```python
# Example: PII scanning with regex
import re

PII_PATTERNS = {
    "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
    "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
    "phone": r"\b\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b",
    "credit_card": r"\b(?:\d[ -]*?){13,16}\b",
}

def classify_column(sample_values):
    for value in sample_values[:100]:
        for pii_type, pattern in PII_PATTERNS.items():
            if re.match(pattern, str(value)):
                return "restricted", pii_type
    return "internal", None
```

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

## Standards Alignment

| Regulation | Data Governance Requirement | Mapping |
|-----------|----------------------------|---------|
| GDPR Art. 5 | Data minimization, purpose limitation | Classification, retention |
| GDPR Art. 17 | Right to erasure | Retention, purge automation |
| GDPR Art. 30 | Records of processing | Data catalog, lineage |
| HIPAA 164.312 | Access controls, audit controls | Classification, access logging |
| HIPAA 164.314 | Business associate agreements | Data contracts |
| PCI DSS Req. 3 | Protect stored cardholder data | Classification, encryption at rest |
| SOX 404 | Financial reporting controls | Data quality, lineage |

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

### Data Contract Template (YAML)
```yaml
# Data contract between producer (payment-service) and consumer (analytics-service)
data_contract:
  name: "payment-transactions"
  version: "2.1.0"
  producer:
    service: payment-service
    owner: payments-team
    contact: payments-oncall@example.com
  consumer:
    service: analytics-service
    owner: data-team
    contact: data-oncall@example.com

  schema:
    type: avro
    fields:
      - name: transaction_id
        type: string
        required: true
        description: "Unique transaction identifier"
      - name: amount
        type: decimal(10,2)
        required: true
        description: "Transaction amount in USD"
      - name: status
        type: enum([pending, completed, failed, refunded])
        required: true
      - name: created_at
        type: timestamp-millis
        required: true

  slas:
    freshness: 60  # Data available in consumer within 60 seconds
    completeness: 99.9  # Minimum % of expected records delivered
    volume:
      min_rows_per_hour: 1000
      max_rows_per_hour: 100000
    availability: 99.95

  change_notification:
    notice_period_days: 14
    channel: data-contracts@example.com
    breaking_changes:
      - removing a field
      - changing a field type
      - making a required field optional
      - changing enum values

  quality_gates:
    - check: "no null transaction_ids"
      severity: critical
    - check: "amount > 0"
      severity: warning
    - check: "valid ISO timestamps"
      severity: error
```

### Data Quality Scorecard (Python Pattern)
```python
class DataQualityScorecard:
    def __init__(self, dataset_name, reporting_period):
        self.dataset = dataset_name
        self.period = reporting_period
        self.dimensions = {}

    def add_dimension(self, name, score, target, weight=1.0):
        self.dimensions[name] = {"score": score, "target": target, "weight": weight}

    def overall_score(self):
        if not self.dimensions:
            return 0.0
        total_weight = sum(d["weight"] for d in self.dimensions.values())
        weighted = sum(d["score"] * d["weight"] for d in self.dimensions.values())
        return weighted / total_weight if total_weight > 0 else 0.0

    def alert_if_breached(self):
        alerts = []
        for name, d in self.dimensions.items():
            if d["score"] < d["target"]:
                alerts.append(f"{self.dataset}.{name}: {d['score']:.1f}% below target {d['target']:.1f}%")
        return alerts

    def report(self):
        lines = [f"# Data Quality Scorecard: {self.dataset} ({self.period})", ""]
        for name, d in self.dimensions.items():
            status = "PASS" if d["score"] >= d["target"] else "FAIL"
            lines.append(f"| {name} | {d['score']:.1f}% | {d['target']:.1f}% | {status} |")
        lines.append(f"| **Overall** | **{self.overall_score():.1f}%** | - | - |")
        return "\n".join(lines)

scorecard = DataQualityScorecard("Customer Transactions", "2026-05")
scorecard.add_dimension("Completeness", 99.97, 99.9, weight=2.0)
scorecard.add_dimension("Accuracy", 99.99, 99.99, weight=2.0)
scorecard.add_dimension("Timeliness", 98.5, 99.0, weight=1.5)
scorecard.add_dimension("Consistency", 99.5, 99.5, weight=1.0)
print(scorecard.report())
```

### Compliance Audit Preparation
1. Maintain data classification register
2. Document retention schedules and purge logs
3. Keep lineage documentation for critical data
4. Record data quality SLAs and breach history
5. Maintain access review logs
6. Document data ownership assignments
7. Store governance policy versions

## Code Examples

### Automated PII Scanner (Python/Schema Registry Integration)
```python
import re, yaml
from typing import List, Dict, Optional

class PIIAutomatedClassifier:
    PII_PATTERNS = {
        "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
        "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        "phone": r"\b\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b",
        "credit_card": r"\b(?:\d[ -]*?){13,16}\b",
        "ip_address": r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b",
        "date_of_birth": r"\b\d{4}-\d{2}-\d{2}\b",
        "address": r"\b\d{1,5}\s+[A-Za-z0-9\s,]+(?:Street|St|Ave|Avenue|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b",
    }

    CLASSIFICATION_ACCESS = {
        "public": {"encrypt_at_rest": False, "encrypt_in_transit": False, "audit": False, "retention_days": 0},
        "internal": {"encrypt_at_rest": True, "encrypt_in_transit": True, "audit": "errors_only", "retention_days": 90},
        "confidential": {"encrypt_at_rest": True, "encrypt_in_transit": True, "audit": "all_access", "retention_days": 1095},
        "restricted": {"encrypt_at_rest": True, "encrypt_in_transit": True, "audit": "immutable_trail", "retention_days": 2190},
    }

    def __init__(self, schema_registry_url: str):
        self.schema_registry_url = schema_registry_url
        self.classification_register = {}

    def scan_column(self, column_name: str, sample_values: List[str]) -> Dict:
        for value in sample_values[:100]:
            for pii_type, pattern in self.PII_PATTERNS.items():
                if re.search(pattern, str(value)):
                    return {
                        "column": column_name,
                        "classification": "restricted",
                        "pii_type": pii_type,
                        "controls": self.CLASSIFICATION_ACCESS["restricted"]
                    }
        return {
            "column": column_name,
            "classification": "internal",
            "pii_type": None,
            "controls": self.CLASSIFICATION_ACCESS["internal"]
        }

    def generate_classification_report(self, schema: Dict) -> str:
        report_lines = ["# Data Classification Report", ""]
        for table, columns in schema.items():
            report_lines.append(f"## Table: {table}")
            for col in columns:
                result = self.scan_column(col["name"], col.get("samples", []))
                report_lines.append(
                    f"- {result['column']}: **{result['classification']}**"
                    + (f" (PII: {result['pii_type']})" if result['pii_type'] else "")
                )
            report_lines.append("")
        return "\n".join(report_lines)

scanner = PIIAutomatedClassifier("https://schema-registry.example.com")
schema = {
    "users": [
        {"name": "email", "samples": ["alice@example.com", "bob@test.com"]},
        {"name": "name", "samples": ["Alice Smith", "Bob Jones"]},
    ],
    "orders": [
        {"name": "credit_card", "samples": ["4111-1111-1111-1111", "5500-0000-0000-0004"]},
    ]
}
print(scanner.generate_classification_report(schema))
```

### Data Quality Monitor (Great Expectations Pattern)
```python
# Pattern: Automated data quality pipeline
quality_checks = {
    "completeness": "SELECT COUNT(*) - COUNT({column}) AS nulls FROM {table}",
    "uniqueness": "SELECT {column}, COUNT(*) as cnt FROM {table} GROUP BY {column} HAVING cnt > 1",
    "freshness": "SELECT MAX(updated_at) FROM {table}",
    "row_count": "SELECT COUNT(*) FROM {table}",
    "referential_integrity": """
        SELECT COUNT(*) FROM {child_table} c
        LEFT JOIN {parent_table} p ON c.{fk} = p.{pk}
        WHERE p.{pk} IS NULL
    """
}

class DataQualityRunner:
    def __init__(self, connection_string):
        self.connection_string = connection_string

    def run_check(self, check_name, table, column=None):
        query = quality_checks[check_name].format(
            column=column or "*", table=table
        )
        result = self._execute(query)
        return {"check": check_name, "table": table, "result": result, "passed": self._evaluate(check_name, result)}

    def _execute(self, query):
        return {"rows": 1000, "nulls": 2}  # Simulated

    def _evaluate(self, check_name, result):
        thresholds = {"completeness": 0.01, "uniqueness": 0, "freshness": 3600}
        return True  # Simplified
```

### Data Retention Policy (YAML/IaC)
```yaml
retention_policies:
  pii_data:
    retention_days: 2190  # 6 years (GDPR)
    purge_method: soft_delete
    legal_hold_override: true
    dry_run: true
    schedule: "0 2 * * 0"  # Weekly Sunday 2am

  application_logs:
    retention_days: 90
    purge_method: delete
    legal_hold_override: false
    schedule: "0 3 * * *"  # Daily 3am

  financial_records:
    retention_days: 2555  # 7 years (SOX)
    purge_method: archive_to_s3_glacier
    legal_hold_override: true
    dry_run: true
    schedule: "0 4 1 * *"  # Monthly 1st 4am

  analytics_aggregates:
    retention_days: 730  # 2 years
    purge_method: delete
    legal_hold_override: false
    schedule: "0 5 * * 0"  # Weekly Sunday 5am
```

## Anti-Patterns

### Anti-Pattern 1: Governance by Spreadsheet
Managing data classification, lineage, and quality in shared spreadsheets. Spreadsheets are stale the moment they're saved, have no enforcement, and no audit trail. Use automated tools: data catalogs, schema registries, quality monitors.

### Anti-Pattern 2: Classifying Everything as Restricted
When everything is Restricted, nothing is. Teams bypass controls because they're too burdensome. Default to Internal. Use automated discovery to find and escalate only genuinely sensitive data. Review quarterly.

### Anti-Pattern 3: Data Quality Without SLAs
Running quality checks without defined targets produces noise. A completeness check at 99.9% is meaningless without knowing whether 99.9% is good enough. Define SLAs per dataset criticality, and alert only on breaches.

### Anti-Pattern 4: Orphaned Data Ownership
Assigning data owners during onboarding but never reviewing. Owners leave the company, change roles, or forget they own data. Data becomes ungoverned. Review ownership quarterly. Escalate unowned datasets to the governance committee.

### Anti-Pattern 5: Over-Engineering Lineage
Trying to capture lineage for every column in every table. Teams burn out maintaining lineage diagrams that are immediately stale. Start with critical data domains (finance, compliance, customer). Automate lineage with dbt/docs. Expand incrementally.

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
  - references/data-contracts.md -- Data Contracts and Sharing Agreements

## Handoff
For compliance requirements on data handling, hand off to `enterprise-compliance-audit`. For multi-tenant data isolation, hand off to `enterprise-multi-tenant`.
