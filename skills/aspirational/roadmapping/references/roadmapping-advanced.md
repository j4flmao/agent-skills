# Strategic Roadmapping Advanced Topics

## Advanced Prioritization Models

### Multi-Criteria Decision Analysis (MCDA)
For complex prioritization with multiple stakeholders:

```python
class MCDAPrioritizer:
    def __init__(self, criteria: dict[str, float]):
        """
        criteria = {
            "revenue_impact": 0.30,
            "strategic_alignment": 0.25,
            "customer_demand": 0.20,
            "technical_feasibility": 0.15,
            "competitive_urgency": 0.10,
        }
        """
        self.criteria = criteria

    def score(self, initiatives: list[dict]) -> list[dict]:
        """Score initiatives using weighted multi-criteria analysis."""
        # Normalize each criterion to 0-100 scale
        normalized = self._normalize(initiatives)

        for item in normalized:
            weighted_score = sum(
                item[criterion] * weight
                for criterion, weight in self.criteria.items()
            )
            item["mcd_score"] = round(weighted_score, 1)

        return sorted(normalized, key=lambda x: x["mcd_score"], reverse=True)

    def _normalize(self, initiatives: list[dict]) -> list[dict]:
        """Min-max normalize each criterion to 0-100."""
        for criterion in self.criteria:
            values = [i[criterion] for i in initiatives]
            min_val, max_val = min(values), max(values)
            if max_val == min_val:
                for i in initiatives:
                    i[criterion] = 50.0  # Default to mid-range
            else:
                for i in initiatives:
                    i[criterion] = (
                        (i[criterion] - min_val) / (max_val - min_val) * 100
                    )
        return initiatives
```

### Cost of Delay / CD3
Quantifies the economic cost of delaying an initiative:

```yaml
cost_of_delay_method: CD3 (Cost of Delay Divided by Duration)

components:
  user_value: Revenue or value lost per month of delay
  time_criticality: How urgency decays over time (fixed deadline vs gradual)
  risk_reduction: Value of learning or de-risking sooner
  opportunity_enabled: Value unlocked for other initiatives

formula: "CD3 = (User Value + Time Criticality + Risk Reduction + Opportunity) / Duration"
```

```yaml
initiative: Multi-region deployment
  user_value_per_month: $50K (enterprise deals requiring 99.99% uptime)
  time_criticality: high (2 enterprise contracts pending on SLA)
  risk_reduction: medium (reduces single-region outage risk)
  opportunity_enabled: medium (enables EU expansion)
  duration_months: 6
  cd3: ($50K + $30K + $20K + $20K) / 6 = $20K/month

initiative: Developer portal v2
  user_value_per_month: $10K (improved activation, reduced support)
  time_criticality: low (nice-to-have, no deadline)
  risk_reduction: low (cosmetic improvement)
  opportunity_enabled: low (nice but not blocking)
  duration_months: 4
  cd3: ($10K + $5K + $5K + $5K) / 4 = $6.25K/month
```

### WSJF (Weighted Shortest Job First)
SAFe prioritization method focusing on value-per-unit-time:

```yaml
wsjf_factors:
  business_value:
    weight: 1-10
    definition: "How much does this move business metrics?"
    anchors:
      10: "Enables new revenue stream ($1M+ ARR)"
      8: "Significantly improves retention or conversion"
      5: "Moderate improvement to existing metrics"
      2: "Marginal improvement"
      1: "Minimal business impact"

  time_criticality:
    weight: 1-10
    definition: "What's the cost of waiting?"
    anchors:
      10: "Fixed deadline this quarter (legal, compliance)"
      8: "Market window closing, competitor shipping"
      5: "Significant if delayed beyond 6 months"
      2: "Delay is tolerable"
      1: "No time sensitivity"

  risk_reduction:
    weight: 1-10
    definition: "Does this reduce risk or enable opportunity?"
    anchors:
      10: "Eliminates critical security/compliance risk"
      8: "Unlocks multiple future initiatives"
      5: "Reduces moderate technical risk"
      2: "Slight improvement"
      1: "No risk reduction"

  job_size:
    weight: 1-10 (inverse)
    definition: "Effort in person-weeks"
    anchors:
      10: "1-2 person-weeks"
      5: "1-2 person-months"
      3: "3-5 person-months"
      1: "6+ person-months"
```

## OKR-Driven Roadmapping

### OKR Cascade
```
Company OKR (CEO)
  O: Become the leading payment processing platform
  KR1: $50M API revenue
  KR2: 1000 active platform partners
    │
    ├── Product OKR (VP Product)
    │   O: Deliver the most developer-friendly payment API
    │   KR1: Reduce integration time by 60%
    │   KR2: Launch partner marketplace with 20 integrations
    │   KR3: Achieve 99.99% API uptime
    │       │
    │       ├── Platform Team OKR
    │       │   O: Build scalable, reliable API platform
    │       │   KR1: Reduce P99 latency from 500ms to 100ms
    │       │   KR2: Achieve 99.99% uptime (zero unplanned downtime)
    │       │   KR3: Support 5000 concurrent API consumers
    │       │
    │       └── Infrastructure Engineer OKR
    │           O: Improve API reliability infrastructure
    │           KR1: Implement multi-region active-active
    │           KR2: Build automated failover testing framework
    │           KR3: Reduce MTTR from 30 min to 5 min
```

### Initiative-to-KR Mapping
```yaml
objective: "Establish market-leading developer experience"

key_results:
  - kr: "Reduce TTFC from 15 min to 3 min"
    initiatives:
      - Self-service developer portal
      - Interactive API documentation
      - TypeScript SDK quickstart
      - Automated onboarding email flow

  - kr: "Increase developer NPS from 32 to 55"
    initiatives:
      - Developer community forum
      - SDK improvement program
      - Documentation redesign
      - Error message clarity initiative

  - kr: "Achieve 90% documentation satisfaction"
    initiatives:
      - Interactive reference docs
      - Code example audit and update
      - Migration guide template
      - Doc quality automation

  - kr: "Publish SDKs for 5 most requested languages"
    initiatives:
      - TypeScript SDK (complete)
      - Python SDK (complete)
      - Go SDK (in progress)
      - Java SDK (planned)
      - Ruby SDK (planned)
```

### OKR Progress Tracking
```python
class OKRTracker:
    def compute_progress(self, objective: dict) -> dict:
        kr_statuses = []
        for kr in objective["key_results"]:
            progress = kr["current"] / kr["target"] * 100 if kr["target"] > 0 else 0
            expected = kr["expected_progress"]
            lag = expected - progress

            kr_statuses.append({
                "kr": kr["name"],
                "progress_pct": round(progress, 1),
                "expected_pct": expected,
                "lag_pct": round(lag, 1),
                "status": "on_track" if lag < 10
                    else "needs_attention" if lag < 25
                    else "at_risk",
            })

        overall = sum(k["progress_pct"] for k in kr_statuses) / len(kr_statuses)
        at_risk = [k for k in kr_statuses if k["status"] == "at_risk"]

        return {
            "objective": objective["name"],
            "overall_progress": round(overall, 1),
            "key_results": kr_statuses,
            "risks": at_risk,
            "recommendation": (
                "Reprioritize: reallocate resources to at-risk KRs"
                if at_risk else "On track — continue execution"
            ),
        }
```

## Stakeholder Alignment Deep Dive

### Stakeholder Mapping Exercise
```yaml
stakeholder_mapping_workshop:
  attendees: [PM, Eng Director, Design Lead, Developer Advocate]

  steps:
    1. List all stakeholders by name and role
    2. Plot on interest-influence matrix
    3. For each stakeholder:
       a. What are their explicit priorities?
       b. What are their unspoken concerns?
       c. What would make this roadmap a success for them?
       d. What would make this roadmap a failure for them?
    4. Develop engagement strategy per quadrant
    5. Schedule individual pre-briefs before roadmap review
```

### Roadmap Review Meeting Format
```yaml
roadmap_review:
  cadence: monthly
  duration: 60 minutes
  attendees: [PM, Eng Lead, Design Lead, Key Stakeholders]

  agenda:
    - 5 min: Strategic context
        OKR progress, market changes, key metrics
    - 10 min: NOW — what we're shipping
        Demos, milestones hit, blockers
    - 15 min: NEXT — priorities for next quarter
        Proposed initiatives, trade-offs, decisions needed
    - 15 min: LATER — strategic bets
        What we're exploring, what we need input on
    - 10 min: Trade-offs
        What we're explicitly not doing and why
    - 5 min: Decisions and actions
        Documented decisions, owners, deadlines

  rules:
    - No status reporting (read the async update)
    - Every item has a clear decision or outcome
    - Trade-offs are presented as options, not surprises
    - Action items documented before meeting ends
```

### Handling Difficult Stakeholder Dynamics
| Scenario | Approach | Technique |
|----------|----------|-----------|
| Stakeholder demands specific feature | Show prioritization scores | "Here's how this scored against other priorities" |
| Executive changes priority weekly | Establish change governance | "Any change this quarter defers something else — here's the impact" |
| Team feels roadmap is dictated | Increase team input | "Propose initiatives aligned to these themes" |
| Consumers want everything now | Set expectations | "Here's what we can do with current capacity — what matters most?" |
| Conflicting priorities between teams | Escalate with options | "We have two high-priority options but capacity for one — which do we choose?" |

## Dependency Management

### Dependency Types
| Type | Definition | Example | Mitigation |
|------|------------|---------|------------|
| Hard dependency | Blocking — cannot start without it | Schema v3 must ship before TS SDK v3 | Early engagement, shared milestones |
| Soft dependency | Preferable order but workaround exists | Docs before launch (can launch without) | Parallel work, stub content |
| Resource dependency | Shared resource constraint | Both teams need the same infra engineer | Resource scheduling, shared pool |
| External dependency | Outside team or vendor | Third-party payment gateway integration | Buffer time, escalation plan |

### Dependency Tracking Table
```yaml
dependency_id: DEP-001
blocking_item: "Multi-region deployment"
blocked_by: "DNS global load balancer configuration"
owner: Platform Team
external_dependency: Network Team
status: in_progress
risk: medium
next_checkpoint: 2026-04-15
escalation_if_no_progress_by: 2026-04-22

dependency_id: DEP-002
blocking_item: "TypeScript SDK v3"
blocked_by: "Schema v3 published"
owner: SDK Team
external_dependency: API Team
status: planned
risk: low
next_checkpoint: 2026-05-01
escalation_if_no_progress_by: 2026-05-15
```

### Dependency Resolution Process
```yaml
dependency_resolution:
  step_1: identify
    when: During quarterly planning
    action: Each team lists their dependencies
    output: Full dependency map

  step_2: validate
    when: After initial dependency map
    action: Confirm each dependency with the providing team
    output: Validated dependency list with owners

  step_3: negotiate
    when: If dependency cannot be met
    action: Negotiate alternative timeline or workaround
    output: Agreed timeline or scope change

  step_4: track
    when: Throughout the quarter
    action: Weekly dependency check in team standups
    output: Status updates, risk flags

  step_5: escalate
    when: Dependency at risk of missing timeline
    action: Escalate through management chain
    output: Decision on priority or descope
```

## Roadmap Communication Playbook

### Audience-Specific Views

#### Executive View (1-pager)
```markdown
## Platform Roadmap — H2 2026

### Strategic Context
Platform growing 20% QoQ but reliability at risk.
Focus: (1) platform stability, (2) developer adoption, (3) ecosystem growth.

### Key Investments
| Initiative | Investment | Impact | Timeline |
|-----------|-----------|--------|----------|
| Multi-region | 3 eng, 6 mo | 99.9% → 99.99% uptime | Q3 2026 |
| Developer portal | 2 eng, 4 mo | 15 min → 3 min TTFC | Q3 2026 |
| API marketplace | 4 eng, 6 mo | Partner ecosystem, new revenue | Q4 2026 |

### Trade-offs
- Mobile SDKs deferred to Q1 2027 (web SDKs cover 85% of use cases)
- Developer portal v2 delayed to Q3 (SDK improvements prioritized)

### Success Measures
- Platform uptime: 99.99% (currently 99.9%)
- Developer NPS: 55 (currently 32)
- Active partners: 200 (currently 50)
```

#### Engineering View (detailed milestones)
```yaml
Q3 2026 — NOW:
  epic: Multi-region active-active
    owner: Infrastructure Team
    milestones:
      - M1: Regional router deployment (Week 4)
      - M2: Data replication pipeline (Week 8)
      - M3: Automated failover testing (Week 10)
      - M4: Production cutover (Week 12)
    dependencies:
      - DNS team: global load balancer
      - Security: cross-region encryption

  epic: Developer self-service portal
    owner: Platform Team
    milestones:
      - M1: API key management UI (Week 3)
      - M2: Usage dashboard (Week 6)
      - M3: Interactive playground (Week 10)
      - M4: Self-service plan upgrade (Week 12)
```

#### Customer View (themed, no dates)
```markdown
## What We're Building Next for You

### Faster Integration
We're investing heavily in developer experience:
- New developer portal coming this summer
- Self-service API key management
- Interactive docs — try API calls in your browser

### More Reliable Platform
- Active-active multi-region deployment
- 99.99% uptime SLA for Enterprise tier
- Real-time status dashboard

### Growing Ecosystem
- Partner marketplace (coming later this year)
- One-click install for popular tools
- Revenue sharing for published integrations
```

### Trade-Off Communication Format
```yaml
decision: "Invest 3 engineers for 6 months in multi-region"
if_we_do_this:
  gains:
    - "99.99% uptime (meets enterprise SLO)"
    - "GDPR compliance for EU expansion"
    - "P99 latency: 500ms → 100ms"
  costs:
    - "Developer portal v2 delayed to Q3"
    - "Python SDK deferred to Q3"
    - "Mobile SDKs deferred to Q1 2027"

then_we_cannot_do:
  - "Any new feature work for 6 months"
  - "Mobile SDK improvements this year"
  - "Further documentation investment"

risk:
  - "No capacity buffer — any slip directly impacts delivery"
  - "Key person dependency on 2 engineers"
```

## Roadmap Tool Selection

### Tool Comparison
```yaml
tool_selection:
  productboard:
    strengths: Now-Next-Later, prioritization scoring, stakeholder views
    weaknesses: Limited engineering integration
    best_for: Product-led roadmaps, outcome focus

  aha:
    strengths: OKR integration, custom workflows, capacity planning
    weaknesses: Over-engineered, steep learning curve
    best_for: Enterprise PM, strategy linkage

  airfocus:
    strengths: Custom scoring models, workspace views
    weaknesses: Limited reporting
    best_for: Prioritization-heavy workflows

  linear:
    strengths: Developer experience, fast, sprint tracking
    weaknesses: Limited strategy views, stakeholder UX
    best_for: Engineering-led roadmaps

  notion/sheets:
    strengths: Flexible, low cost, fast setup
    weaknesses: Manual updates, no automation
    best_for: Early-stage startups, lightweight tracking
```

## Key Points
- MCDA enables complex prioritization with multiple weighted criteria
- Cost of Delay (CD3) quantifies the economic impact of delaying initiatives
- WSJF factors: business value, time criticality, risk reduction ÷ job size
- OKR cascades connect company objectives to individual engineer KRs
- Initiative-to-KR mapping ensures roadmap work directly drives outcomes
- Stakeholder mapping workshop aligns engagement strategy per individual
- Roadmap review meetings require clear decisions and documented trade-offs
- Dependency types: hard, soft, resource, external — each with different mitigation
- Dependency resolution process: identify → validate → negotiate → track → escalate
- Audience-specific views: executive 1-pager, engineering milestones, customer themes
- Trade-off communication uses "If we do X, then we gain Y, but cannot do Z"
- Tool selection depends on team size, maturity, and primary use case

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with strategic roadmapping, dependency sorting, multitrack scenario planning, and integration schemas.
-->

