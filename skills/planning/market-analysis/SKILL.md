---
name: planning-market-analysis
description: >
  Use this skill when the user says 'market analysis', 'competitive analysis', 'market research', 'TAM SAM SOM', 'market sizing', 'competitor research', 'market landscape', 'industry analysis'. Produce market sizing, competitor analysis, SWOT, and differentiation strategy. Do NOT use for: financial projections or business plan writing.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [planning, market, analysis, phase-7]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Planning Market Analysis

## Purpose
Produce data-driven market and competitive analyses to inform product strategy. Covers TAM/SAM/SOM sizing, direct and indirect competitor comparison, SWOT analysis, and differentiation positioning.

Good market analysis separates successful product strategies from guesswork. It answers four essential questions: how big is the opportunity (market sizing), who else is chasing it (competitor analysis), what are our unique advantages (SWOT and moat), and what trends will reshape the market in the next 2-3 years (trend analysis). This skill produces a structured report with sourced data, comparative matrices, and actionable positioning recommendations. The output is usable for strategic planning, investor pitches, and product roadmap prioritization.

## Agent Protocol

### Trigger
"market analysis", "competitive analysis", "market research", "TAM SAM SOM", "market sizing", "competitor research", "market landscape", "industry analysis"

### Input Context
- Industry or market category name (e.g., "SaaS project management", "B2B payment processing", "AI-powered customer support")
- Product description with the unique value proposition and target customer persona
- Geographic scope: global, specific region, or country-level
- Known competitors: direct (same problem, same solution category) and indirect (same problem, different solution)
- Available market data sources: Gartner, Forrester, IDC, SEC filings, public company earnings, industry surveys
- Pricing model and price point(s) for your product
- Distribution channels and go-to-market strategy (self-serve, enterprise sales, channel partners)

### Output Artifact
Market analysis report covering TAM/SAM/SOM sizing, competitive feature matrix, SWOT profiles, market trends, and positioning map

### Response Format
- TAM/SAM/SOM with both top-down (industry reports × filters) and bottom-up (unit economics × customer count) calculation methods, including source citations for every number
- Competitor feature comparison matrix: rows = features (at least 10), columns = competitors, cells = ✅/⚠️/❌ with notes
- SWOT tables per major player (your product plus top 3 competitors): with internal factors at top (strengths, weaknesses) and external factors at bottom (opportunities, threats)
- Positioning map with labeled axes and plotted competitor positions
- Trend summary: key trends with directional arrows (↑ growing, ↓ declining, → stable) and impact assessment
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
TAM/SAM/SOM calculated using both methods with reconciled numbers. Minimum 5 competitors analyzed in the comparison matrix. SWOT analysis complete for your product and top 3 competitors. Positioning map plotted with clear differentiation axis. At least 3 market trends identified with directional assessment.

### Max Response Length
3000 tokens

## Workflow

1. **Size the market** — Calculate TAM (total addressable market: the entire global revenue opportunity if you had 100% market share), SAM (serviceable addressable market: the portion of TAM your product and distribution model can realistically reach), SOM (serviceable obtainable market: what you can realistically capture in 3-5 years given your team, funding, and growth trajectory). Apply two independent methods and reconcile. Top-down: start with an industry analyst TAM figure from Gartner, Forrester, or IDC, then apply percentage filters for your segment, region, and customer profile. Bottom-up: start with your unit economics (annual price per customer) and multiply by the number of potential customers you can reach, then apply expected conversion rates. The two methods should produce numbers within 2x of each other. If they diverge more than that, revisit your assumptions.

2. **Analyze competitors** — Segment competitors into direct (same problem solving approach, similar product category — e.g., Asana and Monday.com) and indirect (same problem solved differently — e.g., Excel as a project management tool). For each competitor, research: feature set (build a matrix with 10-15 rows covering core features, integrations, platform support, certifications), pricing model and price points, target customer segments and company size, estimated market share and growth rate, funding stage and total raised, strengths, weaknesses, and strategic moves. Focus deep analysis on the top 5-7 competitors rather than spreading thin across 20.

3. **Run SWOT analysis** — For your product and each top competitor: Strengths (internal attributes that help achieve the objective — proprietary technology, brand, talent, distribution), Weaknesses (internal attributes that hinder — funding gaps, missing features, team size, brand recognition), Opportunities (external factors that could be leveraged — market trends, competitor weaknesses, regulatory tailwinds, new distribution channels), Threats (external factors that could cause trouble — new entrants, regulation, technology shifts, economic downturns). Cross-reference: a competitor weakness becomes a potential opportunity for your product.

4. **Identify trends** — Categorize trends into four buckets: technology shifts (AI/ML mainstream adoption, cloud migration acceleration, edge computing, platform consolidation, API-first architecture), regulatory changes (GDPR and CCPA expansion, accessibility law updates, data localization requirements, carbon reporting mandates), consumer and buyer behavior changes (privacy-first expectations, remote and hybrid work permanence, subscription fatigue, mobile-first usage, self-serve buying preference), competitive dynamics (consolidation through M&A, hyperscaler entry, open-source alternatives maturing, pricing pressure from freemium models).

5. **Define differentiation** — Synthesize all the analysis into a clear unique value proposition in one sentence: "We are the only [X] that does [Y] for [Z customer]." Articulate the competitive moat: network effects (the product gets more valuable as more users join), switching costs (deep integration, data portability friction, embedded workflows), data advantage (unique dataset no competitor can replicate), intellectual property (patents, trade secrets, proprietary algorithms), brand trust (reputation, certifications, community, compliance). Plot a positioning map with two axes (e.g., price vs quality, simplicity vs power, vertical focus vs horizontal breadth) showing where your product sits relative to competitors.

## Models

### Market Sizing Reconciliation
```
Top-Down:
  TAM = $5B (Gartner 2024: "Global SMB Email Market")
  SAM = $5B × 60% (US+EU focus) × 40% (SaaS delivery) = $1.2B
  SOM = $1.2B × 8% (realistic 5yr capture) = $96M

Bottom-Up:
  SOM = $420/yr (avg price) × 200,000 customers (sales capacity) × 85% (conversion) = $71.4M
  SAM = $71.4M × 5 (5x addressable base vs target) = $357M
  TAM = $357M × 10 (10x total market shareable) = $3.57B

Reconciled: TAM ~$4.2B, SAM ~$850M, SOM ~$85M (average of methods)
```

### Feature Comparison Matrix Structure
| Feature Category | Your Product | Competitor A | Competitor B | Competitor C |
|---|---|---|---|---|
| Core: Feature 1 | ✅ Native | ✅ Native | ⚠️ Plugin | ❌ |
| Core: Feature 2 | ✅ | ❌ | ✅ | ✅ |
| Pricing | $10/mo | $15/mo | Free tier | $25/mo |
| Platform | Web + Mobile | Web only | Web + Mobile | Desktop only |

### SWOT Cross-Reference
Your Strength → Their Weakness = Exploit
Their Weakness → Your Opportunity = Target
Your Weakness → Their Strength = Mitigate
Their Threat → Your Opportunity = Defend

## Rules

- **Source every number** — Unattributed market sizes are guesses, not data. Every TAM component must cite a source: Gartner report title and year, SEC filing form and date, earnings call transcript, or a validated survey methodology.
- **Top-down and bottom-up both required** — Top-down alone is fantasy (it multiplies big numbers by arbitrary percentages). Bottom-up alone is too narrow (it projects current reality linearly). Use both and reconcile the difference.
- **Features are not strategy** — The feature comparison matrix reveals parity, not differentiation. SWOT analysis and positioning map reveal real strategic differences. Do not conflate listing features with doing competitive analysis.
- **Be honest about weaknesses** — A SWOT analysis with no weaknesses is not credible and destroys trust. Every product has gaps. Identifying them shows strategic self-awareness.
- **Update quarterly** — Markets shift fast: competitors launch features, trends emerge, customer preferences change, regulation evolves. Any analysis older than 6 months is stale and potentially misleading for decision-making.
- **Distinguish direct from indirect competitors** — Uber's direct competitor is Lyft (same app-based ride hailing). Indirect competitors include public transit, taxis, bike shares, rental cars, and walking. Both categories matter strategically but require different response strategies.
- **Do not round down competitors** — Including 20 low-end competitors introduces noise. Excluding a significant one misses a strategic threat. Focus on the top 5-7 and analyze them deeply.
- **External validation beats internal estimates** — Prefer cited analyst data, public company filings, and third-party surveys over internal guesses. If external data does not exist, state that explicitly and mark confidence as low.

## References
- `references/competitive-analysis.md` — Competitive Analysis
- `references/market-analysis-frameworks.md` — Market Analysis Frameworks
- `references/market-analysis-template.md` — Market Analysis Template
- `references/market-sizing.md` — Market Sizing

## Handoff
create-roadmap (feed market analysis into roadmap priorities and feature decisions), create-pitch-deck (provide market data, competitor positioning, and TAM/SAM/SOM for investor deck).
