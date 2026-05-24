# Architecture Decision Rights

## Introduction

Architecture decision rights define who can make which architecture decisions, under what conditions, and through what process. A clear decision rights framework prevents bottlenecks, enables faster decisions, and maintains architectural integrity across the enterprise.

## Decision Categories

### Decision Taxonomy

| Category | Sub-Category | Examples |
|----------|-------------|----------|
| Technology | Platform Selection | Cloud provider, database engine, messaging system |
| Technology | Tool Selection | CI/CD platform, monitoring tool, API gateway |
| Technology | Version Upgrades | Major version upgrades, deprecation decisions |
| Design | Architecture Pattern | Microservices vs. monolith, event-driven vs. request/response |
| Design | Integration Pattern | Sync vs. async, API style (REST, gRPC, GraphQL) |
| Design | Data Model | Entity definitions, relationship patterns, data distribution |
| Standards | Technology Standards | Approved languages, frameworks, runtimes |
| Standards | Coding Standards | Conventions, linting rules, testing requirements |
| Standards | Security Standards | Encryption requirements, authentication protocols |
| Exceptions | Standard Waiver | Temporary deviation from approved standard |
| Exceptions | Principle Deviation | Long-term alternative approach to a principle |

### Decision Impact Levels

| Level | Scope | Examples | Time Sensitivity |
|-------|-------|----------|-----------------|
| Level 1 -- Team | Single team, isolated | Library version, code pattern | Low |
| Level 2 -- Domain | Multiple teams, same domain | API design pattern, database choice | Medium |
| Level 3 -- Cross-Domain | Multiple domains, enterprise impact | Cloud provider, messaging platform | High |
| Level 4 -- Enterprise | Organization-wide | Enterprise integration platform, identity provider | Critical |

## RACI Matrix for Decisions

### Key Roles

| Role | Description |
|------|-------------|
| Enterprise Architect | Overall architecture strategy, principles, standards |
| Domain Architect (Business/Data/App/Tech/Security) | Architecture within a specific domain |
| Solution Architect | Architecture for a specific solution or project |
| Lead Engineer | Technical leadership for implementation team |
| Product Manager | Business requirements and priorities |
| Project Manager | Delivery timeline and resource constraints |
| Security Lead | Security requirements and risk acceptance |
| Operations Lead | Operational requirements and runability |

### Decision RACI

| Decision | Enterprise Architect | Domain Architect | Solution Architect | Lead Engineer | Product Manager | Security Lead |
|----------|---------------------|-----------------|-------------------|---------------|-----------------|---------------|
| Technology Standard Selection | A | R | C | C | I | C |
| Technology Standard Exception | A | R | C | C | I | C |
| Domain Architecture Pattern | I | A/R | C | C | I | C |
| Solution Architecture Pattern | I | A | R | C | C | I |
| Framework/Library Version | C | A | R | C | I | C |
| API Design (Internal) | I | C | A | R | C | I |
| API Design (External) | C | R | A | C | C | C |
| Data Model (Domain) | C | A/R | C | I | C | I |
| Security Architecture | C | C | C | C | I | A/R |
| Deployment Architecture | I | A | R | C | I | C |
| Monitoring Approach | I | A | R | R | I | C |

**Key**: R = Responsible, A = Accountable, C = Consulted, I = Informed

### Decision Authority by Level

| Decision Level | Decision Authority | Escalation |
|---------------|-------------------|------------|
| L1 -- Team | Solution Architect or Lead Engineer | Domain Architect |
| L2 -- Domain | Domain Architect | Enterprise Architect |
| L3 -- Cross-Domain | Enterprise Architect | Architecture Board |
| L4 -- Enterprise | Architecture Board | Executive Committee |

## Delegation Rules

### Standing Delegations
- Domain Architects can make Level 1 decisions within their domain without escalation
- Solution Architects can make Level 1 decisions for their solution
- Technology decisions following approved standards are delegated to implementation teams
- Standard change requests for approved technologies are pre-approved

### Delegation Conditions
| Delegation | From | To | Conditions |
|------------|------|-----|------------|
| Technology selection within standard | Enterprise Architect | Domain Architect | Technology must be on approved list |
| Exception for minor deviations | Architecture Board | Chair | <= 30 days, no security impact |
| API design for internal services | Domain Architect | Solution Architect | Must follow domain API standards |
| Data model changes | Enterprise Architect | Data Architect | No change to enterprise entities |

### Delegation Revocation
The delegating authority may revoke a delegation at any time for:
- Pattern of poor decisions
- Significant change in context
- New risk or compliance requirement
- Delegation abuse or scope creep

## Override Process

### Override Scenarios
| Scenario | Trigger | Override Authority | Conditions |
|----------|---------|-------------------|------------|
| Business urgency | Time-sensitive opportunity | Executive Sponsor + Enterprise Architect | Retrospective review within 30 days |
| Technical emergency | Production outage | Operations Lead + Security Lead | Full review within 5 business days |
| Strategic conflict | Enterprise strategy change | CIO | Architecture Board consultation |
| Unresolved disagreement | Impasse at any level | Next-level authority | Documented rationale |

### Override Process Steps
1. Decision maker identifies need for override
2. Override request submitted with business justification
3. Impact assessment performed (can be expedited)
4. Override authority makes decision
5. Decision documented with rationale and expiration
6. Retrospective review scheduled if applicable

### Override Documentation
```
## Override Decision Record
**ODR-{####}**: {Title}
**Date**: {YYYY-MM-DD}
**Overridden Decision**: {reference to original ADR or decision}
**Override Authority**: {name and role}

### Justification
{Business reason for override}

### Risk Acceptance
{Risks accepted as part of override}

### Conditions
{Conditions and expiration}

### Review Date
{Date for retrospective review}
```

## Decision Governance Process

### Standard Decision Flow
1. **Identify Need**: Decision requirement identified by any stakeholder
2. **Assess Category**: Classify decision type and impact level
3. **Determine Authority**: Map to RACI and decision level
4. **Prepare Information**: Gather necessary data, alternatives, impacts
5. **Make Decision**: Decision maker exercises authority
6. **Document**: Record decision with rationale
7. **Communicate**: Inform all stakeholders per RACI
8. **Implement**: Execute decision
9. **Review**: Periodic review for continued relevance

### Decision Metrics
| Metric | Target | Purpose |
|--------|--------|---------|
| Decision turnaround time | < 5 business days (L1-L2), < 10 days (L3-L4) | Velocity |
| Override rate | < 5% of decisions | Delegation effectiveness |
| Reversal rate | < 2% of decisions | Decision quality |
| Stakeholder satisfaction | > 4.0 / 5.0 | Decision process quality |

### Dispute Resolution
1. Attempt resolution at current decision level
2. Escalate to next-level authority
3. Architecture Board mediation for cross-domain disputes
4. Executive Committee for strategic or unresolvable disputes
5. All disputes and resolutions documented in governance records
