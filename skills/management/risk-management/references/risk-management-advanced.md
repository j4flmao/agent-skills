# Risk Management Advanced Topics

## Introduction
Advanced risk management covers quantitative risk analysis, Monte Carlo simulation, decision tree analysis, risk burndown tracking, risk-adjusted decision making, enterprise risk management (ERM), and organizational risk culture. This reference builds on fundamentals for experienced practitioners.

## Quantitative Risk Analysis

### When to Use Quantitative Analysis
Move from qualitative to quantitative when:
- Risk score > 15 (PxI matrix)
- Decision involves significant budget (> $100K at stake)
- Multiple risks interact or compound
- Stakeholders require probabilistic forecasts
- Project has regulatory or safety-critical implications

### Probability Distributions

Common distributions for risk modeling:
- **Triangular** (min, likely, max): used when limited data, expert estimates
- **Normal** (mean, std dev): natural phenomena, many independent factors
- **Log Normal**: cost and schedule (can't go below zero, long tail to right)
- **BetaPERT**: similar to triangular but with weighted most-likely value
- **Uniform**: true uncertainty with no central tendency

### Three-Point Estimation
For each uncertain variable, estimate:
- **Optimistic (O)**: best case (5-10% probability)
- **Most Likely (M)**: typical case
- **Pessimistic (P)**: worst case (5-10% probability)

Formulas:
- Triangular mean: `(O + M + P) / 3`
- PERT mean: `(O + 4M + P) / 6`
- PERT std dev: `(P - O) / 6`

## Monte Carlo Simulation

### Process
1. Identify all uncertain variables (duration, cost, dependencies)
2. Assign probability distributions to each variable
3. Define relationships between variables (correlations)
4. Run 10,000+ iterations, each sampling from distributions
5. Aggregate results into probability distribution of outcome

### Interpreting Monte Carlo Results

```
Completion Date Probability:
April 1:    5%  (best case)
April 15:  50%  (median — P50)
May 1:     85%  (P85 — typical commitment target)
May 15:    95%  (P95 — worst case credible)
```

Use P50 for forecasting, P85 for commitments, P95 for contingency planning.

### Schedule Risk Sensitivity
Tornado chart shows which risks have most impact on outcome:
```
Risk                        Impact on Completion
Vendor delivery delay       ████████████████████  +22 days
Key person availability     ████████████          +14 days
Integration testing         ██████                +8 days
Scope change frequency      ████                  +5 days
```

Focus mitigation on top 2-3 items. Sensitivity analysis reveals where effort has highest ROI.

## Decision Tree Analysis

### Structure
```
Decision → Chance Node (probability) → Outcome (value)
                    ↘ Chance Node (1-probability) → Outcome (value)
```

### Example: Build vs Buy Decision
```
Build in-house ($200K)
├── 60% succeed → Revenue: $500K → Net: $300K
└── 40% fail → Revenue: $100K → Net: -$100K
Expected Value: 0.6 × $300K + 0.4 × (-$100K) = $140K

Buy license ($80K)
├── 90% integrate → Revenue: $400K → Net: $320K
└── 10% fail → Revenue: $200K → Net: $120K
Expected Value: 0.9 × $320K + 0.1 × $120K = $300K

Decision: Buy license (higher expected value)
```

Decision trees make tradeoffs visible and debatable. Update probabilities as new information arrives.

## Risk Burndown and Tracking

### Risk Burndown Chart
Track total risk exposure (sum of PxI scores) over time:
```
Risk Exposure
    ↑
 200│ █
 180│ █ █
 160│ █ █ █
 140│ █ █ █ █
 120│ █ █ █ █ █
 100│ █ █ █ █ █ █
  80│ █ █ █ █ █ █ █
  60│ █ █ █ █ █ █ █ █
    └──────────────────→ Time
        W1 W2 W3 W4 W5 W6 W7 W8
```

Expected trend: decreasing. If risk exposure increases, either new risks emerging or existing risks intensifying. Investigate upward trends.

### Risk Reassessment Cadence
- **Active risks**: weekly status update, monthly full reassessment
- **Monitor risks**: monthly check, quarterly reassessment
- **Closed risks**: archived but reviewed for similar projects
- **New risks**: immediate ID and scoring, entered into register within 1 week

### Risk Review Meeting Agenda (Monthly)
1. New risks identified this period (5 min)
2. Risk status changes (10 min) — probability, impact, proximity updates
3. Close or archive resolved risks (5 min)
4. Risk response effectiveness review (10 min) — is mitigation working?
5. Risk exposure trend (5 min) — burndown chart, PxI sum
6. Top 3 risks deep dive (15 min) — detailed status, residual risk
7. Action items and owners (5 min)

## Risk-Adjusted Decision Making

### Expected Monetary Value (EMV)
`EMV = Σ (Probability × Impact) for all identified risks`

Apply EMV to compare project alternatives:
- Option A: base cost $500K, EMV risk = $50K → total expected cost: $550K
- Option B: base cost $550K, EMV risk = $20K → total expected cost: $570K

Option A has lower expected total cost despite higher risk exposure.

### Contingency Reserve Calculation
```
Method 1: Percentage of budget (simple)
  Contingency = 10-20% of total budget

Method 2: P80 - P50 from Monte Carlo (targeted)
  If P50 cost = $1M and P80 cost = $1.2M → contingency = $200K

Method 3: EMV of identified risks (detailed)
  Contingency = sum of (Probability × Impact) for all medium+ risks
```

### Management Reserve
Additional reserve above contingency for unknown-unknowns (unidentified risks). Typically 5-10% of total budget. Controlled by senior management, not project manager.

## Enterprise Risk Management (ERM)

### Risk Culture Maturity

| Level | Characteristics |
|-------|----------------|
| 1 — Naive | No formal risk management, decisions by intuition, blame culture |
| 2 — Aware | Basic risk register, compliance-driven, risk as separate function |
| 3 — Managed | Risk integrated into planning, risk owners accountable, regular reporting |
| 4 — Enabled | Data-driven risk decisions, risk appetite clearly defined, escalation works |
| 5 — Resilient | Risk-aware culture, proactive risk identification, risk as strategic advantage |

### Risk Governance Structure
```
Board / Audit Committee
    └── Chief Risk Officer (CRO) / Risk Committee
        ├── Operational Risk — business units
        ├── Financial Risk — treasury, finance
        ├── Strategic Risk — strategy, M&A
        └── Compliance Risk — legal, regulatory
```

### Risk Reporting to Board
Standard board risk report format:
1. Risk landscape overview (heat map of top 10 risks)
2. Risk exposure trend (quarter-over-quarter)
3. Risk appetite utilization (are we within tolerance?)
4. Emerging risks (new threats and opportunities)
5. Top 3 risks — deep dive with response status
6. Key Risk Indicators (KRIs) with threshold breaches
7. Risk incidents this period and lessons learned

## Key Risk Indicators (KRIs)

### Designing KRIs
Leading indicators that warn when risk is about to materialize:

| Risk | KRI | Threshold | Action |
|------|-----|-----------|--------|
| Key person dependency | Bus factor (people who can replace) | < 2 | Begin cross-training |
| Budget overrun | Cost performance index (CPI) | < 0.9 | Reduce scope or request reserve |
| Schedule delay | Schedule performance index (SPI) | < 0.9 | Resource reallocation |
| Quality defect | Defect escape rate | > 5% | Code freeze, quality review |
| Security breach | Vulnerability age (days open) | > 30 | Security sprint |
| Vendor failure | Vendor SLA adherence | < 95% | Engage backup vendor |

### KRI Dashboard
```
KRI                    Threshold  Current  Trend  Status
Bus factor (key roles)  ≥ 2        2        →      🟢
CPI (cost index)        > 0.9      0.87     ↓      🔴
SPI (schedule index)    > 0.9      0.94     →      🟢
Defect escape rate      < 5%       3.2%     ↓      🟢
Vulnerability age       < 30 d     45       ↑      🔴
Vendor SLA              > 95%      97%      →      🟢
```

## Key Points
- Quantitative analysis is warranted for high-impact risks (> 15 PxI or > $100K)
- Monte Carlo simulation converts point estimates into probability distributions
- P50 for planning, P85 for commitments, P95 for contingency
- Tornado charts reveal which risks deserve mitigation attention
- Risk burndown tracks total exposure; upward trends need investigation
- EMV enables risk-adjusted comparison of alternatives
- Contingency reserve = 10-20% of budget; management reserve = 5-10%
- KRIs are leading indicators — they warn before risk materializes
- Risk culture maturity determines how effectively tools and processes are used
- Board reporting should highlight trends, emerging risks, and appetite utilization
