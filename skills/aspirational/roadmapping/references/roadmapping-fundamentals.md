# Strategic Roadmapping Fundamentals

## Overview
Strategic roadmapping aligns technology initiatives with business outcomes by connecting vision to execution through prioritization, timeline planning, and stakeholder communication. This reference covers the foundational frameworks, data models, and planning processes for effective roadmapping.

## Core Concepts

### What is a Roadmap?
A roadmap is a strategic communication tool that shows:
- **What** you're building (initiatives, not features)
- **Why** it matters (outcomes, OKR linkage, value)
- **When** (time horizon, not specific dates)
- **Who** is responsible (owners, teams)

A roadmap is NOT a project plan (no Gantt charts) or a backlog (no individual tasks).

### Roadmap Horizons
| Horizon | Timeframe | Detail Level | Certainty | Audience |
|---------|-----------|-------------|-----------|----------|
| Now | 0-3 months | Story/epic-level | High (90%+) | Engineering, PM |
| Next | 3-6 months | Epic/initiative-level | Medium (70%) | Product teams, stakeholders |
| Later | 6-12 months | Theme/initiative-level | Low (40%) | Leadership, strategy |
| Future | 12+ months | Vision, strategic bets | Very Low (10%) | Executive, board |

### Roadmap vs. Backlog vs. Project Plan
| Dimension | Roadmap | Backlog | Project Plan |
|-----------|---------|---------|--------------|
| Purpose | Strategy communication | Work tracking | Execution scheduling |
| Audience | Stakeholders, leadership | Engineering team | PM + engineering leads |
| Granularity | Initiatives, themes | Stories, tasks | Milestones, dependencies |
| Time span | 3-18 months | 1-3 sprints | 1-6 months |
| Update frequency | Monthly/quarterly | Continuous (sprint cycle) | Biweekly |
| Certainty | Intentional ambiguity | Precisely scoped | Milestone-based |

## Strategic Roadmapping Frameworks

### Framework 1: Now-Next-Later
The most common modern roadmapping framework. Theme-based, outcome-focused, date-agnostic.

```
NOW (Q2 2026)                    NEXT (Q3 2026)                  LATER (Q4 2026-H1 2027)
├── Platform Stability           ├── API Marketplace              ├── AI-Powered Analytics
│   ├── Multi-region deploy      │   ├── Partner onboarding       │   ├── Predictive insights
│   ├── P99 < 200ms              │   ├── Usage-based billing      │   ├── Anomaly detection
│   └── 99.99% uptime            │   └── API catalog              │   └── Recommendations
├── Developer Experience         ├── Mobile SDK Suite             ├── Global Expansion
│   ├── Self-service portal      │   ├── iOS SDK v2               │   ├── EU region
│   ├── SDKs (TS, Python, Go)    │   ├── Android SDK v2           │   ├── APAC region
│   └── Interactive docs         │   └── React Native             │   └── Local compliance
└── Enterprise Features          └── Advanced Analytics           └── Ecosystem Platform
    ├── SSO/SAML                     ├── Custom dashboards            ├── Partner marketplace
    ├── Audit logs                   ├── Export pipelines             ├── Developer community
    └── RBAC                         └── SLA reporting                └── Revenue sharing
```

**Best for**: Product-led organizations, stakeholder communication, external-facing roadmaps

### Framework 2: Outcome-Driven Roadmap
Focuses on business results and customer behaviors, not features shipped.

```
OUTCOME: Reduce time-to-first-value from 5 days to 1 hour
├── Hypothesis: Interactive onboarding reduces drop-off
│   └── Initiative: Self-service guided tutorial
│       └── Success metric: % of signups completing tutorial → Target: 80%
├── Hypothesis: SDK availability increases activation
│   └── Initiative: Quickstart SDKs for 5 languages
│       └── Success metric: Time from signup to first API call → Target: < 5 min
└── Hypothesis: Sandbox environment increases confidence
    └── Initiative: One-click sandbox provisioning
        └── Success metric: % of signups using sandbox → Target: 60%
```

**Best for**: Product teams using OKRs, organizations focused on outcomes over output

### Framework 3: Capability-Based Roadmap
Organizes around building platform capabilities over time.

```
CAPABILITY: Developer Self-Service
├── Q2: API key self-service portal
├── Q3: Usage analytics dashboard
├── Q4: Billing and plan management
└── Q1 2027: Team management and RBAC

CAPABILITY: API Reliability
├── Q2: Multi-region active-active
├── Q3: Automated failover
├── Q4: SLA dashboard for consumers
└── Q1 2027: Chaos engineering program

CAPABILITY: API Ecosystem
├── Q2: Public changelog and status page
├── Q3: Partner integration marketplace
├── Q4: Revenue sharing platform
└── Q1 2027: Developer community forum
```

**Best for**: Platform teams, infrastructure organizations, multi-year capability building

### Framework 4: Lean Canvas Roadmap
Validates riskiest assumptions first with build-measure-learn cycles.

```
Phase 1 (Weeks 1-6): RISKIEST ASSUMPTION
  → Hypothesis: "Developers will adopt our API if it has TypeScript SDK"
  → Build: Minimal TS SDK + 5 reference integrations
  → Measure: 10 developer interviews, adoption analytics
  → Learn: Pivot or proceed based on evidence

Phase 2 (Weeks 7-12): NEXT RISKIEST
  → Hypothesis: "Enterprises will pay for SLA-backed API access"
  → Build: Enterprise tier with uptime monitoring
  → Measure: 5 enterprise pilot customers

Phase 3 (Weeks 13-18): SCALE
  → Build: Self-service portal, Python/Go SDKs
  → Measure: Organic signup funnel metrics
```

**Best for**: Early-stage products, new initiatives, high-uncertainty environments

## Roadmap Data Model

### Core Entities
```python
from dataclasses import dataclass
from datetime import date
from enum import Enum
from typing import Optional

class Horizon(Enum):
    NOW = "now"
    NEXT = "next"
    LATER = "later"
    FUTURE = "future"

class Priority(Enum):
    P0 = "critical"      # Must do — non-negotiable
    P1 = "high"          # Should do — significant value
    P2 = "medium"        # Nice to do — if capacity allows
    P3 = "low"           # Won't do now — explicitly deferred

class Status(Enum):
    BACKLOG = "backlog"
    RESEARCH = "research"
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    COMPLETE = "complete"
    BLOCKED = "blocked"

@dataclass
class RoadmapItem:
    id: str
    title: str
    description: str
    horizon: Horizon
    priority: Priority
    status: Status
    owner: str                       # Team or individual
    dependencies: list[str]          # IDs of blocking items
    okr_linkage: list[str]           # Related OKR IDs
    success_metrics: list[str]       # How we'll know it worked
    effort_estimate: str             # "weeks" or "person-months"
    start_date: Optional[date] = None
    target_date: Optional[date] = None

@dataclass
class Theme:
    name: str
    description: str
    objective: str
    items: list[RoadmapItem]

@dataclass
class Roadmap:
    product: str
    period: str                      # "H2 2026"
    themes: list[Theme]
    okrs: list[dict]
    risks: list[dict]
    assumptions: list[str]

    def items_by_horizon(self, horizon: Horizon) -> list[RoadmapItem]:
        return [item for theme in self.themes for item in theme.items
                if item.horizon == horizon]

    def blocked_items(self) -> list[RoadmapItem]:
        return [item for theme in self.themes for item in theme.items
                if item.status == Status.BLOCKED]

    def okr_coverage(self) -> float:
        """Percentage of items linked to an OKR."""
        items = [i for t in self.themes for i in t.items]
        if not items:
            return 100.0
        linked = sum(1 for i in items if i.okr_linkage)
        return linked / len(items) * 100
```

## Quarterly Planning Process

### Planning Timeline
```
Week -4: Strategy Refresh
  → Review company OKRs and strategic context
  → Analyze market changes, competitive moves
  → Update product vision and strategic themes

Week -3: Initiative Proposals
  → Teams propose initiatives aligned to themes
  → Each proposal: hypothesis, success metrics, effort estimate
  → Initial dependency identification

Week -2: Prioritization
  → Score all proposals using RICE/WSJF
  → Capacity mapping — what fits in team capacity
  → Dependency resolution sequencing

Week -1: Capacity Planning
  → Finalize team allocations
  → Identify risks and mitigation plans
  → Draft roadmaps for each audience

Week 0: Roadmap Review
  → Present to stakeholders
  → Document decisions and trade-offs
  → Publish roadmap

Week 1: Sprint Planning
  → Break Now initiatives into epics
  → Assign stories to sprints
  → Set up tracking
```

### Planning Inputs
```yaml
strategic_inputs:
  - Company OKRs and quarterly priorities
  - Product strategy memo
  - Competitive analysis
  - Customer research and feedback summary
  - Market trends and technology shifts

operational_inputs:
  - Current initiative status and completion estimates
  - Team capacity (planned vs actual last quarter)
  - Tech debt and maintenance estimates
  - Known risks and dependency map

quantitative_inputs:
  - Product metrics trends (MAD, NPS, revenue, retention)
  - Support ticket themes and volume
  - Feature request rankings (upvotes, request volume)
  - Performance metrics (uptime, latency, error rate)
```

## Capacity Planning

### Allocation Framework
```yaml
capacity_allocation:
  new_features: 50%       # Roadmap initiatives — new value delivery
  tech_debt: 20%           # Architecture, refactoring, platform improvements
  maintenance: 15%         # Bug fixes, operations, incident response
  discovery: 10%           # Research, spikes, prototyping
  buffer: 5%               # Unplanned work, emergencies, opportunities
```

### Team Capacity Calculation
```yaml
team_capacity:
  team_size: 5
  weeks_per_quarter: 13
  planning_overhead: 2 weeks
  available_weeks: 11
  weekly_hours_per_person: 40
  utilization_rate: 0.80     # Meetings, reviews, overhead

  quarterly_capacity:
    total: 5 × 11 × 40 = 2200 person-hours
    effective: 2200 × 0.80 = 1760 person-hours
    new_features: 1760 × 0.50 = 880 hours
    tech_debt: 1760 × 0.20 = 352 hours
    maintenance: 1760 × 0.15 = 264 hours
    discovery: 1760 × 0.10 = 176 hours
    buffer: 1760 × 0.05 = 88 hours
```

### Dependency Mapping
```
┌─────────────────────────────────────────────────────────────┐
│                    DEPENDENCY MAP — Q2 2026                  │
├─────────────┬─────────────┬─────────────┬───────────────────┤
│ Platform    │ API Team    │ SDK Team    │ Docs Team         │
├─────────────┼─────────────┼─────────────┼───────────────────┤
│ Multi-region│             │             │                   │
│   └─ DNS    │ Schema v3   │ TS SDK      │ v3 migration      │
│     setup   │   └─ needs  │   └─ needs  │ guide             │
│             │     Schema  │     Schema  │   └─ needs v3     │
│             │     v3      │     v3      │     API spec      │
├─────────────┼─────────────┼─────────────┼───────────────────┤
│ Auth infra  │ API keys    │             │ Auth docs         │
│   └─ SSO    │   └─ needs  │             │   └─ needs        │
│     SAML    │     Auth    │             │     Auth v2       │
│             │     infra   │             │                   │
└─────────────┴─────────────┴─────────────┴───────────────────┘
```

### Buffer and Risk Planning
```yaml
risk_register:
  - risk: Key engineer departure
    probability: medium
    impact: high
    mitigation: Cross-training, documentation, bus factor > 2
    contingency: Contractors on retainer, scope reduction

  - risk: External dependency delay
    probability: high
    impact: medium
    mitigation: Early engagement, shared milestones, weekly syncs
    contingency: Alternative implementation path, scope reduction

  - risk: Technology risk (new stack/pattern)
    probability: medium
    impact: high
    mitigation: Spike/prototype in discovery phase
    contingency: Fall back to proven technology

  - risk: Scope creep during execution
    probability: high
    impact: medium
    mitigation: Clear scope definition, change request process
    contingency: Descope lower-priority items
```

## Roadmap Review Metrics

### Health Dashboard
```python
class RoadmapHealthDashboard:
    def compute(self, roadmap: Roadmap) -> dict:
        commitment_rate = self.commitment_reliability(roadmap)
        throughput = self.throughput(roadmap)
        alignment = self.okr_alignment(roadmap)
        predictability = self.predictability(roadmap)

        score = (
            commitment_rate * 0.30 +
            min(throughput / 5, 1.0) * 100 * 0.25 +
            alignment * 0.25 +
            predictability * 0.20
        )

        return {
            "overall_health": round(score, 1),
            "components": {
                "commitment_reliability": commitment_rate,
                "throughput": throughput,
                "okr_alignment": alignment,
                "predictability": predictability,
            },
            "status": (
                "healthy" if score >= 80
                else "needs_attention" if score >= 60
                else "at_risk"
            ),
        }

    def commitment_reliability(self, roadmap: Roadmap) -> float:
        """% of Now items delivered on time."""
        items = [i for t in roadmap.themes for i in t.items
                 if i.horizon == Horizon.NOW]
        if not items:
            return 100.0
        completed = sum(1 for i in items if i.status == Status.COMPLETE)
        return completed / len(items) * 100

    def throughput(self, roadmap: Roadmap) -> int:
        """Items completed per quarter."""
        return sum(
            1 for t in roadmap.themes for i in t.items
            if i.status == Status.COMPLETE
        )

    def okr_alignment(self, roadmap: Roadmap) -> float:
        """% of items linked to an OKR."""
        items = [i for t in roadmap.themes for i in t.items]
        if not items:
            return 100.0
        linked = sum(1 for i in items if i.okr_linkage)
        return linked / len(items) * 100

    def predictability(self, roadmap: Roadmap) -> float:
        """% of work that was planned vs reactive."""
        items = [i for t in roadmap.themes for i in t.items]
        planned = sum(1 for i in items if i.horizon == Horizon.NOW)
        total = len(items)
        return planned / total * 100 if total > 0 else 100.0
```

## Key Points
- Roadmaps communicate strategy, not schedules — use horizon-based planning (Now-Next-Later)
- Four framework options: Now-Next-Later (most common), outcome-driven, capability-based, lean canvas
- Roadmap data model includes horizon, priority, status, owner, dependencies, OKR linkage
- Quarterly planning follows a 5-week cycle: strategy → proposals → prioritization → capacity → review
- Capacity allocation: 50% features, 20% tech debt, 15% maintenance, 10% discovery, 5% buffer
- Dependency mapping visualizes cross-team blocking relationships
- Risk register tracks key risks with probability, impact, mitigation, and contingency
- Health dashboard computes commitment reliability, throughput, OKR alignment, and predictability
- Rolling wave planning provides detail near-term and direction long-term
- Tool selection (Productboard, Aha!, Linear, etc.) depends on team size and organizational maturity

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with strategic roadmapping, dependency sorting, multitrack scenario planning, and integration schemas.
-->
