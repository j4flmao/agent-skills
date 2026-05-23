# Synthesis Frameworks Reference

## Affinity Mapping

### Process
1. **Transcribe** — Full transcript or detailed notes from each session
2. **Extract** — One atomic observation per sticky note (physical or digital)
3. **Cluster** — Move notes into groups without pre-defined labels; let patterns emerge
4. **Label** — Name each cluster once stable (e.g., "Trust concerns", "Workflow friction")
5. **Prioritize** — Vote on clusters by frequency, severity, or business impact
6. **Insight** — Write one sentence per cluster summarizing the pattern

### Tools
- Digital: Miro, Mural, FigJam, Miro
- Physical: Sticky notes + wall + markers

### Cluster Prioritization Matrix

| Cluster | Frequency | Severity | Business Impact | Priority |
|---------|-----------|----------|-----------------|----------|
| Trust concerns | 8/10 participants | Critical | Churn risk | P0 |
| Workflow friction | 6/10 | Major | Efficiency loss | P1 |
| Feature requests | 3/10 | Minor | Nice-to-have | P2 |

## Data-Driven Persona Creation

### Source Requirements
- Minimum 5 participants per persona segment
- Data sources: interview transcripts, survey data, analytics, support tickets
- Every persona attribute must trace to research evidence

### Persona Template
```
Name: [fictional first name]
Role: [job title, industry]
Photo: [representative stock photo]
Archetype: [Power User / Casual / Newcomer / Skeptic]

Bio: 2-3 sentences about their background, daily context, and relationship to the product.

Goals:
- Primary: [main task they need to accomplish]
- Secondary: [supporting goals]

Frustrations:
- [Pain point 1]
- [Pain point 2]
- [Pain point 3]

Behaviors:
- Tools currently used: [tool names]
- Frequency: [daily/weekly/monthly]
- Workarounds: [how they compensate for current limitations]

Quote: One sentence in their voice — "I just need to..."
```

### Assumption-Based vs Data-Driven Personas

| Aspect | Assumption-Based | Data-Driven |
|--------|------------------|-------------|
| Source | Team intuition, stereotypes | Interviews, surveys, analytics |
| Validation | None | Triangulated from 3+ sources |
| Detail | Vague, generic | Specific behaviors, quotes |
| Actionability | Low — too generic | High — specific needs |
| Risk | Confirms biases | Exposes blind spots |

## Journey Mapping

### Template
```
Phase 1        | Phase 2        | Phase 3        | Phase 4
Awareness       | Consideration  | Decision       | Post-purchase

Actions:
[what user does] | [what user does] | [what user does] | [what user does]

Thoughts:
"I need..."     | "Which one...?" | "I hope..."    | "Is this working?"

Emotions:
😕 confused     | 🤔 researching | 😀 confident  | 😠 stuck
😐 neutral      | 😊 interested  | 😟 worried    | 😌 relieved

Pain points:
- Not finding info | - Too many options | - Hidden fees | - Poor support

Opportunities:
- SEO content      | - Comparison tool  | - Transparent pricing | - Chat support
```

### Best Practices
- Map the current experience (not ideal) — capture reality
- Include emotional highs AND lows — not just actions
- Capture workarounds and "kludges" — they reveal opportunities
- Validate journey map with 2-3 participants before finalizing
- Use for stakeholder alignment and opportunity identification

## Findings Report Structure

### 1. Executive Summary
One paragraph: key insight + recommendation. Decision-makers should understand the outcome without reading further.

### 2. Method Overview
| Element | Detail |
|---------|--------|
| Method | Moderated usability testing |
| Participants | 8 (5 existing users, 3 prospects) |
| Duration | 45 min per session |
| Dates | May 10-15, 2026 |

### 3. Participant Profile
Table of demographics: role, experience level, product usage frequency, segment.

### 4. Key Findings (3-5)
Each finding has:
- **Headline** — One sentence (e.g., "Users cannot find the order status filter")
- **Evidence** — Participant quotes, task metrics, screenshots, video timestamps
- **Severity** — Critical / Major / Minor
- **Frequency** — "7 of 8 participants encountered this issue"

### 5. Opportunities & Recommendations
Map to findings with actionable next steps:
- Finding → Recommendation → Effort Estimate → Impact

### 6. Appendix
- Full protocol
- Raw data (task completion rates, time-on-task, SUS scores)
- Transcript excerpts
- Screenshots and video links

## Synthesis Principles

| Principle | Practice |
|-----------|----------|
| Evidence-based | Every finding links to source data (quote, metric, screenshot) |
| Bias-aware | Actively seek disconfirming evidence; don't cherry-pick |
| Triangulated | Multiple data sources for each finding (interview + analytics + survey) |
| Actionable | Findings lead to clear design or strategy recommendations |
| Accessible | Written for stakeholders — avoid academic jargon |
| Prioritized | P0 (critical blocker) → P1 (major friction) → P2 (minor improvement) |
