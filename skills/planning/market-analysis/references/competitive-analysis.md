# Competitive Analysis Guide

## Framework Selection

Choose the right competitive analysis framework for your need.

| Framework | Best For | Output |
|-----------|----------|--------|
| Feature Matrix | Feature parity and gap analysis | Table comparing features across products |
| Positioning Map | Strategic differentiation | 2-axis chart of competitor positions |
| SWOT | Strategic planning for your product | Strengths, Weaknesses, Opportunities, Threats |
| Porter's Five Forces | Industry attractiveness | Industry competitive pressure assessment |
| Blue Ocean Strategy | New market creation | Strategy canvas showing value innovation |
| Battle Card | Sales enablement | One-pager per competitor with counter-strategies |

## Feature Comparison Matrix

### Building the Matrix

1. **Identify features** — List 10-20 features across categories:
   - Core functionality (does the product do the main job?)
   - Integration (APIs, third-party tools, import/export)
   - Platform (web, mobile, desktop, cross-platform)
   - Security (SSO, audit logs, RBAC, encryption)
   - Pricing (free tier, entry price, enterprise pricing)
   - Support (documentation, community, SLA, phone/chat)

2. **Score each competitor** — Use a consistent scale:

   | Symbol | Meaning |
   |--------|---------|
   | ✅ | Native, built-in, first-class |
   | ⚠️ | Available via plugin, add-on, or limited |
   | ❌ | Not available |
   | H | In-house build (for your product) |
   | 3P | Third-party integration required |

3. **Add notes** — Explain the quality of implementation, not just
   availability. "✅ CSV Export — exports all fields" vs.
   "✅ CSV Export — limited to basic fields only."

### Example: Project Management Tools

| Feature | Your Product | Asana | Monday.com | Linear | Notion |
|---------|-------------|-------|------------|--------|--------|
| Task creation | ✅ Instant | ✅ | ✅ | ✅ ✅ Keyboard-first | ✅ |
| Kanban board | ✅ | ✅ | ✅ | ✅ | ⚠️ View only |
| Gantt chart | ❌ | ✅ | ✅ | ❌ | ❌ |
| Time tracking | ⚠️ Integration | ✅ Native | ✅ Native | ❌ | ❌ |
| API | ✅ REST+GraphQL | ✅ REST | ✅ GraphQL | ✅ GraphQL | ❌ |
| Offline mode | ✅ | ❌ | ❌ | ❌ | ⚠️ Limited |
| CLI tool | ✅ | ❌ | ❌ | ✅ | ❌ |
| Markdown | ✅ Native | ❌ Rich text | ❌ Rich text | ✅ Native | ✅ Native |
| Free tier | ✅ 5 users | ✅ 10 users | ✅ 2 users | ✅ Unlimited | ✅ Unlimited |
| Entry price | $8/user/mo | $10.99/user/mo | $9/user/mo | $8/user/mo | $10/user/mo |

## Competitive Landscape Analysis

### Direct vs Indirect Competitors

| Type | Definition | Example (Task Manager) | Response Strategy |
|------|-----------|----------------------|-------------------|
| Direct | Same problem, same solution approach | Asana, Monday.com | Feature parity + differentiation |
| Indirect | Same problem, different solution approach | Excel, Trello, email | Show why your approach is better |
| Adjacent | Different problem, overlapping users | Slack, Jira | Integration strategy |
| Future | Not competitors yet, but could be | GitHub Projects | Monitor and prepare |

### Analyzing Each Competitor

For each top 5-7 competitors, research:

**Product:**
- Core features and standout differentiators
- Product quality (performance, UX, reliability)
- Release velocity (major features per quarter)
- Mobile/web/platform support

**Business:**
- Funding stage and total raised
- Revenue (public or estimated)
- Employee count and growth
- Key leadership (founders, product leads)
- Target customer size (SMB, mid-market, enterprise)

**Market:**
- Estimated market share
- Growth rate (trajectory)
- Primary distribution channel (self-serve, sales-led, partner)
- Geographic presence
- Vertical/industry focus

**Strategy:**
- Recent product launches or pivots
- Pricing changes
- M&A activity
- Marketing positioning (what they claim as differentiators)
- Partnerships and ecosystem

### Competitive Intelligence Sources

| Source | Type | What It Provides |
|--------|------|------------------|
| Gartner Magic Quadrant | Analyst report | Market positioning, vendor evaluation |
| Forrester Wave | Analyst report | Product comparison, market scoring |
| G2 / Capterra | User reviews | Feature ratings, satisfaction scores, NPS |
| SEC filings | Public documents | Public company revenue, growth, risks |
| Crunchbase | Funding data | Investment rounds, valuation, investors |
| SimilarWeb | Web traffic | Traffic volume, sources, geography |
| App Annie / Sensor Tower | Mobile data | App downloads, revenue, usage |
| Product Hunt launches | Product data | Feature announcements, community reception |
| Job postings | HR data | Strategic priorities (new roles = new initiatives) |
| Earnings call transcripts | Financial data | Strategic priorities, market commentary |

## Positioning Map

### How to Build One

1. **Select two axes** that differentiate competitors meaningfully.
   Axes should be independent (not correlated) and relevant to
   customer buying decisions.

   | Axis 1 | Axis 2 | Example |
   |--------|--------|---------|
   | Price (low → high) | Features (basic → advanced) | Task management |
   | Simplicity (easy → powerful) | Vertical focus (niche → broad) | CRM software |
   | Quality (basic → premium) | Platform (single → multi) | Design tools |
   | Individual use → Team | Price (free → paid) | Note apps |

2. **Plot each competitor** based on research, not opinion. If
   possible, use quantitative data (pricing page, feature count).

3. **Identify whitespace** — Areas with no competitors are
   opportunities or dead zones (no market exists).

4. **Add bubble size** — Represent market share or revenue as
   bubble size for additional dimension.

### Example: Note-Taking Apps Positioning

```
Complex/Powerful
    ↑
    │             Notion
    │             ●
    │                 Obsidian
    │                 ●
    │   OneNote ●
    │                   ● Roam
    │       ● Evernote
    │      ● Apple Notes
    │  ● Google Keep
    └──────────────────────────────→ Simple/User-Friendly
    Individual ←──────────→ Team
```

## SWOT Cross-Reference Analysis

Map competitor relationships to strategic actions:

| Situation | Strategic Implication | Action |
|-----------|----------------------|--------|
| Your strength = Their weakness | Competitive advantage to exploit | Double down, market it |
| Their weakness = Your opportunity | Gap to fill | Build feature, target their unhappy customers |
| Your weakness = Their strength | Vulnerability to mitigate | Invest, partner, or de-emphasize |
| Their threat = Your threat | Shared risk | Monitor together, industry response |
| Their threat = Your opportunity | Potential win | Position as alternative, acquire customers |

### Example SWOT: Your Product vs Competitor A

| | Your Product | Competitor A |
|---|---|---|
| **Strengths** | Keyboard-first UX, CLI tool, offline mode | Market leader brand, enterprise features, 500+ integrations |
| **Weaknesses** | No mobile app, small team (5 eng), no enterprise features | Slow release cycle, expensive ($25/user/mo), no offline mode |
| **Opportunities** | Competitor A's price increases driving churn, growing remote work trend | AI feature wave, enterprise digitization |
| **Threats** | Competitor A matching our UX, open-source alternatives | New entrants, macro downturn reducing software spend |

**Cross-Reference Analysis:**
- Your strength (offline mode) × Their weakness (no offline) → Exploit: Market to remote workers
- Their weakness (high price) × Your opportunity → Target: Run pricing comparison campaign
- Your weakness (no mobile) × Their strength (mobile app) → Mitigate: Prioritize mobile MVP
- Their threat (new entrants) × Your threat → Defend: Build community, increase switching costs

## Battle Cards

One-pager per competitor for sales team:

```
╔═══════════════════════════════════════════════════════════╗
║  COMPETITOR BATTLE CARD: Competitor A                    ║
╠═══════════════════════════════════════════════════════════╣
║  OVERVIEW                                                 ║
║  Revenue: $500M ARR  |  Funding: Series D  |  2K employees║
║  Target: Mid-market + Enterprise                          ║
║  Key differentiator claim: "Most integrations"            ║
╠═══════════════════════════════════════════════════════════╣
║  HOW THEY WIN                                             ║
║  1. Brand recognition (enterprise buyers trust the name)  ║
║  2. Integration marketplace (500+ pre-built connectors)   ║
║  3. Sales team (dedicated AE + SE for every deal)         ║
╠═══════════════════════════════════════════════════════════╣
║  HOW WE WIN                                               ║
║  1. Half the price for equivalent features                ║
║  2. Modern UX (built 2024, not 2010)                      ║
║  3. Offline-first (work without internet)                 ║
║  4. 10x faster performance (load times, search speed)     ║
╠═══════════════════════════════════════════════════════════╣
║  COMMON OBJECTIONS                                        ║
║  "We need the integrations" → We have all critical ones   ║
║  "They are more established" → We are growing 3x faster   ║
║  "Enterprise security" → SOC 2 certified, SSO included    ║
╠═══════════════════════════════════════════════════════════╣
║  WINNING TALKING POINTS                                   ║
║  "Competitor A was built for 2010. We built for 2025."    ║
║  "Switch from Competitor A and save 50% on licensing."    ║
╚═══════════════════════════════════════════════════════════╝
```

## Competitive Update Cadence

| Activity | Frequency | Who | Output |
|----------|-----------|-----|--------|
| Competitor news scan | Weekly | PM | Summary of competitor launches, funding, press |
| Feature parity check | Monthly | Engineering + PM | Updated feature matrix |
| Full competitive review | Quarterly | PM + Marketing | Updated SWOT, battle cards, positioning |
| Market landscape update | Annually | PM + Leadership | Full market analysis report |
