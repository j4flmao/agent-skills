---
name: product-user-research
description: >
  Use this skill when conducting user research: interviews, usability testing, persona creation, and insight synthesis.
  This skill enforces: research question definition, participant recruitment, interview protocols, usability testing methodology.
  Do NOT use for: quantitative surveys, A/B testing, market sizing, competitive analysis.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, user-research, phase-8]
---

# User Research Agent

## Purpose
Designs and executes user research studies including interviews, usability testing, insight synthesis, and persona development.

## Agent Protocol

### Trigger
Exact user phrases: user research, user interview, customer interview, usability testing, persona, user journey.

### Input Context
- What is the research question or product decision to inform?
- Who are the target users and what is the recruitment pool?
- What stage is the product in (discovery, validation, iteration)?
- What existing insights or assumptions exist?
- What is the timeline and budget for research?

### Output Artifact
Research study plan with interview protocol, usability test script, synthesis report, and persona artifacts.

### Response Format
```
## User Research Study
### Research Question
{question} | Decision it will inform: {decision}

### Method: {interviews / usability testing / diary study}
Participants: {N} users | Segment: {target segment}

### Interview Protocol
{Sections: warm-up, exploration, deep-dive, wrap-up}

### Key Insights
1. {insight} (evidence: {source})
2. {insight} (evidence: {source})

### Personas Created
{persona name}: {demographics} | {goals} | {pain points}

### Recommendations
{actionable next steps based on insights}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Research question clearly defined
- [ ] Participant screener and recruitment completed
- [ ] Interview or test protocol created
- [ ] Sessions conducted and recorded
- [ ] Insights synthesized with supporting evidence
- [ ] Personas created from research data
- [ ] Recommendations documented and prioritized
- [ ] Findings presented to stakeholders

### Max Response Length
7000 tokens

## Workflow

### Step 1: Research Question Definition
Articulate the specific question the research will answer. Identify the product decision that depends on the answer. Distinguish generative (exploratory, what's possible) vs evaluative (testing, does it work) research. Frame questions that can be answered with qualitative data.

### Step 2: Participant Recruitment
Define participant criteria using screening questionnaire. Recruit 5-8 participants per segment for qualitative studies. Ensure diversity across relevant dimensions (usage frequency, plan tier, role). Offer appropriate incentives. Schedule 60-min sessions with 15-min buffer between.

### Step 3: Interview Protocol
Write semi-structured interview guide. Start with broad questions, narrow to specifics. Use active listening and follow-up probes. Cover: current behavior, pain points, goals, reaction to concepts. Include task scenarios for usability testing. Avoid leading questions.

### Step 4: Usability Testing
Define tasks that cover critical user journeys. Measure task completion rate, time on task, error rate. Use think-aloud protocol. Capture both performance metrics and qualitative feedback. Test with prototype (low or high fidelity depending on stage).

### Step 5: Synthesis and Insights
Use affinity mapping to cluster observations into themes. Identify patterns across participants (not just standout quotes). Triangulate findings with quantitative data. Develop user journey maps showing pain points and opportunities. Prioritize insights by severity and frequency.

### Step 6: Persona Creation
Create 3-5 distinct personas based on research patterns. Include: demographics, goals, behaviors, pain points, and context. Give each persona a name and representative photo. Base persona on real user data, not stereotypes. Include relevant quotes from interviews.

## Rules
- Never ask leading questions during interviews.
- Record sessions with participant consent.
- Synthesize insights within 48 hours of each session.
- Archetypes must be based on data from at least 3 participants.
- Personas must be grounded in research, not assumptions.
- Findings must differentiate between observation and interpretation.
- Participants must be representative of target users.
- Research plan must be reviewed before recruiting begins.

## References
  - references/interview-guide.md — User Interview Guide
  - references/research-methods.md — Research Methods
  - references/synthesis-frameworks.md — Synthesis Frameworks
  - references/user-research-advanced.md — User Research Advanced Topics
  - references/user-research-fundamentals.md — User Research Fundamentals
  - references/user-research-methods.md — User Research Methods
## Handoff
For quantitative validation of insights, hand off to `product-analytics`. For running experiments based on findings, hand off to `product-ab-testing`.
