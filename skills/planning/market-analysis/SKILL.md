---
name: planning-market-analysis
description: >
  Use this skill when the user says 'market analysis', 'competitive analysis', 'market research', 'TAM SAM SOM', 'market sizing', 'competitor research', 'market landscape', 'industry analysis'. Produce market sizing, competitor analysis, SWOT, and differentiation strategy. Do NOT use for: financial projections or business plan writing.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [planning, market, analysis, phase-7]
---

# Market Analysis

## Purpose
Produce data-driven market and competitive analyses to inform product strategy. Covers TAM/SAM/SOM sizing, direct and indirect competitor comparison, SWOT analysis, and differentiation positioning.

Good market analysis separates successful product strategies from guesswork. It answers four essential questions: how big is the opportunity (market sizing), who else is chasing it (competitor analysis), what are our unique advantages (SWOT and moat), and what trends will reshape the market in the next 2-3 years (trend analysis). This skill produces a structured report with sourced data, comparative matrices, and actionable positioning recommendations. The output is usable for strategic planning, investor pitches, and product roadmap prioritization.

## Architecture/Decision Trees

### Analysis Depth Decision Tree
```
Is this for an investor pitch or fundraising?
  |-- YES --> Full analysis: TAM/SAM/SOM, 10+ competitors, SWOT, trends
  |-- NO --> Is this for internal product strategy?
        |-- YES --> Medium analysis: TAM/SAM/SOM, 5-7 competitors, SWOT, trends
        |-- NO --> Light analysis: TAM only, 3-5 competitors, SWOT

Do you have access to paid analyst reports (Gartner, Forrester, IDC)?
  |-- YES --> Top-down TAM using analyst data, validated bottom-up
  |-- NO --> Bottom-up TAM using unit economics, benchmark against public companies

Is your market mature or emerging?
  |-- MATURE --> Focus on market share analysis and competitive differentiation
  |-- EMERGING --> Focus on market creation timeline and category leadership

What is the competitive landscape?
  |-- MANY DIRECT COMPETITORS --> Differentiation strategy, positioning map, feature matrix
  |-- FEW DIRECT COMPETITORS --> Look for indirect competitors and adjacent substitutes
  |-- NO DIRECT COMPETITORS --> Validate: are we creating a new category or missing existing alternatives?
```

## Agent Protocol

### Trigger
"market analysis", "competitive analysis", "market research", "TAM SAM SOM", "market sizing", "competitor research", "market landscape", "industry analysis"

### Input Context
- Industry or market category name
- Product description with unique value proposition and target customer persona
- Geographic scope: global, specific region, or country-level
- Known competitors: direct and indirect
- Available market data sources
- Pricing model and price point(s)
- Distribution channels and go-to-market strategy

### Output Artifact
Market analysis report covering TAM/SAM/SOM sizing, competitive feature matrix, SWOT profiles, market trends, and positioning map.

### Response Format
- TAM/SAM/SOM with both top-down and bottom-up calculation methods, including source citations
- Competitor feature comparison matrix: features x competitors with symbols and notes
- SWOT tables per major player (your product plus top 3 competitors)
- Positioning map with labeled axes and plotted competitor positions
- Trend summary: key trends with directional arrows and impact assessment
- No preamble. No postamble. No explanations. No filler.

### Completion Criteria
TAM/SAM/SOM calculated using both methods with reconciled numbers. Minimum 5 competitors analyzed. SWOT analysis complete for your product and top 3 competitors. Positioning map plotted with clear differentiation axis. At least 3 market trends identified with directional assessment.

### Max Response Length
3000 tokens

## Workflow

### Step 1: Size the Market
Calculate TAM, SAM, SOM using two independent methods and reconcile.

**Top-down approach**: Start with an industry analyst TAM figure, then apply percentage filters for your segment, region, and customer profile. Cite specific sources (Gartner, Forrester, IDC, Statista).

**Bottom-up approach**: Start with your unit economics and multiply by the number of potential customers, then apply expected conversion rates. More credible for early-stage companies because it ties to real customer data.

**Reconciliation**: The two methods should produce numbers within 2x of each other. If they diverge more, revisit your assumptions.

**Market sizing template**:
```markdown
## Market Sizing

### Top-Down
TAM = ${number} ({source}, {year})
SAM = TAM * {segment %} * {region %} = ${number}
SOM = SAM * {capture %} = ${number}

### Bottom-Up
SOM = ${price/yr} * {potential customers} * {expected conversion %} = ${number}
SAM = SOM * {inverse capture %} = ${number}
TAM = SAM * {inverse segment %} / {inverse region %} = ${number}

### Reconciled
TAM: ~${number}
SAM: ~${number}
SOM: ~${number}
```

### Step 2: Analyze Competitors
Segment competitors into direct and indirect.

**Direct competitors**: Same problem, same solution category (e.g., Slack vs Teams).
**Indirect competitors**: Same problem, different solution (e.g., Slack vs email).
**"Do nothing"**: The status quo — always a competitor.

For each competitor, research:
- Feature set (test the product yourself, not just website claims)
- Pricing model and price points
- Target customer segments
- Estimated market share and growth rate
- Funding stage and total raised
- Key strengths and weaknesses
- Recent strategic moves (acquisitions, partnerships, pivots)

**Competitor analysis template**:
```markdown
### {Competitor Name}
**Category:** Direct / Indirect
**Target customer:** {description}
**Pricing:** ${amount}/mo, {model}
**Estimated share:** {X}% of market
**Funding:** ${total}, {stage}
**Strengths:**
- {strength}
- {strength}
**Weaknesses:**
- {weakness}
- {weakness}
**Recent moves:** {acquisitions, partnerships, pivots}
```

### Step 3: Run SWOT Analysis
For your product and each top competitor: Strengths, Weaknesses, Opportunities, Threats.

**SWOT cross-reference**:
- Your Strength → Their Weakness = Exploit
- Their Weakness → Your Opportunity = Target
- Your Weakness → Their Strength = Mitigate
- Their Threat → Your Opportunity = Defend

**SWOT quality criteria**:
- Strengths and weaknesses are internal (team, technology, brand, IP)
- Opportunities and threats are external (market trends, regulation, competitors)
- No empty quadrants — if a quadrant is empty, you are missing something
- Each item is specific and actionable — "strong team" is too vague, "CTO has 15 years in the industry" is specific
- At least 3 items per quadrant

### Step 4: Identify Trends
Categorize trends into four buckets:

**Technology shifts**: AI/ML adoption, cloud migration, new regulation, platform changes.

**Regulatory changes**: GDPR, CCPA, HIPAA updates, industry-specific regulation, trade policy.

**Consumer/buyer behavior**: Remote work, sustainability preferences, channel shift, generational changes.

**Competitive dynamics**: Consolidation, new entrants, partnership ecosystems, pricing pressure.

**Trend assessment template**:
```markdown
### {Trend Name}
**Category:** {Technology / Regulatory / Behavior / Competition}
**Direction:** ↗ Growing / → Stable / ↘ Declining
**Impact on us:** Positive / Negative / Mixed
**Timeframe:** {Near-term / Medium-term / Long-term}
**Our response:** {What we should do about it}
```

### Step 5: Define Differentiation
Synthesize findings into:
- **Unique value proposition**: One sentence that captures why customers should choose you
- **Competitive moat**: What prevents competitors from copying you (network effects, switching costs, data, IP, brand, scale, regulation)
- **Positioning map**: 2x2 matrix with relevant axes, all major competitors plotted, your position highlighted

**Positioning map rules**:
- Choose axes that matter to your target customer (price vs quality, simplicity vs power, speed vs customization)
- Place competitors based on real data, not perceptions
- Your position should be in a clear, defensible sweet spot
- Avoid placing yourself in the top-right corner (everyone claims that)
- Include "do nothing" as a reference point

## Process Patterns

### Pattern 1: The Full Market Analysis
**When**: Fundraising, strategic planning, or market entry decision
**Process**: All sections — TAM/SAM/SOM (2 methods), 10+ competitors, SWOT for top 5, trends (4+), positioning map, differentiation strategy, risks to market position. Takes 2-4 weeks with dedicated research.
**Output**: Comprehensive report ready for investors or board.

### Pattern 2: The Competitive Quick Scan
**When**: Need rapid competitive intelligence for a roadmap decision
**Process**: Light analysis — 5-7 competitors, feature comparison matrix, positioning map only. No formal TAM/SAM/SOM. Takes 2-3 days.
**Output**: Competitive snapshot for internal decision-making.

### Pattern 3: The Market Validation Brief
**When**: Early-stage idea validation, pre-product
**Process**: Focus on TAM/SAM/SOM (bottom-up heavy), competitive landscape confirmation (are there really no competitors?), and customer willingness to pay. No deep SWOT or trends.
**Output**: 2-page brief validating market opportunity size.

### Pattern 4: The Ongoing Competitive Monitor
**When**: Need to track competitors over time
**Process**: Set up tracking for competitor releases, pricing changes, funding announcements. Monthly competitive brief with any changes since last report. Quarterly full refresh.
**Output**: Monthly bulletin + quarterly deep dive.

## Market Risk Analysis

### Risk Identification Framework
Identify risks in four categories that could invalidate market analysis assumptions:

**Demand risk:** Market smaller than estimated, customers don't perceive the problem, willingness to pay lower than assumed. Mitigation: validate demand through pre-orders, waitlists, or landing page conversion before building. Use problem interviews to confirm pain point severity.

**Competitive risk:** New entrants emerge, existing competitors respond aggressively, substitute solutions improve. Mitigation: scenario plan competitive responses. Identify defensible moat elements (network effects, data, switching costs, IP) and their durability.

**Timing risk:** Market not ready (too early), window closing (too late), regulatory changes pending. Mitigation: map technology adoption lifecycle. Identify early adopter segment vs mainstream market readiness. Monitor regulatory landscape quarterly.

**Execution risk:** Cannot build the product at the cost required, cannot reach customers through planned channels, cannot achieve unit economics needed. Mitigation: validate technical feasibility before committing to market assumptions. Build bottom-up TAM based on actual unit economics, not aspirational targets.

### Risk Documentation Template
```
Risk: {description}
Category: {Demand / Competitive / Timing / Execution}
Probability: {Low / Medium / High}
Impact: {Low / Medium / High}
Mitigation: {what we can do}
Trigger: {what would indicate this risk is materializing}
```

## Anti-Patterns

### Anti-Pattern 1: TAM Fantasy
Using the largest possible market definition without considering realistic serviceable segments. "We are in the $100B healthcare market" when you make a scheduling tool for dental offices. Anti-pattern signal: SAM is > 50% of TAM.

### Anti-Pattern 2: Confirmation Bias
Selecting data that supports the desired outcome and ignoring contrary signals. Every market analysis should include a "risks to our thesis" section. Anti-pattern signal: all data points are positive.

### Anti-Pattern 3: Static Analysis
Treating the market as fixed when competitors are entering, merging, and exiting. An analysis that is 6 months old may already be outdated. Anti-pattern signal: no date on the analysis.

### Anti-Pattern 4: Ignoring Indirect Competitors
Focusing only on direct competitors while adjacent solutions eat your market. Slack's indirect competitor was email, not just Teams. Anti-pattern signal: competitor list has only direct competitors.

### Anti-Pattern 5: SWOT Without Weaknesses
A SWOT analysis that lists 7 strengths, 5 opportunities, 4 threats, and 0 weaknesses is not credible. Every organization has weaknesses. Anti-pattern signal: empty Weaknesses quadrant.

### Anti-Pattern 6: Feature Parity Obsession
Believing the product with the most features wins. Customers choose based on the job they need done, not feature count. Anti-pattern signal: feature matrix longer than the differentiation section.

### Anti-Pattern 7: Fake Differentiation
Listing differentiators that are not actually different. "We have better customer support" — every company claims this. True differentiators are measurable: "We respond to support tickets in under 2 hours during business hours."

## Templates

### Market Analysis Report Template
```markdown
# Market Analysis: {Market Name}

## Executive Summary
{1-2 paragraph summary of findings}

## Market Sizing
{TAM/SAM/SOM with both methods}

## Competitive Landscape
{Overview of competitors, segmented by direct/indirect}

## Feature Comparison Matrix
{Matrix with features x competitors}

## SWOT Analysis
{Your SWOT + top 3 competitors' SWOT}

## Market Trends
{4-6 trends with directional assessment}

## Positioning
{Positioning map + differentiation strategy}

## Risks
{Risks to market position and mitigation}
```

### Feature Comparison Matrix Template
| Feature | Your Product | Competitor A | Competitor B | Competitor C |
|---------|-------------|--------------|--------------|--------------|
| Core Feature 1 | ✅ Native | ✅ Native | ⚠️ Plugin | ❌ Missing |
| Core Feature 2 | ✅ Native | ⚠️ Limited | ❌ Missing | ✅ Native |
| Pricing | $10/mo | $15/mo | Free | $8/mo |
| Integration X | ✅ | ❌ | ✅ | ⚠️ |
| Mobile App | ✅ | ✅ | ❌ | ✅ |

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Data source quality | > 80% sourced from primary or respected secondary sources | Source audit |
| TAM reconciliation | Top-down and bottom-up within 2x | Compare both methods |
| Competitor coverage | Top 5-7 competitors analyzed | Count |
| SWOT completeness | No empty quadrants | Quadrant audit |
| Analysis freshness | < 6 months old | Date check |

## Models

### Market Sizing Reconciliation
```
Top-Down:
  TAM = $5B (Gartner 2024)
  SAM = $5B x 60% (US+EU) x 40% (SaaS) = $1.2B
  SOM = $1.2B x 8% (5yr capture) = $96M

Bottom-Up:
  SOM = $420/yr x 200,000 customers x 85% = $71.4M
  SAM = $71.4M x 5 = $357M
  TAM = $357M x 10 = $3.57B

Reconciled: TAM ~$4.2B, SAM ~$850M, SOM ~$85M
```

### SWOT Cross-Reference
| Your SWOT | Competitor SWOT | Action |
|-----------|----------------|--------|
| Strength → | Their Weakness | Exploit — invest in this area |
| Opportunity → | Their Threat | Defend — protect this position |
| Weakness → | Their Strength | Mitigate — close the gap |
| Threat → | Their Opportunity | Monitor — prepare response |

### Porter's Five Forces
| Force | Assessment | Implication |
|-------|------------|-------------|
| Threat of new entrants | High/Med/Low | Barrier analysis |
| Supplier power | High/Med/Low | Dependency risk |
| Buyer power | High/Med/Low | Pricing strategy |
| Threat of substitutes | High/Med/Low | Indirect competition |
| Competitive rivalry | High/Med/Low | Differentiation need |

## Rules
- Source every number — unattributed market sizes are guesses, not data.
- Top-down and bottom-up both required — use both and reconcile.
- Features are not strategy — feature matrix reveals parity, SWOT reveals strategic differences.
- Be honest about weaknesses — a SWOT with no weaknesses is not credible.
- Update quarterly — any analysis older than 6 months is stale.
- Distinguish direct from indirect competitors — both matter strategically but require different responses.
- Focus on top 5-7 competitors — deep analysis beats shallow coverage of 20.
- External validation beats internal estimates — prefer cited analyst data and public filings.

## Best Practices
- Build your feature comparison matrix from actual product testing, not just website claims.
- Interview 3-5 potential customers before finalizing TAM assumptions.
- Use the BCG matrix (Stars, Cash Cows, Question Marks, Dogs) as an additional framework.
- Cross-reference your market analysis with the PRD to ensure requirements match market needs.
- Include a "risks to market position" section for each competitor.
- Use multiple data sources and triangulate — do not rely on a single number.

## Common Pitfalls
- **TAM fantasy**: Using the largest possible market definition without considering realistic serviceable segments.
- **Confirmation bias**: Selecting data that supports the desired outcome and ignoring contrary signals.
- **Static analysis**: Treating the market as fixed when competitors are entering, merging, and exiting.
- **Ignoring indirect competitors**: Focusing only on direct competitors while adjacent solutions eat your market.
- **Outdated data**: Using 2+ year old market reports in a fast-moving market.
- **No differentiation**: SWOT analysis that lists the same strengths as every competitor.

## Compared With
| Framework | Focus | Output | Best For |
|-----------|-------|--------|----------|
| TAM/SAM/SOM | Market opportunity sizing | Numerical estimate | Investor pitches, strategy |
| SWOT | Internal + external factors | Qualitative matrix | Strategy workshops |
| Porter's Five Forces | Industry structure | Competitive pressure assessment | Market entry decisions |
| BCG Matrix | Portfolio positioning | 2x2 grid | Multi-product prioritization |
| Blue Ocean Strategy | New market creation | Strategy canvas | Innovation strategy |

## Performance
- A thorough market analysis takes 2-4 weeks with dedicated research.
- TAM/SAM/SOM should be updated every 6 months at minimum.
- Competitive feature matrix should be refreshed every 3 months.
- SWOT analysis should be reviewed each quarter or on major market events.
- A competitive quick scan can be done in 2-3 days.

## Tooling/Methodology
- **Market data sources**: Gartner, Forrester, IDC, Statista, CB Insights, Crunchbase, SEC EDGAR, PitchBook.
- **Competitive intelligence**: BuiltWith, Wappalyzer, SimilarWeb, Semrush, Ahrefs.
- **Survey tools**: SurveyMonkey, Typeform, Qualtrics for primary market research.
- **Analysis tools**: Excel/Google Sheets for TAM models, Miro/MURAL for SWOT workshops.
- **Visualization**: Canva, Pitch, Google Slides for presentation-ready output.

## References
  - references/market-analysis-fundamentals.md — Market Analysis Fundamentals
  - references/market-analysis-advanced.md — Market Analysis Advanced Topics
  - references/competitive-analysis.md — Competitive Analysis Guide
  - references/market-analysis-frameworks.md — Market Analysis Frameworks
  - references/market-analysis-template.md — Market Analysis Template
  - references/market-sizing.md — Market Sizing Guide
  - references/market-analysis-data-synthesis.md — Market Analysis Data Synthesis

## Handoff
create-roadmap, create-pitch-deck
