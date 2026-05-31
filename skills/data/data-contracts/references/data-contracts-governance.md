# Data Contracts Governance

## Overview

Data contract governance establishes the policies, processes, and organizational structures for managing data contracts across an enterprise. This reference covers governance frameworks, contract lifecycle management, compliance enforcement, audit requirements, and the operating model for data contract governance at scale.

## Governance Framework

### Principles

1. **Producer owns the contract**: the domain producing the data defines and maintains the contract. Consumers provide input but the producer has final authority over schema changes.

2. **Consumer has visibility**: all consumers of a contract must be notified of changes. Consumers can reject breaking changes through the governance process.

3. **Contracts are immutable**: once published, a contract version cannot be modified. Changes create a new version.

4. **Compatibility is enforced**: CI/CD gates prevent non-compatible changes from reaching production.

5. **SLA is bidirectional**: producers commit to freshness, availability, and quality. Consumers commit to usage terms and breach notification.

### Governance Bodies

```yaml
governance_structure:
  council:
    name: Data Contract Governance Council
    members:
      - Chief Data Architect (chair)
      - Domain leads (rotating)
      - Data Platform lead
      - Compliance officer
    meeting_frequency: biweekly
    responsibilities:
      - Approve global contract policies
      - Resolve contract disputes between domains
      - Review contract exception requests
      - Audit contract compliance quarterly

  stewards:
    per_domain:
      - Data Steward (primary)
      - Data Owner (secondary)
    responsibilities:
      - Review and approve contract registrations
      - Handle access requests within 24 hours
      - Monitor contract SLA compliance
      - Represent domain in governance council

  platform:
    team: Data Platform Engineering
    responsibilities:
      - Enforce policies via CI/CD gates
      - Maintain contract registry
      - Provide contract tooling and templates
      - Monitor contract health metrics
```

## Contract Lifecycle

### States

```
DRAFT → REVIEW → PUBLISHED → ACTIVE → DEPRECATED → RETIRED
```

### State Transitions

```yaml
transitions:
  DRAFT → REVIEW:
    conditions:
      - Schema defined with all required fields
      - SLA terms specified
      - Owner and steward assigned
      - Semantic types documented
    action: Steward review request

  REVIEW → PUBLISHED:
    conditions:
      - Schema compatibility checked against previous version
      - Consumers notified (if MAJOR change)
      - Consumer acknowledgments collected (if MAJOR)
      - Steward approved
    action: Register in catalog, make discoverable

  PUBLISHED → ACTIVE:
    conditions:
      - Pipeline deployed
      - Data flowing through all output ports
    action: Health monitoring begins

  ACTIVE → DEPRECATED:
    conditions:
      - Replacement contract exists
      - All consumers notified of deprecation
      - Deprecation period started (min 30 days)
    action: Mark as deprecated in catalog, stop new consumers

  DEPRECATED → RETIRED:
    conditions:
      - Deprecation period elapsed (min 30 days)
      - All consumers migrated (or acknowledged breakage)
      - No active queries in last 7 days
    action: Remove output ports, archive contract
```

### Contract Registration

```yaml
registration_workflow:
  steps:
    1. Domain team creates contract YAML
    2. Contract validated against schema registry (technical compatibility)
    3. CI/CD validates: required fields, SLA, ownership completeness
    4. Domain steward reviews and approves
    5. Contract published to catalog
    6. Consumers can discover and request access

  required_fields:
    - dataset_name
    - version (semver)
    - schema.columns (name, type, required)
    - ownership (producer, steward)
    - sla (freshness, availability)

  optional_fields:
    - semantic_types
    - quality_thresholds
    - tags
    - examples
    - change_log
```

## Policy Enforcement

### Automated Policies

```python
class ContractPolicyEngine:
    """Enforce governance policies on data contracts."""

    def __init__(self, policies: list):
        self.policies = policies

    def check_all(self, contract: dict) -> list:
        violations = []
        for policy in self.policies:
            result = policy.check(contract)
            if not result["passed"]:
                violations.append(result)
        return violations


# Policy: Every contract must have a documented owner
class OwnerRequiredPolicy:
    def check(self, contract: dict) -> dict:
        if not contract.get("ownership", {}).get("producer"):
            return {
                "policy": "OwnerRequired",
                "passed": False,
                "message": "Contract must have a producer owner",
                "severity": "BLOCKING",
            }
        if not contract.get("ownership", {}).get("steward"):
            return {
                "policy": "StewardRequired",
                "passed": False,
                "message": "Contract must have a domain steward",
                "severity": "BLOCKING",
            }
        return {"policy": "OwnerRequired", "passed": True}


# Policy: SLA must include freshness
class SLARequiredPolicy:
    def check(self, contract: dict) -> dict:
        sla = contract.get("sla", {})
        if not sla.get("freshness"):
            return {
                "policy": "SLAFreshnessRequired",
                "passed": False,
                "message": "Contract must define freshness SLA",
                "severity": "BLOCKING",
            }
        if not sla.get("quality", {}).get("null_threshold_pct"):
            return {
                "policy": "SLAQualityRequired",
                "passed": False,
                "message": "Contract must define quality thresholds",
                "severity": "WARNING",
            }
        return {"policy": "SLARequired", "passed": True}


# Policy: PII columns must be tagged
class PIITaggingPolicy:
    def check(self, contract: dict) -> dict:
        violations = []
        for col in contract.get("schema", {}).get("columns", []):
            if is_likely_pii(col["name"]) and "PII" not in col.get("tags", []):
                violations.append(f"Column {col['name']} likely PII but not tagged")
        if violations:
            return {
                "policy": "PIITagging",
                "passed": False,
                "message": "; ".join(violations),
                "severity": "BLOCKING",
            }
        return {"policy": "PIITagging", "passed": True}
```

### Enforcement Levels

| Level | Behavior | Use Case |
|---|---|---|
| BLOCKING | Prevents merge/deploy | Schema compatibility, missing owner |
| WARNING | Allows deploy, alerts steward | Missing optional metadata |
| MONITOR | Logs violation, no action | Best practice suggestions |
| AUDIT | Quarterly compliance report | Documentation completeness |

## Compliance and Audit

### Audit Requirements

```yaml
audit:
  frequency: quarterly
  scope:
    - All PUBLISHED and ACTIVE contracts
    - Consumer acknowledgment records
    - SLA compliance for past 90 days
    - Access grant review
    - Policy violation history

  checklist:
    - Is every contract owned by a named producer?
    - Are all consumer acknowledgments current?
    - Are deprecated contracts transitioning to retired?
    - Are SLA compliance rates above threshold?
    - Are PII fields properly tagged?
    - Are cross-domain contracts documented?

  reporting:
    format: "Data Contract Governance Report"
    sections:
      - Contract inventory (count by domain, by tier)
      - Compliance metrics (by policy)
      - SLA adherence (by data product)
      - Open exceptions
      - Risk assessment
```

### Compliance Report Generator

```python
def generate_compliance_report(contracts: list, period_days: int = 90) -> dict:
    """Generate quarterly compliance report."""
    report = {
        "period": f"Last {period_days} days",
        "generated_at": datetime.utcnow().isoformat(),
        "summary": {},
        "by_domain": {},
        "violations": [],
        "exceptions": [],
    }

    total = len(contracts)
    compliant = 0
    non_compliant = 0

    for contract in contracts:
        domain = contract.get("ownership", {}).get("domain", "unknown")
        if domain not in report["by_domain"]:
            report["by_domain"][domain] = {
                "total": 0,
                "compliant": 0,
                "violations": [],
            }
        report["by_domain"][domain]["total"] += 1

        # Check compliance
        policy_engine = ContractPolicyEngine([
            OwnerRequiredPolicy(),
            SLARequiredPolicy(),
            PIITaggingPolicy(),
        ])
        violations = policy_engine.check_all(contract)

        if violations:
            non_compliant += 1
            report["by_domain"][domain]["non_compliant"] += 1
            report["by_domain"][domain]["violations"].extend(violations)
            report["violations"].append({
                "contract": contract["dataset"],
                "domain": domain,
                "version": contract["version"],
                "violations": violations,
            })
        else:
            compliant += 1
            report["by_domain"][domain]["compliant"] += 1

    report["summary"] = {
        "total_contracts": total,
        "compliant": compliant,
        "non_compliant": non_compliant,
        "compliance_rate": round(compliant / total * 100, 1) if total > 0 else 0,
        "open_exceptions": len(report["exceptions"]),
    }

    return report
```

## Dispute Resolution

### Escalation Path

```
Consumer disagrees with contract change
  ├── Tier 1: Producer and consumer stewards discuss (2 business days)
  ├── Tier 2: Governance council mediation (1 week)
  └── Tier 3: Chief Data Officer decision (final)
```

### Exception Process

```yaml
exception_request:
  id: "EXC-2026-0018"
  contract: analytics.fct_orders
  requested_version: "2.0.0"
  policy_violation: "BACKWARD compatibility required but FORWARD proposed"
  justification: "All consumers can upgrade within 48 hours (internal tools only)"
  risk_assessment: "Low - no external consumers, all consumers on same sprint cadence"
  duration: 30 days
  status: approved
  approved_by: data-governance-council
  approval_date: "2026-04-20"
  expiry_date: "2026-05-20"
  conditions:
    - "All consumers must acknowledge within 7 days"
    - "Steward reports compliance at next council meeting"
```

## Contract Health Dashboard

### Metrics

```yaml
dashboard_metrics:
  contract_health:
    - active_contracts: count
    - compliant_contracts: percentage
    - contracts_with_violations: count
    - contracts_in_deprecation: count

  sla_health:
    - freshness_compliance_rate: percentage
    - volume_compliance_rate: percentage
    - quality_compliance_rate: percentage
    - avg_freshness_lag: seconds

  change_activity:
    - contract_changes_last_30d: count
    - major_changes: count
    - minor_changes: count
    - patch_changes: count

  governance:
    - open_exceptions: count
    - pending_acknowledgments: count
    - overdue_acknowledgments: count
    - average_acknowledgment_time: hours
```

## Multi-Org Contract Governance

### External Partner Contracts

```yaml
external_contract:
  contract_version: "1.0.0"
  dataset: partner_marketing.campaign_performance
  parties:
    producer:
      org: "partner-agency.com"
      domain: marketing
      contact: partner-ops@agency.com
    consumer:
      org: "our-org.com"
      domain: marketing
      team: campaign-analytics
      contact: marketing-analytics@our-org.com

  governance:
    legal_basis: "DPA-2026-0421"
    data_residency: "US only"
    subprocessing_allowed: false
    audit_rights: "Quarterly, 30-day notice"
    breach_notification: "Within 24 hours"
    contract_renewal: "Annual (auto-renew)"
    termination_notice: "90 days"
```

## Tooling

| Tool | Governance Function |
|---|---|
| dbt | Contract enforcement at model level |
| DataHub / OpenMetadata | Contract storage, discovery, metadata |
| Great Expectations | Data quality enforcement matching contract terms |
| Soda / Monte Carlo | SLA monitoring and breach detection |
| OPA / Rego | Policy engine for contract validation |
| Backstage | Developer portal for contract management |
| Custom CI/CD | Contract validation in GitHub/GitLab |

## References

- Schema evolution policies
- Data contract definition and lifecycle
- Contract integration patterns
- Contract monitoring and enforcement
- Data catalog metadata management
- Federated governance operating model
- Data mesh governance
