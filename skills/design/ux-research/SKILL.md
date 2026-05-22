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
  windsurf: true
tags: [design, research, phase-10]
---

# Design UX Research

## Purpose
Design and execute UX research with method selection, structured protocols, and systematic synthesis.

## Agent Protocol

### Trigger
Exact user phrases: "UX research", "user research", "usability testing", "user interview", "persona", "user journey", "information architecture", "card sorting", "research plan", "research method", "user study".

### Input Context
Before activating, verify:
- Product stage: discovery / alpha / beta / live
- Research question or hypothesis
- Available participants and timeline
- Budget and tools available (remote testing platforms, recording)

### Output Artifact
UX research plan with method selection, interview or test protocol, and synthesis framework.

### Response Format
```yaml
# Research plan: method, participants, timeline
# Protocol: questions, tasks, scenarios
```
```markdown
# Synthesis framework: affinity mapping, persona, journey map
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Research question defined with hypothesis
- [ ] Method selected (generative or evaluative) with rationale
- [ ] Participant criteria defined (segments, sample size, screener)
- [ ] Interview or test protocol written with timed sections
- [ ] Synthesis method chosen (affinity mapping, thematic analysis)
- [ ] Output artifacts specified (personas, journey maps, findings report)

### Max Response Length
150 lines of plan and protocol.

## Workflow

### Step 1: Define Research Question
Statement format: "How do [users] currently [task] and what prevents them from [desired outcome]?" Hypothesis format: "We believe [proposed solution] will [outcome] because [reason]." Align question with product stage: discovery → open-ended exploration, alpha → concept validation, beta → usability, live → satisfaction / retention.

### Step 2: Select Method
Generative (why): interviews, diary studies, field observation — use when exploring unknown problems. Evaluative (does it work): usability testing, A/B testing, surveys — use when validating solutions. Mixed methods combine both. Sample size: 5–8 participants per segment for qualitative, >50 per segment for quantitative surveys.

### Step 3: Participant Recruitment
Define screener criteria: demographics, behavior (frequency of use, tool familiarity), attitudinal (openness to change). Recruitment channels: existing user base, social media, panels (UserTesting, UserInterviews). Incentives: $50–100/hour for professionals, gift cards for consumers.

### Step 4: Write Protocol
Sections: introduction (consent, 5 min), warm-up (context, 5 min), main tasks (scenarios, 20–30 min), debrief (reflection, 5 min). Questions: open-ended ("Tell me about...") before closed. For usability: "Please try to [task]" — observe, don't guide. Document follow-up probes for each question.

### Step 5: Synthesis
Affinity mapping: transcribe sessions → extract notes → group by theme → identify patterns. Persona: name, photo, role, goals, frustrations, behaviors, quote. Journey map: phases (awareness, consideration, purchase, support, retention), actions, thoughts, emotions, pain points, opportunities.

### Step 6: Findings Report
Structure: executive summary (key insight in 1 paragraph), method overview, participant profile, key findings (3–5 with supporting evidence), opportunities / recommendations, appendix (protocol, raw data). Every finding must link to source evidence.

## Rules
- Interview questions are always open-ended first — never lead the participant
- Usability tests measure task completion, time-on-task, error rate, and satisfaction
- Personas are based on research data, not assumptions
- Journey maps include emotional highs and lows — not just actions
- Findings without evidence are opinions — tag every finding to a participant quote
- Sample size of 5 per segment catches ~85% of usability issues (Nielsen Norman)
- Never use customers as designers — ask "what do you do", not "what should we build"

## References
- `references/research-methods.md` — Generative vs evaluative, interviews, surveys, unmoderated testing
- `references/synthesis.md` — Affinity mapping, persona, journey map, findings report

## Handoff
`design-prototyping` for interactive prototypes based on research insights.
`design-accessibility` for inclusive design requirements from user feedback.
Carry forward: research findings, persona profiles, journey maps.
