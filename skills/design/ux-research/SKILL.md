---
name: design-ux-research
description: >
  Use this skill when planning UX research, user research, usability testing, user interviews, personas, user journeys, information architecture, or card sorting. This skill enforces: method selection (generative vs evaluative), structured interview protocols, usability test plans, persona templates, journey mapping, and synthesis frameworks. Do NOT use for: visual design critiques, A/B test design, or analytics/quantitative analysis.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsure: true
tags: [design, research, phase-10]
---

# Design UX Research

## Purpose
Design and execute UX research with method selection, structured protocols, and systematic synthesis. Covers generative and evaluative methods, user interview protocols, moderated and unmoderated usability testing, data-driven persona creation, journey mapping, and findings synthesis frameworks.

## Agent Protocol

### Trigger
Exact user phrases: "UX research", "user research", "usability testing", "user interview", "persona", "user journey", "information architecture", "card sorting", "research plan", "research method", "user study", "affinity mapping", "thematic analysis", "moderated test", "unmoderated test", "NPS", "SUS", "CSAT".

### Input Context
Before activating, verify:
- Product stage: discovery / alpha / beta / live
- Research question or hypothesis
- Available participants and timeline
- Budget and tools available (remote testing platforms, recording)
- Existing UX artifacts (analytics, support tickets, previous research)
- Stakeholder expectations and key decisions riding on this research

### Output Artifact
UX research plan with method selection, interview or test protocol, and synthesis framework.

### Response Format
- Research plan: method, participants, timeline
- Protocol: questions, tasks, scenarios with time allocations
- Synthesis framework: affinity mapping, persona, journey map
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Research question defined with hypothesis
- [ ] Method selected (generative or evaluative) with rationale
- [ ] Participant criteria defined (segments, sample size, screener)
- [ ] Interview or test protocol written with timed sections
- [ ] Synthesis method chosen (affinity mapping, thematic analysis)
- [ ] Output artifacts specified (personas, journey maps, findings report)
- [ ] Metrics defined for evaluative research (task completion, SUS, NPS)

### Max Response Length
150 lines of plan and protocol.

## Workflow

### Step 1: Define Research Question & Hypothesis
Format: "How do [users] currently [task] and what prevents them from [desired outcome]?"
Hypothesis: "We believe [proposed solution] will [outcome] because [reason]."

Align question with product stage:

| Stage | Question Type | Method |
|-------|---------------|--------|
| Discovery | Open-ended exploration | Interviews, diary studies |
| Alpha | Concept validation | Concept testing, prototypes |
| Beta | Usability validation | Moderated/unmoderated testing |
| Live | Satisfaction/retention | Surveys, analytics |

### Step 2: Select Research Method

| Method | Type | Participants | Best For |
|--------|------|-------------|----------|
| User interviews | Generative | 5-8 per segment | Deep understanding, problem discovery |
| Diary study | Generative | 8-12 | Longitudinal behavior tracking |
| Usability testing (moderated) | Evaluative | 5-8 | In-depth usability issues |
| Usability testing (unmoderated) | Evaluative | 20-50 | Scale, task completion metrics |
| Survey | Evaluative | 50-500 | Satisfaction, NPS, feature prioritization |
| Card sorting | Generative | 20-50 | Information architecture validation |
| Tree testing | Evaluative | 20-50 | Navigation findability |

### Step 3: Participant Recruitment
Define screener criteria: demographics, behavior (frequency of use, tool familiarity), attitudinal (openness to change).

| Channel | Cost | Speed | Best For |
|---------|------|-------|----------|
| Existing user base | Low | Fast | Current users |
| Panels (UserTesting, etc.) | Medium-High | Fast | General population |
| Social media | Low | Medium | Niche audiences |
| Intercept/on-site recruitment | Low | Slow | In-product users |

Incentives: $50-100/hr for professionals, gift cards for consumers.

### Step 4: Write Research Protocol

| Section | Duration | Content |
|---------|----------|---------|
| Introduction | 5 min | Consent, recording, "there are no wrong answers" |
| Warm-up | 5 min | Background, current tools, role |
| Main tasks | 20-30 min | Scenarios, observe don't guide, think-aloud |
| Debrief | 5 min | Reflection, "anything we missed?" |

Question types:
- "Tell me about the last time you [task]" — open-ended, behavioral
- "What was frustrating about that?" — pain points
- "Walk me through how you [subtask]" — process mapping

Avoid: leading questions, hypotheticals ("would you use..."), double-barreled questions.

### Step 5: Conduct Moderated Usability Testing
Tasks should be scenario-based: "You need to find a specific order from last week. Please try to do that now."
Measure: task completion (pass/fail), time-on-task, error rate, satisfaction rating.
After each task: Single Ease Question (SEQ) — "Overall, how difficult was this task?" (1-7).

### Step 6: Synthesize Findings

| Method | Output | Tool |
|--------|--------|------|
| Affinity mapping | Themed clusters | Miro, Mural, FigJam, physical sticky notes |
| Persona creation | Data-driven archetype | Template with goals, frustrations, behaviors |
| Journey mapping | Visual timeline | Miro, Smaply, LucidChart |

Affinity mapping process:
1. Transcribe sessions → extract atomic observations
2. Cluster naturally — no labels yet
3. Label clusters when stable
4. Prioritize by frequency, severity, or business impact
5. Write one insight sentence per cluster

Persona template: Name, role, photo, bio (2-3 sentences), goals (primary + secondary), frustrations (3-5), behaviors, quote.

### Step 7: Produce Findings Report
Structure: executive summary → method overview → participant profile → 3-5 key findings (each with evidence, severity) → opportunities/recommendations → appendix.

Every finding links to source evidence (participant quote, task metric, screenshot).

## Best Practices

| Practice | Why |
|----------|-----|
| 5 participants per segment | Catches ~85% of usability issues (Nielsen Norman) |
| Pilot test your protocol | Catches ambiguous questions, timing issues |
| Record sessions | Enables post-hoc analysis and quote extraction |
| Mix qualitative and quantitative | Qualitative explains why, quantitative confirms patterns |
| Include a debrief question | "Is there anything we should have asked?" catches blind spots |

## Pitfalls to Avoid

- **Leading questions**: Don't ask "How would you improve X?" — they haven't used X yet. Ask "Tell me about your current process."
- **Hypotheticals**: "Would you use this feature?" — unreliable. Instead: observe behavior with a prototype.
- **Confirmation bias**: Asking questions to prove a hypothesis rather than explore. Listen for disconfirming evidence.
- **Small sample for surveys**: < 50 responses is not statistically significant. Don't report percentages.
- **Personas based on assumptions**: Every persona attribute must trace to research data, not team intuition.
- **Ignoring edge cases**: Recruit edge users (power users, non-users, extreme demographics) for full picture.
- **No participant screening**: Wrong participants = wasted sessions. Always screen against behavior criteria.

## Rules
- Interview questions are always open-ended first — never lead the participant
- Usability tests measure task completion, time-on-task, error rate, and satisfaction
- Personas are based on research data, not assumptions
- Journey maps include emotional highs and lows — not just actions
- Findings without evidence are opinions — tag every finding to a participant quote
- Sample size of 5 per segment catches ~85% of usability issues (Nielsen Norman)
- Never use customers as designers — ask "what do you do", not "what should we build"
- Always pilot test the protocol with 1-2 internal participants before real sessions

## References
- `references/research-methods.md` — Generative vs evaluative, interviews, surveys, unmoderated testing, method selection
- `references/synthesis-frameworks.md` — Affinity mapping, persona creation, journey mapping, findings report structure, SUS/NPS/CSAT
- `references/synthesis.md`

## Handoff
`design-prototyping` for interactive prototypes based on research insights.
Carry forward: research findings, persona profiles, journey maps.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.
