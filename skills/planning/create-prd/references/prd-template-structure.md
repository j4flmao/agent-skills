# PRD Template Structure

## Overview

A well-structured Product Requirements Document is the single source of truth for what a product team is building and why. This reference provides a comprehensive PRD template with detailed guidance for each section, examples, and customization advice for different project types. The structure balances completeness with readability, ensuring that engineers, designers, QA, and stakeholders can all find the information they need without wading through irrelevant detail.

## Complete PRD Template

```markdown
# Product Requirements Document: {Project Name}

| Metadata | Value |
|----------|-------|
| Document ID | PRD-{YYYY-MM-DD}-{increment} |
| Status | Draft / In Review / Approved |
| Author | {name} |
| Last Updated | {date} |
| Version | {major.minor} |

## Executive Summary

{2-3 paragraphs summarizing the product, the problem it solves, target users,
key metrics, and the expected business impact. This section must stand alone —
executives and stakeholders should understand the product without reading the
rest of the document.}

## Problem Statement

### Current State
{Describe the current situation. What pain points do users experience? What
opportunities are being missed? Include quantitative data where available:
current error rates, manual hours spent, customer support tickets, etc.}

### Desired State
{Describe what the experience should be after this product ships. How does it
change user behavior? What business outcomes improve?}

### Success Metrics
{Define measurable outcomes. Use specific targets with timeframes.}

| Metric | Current Baseline | Target | Measurement Method |
|--------|-----------------|--------|-------------------|
| User activation rate | 25% | 50% within 30 days | Product analytics |
| Task completion time | 8 minutes | 3 minutes | Session recording |
| Customer support tickets | 200/week on X | 50/week | Zendesk analytics |
| NPS score | 32 | 50 | Quarterly survey |

## Target Users and Personas

### Primary Persona: {Name}
- **Role**: {Job title, industry, company size}
- **Goals**: {What they want to accomplish}
- **Pain Points**: {Current frustrations}
- **Technical Level**: {Low / Medium / High}
- **Usage Pattern**: {Daily / Weekly / Occasional}
- **Key Quote**: {A representative quote from user research}

### Secondary Persona: {Name}
- **Role**: ...
- **Goals**: ...
- **Pain Points**: ...
- **Technical Level**: ...
- **Usage Pattern**: ...

### Stakeholder Map
| Stakeholder | Interest | Influence | Engagement Strategy |
|-------------|----------|-----------|-------------------|
| Engineering | Feasibility, complexity | High | Early architecture reviews |
| Design | UX quality | High | Iterative design sprints |
| Sales | Customer demand | Medium | Beta customer access |
| Support | Known issues | Low-Medium | Pre-launch training |
| Legal | Compliance | High | Contract review cycle |

## User Stories and Flows

### Core User Journey Map
{Describe the primary flow from entry to completion. Include decision points,
branching paths, and fallback behaviors.}

```
Entry Point: User lands on homepage / opens app
  |
  ▼
Step 1: Sign up or log in
  |
  ▼
Step 2: Set up profile preferences
  |-- Existing user → Load saved preferences
  |-- New user → Guided setup wizard
  |
  ▼
Step 3: Perform primary action
  |-- Success → Confirmation screen
  |-- Partial success → Guidance for next steps
  |-- Error → Clear error message with resolution path
  |
  ▼
Step 4: Review results
  |
  ▼
Step 5: Share or export (if applicable)
```

### Epic 1: {Epic Name}
**Priority:** P0 | **Dependencies:** None | **Target Sprint:** Sprint 1-2

**Description:** {2-3 sentence description of what this epic covers and why
it is important for the MVP.}

#### Story 1.1: {Story Title}
**Priority:** P0 | **Complexity:** M | **Estimate:** 2 days

As a {persona}, I want to {action} so that {value}.

**Acceptance Criteria:**
```
Happy Path:
Given I am logged in as a registered user
When I navigate to the dashboard
Then I see my personalized overview with key metrics

Edge Case:
Given I am a new user with no data
When I navigate to the dashboard
Then I see an empty state with guidance on first steps

Error Case:
Given the analytics service is unavailable
When I navigate to the dashboard
Then I see a degraded state with cached data and a freshness indicator
```

**Design References:** `figma://project/dashboard-v2` (Screen 3A-3D)
**UX Notes:** Loading skeleton should match final layout to reduce layout shift.

#### Story 1.2: {Story Title}
**Priority:** P0 | **Complexity:** S | **Estimate:** 1 day

As a {persona}, I want to {action} so that {value}.

**Acceptance Criteria:**
...

### Epic 2: {Epic Name}
**Priority:** P1 | **Depends on:** Epic 1 | **Target Sprint:** Sprint 3-4

**Description:** ...

### Epic 3: {Epic Name}
...

## Non-Functional Requirements

### Performance
| Requirement | Target | Measurement | Acceptable Deviation |
|-------------|--------|-------------|-------------------|
| API P95 response time | < 200ms | Application performance monitoring | < 500ms for reporting endpoints |
| Page load (LCP) | < 2.5s | Lighthouse CI | < 4s on 3G connections |
| Time to interactive | < 3.5s | Web Vitals | < 5s for media-rich pages |
| First input delay | < 100ms | RUM data | < 300ms on low-end devices |
| Concurrent users | 10,000 | Load testing | Degrade gracefully to read-only |

### Scalability
- Database: auto-scale read replicas at 70% CPU utilization
- Application: horizontal pod autoscaling based on request latency
- Storage: object storage with CDN for static assets
- Cache: distributed cache with 95% hit rate target

### Security
| Requirement | Standard | Verification |
|-------------|----------|-------------|
| Authentication | OAuth 2.0 / OIDC | Penetration test |
| Encryption at rest | AES-256 | Compliance audit |
| Encryption in transit | TLS 1.3 | Automated check |
| API authorization | RBAC with scoped tokens | Integration tests |
| Secrets management | Vault / AWS Secrets Manager | Audit log review |
| Vulnerability scanning | Weekly SAST + DAST | CI/CD gate |

### Availability
| Tier | Uptime Target | Monthly Downtime Budget |
|------|---------------|----------------------|
| Free | 99.5% | 3.6 hours |
| Pro | 99.9% | 43 minutes |
| Enterprise | 99.99% | 4.3 minutes |

### Compliance
- GDPR: data minimization, right to deletion, data portability
- SOC 2 Type II: annual audit, access controls, change management
- WCAG 2.1 AA: accessibility compliance for all user-facing features

### Browser and Device Support
| Category | Supported Versions |
|----------|------------------|
| Chrome | Last 2 major versions |
| Firefox | Last 2 major versions |
| Safari | Last 2 major versions (including iOS Safari) |
| Edge | Last 2 major versions |
| Mobile | iOS 15+, Android 11+ |
| Screen sizes | 320px - 2560px width |

## Data Model (Conceptual)

### Key Entities
{Define the main data entities without implementation details. Focus on attributes
that affect user-facing behavior.}

```
User
├── id (unique identifier)
├── email (verified)
├── name (display)
├── role (admin | member | viewer)
├── preferences (JSON)
└── created_at

Workspace
├── id
├── name
├── owner (User reference)
├── members (User[] relationships)
├── settings (JSON)
└── created_at

Project
├── id
├── name
├── workspace (Workspace reference)
├── status (active | archived | deleted)
├── due_date (nullable)
└── created_at
```

### Data Relationships
- User belongs to Workspace through Membership (many-to-many with role)
- Workspace has many Projects (one-to-many)
- Project has many Tasks (one-to-many)

## Integration Requirements

### Internal Integrations
| System | Integration Type | Direction | Data |
|--------|-----------------|-----------|------|
| Authentication service | API | Outgoing | User credentials |
| Notification service | Message queue | Outgoing | Email/push events |
| Billing system | Webhook | Incoming | Subscription events |
| Analytics pipeline | Stream | Outgoing | User events |

### External Integrations
| Service | Purpose | Auth Method | Data Volume |
|---------|---------|-------------|-------------|
| Stripe | Payment processing | API key | Low (<100 req/min) |
| SendGrid | Transactional email | API key | Medium (<1000 req/min) |
| AWS S3 | File storage | IAM role | High (variable) |
| Datadog | Monitoring | API key | High (metrics) |

### Webhook Contract
{Define the payload format, retry logic, and security for outgoing webhooks.}

```json
{
  "webhook_version": "1.0",
  "event_type": "project.created",
  "event_id": "evt_abc123",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "project_id": "proj_xyz",
    "name": "Q1 Marketing Campaign",
    "workspace_id": "ws_123"
  }
}
```

## Analytics and Reporting

### Key Events to Track
| Event | Trigger | Properties | Business Question |
|-------|---------|------------|------------------|
| user.signed_up | Registration complete | source, plan, referrer | Which acquisition channels work? |
| project.created | First project created | template_used, type | What is activation rate? |
| feature.used | Feature interaction | feature_name, duration | Which features drive retention? |
| subscription.changed | Plan change | from_plan, to_plan, reason | What drives upgrades/downgrades? |

### Required Reports
- **User activation funnel**: Visitors -> Signups -> First key action -> Retention
- **Feature adoption heatmap**: Usage frequency per feature over time
- **Customer health score**: Composite of login frequency, feature usage, support tickets
- **Churn prediction model**: Risk score based on declining engagement

## Rollout Plan

### Release Phases
| Phase | Scope | Timeline | Success Criteria |
|-------|-------|----------|-----------------|
| Alpha | Core functionality, invited users | Week 1-4 | < 5 critical bugs, NPS > 20 |
| Beta | All features, waitlist users | Week 5-8 | < 10 major bugs, NPS > 30 |
| GA | Public launch | Week 9+ | All acceptance criteria met |

### Feature Flags
| Flag | Purpose | Rollout Strategy | Target Population |
|------|---------|-----------------|-------------------|
| new-dashboard | UI redesign | 10% -> 50% -> 100% | Random users |
| ai-features | Premium feature | Target enterprise accounts | Enterprise tier |
| export-v2 | Improved export | Internal -> Beta -> GA | Staged |

### Rollback Plan
- Feature flags allow instant rollback for UI and functional changes
- Database migrations must be backward-compatible for at least one release cycle
- Dark launch all integrations before enabling for users
- Shadow traffic pattern for critical API changes

## Open Questions and TBDs

| Question | Owner | Deadline | Current Status |
|----------|-------|----------|----------------|
| Should we support SSO for enterprise? | Product | Sprint 2 | Researching Okta/Azure AD |
| What is the max file upload size? | Engineering | Sprint 1 | Load testing needed |
| Do we need SOC 2 before launch? | Legal | Sprint 1 | Awaiting compliance assessment |

## Changelog

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2024-01-10 | 1.0 | Alice | Initial draft |
| 2024-01-12 | 1.1 | Bob | Added API integration section |
| 2024-01-15 | 1.2 | Alice | Updated success metrics based on stakeholder feedback |
```

## Template Customization

### For Mobile Apps
- Add "Offline Capabilities" section
- Add "Push Notification Strategy" section
- Add "App Store Review Considerations" section
- Modify browser support to device/OS support

### For Enterprise Products
- Add "Multi-Tenancy" section
- Add "Admin and Governance" section
- Expand compliance requirements
- Add "Audit Trail" requirements
- Add "SSO and SCIM" requirements

### For API/Platform Products
- Replace "User Stories" with "API Capabilities"
- Add "API Versioning Strategy" section
- Add "Rate Limiting" requirements
- Add "Developer Experience" section
- Include SDK and client library requirements

### For Internal Tools
- Simplify user personas (fewer, more specific)
- Reduce rollout plan (often single deployment)
- Focus on integration requirements
- Emphasize migration strategy from existing system

## Section Depth Guidelines

```
Section                       | MVP PRD | Full PRD | Enterprise PRD
------------------------------|---------|----------|----------------
Executive Summary             | 1 para  | 2-3 para | 1 page
Problem Statement             | 1 para  | 1 page   | 2-3 pages
Target Users / Personas       | 1-2     | 2-3      | 3-5
Epics / Stories               | 5 epics | 6-8 epics| 8-12 epics
Non-Functional Requirements   | 5 items | 15 items | 30+ items
Data Model (conceptual)       | None    | Brief    | Detailed
Integration Requirements      | None    | 5-10     | 15-25
Analytics / Reporting         | None    | Section  | Detailed section
Rollout Plan                  | Brief   | Detailed | Multi-phase
Open Questions                | 3-5     | 5-10     | 10-20
```

## PRD Review Checklist

### Completeness
- [ ] Problem statement clearly defined with current vs desired state
- [ ] Success metrics specified with targets and measurement methods
- [ ] Target users described with personas
- [ ] All epics have descriptions and priority
- [ ] Each story has acceptance criteria with happy, edge, and error paths
- [ ] Non-functional requirements cover performance, security, scalability, availability
- [ ] Integration requirements documented (internal and external)
- [ ] Rollout plan defined with phases and success criteria
- [ ] Open questions tracked with owners and deadlines

### Quality
- [ ] No technical implementation details in stories
- [ ] Acceptance criteria are verifiable (testable)
- [ ] User role names are consistent throughout
- [ ] Epics are independent (can be implemented in any order)
- [ ] Stories trace back to MVP features from the brief
- [ ] Metrics are specific (not "improve performance" but "LCP < 2.5s")
- [ ] Edge cases considered for every story

### Alignment
- [ ] Reviewed by engineering for feasibility
- [ ] Reviewed by design for UX consistency
- [ ] Reviewed by QA for testability
- [ ] Reviewed by product leadership for strategic alignment
- [ ] TBDs have clear owners and deadlines for resolution

## References
- references/prd-collaboration.md — PRD Collaboration
- references/prd-examples.md — PRD Examples
- references/prd-review-checklist.md — PRD Review Checklist
- references/prd-template.md — Product Requirements Document Template
- references/create-prd-advanced.md — Create PRD Advanced Topics
- references/prd-stakeholder-review.md — PRD Stakeholder Review
