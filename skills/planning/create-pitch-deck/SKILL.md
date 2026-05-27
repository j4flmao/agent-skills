---
name: planning-create-pitch-deck
description: >
  Use this skill when the user says 'create pitch deck', 'pitch deck', 'investor pitch', 'startup pitch', 'fundraising deck', 'product pitch', 'presentation deck'. Generate a structured investor pitch deck slide-by-slide with storytelling arc and key content. Do NOT use for: business plan writing or financial modeling.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [planning, pitch, phase-7]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Planning Create Pitch Deck

## Purpose
Craft compelling investor pitch decks following storytelling best practices. Structures content across 10 essential slides (Problem → Solution → Market → Product → Traction → Business Model → Team → Competition → Financials → Ask) tailored to investor type and stage.

Investors see hundreds of decks per quarter. Most are immediately forgettable because they list features instead of telling a story. This skill builds a narrative arc — hook, tension, resolution, vision — that makes the opportunity feel urgent, real, and investable. Every slide has exactly one message the audience must remember, one supporting metric that proves it, and one visual suggestion that reinforces it. The output is a comprehensive slide-by-slide outline ready for designer polish and speaker note development, not a template to fill in.

The most common mistake in pitch decks is trying to say everything. Founders pack slides with text, features, and data because they are passionate and want investors to understand every detail. But investors make decisions on pattern recognition and conviction, not exhaustive feature knowledge. One clear message per slide with one memorable metric and one compelling visual consistently outperforms dense, information-rich slides that dilute the core story.

The 10-slide structure is not arbitrary — it maps to the investor's decision-making process. Slides 1-2 establish that the problem is worth solving. Slides 3-4 prove the opportunity is large enough. Slides 5-7 demonstrate that the team can capture it. Slides 8-10 show how the investor's capital accelerates the outcome. Each slide answers a specific question the investor is asking silently, and the order builds the case cumulatively.

## Agent Protocol

### Trigger
"create pitch deck", "pitch deck", "investor pitch", "startup pitch", "fundraising deck", "product pitch", "presentation deck"

### Input Context
- Company/product description: one-sentence value proposition, what the product does, who it serves
- Target investor type and stage: angel (individual, early, pre-seed), VC seed (institutional, pre-revenue or early revenue), VC Series A (institutional, strong traction), VC Series B+ (institutional, scaling)
- Market data: TAM with source, SAM with derivation, SOM with capture rationale
- Traction metrics: total users, active users, MRR or ARR, month-over-month growth percentage, cohort retention (D1, D7, D30), NPS score, gross merchandise volume if applicable
- Team background: founder names, prior company experience and exits, relevant domain expertise, key senior hires and their backgrounds, advisory board members
- Business model: pricing tiers and amounts, unit economics (CAC, LTV, LTV/CAC ratio, payback period in months, gross margin percentage), primary sales motion (self-serve, sales-led, channel partner, hybrid)
- Competition: list of direct and indirect competitors, estimated market share for each, key strengths and weaknesses of each
- Fundraising details: amount being raised, instrument type (priced round, SAFE, convertible note, venture debt), target pre-money or post-money valuation, detailed breakdown of how the funds will be allocated (engineering, go-to-market, operations, reserve), expected runway in months

### Output Artifact
10-slide pitch deck outline with per-slide: headline (max 14 words), key message (one sentence the audience remembers), content bullets (max 3 supporting points), suggested visual type, speaker note guidance, and story arc position

### Response Format
- One section per slide with a clear heading: slide number and slide name
- Headline text (max 14 words — the few words the audience reads on the slide)
- Key message (one sentence — what the audience should remember after the slide)
- Content bullets (max 3 — the evidence supporting the key message)
- Suggested visual type (chart type, screenshot style, diagram, photo category)
- Story arc annotation (which part of hook / tension / resolution / vision this slide serves)
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
All 10 slides outlined with headlines and key messages. Key metrics are present in the appropriate slides. The Ask is specific with amount, valuation, instrument type, and use of funds. The story arc is coherent from the opening problem to the closing vision. Stage-specific tailoring is applied.

### Max Response Length
3000 tokens

## Workflow

1. **Understand audience** — Identify the investor type accurately and tailor the deck's emphasis accordingly. Angel investors primarily bet on the team and vision — emphasize founder-market fit, personal founding story, and market intuition. Early-stage VC investors look for product-market fit signals — emphasize early traction metrics, team quality and completeness, and large addressable market. Series A VCs need proof of a repeatable sales motion — emphasize strong unit economics (LTV/CAC > 3, gross margin > 70%, payback period < 12 months), clear growth path, and competitive differentiation. Series B+ VCs look for market dominance potential — emphasize growth efficiency (magic number, payback period), management team depth, and a clear path to profitable growth or market leadership. Research each target investor's stated investment thesis, preferred stage, sector focus, and existing portfolio companies to understand how the pitch fits their model.

2. **Structure slides** — Follow the standard 10-slide structure in order. Slide 1 — Problem: who is suffering, what is the pain, why is it urgent, why do existing solutions fail, why now. Slide 2 — Solution: your product, the core insight that makes it work, how it eliminates the pain in one memorable sentence. Slide 3 — Market size: TAM with credible source, SAM as the reachable portion, SOM as realistic capture, and why this market is growing. Slide 4 — Product: demo screenshots or architecture diagram showing how the product works, the user journey, the magic moment. Slide 5 — Traction: the metrics that prove the solution works — revenue curve showing growth, user count, cohort retention curves demonstrating product-market fit. Slide 6 — Business model: pricing, unit economics (CAC, LTV, payback, gross margin), sales channel, customer acquisition strategy. Slide 7 — Team: founder backgrounds and why they are the right people, key hires and their domain expertise, advisory board validation, prior exits if any. Slide 8 — Competition: positioning map with clear differentiation axes, competitive moat description (what prevents competitors from copying you), defensibility analysis. Slide 9 — Financials: 3-5 year revenue projection, expense breakdown, headcount plan, key assumptions clearly stated, burn rate and runway analysis. Slide 10 — Ask: the specific amount, valuation, instrument type, and a granular use of funds breakdown.

3. **Write per slide** — For each of the 10 slides, distill the content to exactly one key message that must survive in the audience's memory. The visible text on the slide is at most 30 words total — the slide should be glanceable in under 3 seconds. Identify the one metric that matters most for each slide and highlight it visually. Select a visual that directly reinforces the message: a line chart for growth, a bar chart for comparisons, a screenshot for product demonstration, a diagram for architecture or flow explanations, a photo for team.

4. **Build storytelling arc** — The deck follows a four-part story arc. Hook (slides 1-2): immediately establish the problem in human terms — a specific person with a specific pain, why the pain is urgent, and why existing solutions are inadequate. Tension (slides 3-4): reveal the magnitude of the opportunity and demonstrate that the solution is real — the market is enormous and the product works. Resolution (slides 5-7): present the proof — quantitative traction, viable business model economics, and the right team executing. Vision (slides 8-10): paint the future — competitive moat protecting the business, financial trajectory creating value, and a concrete ask that makes the investor a partner in this future. Each slide should end with a hook that creates curiosity for the next slide.

## Models

### Stage-Specific Content Emphasis
| Slide Element | Seed (Angel/Pre-seed) | Series A | Series B+ |
|---|---|---|---|
| Problem | Deep customer story depth | Market inefficiency quantified | Incumbent failure case study |
| Traction | Early adopter quotes, small revenue | Revenue curve, cohort retention | Unit economics, efficiency ratios |
| Team | Founder-market fit story | Management team depth | Board, advisors, exec team bench |
| Competition | Positioning map entry | Competitive moat defense | Market share capture strategy |
| Financials | 3yr projection | 5yr with unit economics | Path to profitability / EBITDA |

## Rules

- **Exactly one message per slide** — If a slide contains two distinct ideas that each require audience attention, split into two separate slides. A slide with two messages communicates none.
- **Maximum 30 visible words per slide** — The body text on each slide must be under 30 words total. Speaker notes carry the detail. The audience should look at the slide briefly, then listen to the presenter.
- **Visuals always beat text** — Every slide needs a visual: chart, screenshot, product photo, architecture diagram, team photo, or positioning map. Bullet-point walls are a pitch deck anti-pattern.
- **Adjust content emphasis for the stage** — Seed investors need team and vision conviction. Series A investors need traction and unit economics proof. Series B+ investors need growth efficiency and market dominance strategy. Wrong emphasis for the stage is a common cause of rejection.
- **The ask must be specific and actionable** — "We are raising a $2M seed round at a $10M pre-money valuation via a SAFE with a 12-month runway and this breakdown of use of funds." Not "We are looking for funding."
- **Tell a story, not a product specification** — Investors buy into a vision and a team, not a feature list. The product is the vehicle for the vision, not the destination of the pitch.
- **One metric that matters per slide** — For each slide, identify the single number that the audience must remember. If they forget everything else on the slide, what should they recall? Feature that number prominently.
- **Every slide ends with a hook to the next** — The final sentence or visual on each slide should create curiosity and anticipation for the next slide. The deck should feel like an engaging book that is difficult to put down.

## References
  - references/create-pitch-deck-advanced.md — Create Pitch Deck Advanced Topics
  - references/create-pitch-deck-fundamentals.md — Create Pitch Deck Fundamentals
  - references/investor-pitch-preparation.md — Investor Pitch Preparation Guide
  - references/investor-questions.md — Investor Questions
  - references/pitch-deck-storytelling.md — Pitch Deck Storytelling Guide
  - references/pitch-deck-strategy.md — Pitch Deck Strategy
  - references/pitch-deck-template.md — Pitch Deck Template
  - references/pitch-deck-templates.md — Pitch Deck Templates
## Related Skills

- **market-analysis** — Refine market data, TAM/SAM/SOM, and competitive positioning for slide 3
- **create-roadmap** — Align product roadmap narrative with pitch story for investor consistency
- **create-prd** — Develop detailed product requirements supporting pitch claims and narrative
- **create-brief** — Write executive briefs and one-pagers for investor follow-up meetings
- **create-story** — Break down product milestones from the pitch into actionable development stories
- **create-tech-spec** — Document technical differentiation claims and architecture decisions
- **create-adr** — Record architecture decisions that support the competitive moat claims

## Handoff
market-analysis, create-roadmap
