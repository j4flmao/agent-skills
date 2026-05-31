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
Designs and executes user research studies including interviews, usability testing, insight synthesis, and persona development. The goal is to reduce uncertainty about user needs, behaviors, and pain points through systematic qualitative investigation. Research output directly informs product strategy, feature definition, and design decisions.

## Agent Protocol

### Trigger
Exact user phrases: user research, user interview, customer interview, usability testing, persona, user journey.

### Input Context
- What is the research question or product decision to inform?
- Who are the target users and what is the recruitment pool?
- What stage is the product in (discovery, validation, iteration)?
- What existing insights or assumptions exist?
- What is the timeline and budget for research?
- What decisions hinge on the research outcomes?
- What prior research artifacts are available?

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
- [ ] Research repository updated with artifacts
- [ ] Handoff to downstream teams completed

### Max Response Length
7000 tokens

## Framework/Methodology

### Research Taxonomy
Research methods fall along two primary axes:

| Axis | Spectrum | Description |
|------|----------|-------------|
| Nature | Generative vs Evaluative | Explore unknown problems vs test known solutions |
| Data | Qualitative vs Quantitative | Rich depth vs statistical breadth |
| Setting | Natural vs Controlled | Real context vs lab environment |
| Timing | Longitudinal vs Point-in-time | Behavior over time vs snapshot |

### Double Diamond Integration
User research maps to the Double Diamond design process:

| Phase | Diamond Stage | Research Activity | Output |
|-------|--------------|-------------------|--------|
| Discover | Divergent | Exploratory interviews, diary studies, field observation | Problem space map, user needs |
| Define | Convergent | Affinity mapping, thematic analysis, persona creation | Problem statement, personas |
| Develop | Divergent | Concept testing, co-creation workshops, prototype feedback | Solution ideas, design criteria |
| Deliver | Convergent | Usability testing, beta feedback, satisfaction surveys | Validated design, launch readiness |

### Research Maturity Model

| Level | Name | Characteristics |
|-------|------|-----------------|
| 1 | Reactive | Research done ad-hoc when crisis hits, no process |
| 2 | Foundational | Basic methods established, some regular cadence |
| 3 | Integrated | Research embedded in product cycles, dedicated budget |
| 4 | Strategic | Research drives strategy, cross-functional partnerships |
| 5 | Generative | Continuous research culture, proactive discovery |

Assess current maturity level and define target level before planning research.

## Workflow

### Step 1: Research Question Definition
Articulate the specific question the research will answer. Identify the product decision that depends on the answer. Distinguish generative (exploratory, what's possible) vs evaluative (testing, does it work) research. Frame questions that can be answered with qualitative data.

Write research questions using this structure:

```
Research Question: How do [segment] currently [task/goal] and what prevents them from [desired outcome]?
Decision: We will decide [specific decision] based on the findings.
Hypothesis: We believe [assumption] is true because [reasoning].
```

Criteria for good research questions:
- Specific enough to be answerable within study scope
- Broad enough to allow discovery of unexpected findings
- Neutral — does not presuppose an answer
- Actionable — the answer informs a concrete decision
- User-centered — focuses on user behavior, not product features

Bad example: "Do users like our new feature?" (leading, hypothetical, yes/no)
Good example: "How do users currently accomplish task X and where do they experience friction?"

### Step 2: Participant Recruitment
Define participant criteria using screening questionnaire. Recruit 5-8 participants per segment for qualitative studies. Ensure diversity across relevant dimensions (usage frequency, plan tier, role). Offer appropriate incentives. Schedule 60-min sessions with 15-min buffer between.

Participant screener template:

```
Screener Criteria for [Study Name]:
- Must-have: [non-negotiable attributes]
- Nice-to-have: [preferred but not required]
- Exclude: [who should not participate]
- Diversity targets: [e.g., 40-60% gender split, 3+ plan tiers]

Recruitment channels (prioritized):
1. [Best channel for this segment]
2. [Secondary channel]
3. [Fallback channel]

Incentive: ${amount} per {duration} session
Payment method: {gift card / transfer / charity donation}
```

Sample size guidelines:
- Generative interviews: 5-8 per segment (saturation typically reached by 6)
- Usability testing: 5 per segment (~85% issue discovery)
- Diary studies: 8-12 participants
- Quantitative surveys: 50-500 (depending on confidence interval needed)

### Step 3: Interview Protocol
Write semi-structured interview guide. Start with broad questions, narrow to specifics. Use active listening and follow-up probes. Cover: current behavior, pain points, goals, reaction to concepts. Include task scenarios for usability testing. Avoid leading questions.

Protocol structure with timing:

| Section | Duration | Purpose | Key Techniques |
|---------|----------|---------|----------------|
| Introduction | 5 min | Consent, rapport building | Explain "no wrong answers," confirm recording |
| Warm-up | 5-10 min | Context, current behavior | "Tell me about your role", day-in-the-life |
| Main exploration | 20-25 min | Deep dive into topic | Behavioral questions, process mapping |
| Concept response | 10-15 min | Reaction to ideas/solutions | Show prototype, observe reaction |
| Wrap-up | 5 min | Reflection, closure | "What did we miss?", next steps |

Effective probing techniques:
- Silence: Wait 5-7 seconds after an answer — participants often add more
- Echo: Repeat the last few words as a question
- Laddering: "Why is that important?" repeated to reach core values
- Specificity: "Walk me through the last time that happened"
- Contrast: "How is that different from your usual approach?"

Questions to avoid:
- Leading: "How frustrating was that process?" (assumes frustration)
- Double-barreled: "How do you manage X and what do you think of Y?"
- Hypothetical: "Would you use a feature that does Z?"
- Yes/no: "Do you check that daily?" (use "How often do you check that?")

### Step 4: Usability Testing
Define tasks that cover critical user journeys. Measure task completion rate, time on task, error rate. Use think-aloud protocol. Capture both performance metrics and qualitative feedback. Test with prototype (low or high fidelity depending on stage).

Task design principles:
- Scenario-based: "You received a notification about a security issue. Find and review it."
- Goal-oriented: describes the outcome, not the steps
- Realistic data: use believable names, amounts, dates
- Neutral language: avoid hinting at UI element names or locations

Metrics per task:

| Metric | Collection Method | Target Benchmark |
|--------|-------------------|------------------|
| Task completion (binary) | Observer records pass/fail | >80% first attempt |
| Time on task | Screen recording timing | Varies by task complexity |
| Error rate | Count of wrong paths or clicks | <2 per task |
| SEQ (1-7) | Post-task survey | >5.5 |
| CES (1-5) | Post-task survey | <2 |
| SUS (0-100) | Post-test survey | >68 |

### Step 5: Synthesis and Insights
Use affinity mapping to cluster observations into themes. Identify patterns across participants (not just standout quotes). Triangulate findings with quantitative data. Develop user journey maps showing pain points and opportunities. Prioritize insights by severity and frequency.

Affinity mapping process:
1. Extract atomic observations from transcripts (one per sticky note)
2. Cluster without predetermined categories — let patterns emerge
3. Name clusters after patterns stabilize
4. Create hierarchy: cluster groups into themes
5. Write one insight statement per theme
6. Rate each insight by: evidence strength, severity, frequency, business impact

Synthesis output formats:

| Format | Best For | Structure |
|--------|----------|-----------|
| Findings report | Stakeholder communication | Exec summary, method, findings, recommendations |
| Journey map | Visualizing end-to-end experience | Stages, actions, thoughts, emotions, opportunities |
| Experience principles | Guiding design decisions | 3-5 principles derived from research |
| Opportunity map | Prioritizing next steps | Opportunities ranked by impact and effort |

### Step 6: Persona Creation
Create 3-5 distinct personas based on research patterns. Include: demographics, goals, behaviors, pain points, and context. Give each persona a name and representative photo. Base persona on real user data, not stereotypes. Include relevant quotes from interviews.

Persona template:

```
Persona: {Name}
Role: {Job title or user type}
Demographics: {Age range, location, industry}
Quote: {Representative verbatim quote}

Bio: {2-3 sentence narrative of their context and routine}

Goals:
- Primary: {main goal when using the product}
- Secondary: {supporting goals}

Pain Points:
1. {Specific frustration} — "{supporting quote}"
2. {Specific frustration} — "{supporting quote}"
3. {Specific frustration} — "{supporting quote}"

Behaviors:
- {Behavioral pattern} (evidence: {N} of {total} participants)
- {Behavioral pattern} (evidence: {N} of {total} participants)

Current Tools: {what they use instead of or alongside the product}
```

### Step 7: Reporting and Handoff
Structure the findings report for maximum actionability:

1. Executive Summary (1 page): Key insights, recommendations, confidence level
2. Method Overview: How research was conducted, participants, limitations
3. Participant Profile: Who was recruited, key demographics
4. Key Findings (3-5): Each with supporting evidence, severity rating
5. Recommendations: Prioritized actions with expected impact
6. Appendix: Full protocol, raw data, consent forms

Every finding must include:
- The finding statement
- Supporting evidence (participant quote, observation count, metric)
- Severity rating (critical, major, minor, suggestion)
- Confidence level (high, medium, low based on evidence strength)

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Confirmation bias | Seeking evidence that confirms assumptions | Ask disconfirming questions; include devil's advocate |
| Leading questions | Questions that suggest a desired answer | Use behavioral recall, not opinions about future |
| Hypothetical bias | Users overstate future behavior intentions | Ask about past behavior, test with real prototypes |
| Social desirability | Participants tell you what they think you want | Normalize negative feedback; "we need your honesty" |
| Recency bias | Weighting recent or memorable events too heavily | Use diary studies for longitudinal accuracy |
| Small sample generalization | Drawing quantitative conclusions from N=5 | Report patterns, not percentages from qual studies |
| Cherry-picking quotes | Selecting quotes that support a predetermined narrative | Document all themes, including contradictory ones |
| Solutioneering | Participants suggesting features instead of describing problems | Redirect: "Help me understand what you're trying to accomplish" |
| Ignoring edge cases | Only studying mainstream users to the exclusion of extreme users | Deliberately recruit power users and non-users |
| Analysis paralysis | Collecting data without synthesizing | Set aside dedicated synthesis time: 2x session length |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Always pilot test your protocol | Catches ambiguous questions, timing issues, technical glitches |
| Record and transcribe every session | Enables accurate analysis and verbatim quotes |
| Take breaks between sessions | Prevents carryover bias; debrief and reset each time |
| Involve observers from cross-functional teams | Builds research empathy and stakeholder buy-in |
| Maintain a research repository | Enables longitudinal analysis and prevents duplicate studies |
| Use a research consent form | Legal requirement; builds trust with participants |
| Share raw data alongside synthesized findings | Allows others to verify conclusions |
| Timebox synthesis: 2x total research time | Prevents analysis paralysis |
| Include at least one "how might we" per insight | Bridges from research to action |
| Validate qualitative findings with quantitative data when possible | Triangulation increases confidence |

## Templates & Tools

### Research Plan Template
```
# Research Plan: {Study Name}
## Background
- Product area: {what is being studied}
- Stakeholders: {who cares about the outcome}
- Existing knowledge: {what we already know}

## Research Questions
1. {Primary question} → Decision: {what we will decide}
2. {Secondary question} → Decision: {what we will decide}

## Method
- Approach: {interviews / usability testing / diary study}
- Session length: {minutes}
- Total participants: {N} across {M} segments
- Timeline: {start} to {end}

## Participants
- Recruited from: {source}
- Screening criteria: {key criteria}
- Incentive: ${amount} per session

## Outputs
- {Artifact 1}: {description}
- {Artifact 2}: {description}
```

### Analysis Tools

| Tool | Use Case | Cost |
|------|----------|------|
| Dovetail | Transcription, tagging, analysis | Paid |
| Condens | Repository, tagging, highlights | Paid |
| Aurelius | Research repository, tagging | Paid |
| Airtable | Custom research tracking | Freemium |
| Miro/Mural | Affinity mapping (visual) | Freemium |
| Excel/Sheets | Simple data coding and tracking | Free |
| Delve | Thematic analysis tool | Paid |
| EnjoyHQ | Research repository, integrations | Paid |

### Synthesis Toolkit

| Artifact | Tool | Format |
|----------|------|--------|
| Affinity map | Miro, Mural, FigJam | Visual board |
| Journey map | Smaply, Miro, LucidChart | Timeline visualization |
| Persona | Notion, Canva, PPT | Document or poster |
| Findings report | Notion, Google Docs, Confluence | Structured document |
| Insight database | Airtable, Dovetail | Tagged and searchable |

## Case Studies

### Case Study 1: Reducing SaaS Churn through Exit Interviews
A B2B SaaS company with 8% monthly churn conducted exit interviews with 15 churned customers. The research revealed that the primary churn driver was not product quality but poor onboarding — 12 of 15 participants never reached the activation milestone. The company redesigned the onboarding flow based on this insight, reducing 90-day churn from 24% to 12% within one quarter.

Method: 30-min structured exit interviews with churned customers
Key insight: "I signed up, looked around for 5 minutes, and couldn't figure out what to do next"
Action: Redesigned onboarding with guided activation checklist
Result: 50% reduction in churn over 90 days

### Case Study 2: Feature Prioritization via User Interviews
A project management tool was considering 12 new features. User research with 18 participants across 3 segments revealed that 4 of the planned features addressed problems users didn't have, while 2 unplanned features (offline mode and better search) were critical. Reallocating development effort saved an estimated $120K in development costs.

Method: Task-based interviews with card sorting exercise
Key insight: Users prioritized reliability (offline access) over new functionality
Action: Reprioritized roadmap based on user pain point frequency
Result: Avoided building 4 unwanted features, 20% increase in user satisfaction

### Case Study 3: Persona-Driven Redesign
An e-commerce platform created 4 distinct shopper personas through 25 interviews and a survey of 500 users. The "Bargain Hunter" persona drove a new price-drop alert feature; the "Researcher" persona drove a comparison tool. Conversion rates increased 15% and average session time increased 40%.

Method: 25 interviews + 500-response survey
Key insight: Different segments had fundamentally different shopping behaviors that the one-size-fits-all design failed
Action: Created personalized experiences for each persona segment
Result: 15% conversion increase, 40% session time increase

## Rules
- Never ask leading questions during interviews.
- Record sessions with participant consent.
- Synthesize insights within 48 hours of each session.
- Archetypes must be based on data from at least 3 participants.
- Personas must be grounded in research, not assumptions.
- Findings must differentiate between observation and interpretation.
- Participants must be representative of target users.
- Research plan must be reviewed before recruiting begins.
- Every finding must link to specific evidence (quote, metric, observation).
- Include at least one disconfirming question per interview guide.
- Limit sessions to 60 minutes to prevent participant fatigue.
- Debrief as a team within 2 hours of each session.
- Never report percentages from qualitative data (N<20).
- Screen participants against behavioral criteria, not just demographics.
- Respect participant privacy: anonymize all data in reports.
- Budget 2x session time for synthesis per session conducted.
- Include a pilot session before starting official data collection.
- Always ask "what did we miss?" in the last question of every interview.

## References
  - references/interview-guide.md — User Interview Guide
  - references/research-methods.md — Research Methods
  - references/synthesis-frameworks.md — Synthesis Frameworks
  - references/user-research-advanced.md — User Research Advanced Topics
  - references/user-research-fundamentals.md — User Research Fundamentals
  - references/user-research-methods.md — User Research Methods
  - references/user-research-method-selection.md — User Research Method Selection
  - references/user-research-synthesis-reporting.md — User Research Synthesis and Reporting
## Handoff
For quantitative validation of insights, hand off to `product-analytics`. For running experiments based on findings, hand off to `product-ab-testing`.
