# Investor Pitch Preparation Guide

## Overview

Raising capital requires more than a great pitch deck. Success depends on strategic preparation: understanding investor personas, positioning against competition, presenting credible financial projections, mastering due diligence readiness, rehearsing effectively, and navigating term sheets. This guide covers the complete investor engagement lifecycle from targeting to close.

## Fundraise Strategy

### Round Type by Stage

| Stage | Typical Amount | Investor Type | Valuation Range | Key Metrics Required |
|-------|---------------|---------------|-----------------|---------------------|
| Pre-seed | $500K-$2M | Angels, micro-VCs | $5M-$10M | Team, idea, early prototype, some user validation |
| Seed | $2M-$5M | Seed VCs, super-angels | $10M-$20M | MVP, early traction, initial revenue, growing user base |
| Series A | $5M-$15M | Institutional VCs | $20M-$50M | Product-market fit, $1M-$3M ARR, clear unit economics |
| Series B | $15M-$30M | Growth VCs | $50M-$150M | Scaling efficiently, $3M-$15M ARR, proven GTM model |
| Series C+ | $30M+ | Late-stage VCs, PE | $150M+ | Market leadership, $15M+ ARR, path to profitability |

### Fundraise Timeline

```yaml
# fundraise-timeline.yaml
phases:
  preparation:
    duration: 4-6 weeks
    activities:
      - "Refine pitch deck and story"
      - "Build financial model with 3 scenarios"
      - "Prepare data room"
      - "Create target investor list"
      - "Gather customer references"
      - "Practice pitch with advisors"

  outreach:
    duration: 2-3 weeks
    activities:
      - "Send warm introductions via network"
      - "Share deck with target investors"
      - "Schedule initial meetings"
      - "Track engagement and follow-up"
      - "Refine pitch based on feedback"

  meetings:
    duration: 4-6 weeks
    activities:
      - "Conduct partner meetings"
      - "Present to full partnership"
      - "Provide data room access"
      - "Facilitate customer reference calls"
      - "Share additional materials as requested"

  due_diligence:
    duration: 2-4 weeks
    activities:
      - "Complete DD requests"
      - "Financial audit if required"
      - "Technical review if required"
      - "Legal review of company documents"
      - "Reference checks with customers and team"

  closing:
    duration: 2-4 weeks
    activities:
      - "Review term sheet"
      - "Negotiate terms"
      - "Legal documentation"
      - "Board approval"
      - "Fund transfer"
```

### Strategy by Round Type

**Pre-Seed Strategy**: Focus on team and vision. Target 15-20 angel investors and 5-10 micro-VCs. Warm introductions are critical. Lead investor typically gets a board seat. Close within 3 months or reassess.

**Seed Strategy**: Focus on early traction and product-market fit signals. Target 10-15 seed-stage VCs. Run a structured process with a 4-6 week meeting window. Create competition between 2-3 interested firms. Lead investor sets terms, others follow.

**Series A Strategy**: Focus on repeatable GTM motion and unit economics. Target 8-12 institutional VCs. Prepare extensively for partner meetings and full partnership presentations. Data room must be comprehensive. Customer reference calls are decisive.

**Series B+ Strategy**: Focus on growth efficiency and market leadership. Target 5-8 growth VCs. Process is more relationship-driven. Strategic value-add matters. Data room includes detailed cohort analysis, competitive landscape, and organizational plan.

## Investor Persona Targeting

### Investor Research Checklist

```markdown
## Investor Profile Template

**Firm Name:** [Name]
**Fund Size:** [Amount]
**Stage Focus:** [Seed / Series A / Growth]
**Sector Focus:** [List of sectors]
**Check Size:** [$X - $Y]
**Lead/Follow:** [Lead / Co-lead / Follow only]
**Board Seat:** [Yes / No / Depends]

**Past Investments:**
- [Company A] - [outcome]
- [Company B] - [outcome]
- [Company C] - [outcome]

**Current Portfolio (Relevant):**
- [Company X] - might be complementary/competitive

**Partner Alignment:**
- [Partner Name]: focuses on [sector], invested in [companies]
- [Partner Name]: background in [industry], known for [thing]

**Relationship:**
- [ ] Warm introduction from [name]
- [ ] Conference meeting at [event]
- [ ] Cold email
- [ ] Previously met at [time]

**Relevance to Us:**
- High: Exact stage + sector match
- Medium: Adjacent sector, right stage
- Low: Wrong stage or sector
```

### Investor Persona Archetypes

**The Theme Investor**: Invests based on a thesis (e.g., "AI in healthcare"). Pitch must align with their stated thesis explicitly. Reference their published content and past investments.

**The Pattern Matcher**: Looks for similarities to successful past investments. Pitch must draw parallels to known success stories in their portfolio. Acknowledge differences honestly.

**The Number Cruncher**: Focuses on unit economics and metrics. Come prepared with detailed cohort analysis, LTV/CAC trends, and unit economics breakdown. Have a story for every metric trend.

**The Visionary**: Invests based on market transformation potential. Pitch the future, not the present. Paint a vivid picture of how the world changes with your company. Traction proves you are on the right path.

**The Operator**: Former founder or executive who values operational excellence. Pitch must demonstrate deep understanding of the business operations. Show you know what you do not know.

**The Platform Investor**: Value-add through network and resources. Pitch must show how their platform accelerates your growth. Be specific about what introductions and support you need.

## Competitive Landscape Positioning

### Competitive Analysis Framework

```yaml
# competitive-analysis.yaml
competitors:
  direct:
    - name: "Competitor A"
      strengths:
        - "Brand recognition"
        - "Entrenched enterprise sales"
        - "Feature breadth"
      weaknesses:
        - "Legacy architecture"
        - "Slow release cycle"
        - "High total cost of ownership"
      our_advantage:
        - "Modern cloud-native architecture"
        - "80% faster deployment"
        - "60% lower TCO"
      market_share: "~35%"
      funding: "$150M raised"

  indirect:
    - name: "Competitor B"
      approach: "DIY with open source"
      weakness: "Requires 5-person dedicated team to maintain"
      our_advantage: "Fully managed, 1-person operation"

  future:
    - name: "Potential Big Tech Entrant"
      threat_level: "Low (not core to their business)"
      our_defense: "Deep domain expertise, vertical integrations"

positioning_map:
  x_axis: "Price (Low to High)"
  y_axis: "Feature Depth (Basic to Advanced)"
  competitors:
    - name: "Us"
      x: 0.4
      y: 0.8
    - name: "Competitor A"
      x: 0.7
      y: 0.6
    - name: "Competitor B"
      x: 0.1
      y: 0.3
    - name: "Competitor C"
      x: 0.8
      y: 0.9

defensibility:
  moats:
    - "Network effects: each new user improves the product for everyone"
    - "Data advantage: proprietary dataset of 10M+ signals"
    - "Switching costs: deeply integrated into customer workflows"
    - "IP: 3 granted patents, 7 pending"
  - "Brand: category leader in emerging segment"
```

## Financial Projections Presentation

### Model Structure

```yaml
# financial-model.yaml
assumptions:
  revenue:
    - "Customer acquisition: 50 new customers/month by end of Year 1, growing to 200 by Year 3"
    - "Average contract value: $24K/year, increasing 10% annually"
    - "Net revenue retention: 120% (expansion + upgrades - churn)"
    - "Sales cycle: 45 days average, reducing to 30 days by Year 3"
  costs:
    - "Gross margin: 75%, improving to 82% as infrastructure scales"
    - "Sales and marketing: 45% of revenue Year 1, dropping to 30% by Year 3"
    - "R&D: 35% of revenue Year 1, dropping to 20% by Year 3"
    - "G&A: 15% of revenue Year 1, dropping to 10% by Year 3"
  headcount:
    - "Start: 15 people"
    - "Year 1 end: 25 people"
    - "Year 2 end: 45 people"
    - "Year 3 end: 75 people"

projections:
  year_1:
    revenue: "$3.5M"
    gross_margin: "75%"
    operating_expenses: "$4.2M"
    net_income: "-$0.7M"
    ARR: "$3.5M"
    NRR: "120%"
  year_2:
    revenue: "$9.0M"
    gross_margin: "78%"
    operating_expenses: "$9.5M"
    net_income: "-$0.5M"
    ARR: "$9.0M"
    NRR: "115%"
  year_3:
    revenue: "$22.0M"
    gross_margin: "82%"
    operating_expenses: "$18.0M"
    net_income: "$4.0M"
    ARR: "$22.0M"
    NRR: "110%"
```

### Three-Scenario Projection

```markdown
## Scenario Analysis

### Base Case (Most Likely - 60% probability)
- 50 new customers/month by end of Year 1
- 120% NRR throughout
- 45-day sales cycle
- $3.5M ARR end of Year 1 → $22M ARR end of Year 3

### Upside Case (20% probability)
- 75 new customers/month by end of Year 1
- 135% NRR (higher expansion)
- 30-day sales cycle (faster enterprise adoption)
- $5.0M ARR end of Year 1 → $35M ARR end of Year 3

### Downside Case (20% probability)
- 30 new customers/month by end of Year 1
- 105% NRR (normal churn)
- 60-day sales cycle
- $2.0M ARR end of Year 1 → $12M ARR end of Year 3

### Key Drivers
- Upside: Enterprise deals close faster than expected, expansion accelerates
- Downside: Macroeconomic headwinds slow enterprise procurement
- Cash runway: $5M investment provides 18 months in base case, 24 months in downside
```

## Unit Economics Deep Dive

### Unit Economics Calculation

```python
# unit_economics.py
from dataclasses import dataclass

@dataclass
class UnitEconomics:
    cac: float  # Customer acquisition cost
    acv: float  # Annual contract value
    gross_margin: float  # As percentage
    avg_lifetime_years: float
    magic_number: float  # Sales efficiency

    @property
    def ltv(self) -> float:
        return self.acv * self.gross_margin * self.avg_lifetime_years

    @property
    def ltv_cac_ratio(self) -> float:
        if self.cac == 0:
            return float('inf')
        return self.ltv / self.cac

    @property
    def payback_period_months(self) -> float:
        monthly_gross_profit = (self.acv * self.gross_margin) / 12
        if monthly_gross_profit == 0:
            return float('inf')
        return self.cac / monthly_gross_profit

    @property
    def gross_profit_per_customer(self) -> float:
        return self.acv * self.gross_margin

    def is_healthy(self) -> dict:
        checks = {
            'ltv_cac_ratio_above_3': self.ltv_cac_ratio >= 3.0,
            'payback_period_under_12_months': self.payback_period_months <= 12,
            'gross_margin_above_60': self.gross_margin >= 0.60,
            'magic_number_above_0_7': self.magic_number >= 0.7,
        }
        return checks


# Example: SaaS company
saas_economics = UnitEconomics(
    cac=12000,
    acv=24000,
    gross_margin=0.75,
    avg_lifetime_years=4.5,
    magic_number=0.85
)

print(f"LTV: ${saas_economics.ltv:.0f}")
print(f"LTV/CAC: {saas_economics.ltv_cac_ratio:.1f}x")
print(f"Payback Period: {saas_economics.payback_period_months:.0f} months")
print(f"Health: {saas_economics.is_healthy()}")
```

### Cohort Analysis Table

| Customer Cohort | Customers | ACV | Total Revenue | Gross Margin | CAC | LTV/CAC | Payback (months) |
|----------------|-----------|-----|---------------|-------------|-----|---------|-------------------|
| Q1 2024 | 8 | $22K | $176K | 72% | $11K | 2.9x | 13 |
| Q2 2024 | 12 | $24K | $288K | 74% | $12K | 3.1x | 11 |
| Q3 2024 | 15 | $25K | $375K | 75% | $12K | 3.3x | 10 |
| Q4 2024 | 18 | $26K | $468K | 76% | $11K | 3.6x | 9 |

## Due Diligence Readiness

### Data Room Checklist

```markdown
## Data Room Contents

### Corporate Documents
- [ ] Certificate of incorporation
- [ ] Bylaws / Articles of association
- [ ] Cap table (current)
- [ ] Board meeting minutes (last 12 months)
- [ ] Material contracts (customer, vendor, partnership)
- [ ] IP assignment agreements (all employees and contractors)
- [ ] Trademark and patent filings

### Financial Documents
- [ ] Audited financials (if available) or reviewed financials
- [ ] Monthly P&L statements (last 24 months)
- [ ] Cash flow statements
- [ ] Balance sheets
- [ ] Revenue recognition policy
- [ ] Deferred revenue schedule
- [ ] AR aging report
- [ ] Budget vs actuals
- [ ] Sales tax filings
- [ ] Tax returns (last 2 years)

### Technical Documents
- [ ] Architecture overview
- [ ] Infrastructure and deployment diagram
- [ ] Security policies and certifications (SOC2, ISO 27001)
- [ ] Penetration test results
- [ ] Data privacy policies (GDPR, CCPA)
- [ ] Disaster recovery plan
- [ ] SLA documentation
- [ ] Technical roadmap

### Customer Documents
- [ ] Top 10 customer contracts
- [ ] Customer satisfaction surveys (NPS)
- [ ] Case studies
- [ ] Churn analysis
- [ ] Cohort retention curves
- [ ] Reference contact list (with permission)

### People Documents
- [ ] Organizational chart
- [ ] Key employee bios
- [ ] Employment agreements
- [ ] Compensation benchmarks
- [ ] Equity grant schedule
- [ ] Benefits summary
```

## Pitch Rehearsal Framework

### Practice Structure

```yaml
# rehearsal-framework.yaml
phases:
  solo_practice:
    sessions: 10-15
    method: "Record yourself on video"
    focus:
      - "Slide transitions and timing"
      - "Vocal variety and pacing"
      - "Removing filler words"
      - "Gestures and movement"
    target: "Under 15 minutes for 10-slide deck"

  peer_feedback:
    sessions: 5-8
    audience: "Colleagues and advisors"
    focus:
      - "Message clarity"
      - "Compelling story arc"
      - "Q&A preparation"
    feedback_requested:
      - "What was the main message of each slide?"
      - "What questions do you have?"
      - "What was confusing or unclear?"

  investor_simulation:
    sessions: 3-5
    audience: "Experienced founders or angels"
    format: "Full pitch + 30 min Q&A"
    focus:
      - "Handling tough questions"
      - "Reading the room"
      - "Flexibility in delivery"
    simulation_types:
      - "Engaged investor: lots of questions, strong interest"
      - "Skeptical investor: pushes back on assumptions"
      - "Distracted investor: keeps checking phone"
```

### Common Q&A Questions by Topic

**Market and Competition**
- "Who are your top 3 competitors and why will you beat them?"
- "What happens when Google/Amazon/Microsoft enters this space?"
- "How did you calculate your TAM? Why is it different from analyst estimates?"
- "What market share do you need to be a $100M company?"
- "Who would you consider your most dangerous competitor?"

**Product and Technology**
- "What is the core technical insight that makes this possible?"
- "What is your technology moat? Is it defensible?"
- "What is the biggest technical risk you face?"
- "How do you handle data privacy and security?"
- "What is your product roadmap for the next 18 months?"

**Business Model and Metrics**
- "Why is your LTV/CAC ratio improving (or declining)?"
- "What is your gross margin, and how does it change at scale?"
- "How long is your sales cycle, and how are you reducing it?"
- "What is your magic number? Why is it where it is?"
- "What is your path to profitability?"

**Team**
- "Why is your team uniquely qualified to solve this?"
- "What key hire do you need to make next?"
- "What is your biggest team risk?"
- "How did your co-founders meet? How do you resolve disagreements?"
- "What would the team look like in 2 years?"

**Financials and Fundraising**
- "Why are you raising now instead of later?"
- "What happens if you do not raise this round?"
- "How did you arrive at your valuation expectations?"
- "What will you do if you miss your revenue targets?"
- "Other investors you are talking to? What is the process timeline?"

## Term Sheet Navigation

### Key Term Definitions

```yaml
# term-sheet-glossary.yaml
terms:
  valuation:
    pre_money: "Company value before investment"
    post_money: "Pre-money + investment amount"
    price_per_share: "Pre-money / fully diluted shares"
  
  liquidation_preference:
    non_participating: "Investor gets 1x back OR converts to common, whichever is higher"
    participating: "Investor gets 1x back PLUS shares in remaining distribution"
    capped_participation: "Participating up to Nx return, then converts to common"
  
  anti_dilution:
    full_ratchet: "Protection against down rounds at any price (investor friendly)"
    weighted_average: "Adjustment based on weighted average of new price (standard)"
    broad_based: "Most common - includes all outstanding shares in calculation"
  
  governance:
    board_seats: "Investor(s) get board representation"
    protective_provisions: "Investor veto rights on key decisions (M&A, debt, etc.)"
    information_rights: "Regular financial reporting to investors"
  
  employee_pool:
    option_pool: "Shares reserved for future employees"
    pool_shuffle: "Does pool come from pre-money (founder dilute) or post-money?"
  
  other:
    pro_rata: "Right to participate in future rounds to maintain ownership %"
    drag_along: "Majority shareholders can force minority to sell in M&A"
    no_shop: "Company cannot solicit other offers for N days"
    expedited_ipo: "Vesting acceleration on change of control"
```

### Term Sheet Negotiation Priorities

```markdown
## Negotiation Strategy

### Must Protect (Non-Negotiable)
- Control of the board (founders should maintain majority or at least parity)
- Anti-dilution: weighted average only, never full ratchet
- Liquidation preference: non-participating preferred standard
- Option pool: comes from pre-money valuation

### Important to Negotiate
- Vesting schedule: standard is 4 years with 1-year cliff
- Pay-to-play provisions (avoid or limit)
- Information rights (scope and frequency)
- Pro-rata rights (mutual, not just investor)
- Drag-along thresholds (should require supermajority)

### Less Critical (Standard Market Terms)
- No-shop clause (30-45 days)
- Representations and warranties (standard with knowledge qualifiers)
- Counsel fees (market standard is investor pays their own)
- Confidentiality and non-disclosure
- Most-favored-nation (MFN) provisions
```

## Follow-Up Strategy

### Post-Meeting Actions

```markdown
## Meeting Follow-Up Timeline

### Within 1 Hour
- Send personalized thank-you email to each participant
- Attach requested materials (if any)
- Note key questions asked and concerns raised

### Within 24 Hours
- Send meeting summary with key points
- Address any questions you could not answer in the meeting
- Share additional supporting materials that reinforce the pitch
- Provide requested introductions or references

### Within 1 Week
- Follow up with any outstanding items
- Share positive developments (new customer, key hire, milestone)
- Check in on partner meeting scheduling

### Ongoing (If No Response)
- 2 weeks: Gentle check-in, share relevant company update
- 4 weeks: Share meaningful milestone or press coverage
- 6 weeks: Final check-in asking for decision timeline
- If no response after 6 weeks: Assume pass, move on

### Handling "No"
- Ask for specific feedback (what was the deciding factor?)
- Ask if they would be open to following future progress
- Maintain relationship for future rounds
- Do not burn bridges - investors move firms and remember founders
```

## Key Points

- Fundraise strategy must be stage-appropriate: pre-seed focuses on team and vision, seed on traction and signals, Series A on unit economics and repeatability, Series B+ on growth efficiency and market leadership
- Investor persona targeting requires detailed research: know each firm's stage, sector, check size, and partner interests before reaching out
- Competitive positioning requires a defensibility framework with specific moats (network effects, data advantage, switching costs, IP)
- Financial projections need three scenarios (base, upside, downside) with explicit assumptions driving each
- Unit economics deep dive must show LTV/CAC ratio (target 3x+), payback period (target < 12 months), gross margin (target 70%+), and magic number (target > 0.7)
- Data room preparation covers corporate, financial, technical, customer, and people documents in a structured checklist
- Pitch rehearsal follows three phases: solo video recording, peer feedback, and investor simulation with different persona types
- Term sheet navigation requires understanding key terms: liquidation preference, anti-dilution, board composition, and option pool mechanics
- Follow-up strategy has specific cadence: immediate thank-you, 24-hour summary, weekly check-ins, and graceful acceptance of rejections
