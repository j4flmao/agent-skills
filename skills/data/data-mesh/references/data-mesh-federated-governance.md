# Data Mesh Federated Governance

## Overview

Federated governance is the governance model for data mesh where global standards are set centrally and local policies are defined per domain within global constraints. This reference provides a comprehensive deep dive into designing, implementing, and operating federated governance in a data mesh architecture.

## Core Concepts

### Global vs Local Policy Split

| Dimension | Global (Council) | Local (Domain) |
|---|---|---|
| Schema compatibility | Mode, enforcement level | Extensions, custom types |
| PII classification | Categories, storage rules | Tagging, field-level labels |
| Data retention | Min/max bounds | Exact duration within bounds |
| Data format | File format, encoding | Naming conventions |
| SLA tiers | Tier definitions | Per-data-product thresholds |
| Access control | Framework, roles | ACL management |
| Quality standards | Minimum thresholds | Domain-specific rules |
| Metadata requirements | Mandatory fields | Optional enrichment |

### Governance Council

The governance council is the decision-making body for global policies. It does not own data. It does not approve individual data products. It defines the rules of the game.

Council composition:
- Chief data architect (chair)
- Domain leads from each domain (rotating if >10 domains)
- Compliance officer (permanent)
- Platform lead (permanent)
- Legal representative (as needed)

Council operating rhythm:
- Weekly: triage policy exceptions and escalations
- Biweekly: full council meeting, policy review
- Quarterly: policy effectiveness review, maturity assessment
- Annually: major policy version bump

## Policy Definition Framework

### Policy Schema

Every policy has:
- `id`: unique identifier
- `scope`: global or domain
- `category`: schema, security, retention, quality, access
- `enforcement`: hard (blocking) or soft (warning)
- `version`: semver
- `effective_date`: when it takes effect
- `domain_overrides`: allowed overrides with justification requirements

### Policy Types

1. **Schema Policies**
   - Compatibility mode per topic/table
   - Field naming conventions (snake_case, camelCase)
   - Required metadata fields (description, owner, PII label)
   - Enum evolution rules (add-only, no removal)
   - Deprecated field lifecycle: warn → deprecate → remove (minimum 60d)

2. **Security Policies**
   - Encryption at rest: all domains
   - Encryption in transit: all cross-domain traffic
   - PII classification levels: public, internal, restricted, critical
   - PII auto-detection rules (regex patterns)
   - Access control framework: RBAC minimum
   - Audit logging: all access to restricted/critical data

3. **Retention Policies**
   - Minimum retention: 90 days
   - Maximum retention: 7 years (or local regulation)
   - Deletion requires governance council approval for shared data
   - Backup retention: double the source retention

4. **Quality Policies**
   - Completeness: no nulls on primary key columns
   - Uniqueness: primary key uniqueness > 99.9%
   - Freshness: per SLA tier
   - Volume: min/max row bounds with drift alert

5. **Access Policies**
   - Default deny for cross-domain access
   - Access request → domain owner approval → auto-provision
   - Quarterly access review for all cross-domain grants
   - Consumer must accept data contract terms

## Policy Enforcement Architecture

### Enforcement Layers

```
Layer 1: CI/CD Gates (pre-merge)
  - Schema compatibility check
  - Metadata completeness check
  - Policy compliance check
  - Breaking change detection

Layer 2: Registry/Platform (runtime)
  - Schema registry compatibility enforcement
  - Catalog metadata validation
  - Access control enforcement
  - Encryption enforcement

Layer 3: Monitoring (post-deploy)
  - SLA compliance monitoring
  - Quality metric tracking
  - Policy violation detection
  - Anomaly detection
```

### Automated Enforcement with OpenPolicyAgent

```rego
package data_mesh.governance

# Global: schema compatibility must be BACKWARD or FULL
default allow_schema_compatibility = false

allow_schema_compatibility {
    input.compatibility_mode == "BACKWARD"
}
allow_schema_compatibility {
    input.compatibility_mode == "FULL"
}

# Domain override allowed with justification
allow_schema_compatibility {
    input.compatibility_mode == "FORWARD"
    input.justification != ""
    data.domains[input.domain].override_approved == true
}

# PII tagging required for sensitive columns
default require_pii_tagging = true

violation_pii_not_tagged[msg] {
    column := input.schema.columns[_]
    column.sensitive == true
    not column.pii_tier
    msg = sprintf("Column %s requires PII classification", [column.name])
}

# Retention within global bounds
violation_retention_out_of_bounds[msg] {
    policy := input.retention_policy
    policy.min_days < 90
    msg = sprintf("Minimum retention %d below global minimum 90 days", [policy.min_days])
}
violation_retention_out_of_bounds[msg] {
    policy := input.retention_policy
    policy.max_days > 2555
    msg = sprintf("Maximum retention %d exceeds global maximum 7 years", [policy.max_days])
}
```

### CI/CD Integration

```yaml
# .github/workflows/governance-check.yml
jobs:
  governance-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check Global Policy Compliance
        run: |
          opa eval --input data-product.yaml \
            --data policies/global/ \
            --data policies/domains/ \
            "violation" --format json
      - name: Check Schema Compatibility
        run: |
          python scripts/check_compatibility.py \
            --old schemas/previous/orders.avsc \
            --new schemas/orders.avsc \
            --mode BACKWARD
      - name: Validate Metadata Completeness
        run: |
          python scripts/validate_metadata.py \
            --contract contracts/orders.yaml \
            --required-fields description,owner,sla,output_ports
      - name: Notify Governance Council
        if: failure()
        run: |
          curl -X POST -H "Content-type: application/json" \
            --data '{"text":"Governance policy violation detected"}' \
            ${{ secrets.SLACK_WEBHOOK }}
```

## Policy Lifecycle Management

### Policy Creation

1. Proposal submitted by domain lead or governance council member
2. Impact assessment: which domains affected, migration effort
3. Review period: 14 days for minor, 30 days for major
4. Vote: simple majority for minor, two-thirds for major
5. Publish: effective date 30 days after approval
6. Migrate: domains have 90 days to comply

### Policy Versioning

```
policies/
  v1.0.0/
    global/
      schema.rego
      security.rego
      retention.rego
      quality.rego
      access.rego
    domains/
      commerce/overrides.rego
      finance/overrides.rego
  v1.1.0/
    ...
```

Policy versioning follows semver:
- MAJOR: breaking change to policy rules (all domains must adjust)
- MINOR: new policy requirement (non-breaking for compliant domains)
- PATCH: clarification, bug fix (no behavioral change)

### Policy Exception Process

1. Domain submits exception request with scope, duration, and justification
2. Governance council reviews within 5 business days
3. Approval requires documented risk acceptance
4. Exceptions auto-expire after 90 days
5. Exception renewal requires re-approval

```yaml
exception_request:
  id: "EXC-2026-0042"
  domain: marketing
  policy: schema_compatibility
  requested_override: FORWARD
  duration_days: 90
  justification: "Rapid A/B testing requires forward-compatible schemas during campaign optimization"
  risk_assessment: "Low risk - no PII data, consumers are internal dashboards only"
  mitigation: "Daily diff report sent to consumers during exception period"
  status: approved
  approved_by: governance-council
  approval_date: "2026-04-15"
  expiry_date: "2026-07-14"
```

## Domain Stewardship

### Steward Role

Each domain must have at least one data steward. Stewards are domain team members, not platform team members or centralized governance roles.

Steward responsibilities:
- Maintain domain's business glossary and metadata
- Review and approve data product registrations
- Handle cross-domain access requests within 24 hours
- Monitor domain data product quality and SLA compliance
- Represent domain in governance council
- Enforce local policies within global constraints
- Conduct quarterly metadata quality reviews

### Steward Workflow

```
Data product registration request
  ↓
Steward reviews schema, metadata, SLA
  ├── Valid → approve, register in catalog
  └── Invalid → return to domain team with feedback
       ↓
Domain team revises → steward re-reviews
```

## Cross-Domain Data Sharing Governance

### Access Request Workflow

```
Consumer discovers data product via catalog
  ↓
Consumer sends access request through catalog
  ↓
Producer domain steward receives notification
  ├── Auto-approved if on approved list (< 5 min)
  └── Manual review within 24 hours
       ↓
Access provisioned via platform automation
  ↓
Consumer accepts data contract terms
  ↓
Access logged in audit trail
```

### Data Contract Between Domains

```yaml
cross_domain_contract:
  producer_domain: commerce
  producer_product: orders
  consumer_domain: finance
  consumer_team: revenue-analytics
  purpose: "Revenue reconciliation and financial reporting"
  schema_version: "2.1.0"
  sla:
    freshness: 15 minutes
    availability: 99.9%
  terms:
    - consumer_data_use: "Internal financial reporting only"
    - data_resharing_prohibited: true
    - provenance_tracking_required: true
    - breach_notification: "Within 24 hours"
    - contract_renewal: "Annual"
  approved_by:
    producer: commerce-steward
    consumer: finance-steward
  effective_date: "2026-01-01"
  review_date: "2027-01-01"
```

### Audit and Compliance

Every cross-domain access is logged:
- Who accessed (consumer identity)
- What was accessed (data product, output port)
- When (timestamp)
- How (API, stream, batch)
- Volume (rows returned, bytes transferred)
- Purpose (from contract terms)

Audit logs retained for minimum 2 years (or regulatory requirement). Quarterly access review: steward reviews who has access, revokes stale grants.

## Monitoring and Observability

### Governance Metrics

| Metric | Target | Collection |
|---|---|---|
| Policy compliance rate | > 99% | CI/CD gate pass rate |
| Exception count | < 5 active | Policy engine |
| Access request response time | < 24h p95 | Catalog API |
| Stale access grants | < 10% | Quarterly review |
| Metadata completeness | > 95% | Catalog scan |
| Data product freshness | Per SLA | Monitoring system |
| Cross-domain data volume | Per contract | API gateway |

### Policy Violation Alerting

- CRITICAL: PII data exposed without classification. Alert: governance council + domain steward within 5 minutes.
- HIGH: Schema compatibility violation on production data product. Alert: domain steward within 15 minutes.
- MEDIUM: Metadata incomplete for > 7 days. Alert: domain steward daily digest.
- LOW: Access grant stale > 90 days. Alert: monthly review report.

## Scaling Governance

### Governance at 5-10 Domains

- Single governance council with all domain leads
- Weekly council meetings
- Policy exceptions reviewed case-by-case
- One platform team supports all domains

### Governance at 10-50 Domains

- Council reduced to representatives (elected, rotating)
- Domain clusters with sub-councils (e.g., finance cluster, operations cluster)
- Policy automation with OPA/Rego
- Exception process semi-automated with risk scoring
- Dedicated governance platform team (2-4 people)

### Governance at 50+ Domains

- Full-time governance council (not part-time)
- Hierarchical policy structure: global → cluster → domain
- AI-assisted policy compliance checking
- Automated exception approval for low-risk cases
- Governance as code: all policies versioned, tested, deployed via CI/CD

## Transitioning from Centralized Governance

### Phase 1: Inventory and Classify (Month 1-2)

- Document all existing data governance policies
- Classify policies as global or local
- Identify domains and assign interim stewards
- Catalog all existing data assets

### Phase 2: Define Global Baseline (Month 2-3)

- Governance council formed
- Global policies defined (minimum set)
- Policy enforcement tools deployed (OPA, CI/CD gates)
- Domain stewards trained

### Phase 3: Domain Onboarding (Month 3-6)

- Onboard 2-3 pilot domains
- Domain stewards define local policies
- Data products registered under new governance model
- Refine global policies based on pilot feedback

### Phase 4: Scale and Optimize (Month 6-12)

- All domains onboarded
- Policy automation in place
- Quarterly governance reviews established
- Exception process embedded in platform

## Common Challenges

1. **Policy enforcement without agility**: too many hard blocks slow domain velocity. Fix: three-tier enforcement (hard/soft/monitor-only).

2. **Governance council as bottleneck**: council must approve everything. Fix: council defines policy, domain stewards execute.

3. **Inconsistent PII classification**: domains classify similar data differently. Fix: auto-tagging rules and random audits.

4. **Steward burnout**: stewards have domain responsibilities plus governance duties. Fix: allocate 20% of steward time to governance.

5. **Policy drift**: domains gradually diverge from global standards. Fix: automated compliance checks in CI/CD + quarterly audits.

6. **Cross-domain contract disputes**: consumer dissatisfaction with data quality. Fix: contract includes quality SLAs with breach terms.

## Tools and Integration

| Tool | Governance Role |
|---|---|
| OpenPolicyAgent | Policy definition and enforcement |
| DataHub | Metadata validation, lineage tracking |
| Confluent Schema Registry | Schema compatibility enforcement |
| Monte Carlo / Soda | Quality SLA monitoring |
| Backstage | Data product lifecycle, access request UI |
| Grafana + Prometheus | Governance metrics dashboard |
| Terraform | Policy-as-code deployment |
| Great Expectations | Data quality contract enforcement |

## References

- Schema registry evolution management
- Data contract schema evolution policies
- Data catalog metadata management
- Data quality dimension enforcement
- Domain decomposition patterns
- Infrastructure platform for data mesh
