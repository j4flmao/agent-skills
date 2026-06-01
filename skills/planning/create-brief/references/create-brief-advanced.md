# Brief Advanced Topics

## Q&A Strategy Selection

### Exhaustive Q&A
Best for vague ideas, first-time founders, or non-technical stakeholders. Ask all 5 questions sequentially. Risk of misalignment is lowest but time to draft is highest (~5 turns).

### Gap-Filling Q&A
Best when user provided partial information. Ask only the missing questions. Faster but risks unstated assumptions.

### Zero Q&A
Best for experienced PMs, follow-up briefs, or internal projects where the user already articulated all 5 components. Fastest but highest risk of misalignment if assumptions are wrong.

## Question Depth Techniques

### When Users Say "I Don't Know"
Never default to generic assumptions. Provide 2-3 concrete options:
- **Target user**: "Are we building for individual consumers, small teams (<10 people), or large organizations (>50 people)?"
- **Problem**: "Is the pain about cost, time, quality, or something else?"
- **Differentiator**: "Is the advantage price, speed, ease of use, or a feature no one else has?"

### When Users Are Too Vague
- "Everyone" → "If we had to pick the first 100 users, who would they be?"
- "Fixes communication" → "Walk me through the moment this becomes a problem. What happened right before?"
- "Like X but better" → "What specifically does X do poorly that your users complain about?"

## Handling Different Product Types

### B2B SaaS
- Buyer != user. Identify both personas
- Include integration requirements (SSO, data import/export, API)
- Success metrics tied to business outcomes (efficiency gain, cost reduction)

### B2C Consumer
- Behavioral triggers are critical. When and why does the user engage?
- Acquisition channels determine growth strategy
- Time-to-value must be measured in minutes, not weeks

### Marketplace
- Liquidity is the primary risk. How do you get supply and demand in balance?
- Chicken-and-egg strategy must be explicit
- Success metrics include fill rate, conversion, and take rate

### Internal Tools
- Adoption is the primary risk. Users did not choose this tool
- Training and onboarding must be part of scope
- Integration with existing workflows is non-negotiable

## Iteration Management

### Three Round Protocol
- **Round 1**: Present draft. Collect changes. Apply and re-present.
- **Round 2**: Collect further changes. Apply and re-present.
- **Round 3**: Last call. Apply changes. If user wants more, state: "I suggest we proceed with the current version."

### Feature Creep Resistance
Track feature count across rounds. If it increases >20%, push back. "Which features are truly MVP vs. v2?"

### Restructuring
If the user requests significant restructuring, rewrite the full template rather than patching. Patched briefs read incoherently.

## Success Metrics by Product Type

| Product Type | Primary Metric | Secondary Metric | Measurement |
|--------------|----------------|------------------|-------------|
| B2B SaaS | Activation rate (% completing core action in 7 days) | Net revenue retention | Product analytics + billing |
| B2C Consumer | D7 retention | Time-to-value | Cohort analysis |
| Marketplace | Liquidity rate (transactions / available supply) | Take rate | Transaction data |
| Internal Tool | Weekly active users / total licenses | Feature adoption rate | Usage analytics |
| API/Platform | Time to first successful call | Developer NPS | Onboarding flow |
| Mobile App | D1 retention | Session frequency | App analytics |

## Common Edge Cases

**User wants to clone a known product**: The brief must identify why the clone is needed. "Like Trello but for legal document management" is a specific differentiator. "Like Trello" without modification is not a brief.

**User has existing users/code**: The brief should document current state, what needs to change, and constraints imposed by the existing system. "We have 500 users and a Python monolith. We want to..."

**Brief for a non-digital product**: The same framework applies but technical constraints become physical constraints (manufacturing, shipping, retail distribution).

**Multiple stakeholders with conflicting visions**: Document each stakeholder's perspective. Flag the conflict. Escalate to a decision-maker before drafting.

## Connection to Lean Canvas
The Lean Canvas is a pre-brief tool for business model exploration. The 9 boxes (problem, solution, key metrics, UVP, unfair advantage, channels, customer segments, cost structure, revenue) feed directly into the brief. Extract the brief from boxes 1, 2, 4, and 7 (problem, solution, UVP, customer segments) and expand.

## Connection to JTBD
Jobs To Be Done reframes the brief around user motivation. Instead of "who," ask "what job." Instead of "what features," ask "what outcome." This is useful when the user has clear product examples but fuzzy problem definition.
