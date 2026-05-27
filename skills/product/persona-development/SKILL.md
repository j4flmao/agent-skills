---
name: product-persona-development
description: >
  Use this skill when developing user personas: persona creation, empathy mapping, persona-driven feature prioritization.
  This skill enforces: data-driven persona creation, empathy mapping methodology, persona-to-feature connection, user story mapping.
  Do NOT use for: user research interviews, quantitative segmentation, market sizing, customer journey mapping.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [product, persona, phase-8]
---

# Persona Development Agent

## Purpose
Creates data-driven user personas with empathy maps and connects them to feature decisions, enabling user-centered product design and prioritization.

## Agent Protocol

### Trigger
Exact user phrases: persona, user persona, persona development, empathy map, persona creation, user archetype, target user, user profile, persona-based design.

### Input Context
- What user segments or target audiences exist?
- What research data is available (interviews, surveys, analytics)?
- What product or feature area are personas being created for?
- What decisions will personas inform (design, prioritization, marketing)?
- What is the expected number of personas?

### Output Artifact
Persona set with empathy maps, persona profiles, and feature mapping with prioritization based on persona fit.

### Response Format
```
## Persona Development
### Personas Created
1. {name}: {role} | {key goal} | {primary pain point}
2. {name}: {role} | {key goal} | {primary pain point}

### Feature-to-Persona Mapping
| Feature | Primary Persona | Fit Score | Priority |
|---------|----------------|-----------|----------|
| {feature} | {persona} | {score} | P0-P3 |

### Design Recommendations
{persona-driven design guidance}
```
No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Research data analyzed for persona patterns
- [ ] Primary persona defined with demographics, goals, behaviors, pain points
- [ ] Secondary persona defined with distinct characteristics
- [ ] Anti-persona identified (explicitly not target)
- [ ] Empathy map created for each persona
- [ ] Persona-to-feature mapping completed
- [ ] Feature scoring by persona fit calculated
- [ ] Design recommendations documented per persona
- [ ] Persona validation plan created

### Max Response Length
7000 tokens

## Workflow

### Step 1: Data Collection and Analysis
Gather all available user data: research interviews, surveys, analytics, support tickets, sales notes. Identify patterns across demographics, behaviors, goals, and pain points. Look for clusters of users with similar characteristics. Triangulate findings from multiple data sources. Aim for 3-5 distinct persona clusters based on meaningful behavioral differences.

### Step 2: Persona Creation
Define primary persona (main target, design decisions serve this user first). Define secondary persona (important but may have conflicting needs). Define anti-persona (explicitly not the target — prevents scope creep). Use persona template: name, tagline, demographics, goals, behaviors, pain points, context, quote. Write narrative paragraph describing a day in their life with the product.

### Step 3: Empathy Mapping
Create empathy map per persona: Says (quotes from research), Thinks (unspoken beliefs), Does (actions and behaviors), Feels (emotional state). Identify pains (fears, frustrations, obstacles) and gains (desired outcomes, aspirations). Validate empathy map against research data. Review with stakeholders and update based on feedback.

### Step 4: Persona-to-Feature Mapping
Score each feature by persona fit: how well does it serve each persona's goals and alleviate their pain points? Prioritize features that serve primary persona best. Identify features that serve all personas (platform investments) and features serving only anti-persona (consider cutting). Use scoring: 3=essential, 2=helpful, 1=neutral, 0=irrelevant, -1=harmful.

### Step 5: User Story Mapping with Personas
Map user stories by persona on a story map. Arrange by persona journey order. Identify gaps where persona needs have no stories. Flag over-investment in low-priority persona features. Ensure each sprint has stories serving the primary persona.

## Research Methods for Persona Development

### Qualitative Research Methods

```yaml
qualitative_methods:
  user_interviews:
    format: "Semi-structured 1:1 interviews, 45-60 minutes each"
    sample_size: "8-12 participants per persona segment for saturation"
    recruitment: "Screen for target behavior, not demographics — find users who actually do the thing"
    questions:
      - "Walk me through the last time you [key activity]"
      - "What's the hardest part about [activity]?"
      - "How do you currently solve [problem]?"
      - "What would your ideal solution look like?"
    outputs: ["Interview transcripts", "Key quotes", "Behavior patterns", "Pain point themes"]
    
  contextual_inquiry:
    format: "Observe users in their natural environment while they work"
    duration: "1-2 hours per session"
    technique: "Master-apprentice model — user does the task, researcher observes and asks questions"
    best_for: "Complex workflows where users can't articulate what they do"
    outputs: ["Task flow diagrams", "Environment photos", "Workflow artifacts"]
    
  diary_study:
    format: "Users log activities, thoughts, and frustrations over 5-14 days"
    sample_size: "10-20 participants"
    prompts:
      - "What did you do today related to [activity]?"
      - "What frustrated you?"
      - "What workaround did you use?"
      - "How did you feel when [event] happened?"
    outputs: ["Longitudinal behavior data", "Emotion patterns over time", "Frequency data"]
```

### Quantitative Research Methods

```yaml
quantitative_methods:
  surveys:
    format: "Structured questionnaire, Likert scales, multiple choice"
    sample_size: "100+ responses minimum, 400+ for statistical significance"
    question_types:
      - "Behavioral: How often do you [activity]?"
      - "Attitudinal: How satisfied are you with [feature]?"
      - "Segmentation: Which best describes your role?"
    outputs: ["Statistical segments", "Correlation analysis", "Feature preference rankings"]
    
  analytics_analysis:
    sources: ["Product analytics (Mixpanel, Amplitude)", "Web analytics (Google Analytics)", "CRM data"]
    patterns_to_look_for:
      - "User behavior clusters — groups that navigate similarly"
      - "Feature adoption rates — power users vs casual users"
      - "Drop-off points — where do users struggle or abandon"
      - "Session frequency and duration — engagement segments"
    outputs: ["Behavioral segments", "Feature usage patterns", "User journey hotspots"]
    
  behavioral_segmentation:
    technique: "RFM analysis (Recency, Frequency, Monetary) or k-means clustering"
    input: "Usage data, transaction history, support ticket volume"
    outputs: ["Segments: power users, casual, at-risk, dormant", "Segment profiles with key metrics"]
```

### Synthesis and Validation

```yaml
persona_synthesis:
  pattern_recognition:
    technique: "Affinity mapping — group research findings into themes"
    process:
      - "Write each finding on separate sticky note"
      - "Group related findings without predefined categories"
      - "Label clusters with descriptive themes"
      - "Identify behavioral patterns across participants"
      
  persona_drafting:
    structure:
      - "Name and tagline — memorable and descriptive"
      - "Demographics — age, role, industry, tech comfort"
      - "Goals — what they want to achieve (not what features they want)"
      - "Behaviors — how they currently work"
      - "Pain points — what frustrates them"
      - "Workarounds — how they compensate for current limitations"
      - "Quote — real quote from research that captures their essence"
      
  validation:
    methods:
      - "Stakeholder review — present to product team, collect feedback"
      - "Survey validation — test persona descriptions against larger sample"
      - "Analytics triangulation — verify persona behaviors match analytics data"
      - "A/B test — design different experiences for different personas, measure engagement"
    iteration: "Personas are living artifacts — update as product and market evolve"
```

## Rules
- Personas must be based on research data, not stereotypes or assumptions.
- Each persona must be grounded in data from at least 3 research participants.
- Empathy maps must differentiate between says and thinks (stated vs unstated).
- Anti-persona must be explicitly documented to prevent scope creep.
- Feature scoring must prioritize primary persona needs.
- Persona count should be 3-5 — more than 5 dilutes focus.
- Personas must be validated with stakeholders and updated as product evolves.
- Every design decision should reference which persona it serves.
- Use at least 2 research methods (1 qualitative + 1 quantitative) for persona development.
- Validate personas against quantitative data — don't rely solely on interview insights.

## References
  - references/empathy-mapping.md — Empathy Mapping
  - references/persona-creation-guide.md — Persona Creation Guide
  - references/persona-creation.md — Persona Creation
  - references/persona-development-advanced.md — Persona Development Advanced Topics
  - references/persona-development-fundamentals.md — Persona Development Fundamentals
  - references/persona-to-feature.md — Persona-Driven Design
## Handoff
For journey mapping with persona context, hand off to `product-customer-journey`. For user research to validate personas, hand off to `product-user-research`. For feature prioritization using persona scores, hand off to `product-feature-prioritization`.
