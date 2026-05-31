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

# Planning Market Analysis

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
  |-- Mature --> Focus on market share analysis and competitive differentiation
  |-- Emerging --> Focus on market creation timeline and category leadership
```

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
Market analysis report covering TAM/SAM/SOM sizing, competitive feature matrix, SWOT profiles, market trends, and positioning map.

### Response Format
- TAM/SAM/SOM with both top-down and bottom-up calculation methods, including source citations for every number.
- Competitor feature comparison matrix: rows = features (at least 10), columns = competitors, cells = symbols with notes.
- SWOT tables per major player (your product plus top 3 competitors): internal factors at top, external factors at bottom.
- Positioning map with labeled axes and plotted competitor positions.
- Trend summary: key trends with directional arrows and impact assessment.
- No preamble. No postamble. No explanations. No filler. Compress output.

### Completion Criteria
TAM/SAM/SOM calculated using both methods with reconciled numbers. Minimum 5 competitors analyzed in the comparison matrix. SWOT analysis complete for your product and top 3 competitors. Positioning map plotted with clear differentiation axis. At least 3 market trends identified with directional assessment.

### Max Response Length
3000 tokens

## Workflow

1. **Size the market** — Calculate TAM, SAM, SOM. Apply two independent methods and reconcile. Top-down: start with an industry analyst TAM figure, then apply percentage filters for your segment, region, and customer profile. Bottom-up: start with your unit economics and multiply by the number of potential customers, then apply expected conversion rates. The two methods should produce numbers within 2x of each other. If they diverge more than that, revisit your assumptions.

2. **Analyze competitors** — Segment competitors into direct and indirect. For each competitor, research: feature set, pricing model and price points, target customer segments, estimated market share and growth rate, funding stage, strengths, weaknesses, and strategic moves. Focus deep analysis on the top 5-7 competitors.

3. **Run SWOT analysis** — For your product and each top competitor: Strengths, Weaknesses, Opportunities, Threats. Cross-reference: a competitor weakness becomes a potential opportunity for your product.

4. **Identify trends** — Categorize trends into four buckets: technology shifts, regulatory changes, consumer and buyer behavior changes, competitive dynamics.

5. **Define differentiation** — Synthesize into a clear unique value proposition in one sentence. Articulate the competitive moat: network effects, switching costs, data advantage, intellectual property, brand trust. Plot a positioning map.

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

### Feature Comparison Matrix Structure
| Feature | Your Product | Competitor A | Competitor B |
|---------|-------------|--------------|--------------|
| Core Feature 1 | Native | Plugin | Missing |
| Pricing | $10/mo | $15/mo | Free tier |

### SWOT Cross-Reference
Your Strength -> Their Weakness = Exploit
Their Weakness -> Your Opportunity = Target
Your Weakness -> Their Strength = Mitigate
Their Threat -> Your Opportunity = Defend

## Rules
- **Source every number** — Unattributed market sizes are guesses, not data.
- **Top-down and bottom-up both required** — Use both and reconcile the difference.
- **Features are not strategy** — Feature matrix reveals parity, SWOT reveals strategic differences.
- **Be honest about weaknesses** — A SWOT with no weaknesses is not credible.
- **Update quarterly** — Any analysis older than 6 months is stale.
- **Distinguish direct from indirect competitors** — Both matter strategically but require different responses.
- **Focus on top 5-7 competitors** — Deep analysis beats shallow coverage of 20.
- **External validation beats internal estimates** — Prefer cited analyst data and public filings.

## Best Practices
- Build your feature comparison matrix from actual product testing, not just website claims.
- Interview 3-5 potential customers before finalizing TAM assumptions.
- Use the BCG matrix (Stars, Cash Cows, Question Marks, Dogs) as an additional framework.
- Cross-reference your market analysis with the PRD to ensure requirements match market needs.
- Include a "risks to market position" section for each competitor.

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

## Tooling/Methodology
- **Market data sources**: Gartner, Forrester, IDC, Statista, CB Insights, Crunchbase, SEC EDGAR, PitchBook.
- **Competitive intelligence**: BuiltWith, Wappalyzer, SimilarWeb, Semrush, Ahrefs.
- **Survey tools**: SurveyMonkey, Typeform,Qualtrics for primary market research.
- **Analysis tools**: Excel/Google Sheets for TAM models, Miro/MURAL for SWOT workshops.
- **Visualization**: Canva, Pitch, Google Slides for presentation-ready output.

## References
  - references/competitive-analysis.md — Competitive Analysis Guide
  - references/market-analysis-advanced.md — Market Analysis Advanced Topics
  - references/market-analysis-frameworks.md — Market Analysis Frameworks
  - references/market-analysis-fundamentals.md — Market Analysis Fundamentals
  - references/market-analysis-template.md — Market Analysis Template
  - references/market-sizing.md — Market Sizing Guide
  - references/market-analysis-data-synthesis.md — Market Analysis Data Synthesis
## Handoff
create-roadmap (feed market analysis into roadmap priorities)
create-pitch-deck (provide market data for investor deck)
