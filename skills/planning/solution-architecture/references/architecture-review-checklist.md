# Architecture Review Checklist

## Overview

A structured architecture review checklist ensures solution designs are evaluated consistently across all cross-cutting concerns. This guide provides a comprehensive review framework with scoring criteria, stakeholder sign-off process, and compliance validation.

## Review Process

### Phase 1: Pre-Review (Designer Prepares)

```yaml
# pre-review-checklist.yaml
pre_review:
  required_documents:
    - solution_architecture_document: "Architecture Decision Records + diagrams"
    - context_diagram: "System boundaries and external dependencies"
    - container_diagram: "High-level services and data stores"
    - component_diagram: "Internal component decomposition"
    - adr_log: "All ADRs created during design"
    - nfr_table: "Non-functional requirements with targets"
  
  responsible: solution_architect
  deadline: "3 business days before review"
  
  self_assessment:
    - "All ADRs created with status 'Proposed'"
    - "NFRs documented with measurable targets"
    - "Trade-off analysis completed for each decision"
    - "At least 2 alternatives considered per decision"
    - "Cost estimate included"
    - "Security review requested if handling sensitive data"
    - "Compliance check completed for regulated data"
```

### Phase 2: Review Session

```yaml
# review-session.yaml
review_session:
  participants:
    required:
      - solution_architect: "Presents the solution"
      - lead_architect: "Chairs the review"
      - security_architect: "Security review"
      - platform_architect: "Platform/infra review"
    optional:
      - domain_expert: "Business domain validation"
      - data_architect: "Data modeling review"
      - network_architect: "Network topology review"
      - compliance_officer: "Regulatory compliance"
  
  agenda:
    - "Context and problem statement (5 min)"
    - "Solution overview and diagrams (15 min)"
    - "Key ADRs and trade-offs (20 min)"
    - "Cross-cutting concerns evaluation (30 min)"
    - "Risk assessment (10 min)"
    - "Decision and action items (10 min)"
  
  duration: "90 minutes (max)"
  output: "Review decision + action items + scorecard"
```

### Phase 3: Post-Review

```yaml
# post-review-process.yaml
post_review:
  outcomes:
    - approved: "No blockers, proceed to implementation"
    - approved_with_conditions: "Address action items before implementation"
    - revise_and_resubmit: "Major changes needed, schedule follow-up review"
    - rejected: "Fundamental issues, restart design process"
  
  follow_up:
    action_items:
      owner: solution_architect
      due_date: "Specified in review"
      tracking: "Architecture decision log"
    revised_documents:
      deadline: "Within 5 business days"
      distribution: "Review participants"
```

## Cross-Cutting Concerns

### 1. Security

**Assessment Criteria:**
- Authentication and authorization model defined
- Data encryption in transit and at rest specified
- Secrets management approach documented
- Network security controls (firewalls, WAF, network policies)
- API security (rate limiting, input validation, CORS)
- Dependency vulnerability management plan
- Security incident detection and response
- Penetration testing requirements identified
- Compliance with security standards (OWASP ASVS, NIST)

**Scoring:**
```
N/A - Not applicable (0)
Not Addressed - No plan for this concern (1)
Partially Addressed - Some considerations, gaps remain (2)
Mostly Addressed - Identified with minor gaps (3)
Fully Addressed - Comprehensive approach with evidence (4)
```

### 2. Scalability

**Assessment Criteria:**
- Expected load profile defined (concurrent users, transactions/sec, data volume)
- Horizontal and vertical scaling strategy documented
- State management approach (stateless where possible)
- Database scaling strategy (read replicas, sharding, partitioning)
- Caching strategy (CDN, application cache, database cache)
- Queue/buffer for traffic spikes
- Auto-scaling configuration defined
- Scaling limits and bottlenecks identified
- Load testing plan referenced

**Key Questions:**
- What happens at 2x/10x/100x current load?
- Which component fails first under load?
- What is the scaling ceiling?
- How does the system handle traffic bursts?
- What is the cold start performance?

### 3. Operability

**Assessment Criteria:**
- Monitoring and observability strategy (metrics, logs, traces)
- Dashboard definitions for key metrics
- Alert thresholds and notification channels
- Deployment strategy (blue-green, canary, rolling)
- Rollback procedure documented
- Backup and disaster recovery plan
- Runbook availability for common operations
- Configuration management approach
- Release management and versioning strategy
- Capacity planning process

**Key Questions:**
- Can a new team member deploy and operate this system?
- What is the mean time to recovery (MTTR)?
- How are configuration changes made?
- Is the system debuggable in production?

### 4. Cost

**Assessment Criteria:**
- Infrastructure cost estimate provided
- Cost breakdown by component
- Cost optimization opportunities identified
- Reserved instances/committed use discounts planned
- Data transfer costs calculated
- Storage tiering strategy
- License costs for third-party software
- Operational labor costs estimated
- Cost monitoring and budgeting plan

**Key Questions:**
- What is the estimated monthly cost at launch?
- How does cost scale with usage?
- What are the top 3 cost drivers?
- Are there lower-cost alternatives considered?
- What is the cost optimization roadmap?

### 5. Performance

**Assessment Criteria:**
- Performance requirements defined (latency p50/p95/p99, throughput)
- Performance testing approach documented
- Database query performance analysis completed
- Caching strategy defined
- CDN usage for static content
- Async processing for non-critical paths
- Connection pooling configured
- Payload optimization (compression, pagination, field selection)

**Key Questions:**
- What are the expected p50/p95/p99 latencies?
- How does the system behave under saturation?
- What is the database query performance profile?
- Are N+1 query patterns identified and addressed?
- How does latency vary by geographic region?

### 6. Reliability

**Assessment Criteria:**
- SLO/SLI definitions for key service metrics
- Error budget policy defined
- Redundancy strategy (AZ/region failover)
- Retry and circuit breaker patterns
- Degraded mode operation defined
- Data durability and consistency guarantees
- Chaos engineering plan
- SLA commitments and penalties

**Key Questions:**
- What is the target availability (nines)?
- What happens when a dependency fails?
- What is the data loss exposure (RPO)?
- How long does recovery take (RTO)?
- How is the system tested for reliability?

### 7. Maintainability

**Assessment Criteria:**
- Code organization and module boundaries
- API versioning strategy
- Database migration plan
- Technology stack decisions documented
- Technical debt tracking process
- Documentation plan (ADR, runbooks, API docs)
- Testing strategy (unit, integration, e2e, performance)
- CI/CD pipeline design

### 8. Compliance

**Assessment Criteria:**
- Regulatory requirements identified (GDPR, SOC2, HIPAA, PCI-DSS)
- Data residency requirements documented
- Audit trail and logging requirements
- Data retention and deletion policies
- Consent management (for user data)
- Third-party vendor assessment requirements
- Compliance certification roadmap

## Architecture Decision Scoring

### Scorecard Template

```markdown
# Architecture Review Scorecard

## Solution: [Solution Name]
**Review Date:** [Date]
**Reviewer:** [Name]
**Version:** [1.0]

## Overall Score: [2.8 / 4.0]

| Concern | Score | Weight | Weighted | Comments |
|---------|-------|--------|----------|----------|
| Security | 3 | 0.20 | 0.60 | Good auth model, need pen test plan |
| Scalability | 3 | 0.15 | 0.45 | Auto-scaling defined, sharding needs detail |
| Operability | 2 | 0.15 | 0.30 | Missing runbooks, deployment needs review |
| Cost | 4 | 0.10 | 0.40 | Well-optimized, reserved instances planned |
| Performance | 3 | 0.10 | 0.30 | CDN + caching good, need load test results |
| Reliability | 2 | 0.15 | 0.30 | Single AZ deployment risk, needs HA plan |
| Maintainability | 3 | 0.10 | 0.30 | Good ADR and doc, CI/CD needs work |
| Compliance | 3 | 0.05 | 0.15 | GDPR covered, audit trail needs detail |

**Decision:** ✅ Approved with Conditions
**Conditions:** Address items 1-3 below before implementation

## Action Items

1. **Operability** — Create deployment runbook and define rollback procedure
   - Owner: [Name]
   - Due: [Date]
   - Priority: High

2. **Reliability** — Design multi-AZ deployment and document RTO/RPO
   - Owner: [Name]
   - Due: [Date]
   - Priority: High

3. **Security** — Schedule penetration testing for post-deployment
   - Owner: [Name]
   - Due: [Date]
   - Priority: Medium

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Single AZ failure | Medium | High | Multi-AZ deployment (AI-002) |
| Database connection exhaustion | Low | High | Connection pooling + HPA |
| API rate limiting gaps | Medium | Medium | Implement rate limiting in gateway |
| Data migration complexity | Low | Medium | Test migration in staging first |

## Architecture Decisions Validated

| ADR | Title | Status | Notes |
|-----|-------|--------|-------|
| ADR-001 | Use PostgreSQL for primary store | Accepted | Confirmed schema design |
| ADR-002 | Event-driven for async processing | Accepted | Consider Kafka vs SQS |
| ADR-003 | React SPA with API gateway | Conditionally Accepted | Need SSR for SEO |
```


### Scoring Rubric

| Score | Label | Definition |
|-------|-------|------------|
| 4 | Fully Addressed | Comprehensive approach with documented evidence, tested and validated |
| 3 | Mostly Addressed | Clear approach with minor gaps, acceptable for implementation |
| 2 | Partially Addressed | Some considerations but significant gaps identified |
| 1 | Not Addressed | Concern identified but no plan or solution defined |
| 0 | N/A | Not applicable to this solution |

### Weight Guidelines by Solution Type

| Concern | Internal Tool | Customer App | Critical System | Regulated System |
|---------|--------------|--------------|-----------------|------------------|
| Security | 0.10 | 0.20 | 0.25 | 0.30 |
| Scalability | 0.10 | 0.20 | 0.20 | 0.10 |
| Operability | 0.20 | 0.15 | 0.15 | 0.15 |
| Cost | 0.25 | 0.10 | 0.05 | 0.05 |
| Performance | 0.10 | 0.15 | 0.15 | 0.10 |
| Reliability | 0.10 | 0.15 | 0.15 | 0.15 |
| Maintainability | 0.15 | 0.05 | 0.05 | 0.05 |
| Compliance | 0.00 | 0.00 | 0.00 | 0.10 |

## Compliance Validation

### Compliance Checklist by Regulation

```yaml
# compliance-checklist.yaml
regulations:
  gdpr:
    - data_processing_register_updated
    - data_retention_schedule_defined
    - user_consent_mechanism_implemented
    - right_to_erasure_workflow_documented
    - data_portability_api_defined
    - dpia_completed
    - dpo_notified
    - cross_border_transfer_mechanism_defined
  
  soc2:
    - access_control_policy_defined
    - encryption_standards_met
    - monitoring_and_logging_implemented
    - change_management_process_documented
    - incident_response_plan_defined
    - vendor_management_program_in_place
    - physical_security_controls_identified
  
  hipaa:
    - baa_executed
    - phi_data_flow_documented
    - encryption_of_phi_at_rest
    - encryption_of_phi_in_transit
    - access_audit_logging
    - breach_notification_process
    - minimum_necessary_standard_applied
  
  pci_dss:
    - cardholder_data_flow_mapped
    - tokenization_or_encryption_applied
    - network_segmentation_verified
    - access_control_standards_met
    - logging_and_monitoring_implemented
    - quarterly_scanning_required
    - asv_validation_required
```

## Stakeholder Sign-Off

### Sign-Off Matrix

| Role | Responsibility | Sign-Off Required For |
|------|---------------|----------------------|
| Solution Architect | Design ownership and presentation | All solutions |
| Lead Architect | Architecture governance | All solutions |
| Security Architect | Security review | Solutions handling sensitive data |
| Platform Architect | Infrastructure and operations | All production solutions |
| Data Architect | Data modeling and storage | Data-intensive solutions |
| Product Manager | Business requirements validation | All solutions |
| Engineering Manager | Development team commitment | Solutions being implemented |
| Compliance Officer | Regulatory compliance | Regulated solutions |
| Finance | Cost approval | Solutions with significant cost |

### Sign-Off Form

```markdown
# Architecture Review Sign-Off

**Solution:** [Name]
**Review Date:** [Date]
**Review Decision:** [Approved / Approved with Conditions / Revise / Rejected]

## Signatures

| Role | Name | Signature | Date | Comments |
|------|------|-----------|------|----------|
| Solution Architect | [Name] | | | |
| Lead Architect | [Name] | | | |
| Security Architect | [Name] | | | |
| Platform Architect | [Name] | | | |

## Condition Tracking (if applicable)

| Condition | Owner | Due Date | Status | Verified By |
|-----------|-------|----------|--------|-------------|
| [Condition] | [Name] | [Date] | [Open/Closed] | [Name] |

## Distribution
- Architecture Decision Log
- Solution documentation repository
- Engineering leadership
```

## Key Points

- Use an eight-dimension scorecard (Security, Scalability, Operability, Cost, Performance, Reliability, Maintainability, Compliance) for consistent architecture evaluation
- Adjust dimension weights based on solution type (internal tool vs critical system vs regulated system)
- Follow a three-phase process: pre-review preparation, review session, and post-review follow-up
- Every architecture decision must have documented alternatives with trade-off analysis
- Compliance validation must be regulation-specific with verifiable checklist items
- Stakeholder sign-off matrix defines who must approve based on solution characteristics
- Risk assessment identifies top risks with likelihood, impact, and mitigation plans
- Action items from review must have owners, due dates, and verification gates
