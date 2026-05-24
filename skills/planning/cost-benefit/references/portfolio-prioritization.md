# Portfolio Prioritization

## Cost-Benefit Ranking

### Methodology
Rank investment opportunities by their cost-benefit ratio, but not by ratio alone — consider absolute value, strategic alignment, and risk.

### Simple Ranking Table

```
| Project | Investment | 3-Year Benefit | Net Benefit | ROI  | NPV    | Payback |
|---------|-----------|---------------|-------------|------|--------|---------|
| A: CI/CD pipeline | $200K | $600K | $400K | 200% | $310K | 1.0 yr |
| B: Cloud migration | $1.4M | $2.4M | $1.0M | 74%  | $716K | 2.1 yr |
| C: Monitoring upgrade | $150K | $350K | $200K | 133% | $162K | 1.5 yr |
| D: AI chatbot | $800K | $1.5M | $700K | 88%  | $450K | 2.5 yr |
| E: Feature refresh | $500K | $700K | $200K | 40%  | $125K | 3.0 yr |
```

### Ranking by Different Criteria

```
| Rank by ROI | Rank by NPV | Rank by Strategic Fit | Rank by Risk |
|-------------|-------------|----------------------|--------------|
| 1. CI/CD (200%) | 1. Cloud ($716K) | 1. Cloud | 1. Monitoring (low) |
| 2. Monitoring (133%) | 2. AI chatbot ($450K) | 2. AI chatbot | 2. CI/CD (low) |
| 3. AI chatbot (88%) | 3. CI/CD ($310K) | 3. CI/CD | 3. Feature (medium) |
| 4. Cloud (74%) | 4. Monitoring ($162K) | 4. Monitoring | 4. AI chatbot (medium) |
| 5. Feature (40%) | 5. Feature ($125K) | 5. Feature | 5. Cloud (medium) |
```

**Key insight**: Different ranking criteria produce different priorities. The portfolio decision must balance them.

## Weighted Scoring Model

### Scorecard Dimensions

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Strategic alignment | 25% | How well does the project support company OKRs? |
| ROI / Financial return | 20% | What is the expected financial return? |
| Customer impact | 20% | How many customers benefit and how much? |
| Technical feasibility | 15% | Can we deliver this with current capability? |
| Risk level | 10% | What is the probability of success? |
| Time to value | 10% | How quickly will we see results? |

### Scoring Template
```
Project: Cloud Migration

| Dimension | Weight | Score (1-5) | Weighted Score |
|-----------|--------|-------------|---------------|
| Strategic alignment | 25% | 5 | 1.25 |
| ROI / Financial | 20% | 4 | 0.80 |
| Customer impact | 20% | 4 | 0.80 |
| Technical feasibility | 15% | 3 | 0.45 |
| Risk level | 10% | 3 | 0.30 |
| Time to value | 10% | 2 | 0.20 |
| **Total** | **100%** | | **3.80** |
```

### Portfolio Comparison

```
| Project | Strategic (25%) | Financial (20%) | Customer (20%) | Feasibility (15%) | Risk (10%) | Time (10%) | Total |
|---------|----------------|----------------|---------------|-------------------|------------|------------|-------|
| CI/CD | 3 | 4 | 3 | 5 | 5 | 5 | 3.90 |
| Cloud | 5 | 4 | 4 | 3 | 3 | 2 | 3.80 |
| Monitoring | 2 | 3 | 4 | 5 | 5 | 4 | 3.50 |
| AI chatbot | 4 | 4 | 4 | 3 | 2 | 2 | 3.40 |
| Feature | 2 | 2 | 3 | 4 | 4 | 3 | 2.85 |
```

### Prioritization Quadrant

```
                 High Value
                     │
     Feature Refresh │  Cloud Migration (3.80)
       (2.85)        │  ✓ AI Chatbot (3.40)
                     │
 ────────────────────┼────────────────────
    Low Feasibility  │  High Feasibility
                     │
          │           CI/CD Pipeline (3.90)
          │  Monitoring Upgrade (3.50)
          │
                 Low Value

Top priority: CI/CD (high value, high feasibility)
Second priority: Cloud (highest value, moderate feasibility)
```

## Opportunity Cost

### Definition
The value of the next best alternative foregone when a decision is made. Every investment choice implicitly rejects alternative uses of the same resources.

### Example: Engineering Capacity
```
Engineering team: 10 people × 1 quarter = 60 person-weeks

Option A: Build new feature (expected value: $200K)
Option B: Pay down tech debt (expected value: $150K cost avoidance)
Option C: Platform migration prep (expected value: $300K future savings)

If we choose A:
  Opportunity cost = max(B, C) = $300K (forgone migration prep)
  True net value of A = $200K - $300K = -$100K
```

### Opportunity Cost in Portfolio Decision
```
| If We Fund This | We Cannot Fund This | Opportunity Cost |
|-----------------|---------------------|------------------|
| AI chatbot ($800K) | CI/CD + Monitoring ($350K) | 2 projects with high ROI |
| Cloud ($1.4M) | AI chatbot + CI/CD + Feature ($1.5M) | 3 projects with faster payback |
| Feature ($500K) | Monitoring ($150K) + many quick wins | Several quick wins lost |
```

## Resource Constraints

### Types of Constraints
- **Budget**: Total capital available for investment
- **Engineering capacity**: Number of available developers (most common constraint)
- **Subject matter expertise**: Limited number of people with specific skills (ML, security, platform)
- **Time**: Fixed delivery deadline (regulatory, market window)
- **Dependencies**: Projects that cannot proceed until another completes

### Capacity-Constrained Portfolio

```
Capacity: 3 concurrent projects (teams available)

Q1: CI/CD Pipeline (Team A) | Monitoring (Team B) | Feature Refresh (Team C)
Q2: Cloud - Phase 1 (Team A) | AI Chatbot - Research (Team B) | Feature Refresh (Team C)
Q3: Cloud - Phase 2 (Team A) | AI Chatbot - MVP (Team B) | Monitoring - Phase 2 (Team C)
Q4: Cloud - Phase 3 (Team A) | AI Chatbot - Launch (Team B) | Cloud - Support (Team C)
```

### Bottleneck Management
```
Identify the bottleneck resource (usually senior engineering or specialized skills):

| Resource | Demand | Supply | Gap | Action |
|----------|--------|--------|-----|--------|
| Senior backend | 4 projects | 2 people | -2 | Hire, contract, or reprioritize |
| ML engineer | 2 projects | 0.5 people | -1.5 | Hire, or defer ML projects |
| DevOps | 5 projects | 1 person | -4 | Critical bottleneck — expand platform team |
| PM | 3 projects | 2 people | -1 | Prioritize most strategic projects |
```

## Capacity Alignment

### Capacity Planning Process

1. **Estimate demand**: Collect all proposed projects with effort estimates
2. **Calculate capacity**: Determine available person-weeks per quarter
3. **Match demand to capacity**: Select projects that fit within capacity
4. **Identify gaps**: Projects that don't fit → defer, descope, or add resources
5. **Adjust**: Re-balance quarterly as new information emerges

### Annual Capacity Model
```
Available Engineering Capacity: 40 engineers × 48 weeks = 1,920 person-weeks

Overhead allocation:
- Ceremonies (planning, retro, standups): 15% = 288 pw
- Support/incidents: 10% = 192 pw
- Training/learning: 5% = 96 pw
- Internal improvement: 5% = 96 pw
- Available for project work: 65% = 1,248 pw

Project demand:
CI/CD Pipeline: 24 pw
Cloud Migration: 480 pw (phased over 4 quarters)
AI Chatbot: 160 pw
Monitoring Upgrade: 40 pw
Feature Refresh: 120 pw
Total demand: 824 pw (within capacity of 1,248 pw)
```

### When Capacity Exceeds Demand
- Opportunity to invest in technical debt reduction
- Platform and automation improvements
- Team training and skill development
- Innovation time (Google 20% time, hackathons)
- Cross-team knowledge sharing

### When Demand Exceeds Capacity
- Defer lower-priority projects
- Descope projects to MVP
- Hire or contract additional capacity
- Accept trade-offs and document decisions
- Plan for partial delivery with phased approach

## Portfolio Governance

### Review Cadence
| Review Type | Frequency | Participants | Decisions |
|-------------|-----------|-------------|-----------|
| Portfolio review | Quarterly | Leadership, PMO, engineering directors | Project selection, funding, resource changes |
| Project review | Monthly | Project sponsors, PMs | Progress check, issue escalation |
| Pipeline review | Bi-weekly | PMO, product managers | New proposals, backlog grooming |

### Decision Rights
```
| Decision | Who Decides | Input From |
|----------|-------------|------------|
| Portfolio priorities | Leadership team | Product, engineering, finance |
| Project funding | Portfolio board | PMO, finance |
| Resource allocation | Engineering leadership | PMO |
| Project go/no-go | Project sponsor | Stakeholders |
| Scope change | Project sponsor + PM | Team |
| Project cancellation | Portfolio board | Project sponsor |
```

### Portfolio Health Metrics
```
Portfolio Dashboard — Q2 2026

Investment Distribution:
├── Growth (new features): 45%
├── Run (maintenance): 30%
└── Transform (platform): 25%

Capacity Utilization: 92% (healthy)
Projects on track: 8/12 (67%)
Projects at risk: 3/12 (25%)
Projects blocked: 1/12 (8%)

ROI Forecast: 72% weighted average
Risk-adjusted portfolio NPV: $4.2M

Variance: +8% vs plan (on track)
```

## References
- Project Management Institute: The Standard for Portfolio Management
- Lean Portfolio Management — Scaled Agile Framework (SAFe)
- Strategic Portfolio Management — Gartner
- Harvard Business Review: Managing Your Innovation Portfolio
- Beyond the Hype: A Guide to Understanding and Managing the Modern Portfolio — McKinsey
