# Change and Release Management

## Introduction

Change management controls the lifecycle of all changes to IT services with minimal disruption. Release management handles deployment of authorized changes into production. Together they ensure safe, consistent service transitions.

## Change Management

### Change Types

| Type | Definition | Approval Path | Implementation | Documentation |
|------|------------|---------------|----------------|---------------|
| Standard | Pre-approved, low risk, well-documented | Pre-approved (Change Authority) | Any time | Change Model, Record for audit |
| Normal | Requires assessment and approval | CAB or delegated authority | Scheduled | Full RFC with assessment |
| Emergency | High risk, urgent (security fix, Sev1) | Emergency CAB (ECAB) | Immediate | RFC + retrospective within 5 business days |

### Change Authority Matrix

| Change Type | Low Risk | Medium Risk | High Risk | Very High Risk |
|-------------|----------|-------------|-----------|----------------|
| Standard | Pre-approved | N/A | N/A | N/A |
| Normal Minor | Change Manager | Change Manager | CAB | CAB + Exec |
| Normal Significant | CAB | CAB | CAB + Exec | Exec Board |
| Emergency | ECAB | ECAB | ECAB + CIO | CIO + Exec |

### Change Model Components
- Change type classification criteria
- Approval authority and routing rules
- Assessment checklist per risk level
- Implementation and back-out plan requirements
- Testing and validation requirements
- Communication and notification plan
- Post-implementation review (PIR) requirements

### Normal Change Process

1. **Raise RFC**: Submit Request for Change with detailed description, justification, risk assessment, implementation plan, and back-out plan
2. **Classify and Prioritize**: Categorize by type (standard/normal/emergency), assess impact and urgency, assign priority
3. **Assess and Evaluate**: Technical review, risk assessment, resource estimation, schedule coordination
4. **Authorize**: Route to appropriate authority based on change type and risk level
5. **Plan and Coordinate**: Schedule implementation, assign resources, update stakeholders, plan testing
6. **Build and Test**: Develop change components, execute test plan, validate results
7. **Implement**: Deploy change per implementation plan, execute back-out if needed
8. **Review and Close**: Post-implementation review, verify success, update CMDB, close change record

### Change Advisory Board (CAB)

| ROLE | RESPONSIBILITY |
|------|---------------|
| Change Manager (Chair) | CAB operations, process compliance, minutes |
| Service Owner | Business impact assessment |
| Technical Representatives | Technical feasibility and risk assessment |
| Security Representative | Security impact analysis |
| Operations Representative | Operational readiness assessment |
| Release Manager | Release schedule coordination |
| Application Support | Application-specific impact |

### CAB Meeting Agenda
1. Review of previous minutes and actions
2. Approved changes report from last period
3. Outstanding emergency change retrospective
4. New normal change submissions
5. Forward schedule of change review
6. Change performance metrics review

### Emergency Change Process
1. **Identification**: Security vulnerability, Sev1 outage fix requiring config change
2. **ECAB Convening**: Change Manager assembles ECAB (minimum: Change Manager, technical lead, security rep)
3. **Risk Assessment**: Rapid risk assessment focusing on business impact and failure likelihood
4. **Authorization**: ECAB decision (approve, reject, require further assessment)
5. **Implementation**: Deploy with accelerated testing and monitoring
6. **Retrospective**: Within 5 business days, full review and documentation

## Release Management

### Release Types

| Release Type | Scope | Risk | Frequency | Examples |
|-------------|-------|------|-----------|----------|
| Major | Significant functionality changes | High | Quarterly to bi-annual | Version upgrades, new modules |
| Minor | Small enhancements and fixes | Medium | Monthly | Feature additions, patches |
| Emergency | Critical fixes for production issues | Variable | As needed | Hotfixes, security patches |

### Release Units
- **Definition**: The smallest individually deployable entity
- **Examples**: Container image, database migration script, configuration file
- **Characteristics**: Self-contained, versioned, tested independently
- **Dependencies**: Must be documented with other required release units

### Release Policy Components
- Release types and definitions
- Release cadence and schedule
- Release unit identification and versioning
- Deployment approach (big bang, phased, rolling, blue-green, canary)
- Rollback and back-out procedures
- Testing and validation gates
- Approval authorities per release type
- Communication and stakeholder notification

### Release Management Process
1. **Release Planning**: Define scope, schedule, and resource requirements; coordinate with change management for RFCs
2. **Release Build**: Assemble release units, version control, dependency resolution, baseline creation
3. **Release Testing**: Unit, integration, system, and UAT; sign-off from all test phases
4. **Release Acceptance**: Formal acceptance by service owner; verify against release criteria
5. **Release Deployment**: Execute deployment plan per change schedule; communicate status
6. **Early Life Support**: Enhanced monitoring and support for defined period (typically 48-72 hours)
7. **Release Closure**: Post-implementation review; lessons learned; update CMDB

### Rollback Planning

| Rollback Strategy | Approach | Downtime | Data Impact | Best For |
|------------------|----------|----------|-------------|----------|
| Back-out Scripts | Pre-written scripts to revert changes | Same as original | Minimal | Configuration changes |
| Blue-Green | Switch traffic back to previous environment | Seconds | None | Application deployments |
| Database Restore | Restore from pre-deployment backup | Longer | May lose post-deployment data | Database changes |
| Feature Flag | Disable feature at runtime | None | None | Feature rollouts |
| Version Rollback | Deploy previous release version | Standard deployment time | Varies | Full application rollback |

### Release Coordination with Change Management
- All releases require corresponding change records
- Emergency releases follow emergency change process
- Release schedule feeds forward schedule of change
- CAB reviews significant releases as part of change approval
- Release closures trigger post-implementation reviews
