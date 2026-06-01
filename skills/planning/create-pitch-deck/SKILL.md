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

# Create Pitch Deck

## Purpose
Craft compelling investor pitch decks following storytelling best practices. Structures content across 10 essential slides (Problem → Solution → Market → Product → Traction → Business Model → Team → Competition → Financials → Ask) tailored to investor type and stage.

Investors see hundreds of decks per quarter. Most are immediately forgettable because they list features instead of telling a story. This skill builds a narrative arc — hook, tension, resolution, vision — that makes the opportunity feel urgent, real, and investable. Every slide has exactly one message the audience must remember, one supporting metric that proves it, and one visual suggestion that reinforces it. The output is a comprehensive slide-by-slide outline ready for designer polish and speaker note development, not a template to fill in.

The most common mistake in pitch decks is trying to say everything. Founders pack slides with text, features, and data because they are passionate and want investors to understand every detail. But investors make decisions on pattern recognition and conviction, not exhaustive feature knowledge. One clear message per slide with one memorable metric and one compelling visual consistently outperforms dense, information-rich slides that dilute the core story.

## Architecture/Decision Trees

### Investor Type Decision Tree
```
Who is the audience?
  |-- ANGEL (individual, early, pre-seed)
  |     |-- Emphasis: Team and vision
  |     |-- Key: Founder-market fit, personal story, market intuition
  |     |-- Avoid: Complex financial models, detailed unit economics
  |-- VC SEED (institutional, pre-revenue/early revenue)
  |     |-- Emphasis: Team + market size
  |     |-- Key: Founding team credentials, TAM story, early traction signals
  |     |-- Avoid: Overly detailed competitive analysis, 5-year projections
  |-- VC SERIES A (institutional, strong traction)
  |     |-- Emphasis: Traction + unit economics
  |     |-- Key: Revenue growth, cohort retention, LTV/CAC > 3
  |     |-- Avoid: Vision without proof, team bios without metrics
  |-- VC SERIES B+ (institutional, scaling)
  |     |-- Emphasis: Growth efficiency + market dominance
  |     |-- Key: Magic number, payback period, path to profitability
  |     |-- Avoid: Early-stage metrics, founder-centric narrative
  |-- CORPORATE / STRATEGIC
        |-- Emphasis: Strategic fit + integration
        |-- Key: Synergies, distribution channel, technology advantage
        |-- Avoid: Generic market size, standard VC narrative

What is the fundraising instrument?
  |-- SAFE --> Focus on: vision, traction, milestone to next round
  |-- PRICED ROUND --> Focus on: valuation rationale, use of funds, dilution
  |-- CONVERTIBLE NOTE --> Focus on: discount rate, valuation cap, maturity date
  |-- VENTURE DEBT --> Focus on: unit economics, ARR, debt service capacity
```

### Slide Priority Decision Tree
```
Does the investor know the problem space?
  |-- YES --> Skip deep problem setup, lead with solution + data
  |-- NO  --> Lead with customer story, build problem urgency

Does the product have strong visual appeal?
  |-- YES --> Lead with demo/screenshots early (slide 3-4)
  |-- NO  --> Lead with metrics, use diagrams instead of screenshots

Is traction clear and impressive?
  |-- YES --> Lead with traction curve, make it slide 3
  |-- NO  --> Build case through problem + solution before revealing traction

Is the market well-known?
  |-- YES --> Brief TAM slide, focus on SAM/SOM logic
  |-- NO  --> Detailed market analysis, analyst citations, growth drivers

Is the team the strongest asset?
  |-- YES --> Team slide earlier (slide 5-6), detailed backgrounds
  |-- NO  --> Team slide later (slide 8+), focus on key experience only
```

## Agent Protocol

### Trigger
"create pitch deck", "pitch deck", "investor pitch", "startup pitch", "fundraising deck", "product pitch", "presentation deck"

### Input Context
- Company/product description: one-sentence value proposition, what the product does, who it serves
- Target investor type and stage: angel, VC seed, Series A, Series B+, corporate
- Market data: TAM with source, SAM with derivation, SOM with capture rationale
- Traction metrics: total users, active users, MRR or ARR, month-over-month growth percentage, cohort retention (D1, D7, D30), NPS score, GMV if applicable
- Team background: founder names, prior company experience and exits, relevant domain expertise, key senior hires and their backgrounds, advisory board members
- Business model: pricing tiers and amounts, unit economics (CAC, LTV, LTV/CAC ratio, payback period, gross margin), primary sales motion
- Competition: list of direct and indirect competitors, estimated market share, key strengths and weaknesses
- Fundraising details: amount being raised, instrument type, target valuation, breakdown of fund allocation, expected runway

### Output Artifact
10-slide pitch deck outline with per-slide: headline (max 14 words), key message, content bullets (max 3), suggested visual type, speaker note guidance, story arc position.

### Response Format
- One section per slide with a clear heading: slide number and slide name
- Headline text (max 14 words — the few words the audience reads on the slide)
- Key message (one sentence — what the audience should remember after the slide)
- Content bullets (max 3 — the evidence supporting the key message)
- Suggested visual type (chart type, screenshot style, diagram, photo category)
- Story arc annotation (which part of hook / tension / resolution / vision this slide serves)
- No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
All 10 slides outlined with headlines and key messages. Key metrics are present in the appropriate slides. The Ask is specific with amount, valuation, instrument type, and use of funds. The story arc is coherent from the opening problem to the closing vision. Stage-specific tailoring is applied.

### Max Response Length
3000 tokens

## Workflow

### Step 1: Understand Audience
Identify the investor type accurately and tailor the deck's emphasis accordingly.

**Angel investors**: Bet on team and vision. Emphasize founder-market fit, personal founding story, and market intuition. Avoid complex financial models.

**Early-stage VC**: Look for product-market fit signals. Emphasize early traction metrics, team quality and completeness, and large addressable market.

**Series A VCs**: Need proof of a repeatable sales motion. Emphasize strong unit economics (LTV/CAC > 3, gross margin > 70%, payback period < 12 months), clear growth path, and competitive differentiation.

**Series B+ VCs**: Look for market dominance potential. Emphasize growth efficiency (magic number, payback period), management team depth, and clear path to profitable growth or market leadership.

**Research each investor**: Check stated investment thesis, preferred stage, sector focus, and existing portfolio. Tailor the pitch to fit their model.

### Step 2: Structure Slides
Follow the standard 10-slide structure in order:

**Slide 1 — Problem**: Who is suffering, what is the pain, why is it urgent, why do existing solutions fail, why now. Use a specific customer story or scenario.

**Slide 2 — Solution**: Your product, the core insight that makes it work, how it eliminates the pain in one memorable sentence.

**Slide 3 — Market size**: TAM with credible source, SAM as the reachable portion, SOM as realistic capture, and why this market is growing.

**Slide 4 — Product**: Demo screenshots or architecture diagram showing how the product works, the user journey, the magic moment.

**Slide 5 — Traction**: The metrics that prove the solution works — revenue curve, user count, cohort retention curves demonstrating product-market fit.

**Slide 6 — Business model**: Pricing, unit economics (CAC, LTV, payback, gross margin), sales channel, customer acquisition strategy.

**Slide 7 — Team**: Founder backgrounds and why they are the right people, key hires and domain expertise, advisory board validation, prior exits.

**Slide 8 — Competition**: Positioning map with clear differentiation axes, competitive moat description, defensibility analysis.

**Slide 9 — Financials**: 3-5 year revenue projection, expense breakdown, headcount plan, key assumptions clearly stated, burn rate and runway.

**Slide 10 — Ask**: The specific amount, valuation, instrument type, and a granular use of funds breakdown.

### Step 3: Write Per Slide
For each of the 10 slides:
- Distill content to exactly one key message that must survive in memory
- Visible text on the slide is at most 30 words total — glanceable in under 3 seconds
- Identify the one metric that matters most and highlight it visually
- Select a visual that directly reinforces the message

**Visual selection guide**:
- Line chart: Growth over time (revenue, users)
- Bar chart: Comparisons (competition, market segments)
- Pie/Donut chart: Composition (market share, budget allocation)
- Screenshot: Product demonstration
- Diagram: Architecture, flow, process
- Photo: Team, customer, real-world scenario
- Logo grid: Customers, partners, press mentions

### Step 4: Build Storytelling Arc
The deck follows a four-part story arc:

**Hook (slides 1-2)**: Immediately establish the problem in human terms — a specific person with a specific pain, why the pain is urgent, and why existing solutions are inadequate.

**Tension (slides 3-4)**: Reveal the magnitude of the opportunity and demonstrate that the solution is real — the market is enormous and the product works.

**Resolution (slides 5-7)**: Present the proof — quantitative traction, viable business model economics, and the right team executing.

**Vision (slides 8-10)**: Paint the future — competitive moat protecting the business, financial trajectory creating value, and a concrete ask that makes the investor a partner.

Each slide should end with a hook that creates curiosity for the next slide.

## Process Patterns

### Pattern 1: The Customer-Centric Pitch
**When**: Market is new or unfamiliar to investors
**Process**: Open with a detailed customer story (real name, real problem, real outcome). Derive the market size from the customer's willingness to pay. Use testimonials throughout.
**Best for**: B2B SaaS, niche markets, new categories.

### Pattern 2: The Metrics-First Pitch
**When**: Traction is the strongest signal
**Process**: Open with the growth curve. Problem and solution are brief (1 slide each). Market is sized to match the growth trajectory. Team slide focuses on operator experience.
**Best for**: Series A+, high-growth consumer, marketplaces.

### Pattern 3: The Vision-First Pitch
**When**: Pre-revenue or early-stage, bold vision
**Process**: Open with the future state — what the world looks like when the problem is solved. Work backward to why now, why this team, why this approach. Traction is small but promising signals.
**Best for**: Deep tech, pre-seed, moonshots.

### Pattern 4: The Competitive Displacement Pitch
**When**: Competing against incumbents
**Process**: Open with incumbent failures — specific data points on what existing solutions cost users. Position the solution as the inevitable replacement. Market size includes the incumbent's revenue.
**Best for**: Enterprise disruption, regulated industries.

## Anti-Patterns

### Anti-Pattern 1: Feature Dump
Every slide lists features instead of benefits. Investors invest in outcomes, not features. Anti-pattern signal: bullet lists of product capabilities without "which means..." explanation.

### Anti-Pattern 2: The Wall of Text
Slides have more than 30 words of visible text. If the audience is reading, they are not listening. Anti-pattern signal: font size below 24pt, paragraphs on slides.

### Anti-Pattern 3: The Missing Ask
The deck ends without a specific ask — no amount, no valuation, no terms. Or the ask is vague: "We are looking for funding." Anti-pattern signal: "We are raising a round" without details.

### Anti-Pattern 4: Generic Market Sizing
TAM of "$100B" without credible sourcing or SAM/SOM derivation. Investors see through made-up market sizes. Anti-pattern signal: TAM cited from a single source without methodology explanation.

### Anti-Pattern 5: Oversized Team Bios
Team slide lists every credential since college. Focus on what is relevant to this specific company. Anti-pattern signal: team bios longer than the traction section.

### Anti-Pattern 6: No Competitive Awareness
Claiming no competition exists. Every product has competition — direct, indirect, or "do nothing." Ignoring it signals naivety. Anti-pattern signal: "We have no competitors" or competition slide missing.

### Anti-Pattern 7: Inconsistent Story
Slides feel disconnected from each other. The problem slide describes one scenario, the solution slide addresses a different one. Anti-pattern signal: slides can be rearranged without breaking the narrative.

### Anti-Pattern 8: Overly Optimistic Projections
Financial projections that assume linear growth forever, 100% market capture, or magical efficiency improvements. Anti-pattern signal: hockey-stick projections without justification.

## Templates

### Slide Structure Template
Each slide follows this structure:
```
## Slide {N}: {Title}
**Headline:** {≤14 words, what appears on slide}
**Key message:** {one sentence for audience memory}
**Content:**
- {bullet 1 with metric}
- {bullet 2 with supporting point}
- {bullet 3 with supporting point}
**Visual:** {chart/screenshot/diagram type}
**Speaker note:** {guidance for presenter}
**Story arc:** {Hook/Tension/Resolution/Vision}
```

### Quick Deck Template (5 slides, for informal pitches)
```
Slide 1: Problem + Solution (combined)
Slide 2: Market + Product (combined)
Slide 3: Traction
Slide 4: Business Model + Team
Slide 5: Ask
```

### Full Deck Template (10 slides)
See Step 2 structure.

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Deck completion time | < 60 minutes | From trigger to complete outline |
| Slide message clarity | Each slide has 1 clear message | Review test: "What was slide N about?" |
| Ask specificity | Exact amount + instrument + use of funds | Investor comprehension test |
| Story arc coherence | 4-part arc clearly present | Blind review: does the story flow? |
| Stage tailoring accuracy | Content matches investor stage expectation | Compare to stage benchmarks |

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
- Exactly one message per slide — if a slide contains two distinct ideas, split it.
- Maximum 30 visible words per slide — speaker notes carry details.
- Visuals always beat text — every slide needs a visual.
- Adjust content emphasis for the stage — wrong emphasis is a common rejection cause.
- The ask must be specific and actionable — amount, valuation, instrument, use of funds.
- Tell a story, not a product specification — investors buy into vision and team.
- One metric that matters per slide — feature the single number the audience must remember.
- Every slide ends with a hook to the next — the deck should feel like a book you cannot put down.

## Slide-by-Slide Deep Dive

### Slide 1: Problem
**Headline example**: "Every day, {target user} wastes {X hours / $Y} on {pain point}."

**Building the problem case**:
- **Human story**: Start with a specific person. "Meet Sarah, a {role} at {company}. Every morning she..."
- **Quantify the pain**: "This affects {N} people and costs the industry ${M} annually."
- **Why now**: What changed? New regulation? Technology shift? COVID? Market maturation?
- **Existing solutions fail**: List 3 reasons current alternatives do not work. Be specific.

**Story arc**: Hook — make the audience feel the pain.

**Speaker note guidance**: Speak slowly. Let the problem breathe. Pause after the customer story. The audience needs to feel the pain before you offer relief. Do NOT mention the solution on this slide. If you do, the problem loses its weight.

### Slide 2: Solution
**Headline example**: "{Product Name} eliminates {pain point} by {core mechanism}."

**Building the solution case**:
- **One-liner**: "We are {company}. We help {target user} {outcome} by {mechanism}."
- **The insight**: What was the key realization that made this solution possible?
- **Before/After**: Show the world without and with your product. Use a timeline, comparison, or diagram.

**Story arc**: Hook continued — offer relief.

**Speaker note guidance**: The solution slide is about CLARITY, not completeness. If you cannot explain what you do in one sentence, you do not understand it well enough. Practice the one-liner until it is effortless.

### Slide 3: Market Size
**Headline example**: "{Market Category} is a ${TAM}B market growing at {CAGR}%."

**Building the market case**:
- **TAM**: Total Addressable Market — the total revenue opportunity if 100% market share. Cite a specific source (Gartner, Forrester, industry report).
- **SAM**: Serviceable Addressable Market — the portion you can reach given your business model and geography. Show your derivation.
- **SOM**: Serviceable Obtainable Market — the portion you can realistically capture in 3-5 years. This is your revenue target.
- **Market trends**: Why is this market growing? What tailwinds are driving it?

**Story arc**: Tension — the opportunity is enormous.

**Speaker note guidance**: The TAM is not the story. The SAM/SOM logic is the story. Investors know generic TAM numbers are inflated. What they want to hear is WHY you can capture your SOM. Spend 70% of this slide's speaking time on SOM logic, 30% on TAM context.

### Slide 4: Product
**Headline example**: "See how {product name} works in {time period}."

**Building the product case**:
- **Demo flow**: Show the user's journey from first interaction to "aha moment."
- **Magic moment**: What is the single moment when the user realizes the product delivers value?
- **Key features**: 3-5 features maximum, each with a screenshot or annotation.
- **User experience**: Focus on ease of use, speed, and delight.

**Story arc**: Tension — the solution is real and works.

**Speaker note guidance**: If you can demo live, do it. If not, use screenshots or a video walkthrough. DO NOT put architecture diagrams on this slide — save those for Q&A. The audience should feel like they can use the product after this slide.

### Slide 5: Traction
**Headline example**: "{Metric} has grown {X%} month over month for {N} months."

**Building the traction case**:
- **Revenue curve**: Monthly revenue line chart. Show the trend, not just the absolute number.
- **User growth**: Total users or active users over time. Highlight the growth rate.
- **Cohort retention**: Retention curves by cohort. A flatlining curve above zero is the holy grail.
- **Key milestones**: First paying customer, $1M ARR, 100K users, first enterprise deal.

**Story arc**: Resolution — proof that it works.

**Speaker note guidance**: Traction is the most heavily scrutinized slide. Every number must be accurate and defensible. If you are pre-revenue, show what you have: waitlist signups, pilot customer commitments, letter of intent. Do not fabricate or inflate.

### Slide 6: Business Model
**Headline example**: "We generate revenue through {model type} with {unit economics}."

**Building the business model case**:
- **Pricing**: List pricing tiers and what each includes. Show the rationale.
- **Unit economics**: CAC (customer acquisition cost), LTV (lifetime value), LTV/CAC ratio, gross margin, payback period.
- **Sales motion**: Self-serve (user signs up online), sales-led (BDR → AE), channel (partners resell), or hybrid.
- **Customer acquisition**: How do you reach customers? What channels are most effective?

**Story arc**: Resolution — the business works financially.

**Speaker note guidance**: Unit economics are more important than total revenue. A company with $5M ARR and LTV/CAC of 1.5 is less healthy than a company with $2M ARR and LTV/CAC of 5. Focus on the efficiency story.

### Slide 7: Team
**Headline example**: "We have been building {domain} products for {X} years."

**Building the team case**:
- **Founders**: Name, title, relevant prior experience, why they are uniquely qualified.
- **Key hires**: Name, role, background, and why they joined.
- **Advisors**: Who advises the company and what domain expertise they bring.
- **Prior exits**: If any founder has had an exit, highlight it prominently.

**Story arc**: Resolution — the right team is executing.

**Speaker note guidance**: Investors invest in people first. Do not list every credential since college — focus on what is RELEVANT to THIS company. Relevant experience at a similar company or solving a similar problem is worth 100x generic credentials.

### Slide 8: Competition
**Headline example**: "While competitors do {X}, we do {Y}."

**Building the competition case**:
- **Positioning map**: 2x2 matrix with axes relevant to your market (e.g., price vs. features, ease of use vs. power).
- **Competitor list**: Direct competitors (same solution), indirect competitors (different solution, same problem), and "do nothing" (status quo).
- **Your moat**: What prevents competitors from copying you? Network effects, data network effects, switching costs, brand, scale, regulatory, IP.
- **Defensibility over time**: How does your moat grow as you scale?

**Story arc**: Vision — the competitive position is defensible.

**Speaker note guidance**: Never say "we have no competitors." It signals naivety or insufficient research. Acknowledge competitors honestly and explain why you win. The positioning map should show a clear, defensible sweet spot that only you occupy.

### Slide 9: Financials
**Headline example**: "Projecting ${N}M ARR by {year} with {X}% gross margin."

**Building the financial case**:
- **Revenue projection**: 3-5 year revenue by line item (subscription, services, other). Show base, conservative, and optimistic scenarios.
- **Expense breakdown**: COGS, R&D, S&M, G&A as percentage of revenue.
- **Headcount plan**: How many people and in which functions over time.
- **Key assumptions**: What must be true for these projections to hold? Number of customers, average contract value, churn rate, sales cycle length.

**Story arc**: Vision — the financial trajectory creates value.

**Speaker note guidance**: The assumptions matter more than the numbers. Show you understand what drives the business. Be realistic — hockey-stick projections undermine credibility. If you are pre-revenue, show a model based on comparable companies at your stage.

### Slide 10: Ask
**Headline example**: "We are raising a ${amount} {instrument} at ${valuation} pre-money."

**Building the ask case**:
- **Amount**: Exact number you are raising.
- **Instrument**: SAFE, priced round, convertible note, venture debt.
- **Valuation**: Pre-money or valuation cap. Provide rationale based on comparables.
- **Use of funds**: Granular breakdown — engineering (%), go-to-market (%), operations (%), reserve (%).
- **Runway**: How many months this funding provides.
- **Milestones**: What you will achieve before the next round. These should be concrete, measurable outcomes.

**Story arc**: Vision — the investor is invited to be part of this future.

**Speaker note guidance**: The ask is the most important slide. Be direct, specific, and confident. Do not hedge: "We are raising $2M" not "We are looking for around $2M." Practice the ask until it sounds natural. End with a specific call to action: "We would love to have you as a partner in this journey."

## Investor Q&A Preparation

### Top 10 Investor Questions

**1. "Why now?"**
What changed in technology, regulation, or consumer behavior that makes this the right moment? Reference a specific catalyst.

**2. "What is your moat?"**
How do you defend against competitors? Network effects, data advantages, switching costs, regulatory barriers, brand, or speed.

**3. "How did you get your first 10 customers?"**
This tests go-to-market understanding. Have a specific story for each channel. "Warm intros," "LinkedIn outreach," "Content marketing" — be specific.

**4. "What if Google/Microsoft/Amazon copies you?"**
Show why incumbents cannot easily replicate your solution. Is it the wrong business model for them? Too small for their scale? Requires focus they lack?

**5. "What is your biggest risk?"**
Honest self-awareness is impressive. Name a real risk and explain your mitigation. "Our biggest risk is enterprise sales cycles. We mitigate by targeting mid-market first."

**6. "How much are you projecting to raise total?"**
Show the full funding plan to exit/IPO. Investors want to know the total dilution path.

**7. "What keeps you up at night?"**
Similar to "biggest risk" — name something specific and real. False bravado ("nothing") is a red flag.

**8. "Who is your dream CEO?"**
If you plan to hire a professional CEO, name the profile. If you plan to be the CEO, explain why you are the right person.

**9. "What valuation do you expect and why?"**
Use comparables (similar companies, similar stage, similar metrics) to anchor the valuation. "Companies in our space at our stage with similar traction are raising at {range}."

**10. "Can you introduce us to 3 customers we can call?"**
If you cannot produce customer references before the meeting, your traction claim is weak. Have 3-5 customers prepped and willing to take calls.

### Handling Tough Questions

**"I do not know"**: Acceptable for reasonable unknowns. "I do not know the exact TAM for that subsegment, but I can get you the number by tomorrow."

**"That is a competitive question"**: Avoid this response. Answer the question indirectly if you must, but do not stonewall.

**"Our financial model is conservative"**: 100% of founders say this. Prove it by showing your assumptions and what happens if they are wrong.

**Redirecting**: "That is a great question. The short answer is {X}. If you want to go deeper, I suggest we cover it in the follow-up meeting."

## Design Principles

### Typography
- Use one font family throughout (sans-serif for readability: Helvetica, Inter, SF Pro)
- Headline: 36-48pt
- Body: 18-24pt
- Maximum 2 font sizes per slide

### Color
- Use a consistent brand palette (primary, secondary, accent, neutral)
- One accent color for highlighting key metrics
- Avoid red/green combinations for accessibility
- Use contrast effectively: dark text on light backgrounds

### Layout
- Consistent margins throughout (standard: 1-inch)
- Left-align text (centered text is harder to read)
- One visual element per slide dominates
- Whitespace is not wasted space — it signals confidence

### Data Visualization
- Line charts for trends over time
- Bar charts for comparisons
- Donut charts for composition (use sparingly)
- Avoid 3D charts, pie charts with >5 slices, and chart junk
- Every chart must have labeled axes and data source

## Pre-Meeting Checklist

- [ ] Investor research completed (portfolio, thesis, recent activity)
- [ ] Executive summary (1-page) prepared as leave-behind
- [ ] Pitch rehearsed without slides (know the story cold)
- [ ] Top 10 Q&A answers prepared and practiced
- [ ] Customer references identified and prepped
- [ ] Financial model ready for deep dive
- [ ] Product demo works (if applicable)
- [ ] Technical co-founder available for architecture questions
- [ ] Competitor analysis updated (any new entrants?)
- [ ] Use of funds breakdown finalized

## Post-Meeting Follow-Up Template
```
Subject: {Company} — {Meeting Date} Follow-Up

Hi {Investor Name},

Thank you for the time today. As promised, I have attached our pitch deck and executive summary.

Key points from our discussion:
- {Topic 1}: {Summary of what was discussed}
- {Topic 2}: {Summary of what was discussed}

You asked about {specific question}. Here is the information:
{Answer}

Next steps:
- {Action item} by {date}
- {Action item} by {date}

I will follow up on {date} as we discussed.

Best,
{Your Name}
```

## References
- **market-analysis** — Refine market data, TAM/SAM/SOM, and competitive positioning
- **create-roadmap** — Align product roadmap narrative with pitch story
- **create-prd** — Develop detailed product requirements supporting pitch claims
- **create-brief** — Write executive briefs for investor follow-up meetings
- **create-story** — Break down product milestones into development stories
- **create-tech-spec** — Document technical differentiation claims
- **create-adr** — Record architecture decisions supporting competitive moat

## Handoff
market-analysis, create-roadmap
