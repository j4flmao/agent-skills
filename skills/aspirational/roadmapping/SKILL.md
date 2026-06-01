---
name: aspirational-roadmapping
description: >
  Use when the user asks about strategic roadmapping, technology roadmapping, product roadmap creation, prioritization frameworks (RICE, WSJF, MoSCoW), OKR alignment, stakeholder alignment, timeline planning, or roadmap communication. Do NOT use for: project management task tracking, sprint planning, or technical architecture design.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [aspirational, roadmapping, phase-3]
---

# Strategic Roadmapping

## Purpose
Create, communicate, and execute strategic roadmaps that align technology initiatives with business outcomes. Apply prioritization frameworks, connect work to OKRs, manage stakeholder expectations, and plan timelines that balance innovation with delivery.

## Workflow

### Strategic Roadmapping Process
```
Vision & Strategy → Strategic Themes → Initiatives → Priorities → Timeline → Communicate → Review
                                          │                           │
                                          └── OKR Linkage ────────────┘
```

### Roadmap Horizon Model

| Horizon | Timeframe | Focus | Certainty | Audience |
|---------|-----------|-------|-----------|----------|
| Now | 0-3 months | Current initiatives, committed deliverables | High | Engineering, stakeholders |
| Next | 3-6 months | Next priority batch, in refinement | Medium | Product teams, leadership |
| Later | 6-12 months | Strategic bets, exploratory | Low | Leadership, strategy |
| Future | 12+ months | Vision, industry trends, moonshots | Very low | Executive, board |

## Strategic Roadmapping Frameworks

### Framework 1: Now-Next-Later (Productboard, Aha!)

The most common modern roadmapping framework. Focuses on themes and outcomes rather than dates and features.

```
NOW (Q2 2026)                    NEXT (Q3 2026)                  LATER (Q4 2026-H1 2027)
├── Platform Stability           ├── API Marketplace              ├── AI-Powered Analytics
│   ├── Multi-region deploy      │   ├── Partner onboarding       │   ├── Predictive insights
│   ├── P99 < 200ms              │   ├── Usage-based billing      │   ├── Anomaly detection
│   └── 99.99% uptime            │   └── API catalog              │   └── Recommendations
├── Developer Experience         ├── Mobile SDK Suite             ├── Global Expansion
│   ├── Self-service portal      │   ├── iOS SDK v2               │   ├── EU region
│   ├── SDKs for TS/Python/Go    │   ├── Android SDK v2           │   ├── APAC region
│   └── Interactive docs         │   └── React Native             │   └── Local compliance
└── Enterprise Features          └── Advanced Analytics           └── Ecosystem Platform
    ├── SSO/SAML                     ├── Custom dashboards            ├── Partner marketplace
    ├── Audit logs                   ├── Export pipelines             ├── Developer community
    └── RBAC                         └── SLA reporting                └── Revenue sharing
```

### Framework 2: Outcome-Driven Roadmap (Inspired by Marty Cagan)

Focus on outcomes (business results, customer behaviors) rather than output (features shipped).

```
OUTCOME: Reduce time-to-first-value from 5 days to 1 hour
├── Hypothesis: Interactive onboarding reduces drop-off
│   └── Initiative: Self-service guided tutorial
│       ├── Success metric: % of signups completing tutorial
│       └── Target: 80% completion rate
├── Hypothesis: SDK availability increases activation
│   └── Initiative: Quickstart SDKs for 5 languages
│       ├── Success metric: Time from signup to first API call
│       └── Target: < 5 minutes
└── Hypothesis: Sandbox environment increases confidence
    └── Initiative: One-click sandbox provisioning
        ├── Success metric: % of signups using sandbox
        └── Target: 60% engagement
```

### Framework 3: Capability-Based Roadmap

Organize around building platform capabilities rather than features.

```
CAPABILITY: Developer Self-Service
├── Q2: API key self-service portal
├── Q3: Usage analytics dashboard
├── Q4: Billing and plan management
└── Q1 2027: Team management and RBAC

CAPABILITY: API Reliability
├── Q2: Multi-region active-active
├── Q3: Automated failover
|── Q4: SLA dashboard for consumers
└── Q1 2027: Chaos engineering program

CAPABILITY: API Ecosystem
├── Q2: Public changelog and status page
├── Q3: Partner integration marketplace
├── Q4: Revenue sharing platform
└── Q1 2027: Developer community forum
```

### Framework 4: Lean Canvas Roadmap

Validates riskiest assumptions first:

```
Phase 1 (Weeks 1-6): RISKIEST ASSUMPTION
  → "Developers will adopt our API if it has TypeScript SDK"
  → Build: Minimal TypeScript SDK + 5 reference integrations
  → Validate: 10 developer interviews, adoption analytics

Phase 2 (Weeks 7-12): NEXT RISKIEST
  → "Enterprises will pay for SLA-backed API access"
  → Build: Enterprise tier with uptime monitoring
  → Validate: 5 enterprise pilot customers

Phase 3 (Weeks 13-18): SCALE
  → Build: Self-service portal, Python/Go SDKs
  → Validate: Organic signup funnel metrics
```

## Prioritization Models

### RICE Framework
| Factor | Definition | Scoring |
|--------|-----------|---------|
| Reach | How many users/consumers will this impact? | # of users per time period |
| Impact | How much will this move the needle? | 0.25x (minimal) to 3x (massive) |
| Confidence | How confident are we in our estimates? | 20% (wild guess) to 100% (proven) |
| Effort | How much work is required? | Person-months or story points |

```
RICE Score = (Reach × Impact × Confidence) / Effort
```

```yaml
initiative: API TypeScript SDK
  reach: 5000 developers/month
  impact: 2x (high — reduces integration time)
  confidence: 80% (validated by developer interviews)
  effort: 3 person-months
  rice_score: (5000 × 2 × 0.8) / 3 = 2667

initiative: Multi-region deployment
  reach: 2000 active consumers
  impact: 1.5x (medium — improves reliability)
  confidence: 60% (we know we need it, unclear ROI)
  effort: 6 person-months
  rice_score: (2000 × 1.5 × 0.6) / 6 = 300
```

### WSJF (Weighted Shortest Job First)

Used in SAFe for prioritizing jobs by dividing value by duration.

```
WSJF = (User-Business Value + Time Criticality + Risk Reduction/Opportunity Enablement) / Job Size
```

```yaml
initiative: API version v3 migration
  user_value: 8   (major DX improvement)
  time_criticality: 6 (v2 sunset deadline approaching)
  risk_reduction: 5 (security improvements in v3)
  job_size: 5 (5 sprints)
  wsJF: (8 + 6 + 5) / 5 = 3.8

initiative: Developer portal redesign
  user_value: 5 (nice-to-have improvement)
  time_criticality: 2 (no deadline)
  risk_reduction: 2 (cosmetic)
  job_size: 8 (8 sprints)
  wsjf: (5 + 2 + 2) / 8 = 1.125
```

### MoSCoW Method
| Priority | Meaning | % of Effort | Criteria |
|----------|---------|-------------|----------|
| Must have | Non-negotiable for launch | 60% | Legal, security, core functionality |
| Should have | Important but not critical | 20% | Significant value, workaround exists |
| Could have | Desirable but not necessary | 20% | Nice-to-have, low effort |
| Won't have | Explicitly out of scope | 0% | Deliberately excluded for now |

### Eisenhower Matrix for Roadmap Items
```
                    URGENT                    NOT URGENT
         ┌─────────────────────────┬─────────────────────────┐
IMPORTANT │ DO FIRST                │ SCHEDULE                │
         │ • Security vuln fix     │ • Platform scalability  │
         │ • API downtime          │ • Documentation         │
         │ • Major customer issue  │ • SDK improvements      │
         ├─────────────────────────┼─────────────────────────┤
NOT      │ DELEGATE                │ ELIMINATE/DEFER         │
IMPORTANT │ • Minor bug reports    │ • Nice-to-have features │
         │ • Routine updates       │ • Internal tooling      │
         │ • Non-critical emails   │ • Bike-shedding items   │
         └─────────────────────────┴─────────────────────────┘
```

## OKR Linkage

### Connecting Initiatives to OKRs

Every roadmap initiative should trace to an Objective and Key Result.

```yaml
Objective: Establish market-leading API developer experience

Key Results:
  KR1: Reduce time-to-first-call from 15 min to 3 min
  KR2: Increase developer NPS from 32 to 55
  KR3: Achieve 90% documentation satisfaction rating
  KR4: Publish SDKs for 5 most requested languages

Initiatives → KR Mapping:
  - Self-service developer portal    → KR1, KR2
  - Interactive API documentation    → KR3
  - TypeScript/Python/Go SDKs        → KR1, KR4
  - Automated onboarding email flow  → KR1
  - Developer community forum        → KR2
```

### OKR Cascade
```
Company OKR (CEO)
└── Product OKRs (VP Product)
    └── Platform OKRs (Platform Team)
        └── Individual OKRs (Engineer)
```

```yaml
Company OKR:
  O: Become the leading payment processing platform
  KR: $50M API revenue; 1000 active platform partners

Product OKR:
  O: Deliver the most developer-friendly payment API
  KR1: Reduce integration time by 60%
  KR2: Launch partner marketplace with 20 integrations
  KR3: Achieve 99.99% API uptime

Platform Team OKR:
  O: Build scalable, reliable API platform
  KR1: Reduce P99 latency from 500ms to 100ms
  KR2: Achieve 99.99% uptime (zero unplanned downtime)
  KR3: Support 5000 concurrent API consumers

Engineering OKR (Individual):
  O: Improve API reliability infrastructure
  KR1: Implement multi-region active-active
  KR2: Build automated failover testing framework
  KR3: Reduce MTTR from 30 min to 5 min
```

### OKR Health Check
```python
class OKRHealthCheck:
    def check_progress(self, okrs: list[dict]) -> list[dict]:
        """Check OKR health and flag at-risk items."""
        results = []
        for okr in okrs:
            status = "on_track"
            risks = []

            for kr in okr["key_results"]:
                progress = kr["current"] / kr["target"] * 100 if kr["target"] > 0 else 0

                if progress < kr["expected_progress"] * 0.7:
                    status = "at_risk"
                    risks.append(f"{kr['name']}: {progress:.0f}% vs expected {kr['expected_progress']:.0f}%")
                elif progress < kr["expected_progress"] * 0.9:
                    if status != "at_risk":
                        status = "needs_attention"

            results.append({
                "objective": okr["objective"],
                "status": status,
                "risks": risks,
                "recommended_action": self.recommend_action(status, risks),
            })
        return results
```

## Stakeholder Alignment

### Stakeholder Map
```yaml
stakeholder_mapping:
  - role: VP Product
    interest: high
    influence: high
    engagement: executive sponsor, quarterly roadmap reviews
    concerns: revenue growth, competitive position, time-to-market

  - role: Engineering Director
    interest: high
    influence: high
    engagement: biweekly roadmap sync
    concerns: technical feasibility, resource allocation, tech debt

  - role: Developer Advocate
    interest: high
    influence: medium
    engagement: weekly input session
    concerns: developer experience, documentation quality

  - role: Sales Team
    interest: medium
    influence: medium
    engagement: monthly roadmap preview
    concerns: customer commitments, competitive features

  - role: Customers
    interest: high
    influence: low (direct)
    engagement: quarterly product advisory board
    concerns: API stability, missing features, migration effort
```

### Alignment Techniques

#### Pre-Meeting One-on-Ones
```
Before any roadmap review meeting:
1. Meet individually with each key stakeholder
2. Understand their priorities and concerns
3. Address objections before the group meeting
4. Build allies who will support the proposal
5. Prepare contingency for unexpected feedback
```

#### Roadmap Review Meeting Structure
```yaml
roadmap_review:
  cadence: monthly
  duration: 60 min
  attendees: [PM, Engineering Lead, Design Lead, Stakeholders]

  agenda:
    - 5 min: Context (OKR progress, market changes)
    - 10 min: Now — what we're shipping this month
    - 15 min: Next — priorities for next quarter
    - 15 min: Later — strategic bets, decision required
    - 10 min: Trade-off discussion (what we're saying no to)
    - 5 min: Decisions and action items
```

#### Trade-off Visual
```yaml
Current trade-off:
  Invest 3 engineers for 6 months to:
  ✅ Launch multi-region active-active (P0 — SLO requirement)
  ✅ Reduce P99 latency from 500ms to 100ms (KR target)
  ❌ Delay developer portal v2 (moved to Q3)
  ❌ Defer Python SDK improvements (moved to Q3)
  ⚠️ Team capacity fully allocated — no new work without descoping
```

## Timeline Planning

### Planning Horizons
```yaml
planning_horizons:
  strategic: 12-24 months
    detail: initiative-level, outcome-focused
    owner: CPO / VP Product
    review: quarterly

  tactical: 3-6 months
    detail: epic-level, milestone-focused
    owner: Product Director
    review: monthly

  operational: 1-3 months
    detail: story-level, delivery-focused
    owner: Product Manager
    review: biweekly
```

### Dependency Mapping
```
┌─────────────────────────────────────────────────────────┐
│              DEPENDENCY MAP — Q2 2026                    │
├─────────────┬─────────────┬─────────────┬───────────────┤
│ Platform    │ API Team    │ SDK Team    │ Docs Team     │
├─────────────┼─────────────┼─────────────┼───────────────┤
│ Multi-region│             │             │               │
│   └─ DNS    │ Schema v3   │ TS SDK      │ v3 migration  │
│      setup  │   └─ needs  │   └─ needs  │   guide       │
│             │      Schema │      Schema │               │
│             │      v3     │      v3     │               │
├─────────────┼─────────────┼─────────────┼───────────────┤
│ Auth infra  │ API keys    │             │ Auth docs     │
│   └─ SSO    │   └─ needs  │             │   └─ needs    │
│      SAML   │      Auth   │             │      Auth v2  │
│             │      infra  │             │               │
└─────────────┴─────────────┴─────────────┴───────────────┘
```

### Buffer and Risk Planning
```yaml
capacity_buffer:
  planned_work: 60%
  known_unknowns: 20%     # Refinement, unexpected complexity
  pure_buffer: 20%         # Unplanned work, incidents, tech debt

risk_register:
  - risk: Key engineer departure
    probability: medium
    impact: high
    mitigation: Cross-training, documentation, bus factor > 2
    contingency: Contractors on retainer

  - risk: Dependency delay (external team)
    probability: high
    impact: medium
    mitigation: Early engagement, shared milestones
    contingency: Alternative implementation, scope reduction

  - risk: Technology risk (new stack)
    probability: medium
    impact: high
    mitigation: Spike/Prototype in discovery phase
    contingency: Fall back to proven technology
```

### Roadmap Data Model
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
    P0 = "critical"
    P1 = "high"
    P2 = "medium"
    P3 = "low"

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
    owner: str
    dependencies: list[str]
    okr_linkage: list[str]
    success_metrics: list[str]
    effort_estimate: str  # "weeks" or "person-months"

@dataclass
class Theme:
    name: str
    description: str
    objective: str
    items: list[RoadmapItem]

@dataclass
class Roadmap:
    product: str
    period: str  # e.g. "H2 2026"
    themes: list[Theme]
    okrs: list[dict]
    risks: list[dict]
    assumptions: list[str]

    def items_by_horizon(self, horizon: Horizon) -> list[RoadmapItem]:
        return [item for theme in self.themes for item in theme.items if item.horizon == horizon]

    def status_summary(self) -> dict:
        statuses = {}
        for theme in self.themes:
            for item in theme.items:
                statuses[item.status] = statuses.get(item.status, 0) + 1
        return statuses
```

## Roadmap Communication

### Audience-Specific Views

#### Executive View (1-pager)
```markdown
## Platform Roadmap — H2 2026

### Strategic Context
Our developer platform is growing 20% QoQ but reliability SLOs are at risk.
This roadmap focuses on: (1) platform stability, (2) developer adoption, (3) ecosystem growth.

### Key Investments (Ordered by Priority)
| Initiative | Investment | Impact | Timeline |
|-----------|-----------|--------|----------|
| Multi-region deployment | 3 eng, 6 mo | 99.9% → 99.99% uptime | Q3 2026 |
| Developer self-service portal | 2 eng, 4 mo | 15 min → 3 min time-to-first-call | Q3 2026 |
| API marketplace | 4 eng, 6 mo | Partner ecosystem, new revenue stream | Q4 2026 |

### Trade-offs
- Developer portal v2 delayed to Q3 (SDK improvements prioritized)
- Mobile SDKs deferred to Q1 2027 (web SDKs cover 85% of use cases)

### How We'll Measure Success
- Platform uptime: 99.99% (currently 99.9%)
- Developer NPS: 55 (currently 32)
- Active platform partners: 200 (currently 50)
```

#### Engineering View (detailed)
```yaml
## Platform Roadmap — Engineering

### Q3 2026 — NOW
epics:
  - title: Multi-region active-active deployment
    owner: Infrastructure Team
    milestones:
      - M1: Regional router deployment (Week 4)
      - M2: Data replication pipeline (Week 8)
      - M3: Automated failover testing (Week 10)
      - M4: Production cutover (Week 12)
    dependencies:
      - DNS team: global load balancer config
      - Security team: cross-region encryption

  - title: Developer self-service portal
    owner: Platform Team
    milestones:
      - M1: API key management UI (Week 3)
      - M2: Usage dashboard (Week 6)
      - M3: Interactive API playground (Week 10)
      - M4: Self-service plan upgrade (Week 12)

### Q4 2026 — NEXT
epics:
  - title: API marketplace
    owner: Ecosystem Team
    status: planning
    start_date: 2026-10-01
```

#### Customer View (themed, no dates)
```markdown
## What We're Building Next for You

### Making Your Integration Faster
We're investing heavily in developer experience:
- New developer portal coming this summer
- Self-service API key management — no more email support
- Interactive documentation — try API calls in your browser

### Making Your API More Reliable
We're deploying across multiple regions so your integrations stay up:
- Active-active multi-region deployment
- 99.99% uptime SLA for Enterprise tier
- Real-time status dashboard

### Growing the Ecosystem
New partner marketplace (coming later this year):
- Discover integrations built by other companies
- One-click install for popular tools
- Revenue sharing for published integrations
```

### Roadmap Risk Communication
```yaml
risk_communication:
  format: "If → Then"
  examples:
    - "If we invest in multi-region, then we must delay the mobile SDK by one quarter."
    - "If the security audit reveals critical findings, then we will reprioritize Q3 scope."
    - "If the TypeScript SDK pilot shows strong adoption, then we will accelerate Python and Go SDKs."

  when_to_communicate:
    - After each quarterly planning cycle
    - When a dependency becomes blocked
    - When a key initiative is descoped
    - When new information changes priorities
```

## Roadmap Review & Iteration

### Review Cadence
```yaml
review_cadence:
  weekly:
    - Team standup — blocking issues, this week's commits
    - Duration: 15 min
    - Attendees: Engineering team

  biweekly:
    - Sprint review — demo completed work
    - Roadmap check — adjustments for next sprint
    - Duration: 30 min
    - Attendees: PM, Engineering Lead, Design Lead

  monthly:
    - Stakeholder sync — roadmap status, decisions needed
    - Duration: 60 min
    - Attendees: Stakeholders, PM, Engineering Director

  quarterly:
    - Strategic review — OKR progress, next quarter priorities
    - Duration: 2 hours
    - Attendees: Executive team, product leadership
    - Artifacts: Updated roadmap, OKR scores, strategy memo
```

### Roadmap Health Metrics
```yaml
roadmap_health:
  commitment_reliability:
    description: % of committed items delivered on time
    target: > 80%
    measurement: items delivered / items committed last quarter

  throughput:
    description: Initiatives delivered per quarter
    target: Growing or stable
    measurement: Count of completed roadmap items per quarter

  predictability:
    description: % of work planned vs unplanned
    target: > 70% planned
    measurement: Planned story points / total story points

  alignment_score:
    description: % of work directly tied to OKRs
    target: > 90%
    measurement: OKR-linked initiatives / total initiatives

   stakeholder_satisfaction:
    description: Stakeholder satisfaction with roadmap process
    target: > 4.0 / 5.0
    measurement: Quarterly survey
```

## Roadmap Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Fix |
|-------------|---------|-----------|-----|
| Everything is P0 | No real prioritization | Lack of forced ranking | Use RICE/WSJF scoring, cap P0 items |
| Feature factory | Output-focused, no outcomes | No OKR linkage | Map every initiative to a KR |
| Gantt chart roadmap | Over-constrained dates | False certainty | Use horizon model (Now/Next/Later) |
| Watermelon status | All green on surface, red inside | No psychological safety | Blameless retrospectives |
| Perpetual "Now" | Nothing moves to Next/Later | Scope creep, no trade-offs | Freeze scope per quarter |
| Roadmap as a document | Stale before it's published | No living artifact | Monthly updates, quarterly reviews |
| Stakeholder surprise | Objections in review meeting | No pre-briefs | One-on-ones before group meeting |

## Advanced OKR Linkage Patterns

### Weighted KR Contribution Model
```python
def compute_kr_contribution(initiatives: list[dict]) -> dict:
    """Shows how each initiative contributes to each KR."""
    kr_contributions = {}
    for ini in initiatives:
        for kr_id in ini.get("kr_linkage", []):
            if kr_id not in kr_contributions:
                kr_contributions[kr_id] = []
            kr_contributions[kr_id].append({
                "initiative": ini["name"],
                "contribution_pct": ini.get("contribution_pct", 100),
            })
    return kr_contributions
```

### OKR Confidence Scoring
```yaml
okr_confidence:
  definition: "How likely are we to achieve this KR given current progress and remaining time?"

  scoring:
    1: "Wild guess — no data"
    2: "Plausible but uncertain"
    3: "On track — moderate confidence"
    4: "Strong progress — high confidence"
    5: "Already achieved or certain"

  usage:
    - Score each KR at the start of quarter
    - Re-score monthly — flag KRs dropping from 4→2
    - Reprioritize resources to KRs with dropping confidence
```

### OKR-to-Initiative Traceability Matrix
```yaml
traceability_matrix:
  objective: "Become the leading payment platform"
  KRs:
    - id: KR1
      name: "$50M API revenue"
      initiatives:
        - name: "Enterprise pricing tier"
          contribution: "40%"
          status: "in_progress"
        - name: "Partner marketplace"
          contribution: "30%"
          status: "planning"
        - name: "Usage-based billing"
          contribution: "30%"
          status: "planned"

    - id: KR2
      name: "1000 active partners"
      initiatives:
        - name: "Partner onboarding portal"
          contribution: "50%"
          status: "in_progress"
        - name: "Revenue sharing platform"
          contribution: "30%"
          status: "planning"
        - name: "Partner developer docs"
          contribution: "20%"
          status: "research"
```

## References
- `references/roadmapping-fundamentals.md` — Core frameworks, data model, horizon planning, quarterly process
- `references/roadmapping-advanced.md` — Advanced prioritization (MCDA, CD3), OKR cascades, dependency management
- `references/roadmapping-prioritization.md` — Prioritization models deep dive: RICE, WSJF, MoSCoW, Kano, ICE
- `references/roadmapping-communication.md` — Audience-specific views, stakeholder alignment, trade-off communication
- `references/technology-roadmapping.md` — (Deprecated — see roadmapping-fundamentals.md)
