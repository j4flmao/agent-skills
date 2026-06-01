# Risk Management Fundamentals

## Overview
Risk management identifies, assesses, and mitigates uncertainties that could affect project or organizational objectives. This reference covers foundational concepts, risk identification techniques, qualitative and quantitative assessment, response planning, and monitoring.

## Core Concepts

### Concept 1: What is Risk?

Risk = uncertainty that matters.

**Key attributes**:
- Probability: likelihood of occurrence (0-100%)
- Impact: consequence if it occurs (cost, schedule, quality, reputation)
- Proximity: when the risk could materialize
- Detectability: how easily we'd know it occurred

**Risk vs Issue**:
- Risk: uncertain future event that may or may not happen
- Issue: event that has already occurred and needs immediate action
- Process: manage risks to prevent issues; manage issues to minimize damage

### Concept 2: Risk Categories

| Category | Examples |
|----------|----------|
| Technical | Architecture failure, performance degradation, tech debt, integration problems |
| Schedule | Timeline overruns, dependency delays, resource conflicts |
| Cost | Budget overrun, currency fluctuation, vendor price changes |
| Resource | Key person departure, skill gaps, team availability |
| Scope | Creep, misunderstood requirements, stakeholder disagreements |
| External | Regulatory changes, market shifts, vendor bankruptcy, natural disasters |
| Operational | Process failure, system outages, security incidents |
| Strategic | Competitor moves, technology obsolescence, partnership dissolution |

### Concept 3: The Risk Management Process (ISO 31000)

**5-step iterative process**:

1. **Establish Context** — define objectives, scope, risk appetite, and tolerance thresholds
2. **Risk Identification** — find potential risks using structured techniques
3. **Risk Analysis** — assess probability and impact (qualitative or quantitative)
4. **Risk Evaluation** — prioritize risks against appetite, decide which need treatment
5. **Risk Treatment** — select and implement response strategies

Continuous: Communicate & Consult, Monitor & Review throughout.

### Concept 4: Risk Appetite vs Tolerance

**Risk Appetite**: amount of risk the organization is willing to accept in pursuit of value.
- High appetite: startup, innovation projects, market disruption
- Low appetite: healthcare, finance, safety-critical systems

**Risk Tolerance**: acceptable deviation from objectives on a specific risk.
- Budget tolerance: ±10% of planned cost
- Schedule tolerance: ±2 weeks on milestones
- Quality tolerance: zero P0/P1 bugs in production

Tolerance is the actionable boundary. When tolerance is exceeded, escalation is triggered.

### Concept 5: Qualitative Risk Assessment

**Probability and Impact Matrix (PxI)**:

```
Impact →
Probability ↓ | Very Low | Low    | Medium | High   | Very High
               | (1)      | (2)    | (3)    | (4)    | (5)
---------------|----------|--------|--------|--------|---------
Very High (5)  | 5        | 10     | 15     | 20     | 25
High (4)       | 4        | 8      | 12     | 16     | 20
Medium (3)     | 3        | 6      | 9      | 12     | 15
Low (2)        | 2        | 4      | 6      | 8      | 10
Very Low (1)   | 1        | 2      | 3      | 4      | 5
```

Score thresholds:
- 1-4: Low — accept or monitor
- 5-12: Medium — active mitigation
- 15-25: High — immediate response required

### Concept 6: Risk Response Strategies

**For Threats (negative risks)**:
- **Avoid**: eliminate the risk by changing approach (e.g., use proven technology instead of experimental)
- **Transfer**: shift impact to third party (insurance, fixed-price contract, warranty)
- **Mitigate**: reduce probability or impact (prototyping, additional testing, redundancy)
- **Accept**: acknowledge and budget for contingency (active: contingency plan; passive: no action, monitor)

**For Opportunities (positive risks)**:
- **Exploit**: ensure opportunity happens (assign best people, accelerate timeline)
- **Share**: partner with others to capture (joint venture, partnership)
- **Enhance**: increase probability or impact (add features, expand scope)
- **Accept**: ready to capture if it occurs

### Concept 7: Risk Register Template

```
ID  | Category  | Description | Probability | Impact | PxI | Response | Owner | Status
----|-----------|-------------|-------------|--------|-----|----------|-------|-------
R01 | Technical | API vendor may delay release | 3 (Med) | 4 (High) | 12 | Mitigate: build fallback adapter | Alice | Active
R02 | Resource  | Key engineer may leave mid-project | 2 (Low) | 5 (V High) | 10 | Mitigate: cross-train, document knowledge | Bob | Active
R03 | Schedule  | Regulatory approval could take > expected | 4 (High) | 3 (Med) | 12 | Accept: buffer schedule by 2 weeks | Carol | Monitor
R04 | Cost      | Cloud costs may exceed budget | 3 (Med) | 3 (Med) | 9 | Mitigate: set budget alerts, reserved instances | Dave | Active
```

Fields: ID, Category, Description, Probability, Impact, PxI Score, Risk Level, Response Strategy, Owner, Status (Active/Monitor/Closed), Trigger, Fallback Plan.

### Concept 8: Key Risk Terminology

**Inherent Risk**: risk level before any mitigation applied.
**Residual Risk**: risk level after mitigation is implemented.
**Secondary Risk**: new risk created by implementing a response.
**Trigger**: early warning sign that a risk is about to materialize.
**Contingency Plan**: predefined actions when risk materializes.
**Fallback Plan**: backup plan if contingency fails.
**Risk Threshold**: maximum acceptable risk level before escalation.
**Risk Owner**: person accountable for managing a specific risk.

## Best Practices

| Practice | Description | Priority |
|----------|-------------|----------|
| Involve the Team | Risk identification is not a solo activity | High |
| Update Regularly | Risk register reviewed at least monthly | High |
| Assign Owners | Every risk has a named accountable person | High |
| Quantify When Possible | Move from qual to quant for high-impact risks | Medium |
| Link to Schedule | Identify when risks are most likely | Medium |
| Track Trigger Conditions | Know what signals a risk is materializing | High |
| Celebrate Risk Discovery | Finding risks early is good, not bad | Medium |

## Common Pitfalls

### Pitfall 1: Risk Register as a Checklist Exercise
List created at kickoff, never touched again. Risks identified but not actively managed.
Fix: review risk register at every status meeting. Update probability, impact, and status. Close or add items.

### Pitfall 2: Optimism Bias
Underestimating probability and impact. Assuming everything will go right.
Fix: use reference class forecasting — compare to actual outcomes of similar projects. Use premortem technique.

### Pitfall 3: Risk Aversion Paralysis
So focused on avoiding risks that no progress is made. Every option seems too risky.
Fix: distinguish between acceptable and unacceptable risks. A risk that's within tolerance and has a mitigation plan is manageable.

### Pitfall 4: Ignoring Opportunities
Risk management focuses only on threats. Positive risks (opportunities) are ignored.
Fix: track opportunities alongside threats in the risk register. Assign owners. Actively explore.

### Pitfall 5: Blaming Risk Identifiers
Team members who identify risks are seen as negative or pessimistic. Risk identification is discouraged.
Fix: celebrate risk discovery. Reward people who surface risks early. Normalize "what could go wrong" conversations.

### Pitfall 6: One-Size-Fits-All Response
Applying mitigate to every risk regardless of score. Not using avoid, transfer, or accept appropriately.
Fix: match response strategy to risk level. Low risks can be accepted. High risks may need transfer or avoid.

### Pitfall 7: No Contingency Budget
Risks identified but no budget reserved for mitigation. When risk materializes, no resources available.
Fix: allocate contingency budget proportional to risk exposure (typically 10-20% of project budget). Track contingency usage.

## Tooling Ecosystem

### Risk Management Tools
- Jira: issue tracking with risk fields, custom workflows
- Risk register spreadsheets: simple, flexible, universal
- Smartsheet: collaborative risk register with alerts
- ARM: specialized enterprise risk management
- RationalPlan: project risk analysis integrated
- Monte Carlo simulators: @RISK, Crystal Ball

### Techniques
- SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats)
- Premortem: imagine project has failed, work backwards to causes
- Delphi Method: anonymous expert consensus on probability/impact
- Bowtie Analysis: visualize cause → event → consequence
- FMEA: Failure Mode and Effects Analysis (engineering)
- Decision Tree: evaluate alternative choices with probabilities

## Key Points
- Risk is uncertainty that matters — not all uncertainty needs management
- PxI matrix prioritizes which risks need active response
- Every risk needs an owner and a response strategy
- Contingency budget is essential (10-20% of project budget)
- Update risk register at least monthly
- Balancing threats and opportunities — positive risks matter too
- Risk identification is a team sport, not a PM solo activity
- Inherent risk vs residual risk: mitigation reduces but rarely eliminates
- Triggers tell you when to act — define them in advance
- Celebrate risk discovery: early warning is valuable, not pessimistic
