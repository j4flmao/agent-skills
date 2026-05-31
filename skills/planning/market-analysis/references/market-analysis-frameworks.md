# Market Analysis Frameworks

## Overview

A structured framework turns market analysis from an overwhelming data collection exercise into a repeatable, comparable process. This reference covers the major market analysis frameworks, when to use each, how to combine them, and how to extract actionable strategic insights from each framework's output.

## Framework Selection Guide

```
What is your primary objective?
  |
  ├── Estimate market size → TAM/SAM/SOM framework
  ├── Understand competitive position → Porter's Five Forces
  ├── Identify strategic actions → SWOT
  ├── Prioritize product portfolio → BCG Matrix
  ├── Find uncontested market space → Blue Ocean Strategy
  ├── Map customer perception → Perceptual Mapping
  ├── Analyze macro factors → PESTEL
  └── Assess relative competitive strength → Comparative Advantage Matrix
```

## Framework 1: TAM/SAM/SOM (Market Sizing)

### Purpose
Quantify the total revenue opportunity for a product or service.

### Components

| Component | Definition | Calculation Approach |
|-----------|-------------|---------------------|
| TAM (Total Addressable Market) | Total revenue opportunity if 100% market share | Global revenue of all products solving the same problem |
| SAM (Serviceable Addressable Market) | Segment of TAM your product can reach | TAM x geographic filter x segment filter x channel filter |
| SOM (Serviceable Obtainable Market) | Realistic revenue capture in 3-5 years | SAM x realistic market share based on team, funding, growth |

### Top-Down Calculation Method

```
TAM = Industry Revenue x Category Percentage

Example: Global Project Management Software Market
TAM = $9.81B (Gartner, 2024 "Global PM Software Market Forecast")
SAM = $9.81B x 65% (SaaS delivery model)
    x 40% (SMB segment, <500 employees)
    x 50% (North America + Western Europe)
    = $1.28B
SOM = $1.28B x 5% (realistic 5-year market share for well-funded startup)
    = $64M
```

### Bottom-Up Calculation Method

```
SOM = Unit Economics x Customer Count x Conversion Rate

Example: Same PM Software Product
ARPU = $240/year ($20/month average)
Target customers = 500,000 SMBs in NA + WE
Sales capacity = 50 reps x 200 deals/year = 10,000 deals/year
Conversion rate = 10% (inbound + outbound)
SOM (Year 5) = $240 x (10,000 x 10%) x 5 years = $12M/year

SAM = SOM x (total addressable customers / target customers)
    = $12M x (2,000,000 / 500,000) = $48M
TAM = SAM / 0.40 (segment percentage) / 0.50 (geo percentage) / 0.65 (delivery percentage)
    = $48M / 0.13 = $369M
```

### Reconciliation

When top-down and bottom-up diverge, document assumptions and find the middle:

```yaml
Reconciliation:
  top_down:
    tam: "$5.0B"
    sam: "$1.28B"
    som: "$64M"
    confidence: medium  # relies on analyst estimates for adjacent category
  bottom_up:
    tam: "$369M"
    sam: "$48M"
    som: "$12M"
    confidence: medium-high  # built on own pricing and realistic sales capacity
  reconciled:
    tam: "$1.5B"
    sam: "$250M"
    som: "$35M"
    rationale: >-
      Bottom-up is more conservative but may underestimate TAM because
      the sales capacity model excludes self-serve and channel revenue.
      Top-down uses broader category data. Weighted average applied.
    assumptions:
      - "Self-serve channel could double bottom-up SOM"
      - "Channel partners not yet included in bottom-up"
      - "Market growing at 12% CAGR over forecast period"
```

### Common Data Sources

| Source Type | Examples | Reliability | Cost |
|-------------|----------|-------------|------|
| Analyst reports | Gartner, Forrester, IDC | High | $2,000-$5,000 per report |
| Public company filings | SEC 10-K, annual reports | High | Free |
| Industry associations | SIIA, CompTIA, NFIB | Medium | Free to $500 |
| Government data | Census Bureau, BLS | High | Free |
| Startup databases | Crunchbase, PitchBook | Medium | Free to $500/month |
| Surveys | SurveyMonkey, Qualtrics | Low-Medium | $1,000-$10,000 |
| News/analysis | TechCrunch, CB Insights | Low-Medium | Free to $500/month |

## Framework 2: Porter's Five Forces

### Purpose
Analyze the competitive intensity and attractiveness of an industry.

### The Five Forces

```
                    Threat of New Entrants
                            │
                            ▼
   Bargaining Power  ◄─── INDUSTRY ───►  Bargaining Power
   of Suppliers             RIVALRY        of Buyers
                            │
                            ▼
                    Threat of Substitutes
```

### Assessment Scale
Rate each force as Low, Medium, or High threat:

```yaml
force_assessment:
  industry:
    name: "SaaS Project Management"
    current_stage: "Growth/Maturity"

  threat_of_new_entrants:
    rating: "Medium"
    factors:
      - "Low capital requirements for basic MVP"
      - "High switching costs for established users"
      - "API ecosystem creates network effects"
      - "AI features raising the bar for new entrants"

  bargaining_power_of_suppliers:
    rating: "Low"
    factors:
      - "Cloud infrastructure is commoditized (AWS, GCP, Azure)"
      - "Multiple open-source database options"
      - "Developer talent market is tight but not exclusive"

  bargaining_power_of_buyers:
    rating: "Medium-High"
    factors:
      - "Low switching costs between basic PM tools"
      - "Price sensitivity in SMB segment"
      - "Enterprise buyers demand customization"
      - "Many free alternatives available"

  threat_of_substitutes:
    rating: "Medium"
    factors:
      - "Email + spreadsheets remain substitute for basic needs"
      - "All-in-one platforms (Notion, ClickUp) consolidate categories"
      - "Built-in tools in larger platforms (Jira, Salesforce)"

  industry_rivalry:
    rating: "High"
    factors:
      - "10+ well-funded competitors"
      - "Low differentiation in core features"
      - "Price pressure from freemium models"
      - "Consolidation through M&A accelerating"
```

### Strategic Implications by Force

| Force | If High | If Low |
|-------|---------|--------|
| New entrants | Build moats quickly (network effects, data, switching costs) | Focus on execution speed |
| Supplier power | Diversify suppliers, build in-house alternatives | Standardize on best-in-class |
| Buyer power | Differentiate, increase switching costs, target sticky segments | Compete on price/value |
| Substitutes | Make your category more valuable than alternatives | Compete on features |
| Rivalry | Find uncontested space, niche focus | Compete on execution |

## Framework 3: SWOT Analysis

### Purpose
Evaluate internal capabilities (Strengths, Weaknesses) and external environment (Opportunities, Threats).

### SWOT Structure

```
┌──────────────────────────────────────┐
│           Internal Factors            │
├──────────────────┬───────────────────┤
│   Strengths      │   Weaknesses      │
│  ┌────────────┐  │  ┌─────────────┐  │
│  │ Proprietary │  │  │ Small team  │  │
│  │ ML model    │  │  │ No brand    │  │
│  │ Strong      │  │  │ recognition │  │
│  │ engineering │  │  │ Limited     │  │
│  │ team        │  │  │ funding     │  │
│  └────────────┘  │  └─────────────┘  │
├──────────────────┼───────────────────┤
│  Opportunities   │   Threats         │
│  ┌────────────┐  │  ┌─────────────┐  │
│  │ AI trend   │  │  │ Competitor X │  │
│  │ Remote     │  │  │ entering     │  │
│  │ work growth│  │  │ our segment  │  │
│  │ Regulatory │  │  │ Economic     │  │
│  │ tailwind   │  │  │ downturn     │  │
│  └────────────┘  │  └─────────────┘  │
├──────────────────┴───────────────────┤
│           External Factors            │
└──────────────────────────────────────┘
```

### Cross-Reference Matrix

The strategic value of SWOT comes from cross-referencing quadrants:

```yaml
swot_strategies:
  SO_strategies:  # Strength + Opportunity = Exploit
    - "Leverage proprietary ML model to capture AI adoption wave"
    - "Use engineering excellence to build remote-first collaboration features"

  WO_strategies:  # Weakness + Opportunity = Improve
    - "Partner with established brands to overcome lack of recognition"
    - "Use lean startup methodology to maximize limited funding"

  ST_strategies:  # Strength + Threat = Defend
    - "Use technical moat to defend against well-funded competitor entry"
    - "Build switching costs through deep integrations"

  WT_strategies:  # Weakness + Threat = Avoid
    - "Avoid direct price competition with well-funded competitors"
    - "Focus on niche segment where brand recognition matters less"
```

### SWOT Quality Checklist

- [ ] Strengths are truly internal and controllable, not market conditions
- [ ] Weaknesses are honest and specific, not generic ("could improve")
- [ ] Opportunities are specific and time-bound, not vague trends
- [ ] Threats are realistic and actionable, not hypothetical worst cases
- [ ] Cross-reference strategies are specific enough to act on
- [ ] At least 3-5 items per quadrant

## Framework 4: BCG Matrix

### Purpose
Analyze product portfolio positioning to inform resource allocation.

### Matrix Structure

```
                  Market Growth Rate
                  High          Low
          ┌─────────────────────────┐
   High   │    STARS         CASH COWS   │
          │  (Invest)       (Harvest)    │
Market    │                              │
Share     │  QUESTION MARKS     DOGS     │
   Low    │  (Analyze/Divest)  (Divest)  │
          └─────────────────────────────┘
```

### Application

```yaml
bcg_matrix:
  product_a:
    category: "Star"
    market_share: "25% (leader)"
    growth_rate: "20% YoY"
    strategy: "Invest heavily, defend position"
    resource_allocation: "40% of engineering budget"

  product_b:
    category: "Cash Cow"
    market_share: "35% (dominant)"
    growth_rate: "3% YoY"
    strategy: "Maximize profit, minimize investment"
    resource_allocation: "10% of engineering budget (maintenance)"

  product_c:
    category: "Question Mark"
    market_share: "5%"
    growth_rate: "40% YoY (emerging category)"
    strategy: "Invest or divest — 6 month decision window"
    resource_allocation: "25% of engineering budget (time-boxed)"

  product_d:
    category: "Dog"
    market_share: "8%"
    growth_rate: "-5% YoY (declining)"
    strategy: "Divest, sunsets, or reposition"
    resource_allocation: "Minimal — maintain only"
```

## Framework 5: Blue Ocean Strategy

### Purpose
Create uncontested market space by reconstructing industry boundaries.

### Strategy Canvas

The strategy canvas plots competitive factors on the X-axis and offering level on the Y-axis:

```yaml
strategy_canvas:
  competitive_factors:
    - price
    - feature_count
    - ease_of_use
    - integrations
    - customer_support
    - mobile_experience
    - ai_capabilities
    - collaboration

  your_product:
    price: 3    # Mid-range
    feature_count: 4  # Focused set
    ease_of_use: 9    # Best in class
    integrations: 6   # Good
    customer_support: 5  # Standard
    mobile_experience: 8 # Excellent
    ai_capabilities: 9   # Leading
    collaboration: 7     # Very good

  competitor_a:
    price: 2    # More expensive
    feature_count: 9  # Feature-rich
    ease_of_use: 4    # Complex
    integrations: 8   # Extensive
    customer_support: 3  # Automated
    mobile_experience: 4 # Basic
    ai_capabilities: 2   # Minimal
    collaboration: 5     # Standard

  competitor_b:
    price: 5    # Very cheap/free
    feature_count: 3  # Minimal
    ease_of_use: 8    # Simple
    integrations: 2   # Few
    customer_support: 2  # Community only
    mobile_experience: 5 # Adequate
    ai_capabilities: 1   # None
    collaboration: 3     # Basic
```

### ERRC Framework (Eliminate-Raise-Reduce-Create)

| Action | Question | Example |
|--------|----------|---------|
| Eliminate | Which factors taken for granted should be eliminated? | Eliminate complex reporting — replace with AI summaries |
| Raise | Which factors should be raised above industry standard? | Raise ease of use to consumer-grade |
| Reduce | Which factors should be reduced below industry standard? | Reduce feature count to avoid bloat |
| Create | Which factors never offered should be created? | Create AI-powered workflow suggestions |

## Framework 6: PESTEL Analysis

### Purpose
Analyze macro-environmental factors that affect the market.

### Dimensions

```yaml
pestel_analysis:
  political:
    factors:
      - "Trade policy between US and China affects cloud infrastructure costs"
      - "Government digital transformation initiatives drive demand"
      - "Data sovereignty laws (GDPR, CCPA, India DPDP)"
    impact: "Medium — compliance cost but also drives demand"

  economic:
    factors:
      - "Interest rates affect startup funding availability"
      - "SaaS spending expected to grow 18% despite economic uncertainty"
      - "Remote work reducing geographic hiring constraints"
    impact: "Medium-High — funding environment directly affects customer acquisition"

  social:
    factors:
      - "Remote and hybrid work is permanent for knowledge workers"
      - "Generational shift: Gen Z expects consumer-grade UX at work"
      - "Work-life balance expectations changing feature priorities"
    impact: "High — social trends define product requirements"

  technological:
    factors:
      - "AI/ML capabilities becoming table stakes in SaaS"
      - "API-first architecture enabling composable software stacks"
      - "Edge computing enabling real-time collaboration features"
      - "Low-code/no-code platforms expanding addressable users"
    impact: "Very High — technology is the primary market driver"

  environmental:
    factors:
      - "Cloud providers committing to carbon neutrality"
      - "Remote work reducing office real estate needs"
      - "ESG reporting requirements for enterprise customers"
    impact: "Low-Medium — growing but not yet decisive"

  legal:
    factors:
      - "AI regulation emerging (EU AI Act, US executive orders)"
      - "Accessibility requirements expanding (WCAG, ADA, EAA)"
      - "Data privacy regulations expanding globally"
      - "IP and copyright concerns with AI-generated content"
    impact: "High — regulatory compliance is a competitive barrier"
```

## Framework 7: Comparative Advantage Matrix

### Purpose
Compare your product directly against each major competitor across weighted dimensions.

```yaml
comparative_advantage:
  dimensions:
    - name: "Product completeness"
      weight: 20  # Percentage of total importance
    - name: "Ease of use"
      weight: 25
    - name: "Integration ecosystem"
      weight: 15
    - name: "Enterprise features"
      weight: 15
    - name: "Pricing value"
      weight: 15
    - name: "Customer support"
      weight: 10

  scores:  # 1-10 scale
    your_product:
      product_completeness: 7
      ease_of_use: 9
      integration_ecosystem: 6
      enterprise_features: 5
      pricing_value: 7
      customer_support: 8
      weighted_total: 7.2

    competitor_a:
      product_completeness: 9
      ease_of_use: 4
      integration_ecosystem: 8
      enterprise_features: 9
      pricing_value: 4
      customer_support: 5
      weighted_total: 6.4

    competitor_b:
      product_completeness: 5
      ease_of_use: 8
      integration_ecosystem: 4
      enterprise_features: 3
      pricing_value: 9
      customer_support: 3
      weighted_total: 5.6
```

## Combining Frameworks

A comprehensive market analysis uses multiple frameworks in sequence:

```yaml
analysis_sequence:
  phase_1_scope:
    framework: "PESTEL"
    output: "Macro environment scan"
    purpose: "Identify major forces affecting the market"

  phase_2_industry:
    framework: "Porter's Five Forces"
    output: "Industry attractiveness assessment"
    purpose: "Understand competitive dynamics"

  phase_3_size:
    framework: "TAM/SAM/SOM"
    output: "Market size estimate"
    purpose: "Quantify the opportunity"

  phase_4_position:
    frameworks:
      - "Competitive Feature Matrix"
      - "Comparative Advantage Matrix"
      - "Perceptual Map"
    output: "Competitive positioning analysis"
    purpose: "Understand relative strengths and weaknesses"

  phase_5_strategy:
    frameworks:
      - "SWOT"
      - "Blue Ocean Strategy Canvas"
      - "BCG Matrix"
    output: "Strategic recommendations"
    purpose: "Define actionable strategy"

  phase_6_synthesis:
    framework: "Cross-Reference Analysis"
    output: "Single-page strategy summary"
    purpose: "Consolidate findings into clear direction"
```

## Framework Output Formats

### Perceptual Map (Positioning)

A 2x2 perceptual map plots competitors on two key dimensions:

```
Dimensions: Simplicity (X-axis) vs. Power (Y-axis)

                    Powerful
                       │
          Competitor B │  ● Your Product
                       │
         ──────────────┼────────────── Simplicity
          Complex      │                Simple
                       │
        Competitor A ● │
                       │    Competitor C ●
                    Basic
```

### Bubble Chart (Market Share + Growth)

Each competitor is a bubble:
- X-axis: Market share
- Y-axis: Growth rate
- Bubble size: Revenue
- Color: Segment or business model

## Framework Selection Guide by Context

| Context | Primary Framework | Secondary Framework |
|---------|------------------|-------------------|
| Fundraising | TAM/SAM/SOM | Comparative Advantage Matrix |
| New product launch | Blue Ocean Strategy | PESTEL |
| Competitive threat | Porter's Five Forces | SWOT |
| Portfolio review | BCG Matrix | SWOT |
| Annual strategy | PESTEL + Five Forces | TAM/SAM/SOM |
| Acquisition target | TAM/SAM/SOM | Comparative Advantage Matrix |
| Market entry | PESTEL | Porter's Five Forces |

## References
- references/market-analysis-data-synthesis.md — Market Analysis Data Synthesis
- references/competitive-analysis.md — Competitive Analysis Guide
- references/market-sizing.md — Market Sizing Guide
- references/market-analysis-template.md — Market Analysis Template
- references/market-analysis-advanced.md — Market Analysis Advanced Topics
- references/market-analysis-fundamentals.md — Market Analysis Fundamentals
