# Team Topology Advanced Topics

## Introduction
Advanced team topology covers cognitive load assessment, DDD alignment, team interaction mode optimization, organization sensing, topology evolution, and building platform teams that reduce friction.

## Cognitive Load Assessment

### Types of Cognitive Load

**Intrinsic load**: complexity inherent to the domain or problem. The essential difficulty of the work.

**Extraneous load**: overhead from the environment, tools, processes, and unclear boundaries. This is waste — reduce it.

**Germane load**: effort invested in learning and improvement. This is productive — maintain it.

**Goal**: minimize extraneous load so teams can focus on intrinsic and germane load.

### Cognitive Load Assessment Template

For each team, assess:

```
Team: {name}
Domain: {what they own}

Intrinsic Load Factors:
- Number of subsystems/components owned: {1-10}
- Complexity of domain (1-5): {1=simple CRUD, 5=real-time distributed}
- Rate of change in domain: {stable / evolving / volatile}
- Integration points with other systems: {count}

Extraneous Load Factors:
- How many tools/systems to learn before being productive: {count}
- Deployment process complexity: {simple / moderate / complex / painful}
- On-call incident types and frequency: {count per week}
- Documentation quality (1-5): {1=none, 5=excellent}
- Meeting hours per week: {hours}

Total cognitive load: {low / medium / high / critical}
```

**Thresholds for action**:
- If total COU (Cognitive Overhead Units) > 30: split the team's domain
- If extraneous load score > 60%: invest in platform improvements
- If on-call pager is #1 source of extraneous load: needs dedicated SRE support
- If team has been at "critical" for 2+ quarters: reorganization needed

### Cognitive Load Reduction Strategies

**Platform improvement**: remove manual steps, automate deployments, improve monitoring. Directly reduces extraneous load.

**Domain splitting**: divide team's domain into smaller bounded contexts. Assign sub-teams to each.

**Enabling team support**: bring in experts to coach on complex domain aspects. Reduces intrinsic load through skill building.

**Simplify interfaces**: one well-designed API is easier to maintain than 3 inconsistent ones.

**Documentation investment**: reduce learning curve for new members and cross-team understanding.

## Domain-Driven Design (DDD) Alignment

### Bounded Contexts and Team Boundaries

Each bounded context should map to one stream-aligned team.

**Bounded context characteristics**:
- Clear boundary (what's in, what's out)
- Ubiquitous language (shared vocabulary within context)
- Owns its data (no direct database access from outside)
- Exposes API for inter-context communication

**Mapping example**:
```
Bounded Context        | Team             | API                    | Data Store
Inventory Management   | Inventory Team   | gRPC: StockService     | inventory-db
Order Processing       | Orders Team      | REST: /api/orders      | order-db
Customer Management    | Customer Team    | GraphQL: customer API  | customer-db
Payment Processing     | Payments Team    | Event: PaymentEvent    | payment-db
Shipping               | Shipping Team    | Async: ShipmentCommand | shipping-db
```

### Entity, Aggregate, and Value Object Boundaries

Design teams around aggregates (clusters of related entities):

- Each aggregate owned by exactly one team
- Aggregate boundaries define team responsibilities
- Aggregates communicate via events or commands
- Team owns all entities within their aggregates

**If an aggregate spans two teams, either**:
- Merge the teams (one stream-aligned team)
- Split the aggregate (redesign boundaries)
- Add a platform service (shared but owned by platform team)

### Context Mapping

Relationship between bounded contexts:

**Partnership**: two contexts collaborate to deliver a feature. Regular coordination. Limited duration.

**Shared Kernel**: shared subset of model. High coupling — use sparingly. Both teams agree on shared portion.

**Customer-Supplier**: upstream (supplier) determines API. Downstream (customer) adapts. Power imbalance.

**Conformist**: downstream conforms to upstream's model without influence. Accepts whatever upstream provides.

**Anticorruption Layer**: downstream creates translation layer to protect its model from upstream changes. Ugly but necessary.

**Open Host Service**: upstream provides well-documented API for all consumers. Public service protocol.

**Published Language**: shared standard format (e.g., OpenAPI, AsyncAPI). Both sides use it independently.

## Team Interaction Mode Optimization

### Collaboration Mode Effectiveness

| Interaction Mode | Best When | Risk | Duration |
|-----------------|-----------|------|----------|
| Collaboration | Exploring new territory, shared problem solving | Becomes permanent, blurs ownership | Weeks, not months |
| X-as-a-Service | Clear provider/consumer, well-understood domain | Provider doesn't meet all needs | Ongoing |
| Facilitating | Capability building, knowledge transfer | Dependency on facilitator | Timeboxed, goal-oriented |

### Detecting Mode Mismatches

**Collaboration mode when X-as-a-Service would suffice**:
- Teams meet daily for a well-understood interface
- Provider team in every meeting of consumer team
- No clear ownership boundary

**Fix**: define explicit interface, reduce meeting frequency, restore team autonomy.

**X-as-a-Service when collaboration is needed**:
- Consumer constantly blocked by provider changes
- Provider doesn't understand consumer needs
- Rapid iteration required but provider enforces slow release cycle

**Fix**: temporary collaboration mode to resolve issues, then return to X-as-a-Service with improved interface.

### Interaction Mode Transition Guide

```
Start with: Collaborate
├── Outcome achieved → Transition to X-as-a-Service
├── More discovery needed → Extend collaboration (timeboxed)
└── No shared understanding → Bring in enabling team

Start with: X-as-a-Service
├── Consumer needs not met → Temporary collaboration
├── Interface stable → Maintain X-as-a-Service
└── Consumer wants platform → Extract to platform team
```

## Organization Sensing

### Topology Health Indicators

| Indicator | Green | Yellow | Red |
|-----------|-------|--------|-----|
| Cross-team dependencies | < 3 per team | 3-6 per team | > 6 per team |
| Handoff wait time | < 1 day | 1-3 days | > 3 days |
| Deployment frequency | Multiple times/week | Weekly | Monthly or less |
| Team cognitive load | Low-medium | Medium-high | High-critical |
| Team stability | > 12 months | 6-12 months | < 6 months |
| Feature cycle time | < 1 week | 1-3 weeks | > 3 weeks |

### Sensing Mechanisms

**Regular checkpoints** (quarterly):
- Team topology review: are boundaries still correct?
- Dependency audit: are cross-team dependencies increasing or decreasing?
- Cognitive load assessment: is any team overloaded?
- Interaction mode review: are teams using the right modes?

**Continuous sensing**:
- DORA metrics (deployment frequency, lead time, MTTR, change failure rate)
- Team satisfaction (pulse surveys, 1:1s, retros)
- Code ownership patterns (is code seeing contributions from unexpected teams?)
- Communication patterns (Slack/Jira cross-team interaction analysis)

## Topology Evolution

### When to Change Topology

**Reasons to reorganize**:
- Cognitive load exceeds capacity (team can't keep up)
- Dependency graph is too complex (too many handoffs)
- Conway's Law misalignment (system architecture doesn't match team structure)
- Growth (team > 10 people, split into two)
- New strategic priority (new product, market, technology)
- Persistent delivery problems not solved by process changes

**Not reasons to reorganize**:
- New manager wants to make their mark
- Following a trend (spotify model, squadification)
- Quarterly restructuring habit
- Fixing a personnel problem (address directly, not via org design)

### Topology Change Process

1. **Identify problem**: data showing delivery problems, cognitive overload, or misalignment
2. **Design target topology**: desired team structure and interaction modes
3. **Assess impact**: what changes for each team? Who's affected?
4. **Plan transition**: phased approach, communication plan, support during transition
5. **Communicate**: why, what, when, how each team is affected
6. **Execute**: reorganize teams, update ownership, migrate code
7. **Stabilize**: minimize further changes for 3-6 months
8. **Measure**: did the topology change solve the original problem?

### Stability vs Evolution

Stable teams outperform frequently reorganized teams. But static topology can become misaligned.

**Balance**:
- Reorganize no more than once per year
- Unless critical issue demands immediate change
- Teams need 3-6 months to reach performing state post-reorg
- Measure impact of reorganization (did it solve the problem?)
- Default: stable teams with quarterly health checks

## Platform Team Design

### Platform as a Product Mindset

Treat the internal platform like a customer-facing product:

- **User research**: understand what consuming teams need (not what platform team wants to build)
- **Product roadmap**: planned capabilities with release dates
- **Documentation**: onboarding guide, API reference, tutorials, best practices
- **SLAs**: availability, latency, response time commitments
- **Feedback loops**: user satisfaction surveys, feature requests, NPS
- **Deprecation policy**: clear timeline for removing old features

### Platform Capability Catalog

Standard platform capabilities:
```
Capability          | Description                           | Example Tools
CI/CD               | Build, test, deploy pipeline          | GitHub Actions, Jenkins, GitLab CI
Infrastructure      | Compute, network, storage provisioning| Terraform, Pulumi, CloudFormation
Observability       | Metrics, logs, traces, alerting       | Prometheus, Grafana, Datadog
Secrets management  | Credential storage and rotation        | Vault, AWS Secrets Manager
Service mesh        | Service-to-service communication      | Istio, Linkerd, Consul
Container platform  | Container orchestration               | Kubernetes, ECS, Nomad
Developer portal    | Service catalog, docs, API registry   | Backstage, Catalog, Build your own
Security scanning  | SAST, DAST, dependency, secret scan   | Snyk, SonarQube, Trivy, Semgrep
```

### Platform Adoption Strategy

1. **Solve real pain**: build what consuming teams explicitly request
2. **Make it 10x better**: teams will adopt voluntarily if platform is clearly superior
3. **Provide migration support**: enabling team helps with migration
4. **Don't deprecate old solutions until platform is proven**: parallel run
5. **Measure adoption rate**: track % of teams using each platform capability
6. **Celebrate success stories**: show how platform improved team delivery

## Key Points
- Cognitive load assessment identifies overloaded teams requiring reorganization
- Minimize extraneous load through platform improvements and clear boundaries
- Map bounded contexts to teams — each context owned by one stream-aligned team
- Context mapping reveals relationship patterns between teams
- Interaction modes: Collaborate (explore), X-as-a-Service (consume), Facilitate (learn)
- Detect mode mismatches and transition as relationships mature
- Reorganize only when data shows structural problem — max once per year
- Platform as a product: user research, roadmap, documentation, SLAs, feedback loops
- Platform adoption is voluntary — make it 10x better to drive organic adoption
- Stable teams + quarterly sensing balances performance with evolution
