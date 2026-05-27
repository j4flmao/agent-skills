# IDP Scorecard: Maturity Assessment Framework

## Overview

The IDP Scorecard is a structured maturity model for assessing your Internal Developer Platform across five critical dimensions. Each dimension has four maturity levels, specific criteria, and measurable indicators. Use this framework to baseline your current state, identify improvement areas, and track progress over time.

## Scorecard Dimensions

### 1. Developer Experience (DX)

Measures how easy, fast, and enjoyable it is for developers to deliver value through the platform.

**Level 1: Manual**
- Developers manually provision infrastructure through cloud consoles or ticketing systems
- No self-service capabilities; every deployment requires platform team intervention
- Average time-to-production: days to weeks
- Developer satisfaction: unmeasured or low
- No standardized development environments; each team sets up independently

**Level 2: Basic Self-Service**
- Limited self-service via Backstage templates or basic web forms
- Developers can provision predefined infrastructure stacks
- Time-to-production: hours to days
- Basic documentation exists but is scattered
- Environment provisioning is partially automated
- Developer satisfaction measured annually via surveys

**Level 3: Platform-Aware**
- Comprehensive self-service catalog with 80%+ coverage of common needs
- Golden paths guide developers through production-ready setups
- Time-to-production: minutes to hours
- Documentation integrated into developer portal (TechDocs)
- Developer feedback loops established with quarterly NPS tracking
- Platform team proactively improves DX based on usage analytics

**Level 4: Developer-Centric**
- Self-service covers 95%+ of development workflows
- Platform anticipates developer needs with intelligent defaults
- Time-to-production: minutes
- Platform is the default, not the exception
- Developer NPS tracked in real-time with sentiment analysis on feedback
- Platform team spends 70%+ of time on feature work, not firefighting

### 2. Platform Reliability

Measures the operational health and stability of the platform itself.

**Level 1: Fragile**
- Platform components are manually deployed and managed
- No formal SLOs for platform services
- Platform team reacts to incidents
- Backstage/portal uptime unmeasured
- No disaster recovery plan for platform components
- Change management is ad-hoc

**Level 2: Monitored**
- Platform components have basic monitoring and alerting
- Platform services have defined SLOs
- Incident response follows documented process
- Backstage uptime measured but below 99.5%
- Weekly maintenance windows cause developer disruption
- Change management is documented but not enforced

**Level 3: Reliable**
- Platform meets 99.9%+ uptime SLOs
- Automated rollbacks for platform changes
- Canary deployments for platform updates
- Self-healing infrastructure for platform components
- Incident postmortems drive platform improvements
- Changes follow a standardized review and deployment process
- Disaster recovery tested quarterly

**Level 4: Resilient**
- Platform exceeds 99.99% uptime across all components
- Multi-region active-active platform deployment
- Automatic failover with zero-downtime upgrades
- Platform survives region-level outages without developer impact
- All changes are fully automated with progressive delivery
- Chaos engineering exercises validate platform resilience
- Platform reliability continuously improves based on failure mode analysis

### 3. Self-Service Coverage

Measures the breadth and depth of capabilities developers can access without platform team intervention.

**Level 1: No Self-Service**
- All infrastructure requests go through ticketing
- No service catalog; each team manages their own configs
- Platform team is a bottleneck for all operations
- Zero automation for common tasks
- Developers cannot deploy independently

**Level 2: Basic Catalog**
- Backstage software catalog with basic entity registration
- Limited set of templates for common service types
- Some infrastructure automation through Terraform modules
- Developers can request but not fully self-serve
- Template coverage: < 30% of common workflows
- Manual approval gates for most operations

**Level 3: Comprehensive**
- Full Backstage catalog with automated entity discovery
- Templates cover 70%+ of common development workflows
- Infrastructure provisioning fully automated via Crossplane/Terraform
- Developers can deploy, scale, and configure independently
- Self-service includes databases, caches, queues, and DNS
- Automated compliance checks built into templates
- Resource cleanup and decommissioning automated

**Level 4: Universal**
- Complete self-service covering all development and operational needs
- Templates dynamically adapt based on service characteristics
- AI-assisted template configuration with smart defaults
- Cross-service orchestration (deploy a service + its dependencies)
- Self-service extends to non-standard workflows
- Platform continuously expands coverage based on usage patterns
- Developer can build and deploy a complete microservice with no platform team interaction

### 4. Platform Adoption

Measures how widely the platform is used across the organization.

**Level 1: Skepticism**
- < 20% of eligible teams use the platform
- Teams actively choose alternatives over the platform
- No executive sponsorship for platform adoption
- Platform team perceived as a blocker, not an enabler
- No adoption metrics tracked
- Shadow IT and non-platform solutions prevalent

**Level 2: Early Adoption**
- 20-50% of eligible teams onboarded
- Executive sponsor identified but not fully engaged
- Early adopters providing positive feedback
- Adoption metrics tracked but not widely shared
- Some teams still using non-platform solutions
- Onboarding process exists but is manual and slow
- Internal marketing of platform benefits begun

**Level 3: Growth**
- 50-80% of eligible teams actively using the platform
- Executive sponsor actively champions the platform
- Platform is the recommended path for new services
- Non-platform solutions being actively migrated
- Adoption metrics visible to the whole organization
- Self-service onboarding with automated setup
- Referral program: existing teams help onboard new teams

**Level 4: Standard**
- > 80% adoption rate across eligible teams
- Platform is the default choice mandated by engineering leadership
- Platform team consulted early in every new initiative
- Zero non-platform alternatives for standard workflows
- Adoption metrics tied to engineering KPIs and performance reviews
- Platform contributions from dev teams (InnerSource model)
- Platform team focused on extending capabilities, not driving adoption

### 5. Platform Engineering Maturity

Measures the sophistication of the platform team's practices and culture.

**Level 1: Ad-Hoc**
- Platform team is a side responsibility, not dedicated
- No platform roadmap or vision document
- Tooling decisions made reactively
- Platform built as a collection of disconnected scripts
- No versioning or release process for platform changes
- Team lacks dedicated product management

**Level 2: Defined**
- Dedicated platform team with clear mission
- Platform roadmap exists but is not regularly updated
- Basic platform-as-a-product mindset emerging
- Platform components are versioned and documented
- Quarterly planning aligned with developer needs
- Platform team has a product manager

**Level 3: Managed**
- Platform team follows product management practices
- Roadmap driven by developer feedback and usage data
- Platform has clear KPIs tied to business outcomes
- Regular platform releases with release notes
- Platform team size scales with developer count (1:20 ratio target)
- Platform team includes UX and technical writing support
- InnerSource contributions from development teams

**Level 4: Optimizing**
- Platform team operates as a mature product organization
- Roadmap is data-driven with A/B testing of platform features
- Platform KPIs directly linked to business OKRs
- Automated platform experiments validate improvements
- Team autonomously identifies and prioritizes improvements
- Platform team is a career destination, not a stepping stone
- Platform decisions documented as ADRs with community input

## Assessment Framework

### Scoring Rubric

Each dimension is scored on a 1-4 scale. The overall maturity is the average across all five dimensions.

| Score | Label | Description |
|-------|-------|-------------|
| 1.0-1.9 | Initial | Platform exists but is immature; significant investment needed |
| 2.0-2.9 | Defined | Basic platform capabilities established; systematic improvements ongoing |
| 3.0-3.4 | Managed | Platform delivers measurable value; optimization phase |
| 3.5-4.0 | Optimized | Platform is a strategic asset driving engineering velocity |

### Assessment Process

1. **Self-assessment**: Platform team scores each dimension using the criteria. Collect evidence for each score.
2. **Developer survey**: Deploy a survey to measure perceived DX, self-service adequacy, and platform satisfaction. Compare with the team's self-assessment.
3. **Usage analytics audit**: Extract platform usage data from Backstage, CI/CD systems, and infrastructure provisioning tools. Compare actual usage against survey responses.
4. **Score validation**: Review findings with platform stakeholders (VP Engineering, DevTeam leads, Platform PM). Adjust scores based on discussion.
5. **Gap analysis**: Identify the largest gaps between current and target maturity. Prioritize based on developer impact and effort.
6. **Improvement roadmap**: Define specific initiatives with owners and timelines to close gaps. Each initiative should target moving one dimension to the next level.

### Assessment Cadence

- **Full scorecard**: Quarterly
- **Lightweight pulse check**: Monthly (developer NPS + usage metrics only)
- **Gap review**: Bi-weekly during platform sprint planning

## Metrics Collection

### Quantitative Metrics

```yaml
# Platform Metrics Dashboard
platform:
  adoption:
    eligible_teams: 45
    onboarded_teams: 38
    adoption_rate_percent: 84.4
    new_services_platform_percent: 91.2
    migrated_legacy_services: 12
  self_service:
    template_count: 47
    template_coverage_percent: 73
    weekly_template_executions: 230
    avg_template_completion_minutes: 4.2
    most_used_templates:
      - microservice-fastapi
      - data-pipeline-python
      - terraform-module
  developer_experience:
    nps_score: 52
    survey_response_rate_percent: 38
    avg_time_to_production_minutes: 47
    support_ticket_count: 18
    avg_ticket_resolution_hours: 6.5
  reliability:
    backstage_uptime_percent: 99.92
    api_uptime_percent: 99.98
    incident_count: 3
    avg_incident_resolution_minutes: 28
    change_failure_rate_percent: 2.1
```

### Qualitative Metrics

- **Developer NPS survey**: Quarterly, 5-point scale, include free-text for qualitative feedback
- **Platform satisfaction survey**: Bi-annual, covers self-service, documentation, performance, and support
- **Onboarding feedback**: Survey sent after every new team onboarding, focus on friction points
- **Exit interviews**: When teams leave the platform, understand why

### Metric Targets by Maturity Level

| Metric | L1 | L2 | L3 | L4 |
|--------|----|----|----|-----|
| Adoption rate | < 20% | 20-50% | 50-80% | > 80% |
| Time to production | Days | Hours | Minutes | Minutes |
| Developer NPS | < 0 | 0-30 | 30-60 | > 60 |
| Platform uptime | < 99% | 99-99.5% | 99.5-99.9% | > 99.9% |
| Template coverage | < 10% | 10-50% | 50-80% | > 80% |
| Support tickets/week | > 50 | 20-50 | 5-20 | < 5 |

## Improvement Roadmap Template

```yaml
# idp-improvement-roadmap.yml
quarter: "2025-Q2"
current_score: 2.4
target_score: 3.0
initiatives:
  - name: "Extend template catalog to 70% coverage"
    dimension: self_service_coverage
    current_level: 2
    target_level: 3
    efforts:
      - "Create 15 missing templates based on usage gap analysis"
      - "Add template versioning and deprecation workflow"
      - "Build template testing framework"
    owner: "platform-team"
    deadline: "2025-06-30"
    dependencies: []
  - name: "Improve Backstage uptime to 99.9%"
    dimension: platform_reliability
    current_level: 2
    target_level: 3
    efforts:
      - "HA deployment for Backstage components"
      - "Automated failover testing"
      - "Implement SLO monitoring and alerting"
    owner: "sre-team"
    deadline: "2025-05-15"
    dependencies: ["infra-team to provision HA DB"]
  - name: "Implement developer NPS tracking"
    dimension: developer_experience
    current_level: 1
    target_level: 2
    efforts:
      - "Deploy in-app NPS survey in Backstage"
      - "Set up monthly dashboard for NPS trends"
      - "Create feedback review process in sprint planning"
    owner: "platform-pm"
    deadline: "2025-04-30"
    dependencies: []
```

## Scorecard Report Template

```markdown
# IDP Scorecard Report: Q2 2025

## Overall Score: 2.6 / 4.0 (Defined → Managed)

| Dimension | Current | Previous | Target | Δ |
|-----------|---------|----------|--------|---|
| Developer Experience | 2.5 | 2.0 | 3.0 | +0.5 |
| Platform Reliability | 2.0 | 1.5 | 2.5 | +0.5 |
| Self-Service Coverage | 3.0 | 2.5 | 3.5 | +0.5 |
| Platform Adoption | 3.0 | 2.5 | 3.5 | +0.5 |
| Platform Engineering | 2.5 | 2.0 | 3.0 | +0.5 |

## Key Wins
- Template catalog expanded from 30% to 55% coverage
- Backstage uptime improved from 99.2% to 99.7%
- Onboarded 4 new teams (total: 24/45 eligible)

## Key Risks
- Developer NPS dropped from 35 to 28 (investigate via free-text feedback)
- Support ticket volume increased 40% due to template bugs
- Platform team is understaffed (1:45 vs target 1:20)

## Next Quarter Priorities
1. Improve template quality to reduce support tickets
2. Hire 2 additional platform engineers
3. Implement automated onboarding for remaining teams
```

## Key Points

- Score five dimensions: Developer Experience, Platform Reliability, Self-Service Coverage, Platform Adoption, Platform Engineering Maturity
- Each dimension has four maturity levels with concrete criteria and metrics
- Assess quarterly with monthly pulse checks using usage analytics and developer surveys
- Drive improvement with data-backed roadmaps tied to dimension scores
- Use the scoring rubric to communicate platform value to executive stakeholders
- Link platform KPIs to engineering organization OKRs for alignment
