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

### Step 1: Research Planning and Recruitment
Define research questions that guide investigation. Formulate hypotheses: "We believe [segment] has [need] because [evidence]". Choose sampling strategy: purposive for qualitative, stratified for quantitative. Determine sample sizes: 8-12 interviews per persona segment, 100-400 survey responses. Design screening criteria that target behavior patterns, not just demographics. Over-recruit by 20-50% to account for no-shows. Set incentive levels appropriate to participant type ($50-100 for 60-min B2B interview).

### Step 2: Data Collection
Deploy qualitative methods (interviews, contextual inquiry, diary studies) in parallel with quantitative methods (surveys, analytics analysis). Conduct semi-structured interviews using open-ended questions: "Walk me through the last time you [key activity]". Avoid leading questions — ask about behavior, not opinions about features. Capture what users DO, not just what they SAY. Record sessions with consent. Collect behavioral analytics data to validate self-reported behavior.

### Step 3: Data Synthesis and Pattern Identification
Synthesize raw data using affinity mapping — write each finding on separate notes, cluster without predefined categories, label themes. Code interview transcripts systematically (open coding → axial coding → selective coding). Identify behavioral clusters where goals and pain points meaningfully differ. Look for 3-5 distinct persona candidates. Triangulate qualitative themes with quantitative data — behavioral analytics should support what interviews reveal.

### Step 4: Persona Creation
Define primary persona (main target, design decisions serve this user first). Define secondary persona (important but may have conflicting needs). Define anti-persona (explicitly not the target — prevents scope creep). Optionally define negative persona (would harm the product) and supplemental persona (influences purchasing but isn't end user). Use persona template: name, tagline, demographics, goals, behaviors, pain points, context, quote, research sources. Write narrative paragraph describing a day in their life with the product. Validate each attribute against research sources — if you can't cite evidence, remove the attribute.

### Step 5: Empathy Mapping
Create empathy map per persona: Says (quotes from research), Thinks (unspoken beliefs), Does (actions and behaviors), Feels (emotional state). Identify pains (fears, frustrations, obstacles) and gains (desired outcomes, aspirations). Ensure says and thinks are differentiated — the gap between stated and unstated reveals deepest insights. Validate empathy map against research data. Review with stakeholders and update based on feedback.

### Step 6: Persona-to-Feature Mapping
Score each feature by persona fit: 3=essential, 2=helpful, 1=neutral, 0=irrelevant, -1=harmful. Calculate weighted score using persona priority weights (primary ×0.5, secondary ×0.3, anti ×0.0). Prioritize features essential for primary persona. Identify features serving all personas (platform investments) and features serving only anti-persona (consider cutting). Use RICE-Persona hybrid: multiply RICE by persona weight and essentiality score.

### Step 7: User Story Mapping with Personas
Map user stories by persona on a story map. Arrange by persona journey order (backbone → skeleton → body). Label each story with persona tag. Identify gaps where persona needs have no stories. Flag over-investment in low-priority persona features. Ensure each sprint has 60-70% primary persona stories, 20-30% secondary, 0% anti, 10% platform/tech debt. If primary drops below 50%, sprint is off-track.

### Step 8: Validation and Iteration
Test persona hypotheses against behavioral data — do analytics confirm assumed behaviors? Validate with additional user interviews — present persona, ask if it rings true. Conduct survey validation at scale. Track persona fitness score per release = sum of feature scores for primary / total possible score. Target >0.7 for primary. Update personas quarterly (light) and annually (full refresh). Archive personas that no longer predict behavior.

## Decision Trees

### Persona Count Decision
```
How many distinct behavioral clusters emerged from research?
├── 1-2 clusters → Create 2 personas (primary + secondary)
│   └── Also create anti-persona to maintain focus
├── 3-5 clusters → Create 3-5 personas (standard range)
│   ├── 1 primary (highest business value + behavioral fit)
│   ├── 1-2 secondary (important but different needs)
│   ├── 1 anti-persona (explicitly not target)
│   └── Optional: 1 supplemental (buyer/influencer)
└── 6+ clusters → Re-examine: are differences meaningful?
    ├── Yes, truly distinct → Group into 3-5 composite personas
    └── No, minor variations → Merge similar clusters
```

### Research Method Selection
```
What stage is the product in?
├── Pre-product / Discovery
│   └── Use: User interviews + Contextual inquiry + Competitive analysis
├── Early product / MVP validation
│   └── Use: Problem interviews + Solution interviews + Analytics
├── Growth / optimization
│   └── Use: Surveys + Behavioral analytics + Diary studies
└── Established / scaling
    └── Use: All methods + Longitudinal studies + Cohort analysis

What question are you answering?
├── "What are users' goals and motivations?"
│   └── Method: Semi-structured interviews, contextual inquiry
├── "How prevalent is this behavior?"
│   └── Method: Surveys, analytics cohorts
├── "What do users actually do vs say?"
│   └── Method: Behavioral analytics, diary studies, session recordings
├── "How do users organize information?"
│   └── Method: Card sorting, tree testing
├── "What pains are most severe?"
│   └── Method: Interviews + survey validation
└── "Do our personas reflect reality?"
    └── Method: Analytics triangulation, survey validation, A/B testing
```

### Persona Type Classification
```
Is this user segment a target for the product?
├── YES → Are they the primary decision-maker and daily user?
│   ├── YES to both → PRIMARY Persona (optimize everything)
│   └── NO → Are they a secondary user or influencer?
│       ├── Secondary user → SECONDARY Persona (accommodate)
│       └── Influencer/buyer → SUPPLEMENTAL Persona (address in sales)
└── NO → Would serving this segment harm the product?
    ├── YES → NEGATIVE Persona (design safeguards against)
    └── NO → ANTI-Persona (avoid scope creep, politely decline features)
```

### Feature Scoring Decision
```
How does a proposed feature score for primary persona?
├── Essential (3): BUILD — directly enables core goal
├── Helpful (2): BUILD if capacity allows — improves experience
├── Neutral (1): QUESTION — does it serve anyone else?
│   ├── Serves secondary well → Build for secondary after primary needs
│   └── No one cares → DEPRIORITIZE
├── Irrelevant (0): SKIP — waste of effort
└── Harmful (-1): BLOCK — degrades primary experience
    └── Only build if serves secondary at -1 to primary → DO NOT BUILD
```

## Persona Lifecycle Management

### Lifecycle Stages

| Stage | Description | Activities |
|-------|-------------|------------|
| Draft | Initial hypothesis from research | Create from 8-12 interviews, present to team |
| Active | Used daily in product decisions | Reference in design reviews, story mapping, prioritization |
| Mature | Well-validated, team knows them naturally | 50+ interviews, analytics confirmed, quarterly light updates |
| Transitioning | Behavioral shifts detected | New research triggered, preparing for split/merge/retire |
| Split/Merge/Retire | Structural change needed | Full research cycle, update all artifacts, communicate changes |

### Update Cadence

```
Quarterly (light): 2-3 validation interviews, analytics check, support ticket review.
  Update statistics, pain point priorities, behavioral data.

Annually (full): 8-12 new interviews per persona, field validation survey (n=200+).
  Full persona audit: revise attributes, goals, behaviors, needs.
  Present updated personas to entire product team.
  Archive previous version, publish changelog.

Trigger-based: Major market shift, product pivot, new segment discovered,
  persona no longer predicts behavior, competitor shift.
```

### Version Control

```
Persona: Operations Manager "Sarah Chen"
Version History:
  v1.0 (2024-01) — Initial from 8 interviews
  v1.1 (2024-04) — Demographics from survey (n=142), pain point ranking updated
  v2.0 (2025-01) — Major revision: split into Operational Sarah (60%) and Strategic Sarah (40%)
    Rationale: Distinct behavioral patterns couldn't be served by one persona
  v2.1 (2025-07) — Light update: added AI tools to tool ecosystem
```

## Anti-Patterns Catalog

### 1. Stereotype-Based Personas
Creating personas based on assumptions or demographic stereotypes rather than research data. "Millennial Marketer — 25-34, lives on social media." No research basis. Useless for design decisions.
**Fix:** Every persona attribute must trace to research evidence. If you can't cite a source, remove it.

### 2. Too Many Personas
Teams create 8-15 personas that nobody can remember. Symptoms: team can't name them, posters collect dust, reviews don't reference them, documents overlap.
**Fix:** Limit to 3-5. Prioritize into primary/secondary/anti. If you can't fit them on one wall, you have too many.

### 3. Vanity Personas
Personas created to please stakeholders rather than represent users. C-level title but does grunt work. Unlimited budget. No pain points. Perfectly matches CEO's assumptions.
**Fix:** Base on user research, not stakeholder opinion. Include real frustrations. Present evidence for each attribute.

### 4. Outdated Personas
Personas 2+ years without update. Reference obsolete tools. Cite old statistics. Describe workflows that no longer exist.
**Fix:** Annual refresh minimum. "Last updated" on all artifacts. Quarterly analytics check to detect drift.

### 5. Hypothesis Amnesia
Teams treat personas as facts rather than hypotheses. Stop validating after creation. Never question persona accuracy.
**Fix:** Personas are hypotheses — continuously test. Include confidence ratings per attribute. Plan follow-up research for low-confidence attributes.

### 6. One-Time Artifact
Personas created, presented, then forgotten. Posters gather dust. No one references them in decisions. Onboarding doesn't include them.
**Fix:** Display prominently in workspace. Reference by name in every design review. Include in sprint planning and story mapping.

### 7. Generic, Unactionable Personas
Personas filled with generic statements that don't inform design. "Wants good UX." "Values reliability." Doesn't help make decisions.
**Fix:** Every attribute must be specific enough to inform a design decision. "Wants one-click export" not "Wants efficiency."

### 8. Self-Referential Design
Team designs for themselves, not users. "I would use it this way." Assumes their own preferences represent the user's.
**Fix:** Personas are external references. Use empathy maps to check: "Would Sarah do this?" Base on research, not intuition.

### 9. Anti-Persona Neglect
Team knows primary and secondary personas but never documents anti-persona. Feature requests from non-target users get built.
**Fix:** Always define anti-persona explicitly. Use it to decline features. "This serves the anti-persona, not our target."

### 10. All Pain, No Gain
Personas only document frustrations and obstacles. No aspirations, goals, or desired outcomes. Leads to problem-focused design without vision.
**Fix:** Balance pains with gains. Document what success looks like for the persona. Design for desired outcomes, not just pain relief.

### 11. Perfect Customer Persona
Created by sales or marketing — describes the ideal customer who buys easily, never complains, and has unlimited budget. Not useful for product design.
**Fix:** Product personas differ from marketing personas. Include real struggles, limitations, and behaviors — not just buying patterns.

### 12. Data-Free Persona Refresh
Team "updates" personas by tweaking names or photos without conducting new research. New version number but stale data.
**Fix:** Never update version number without new research. If no new data, keep the old version. A stale version with known limitations is better than a "refreshed" version with unknown accuracy.

## Templates

### Persona Card Template
```
Name: {Fictional name consistent with demographics}
Role: {Job title and role description}
Tagline: {One sentence capturing core need}
Type: {Primary / Secondary / Anti / Supplemental}
Version: {x.y} | Last Updated: {date}

Demographics:
  Age Range: {range} | Education: {level}
  Job Title: {title} | Industry: {industry}
  Company Size: {range} | Tech Proficiency: {low/med/high}

Goals:
  Primary: {main thing they want to accomplish}
  Secondary: {related objectives}
  Personal: {career, recognition, ease}

Pain Points:
  - {Frustration} (severity: 1-5, frequency: daily/weekly/monthly)
  - {Frustration} (severity: 1-5, frequency: daily/weekly/monthly)

Behaviors:
  Daily: {key daily actions}
  Weekly: {key weekly routines}
  Discovery: {how they find new solutions}
  Decision: {how they evaluate and decide}

Motivations: {efficiency: X%, accuracy: X%, control: X%, recognition: X%}

Context:
  Tools: [{tool1}, {tool2}]
  Environment: {where/when they use product}
  Constraints: {budget, security, team size}

Quote: "{Verbatim quote from research}"

Research Sources:
  - Interviews: {n} participants
  - Surveys: {n} responses
  - Analytics: {time period}
```

### Empathy Map Template
```
┌─────────────────────────────────────────────────────────────┐
│                      Persona Name                           │
├──────────────────────────┬──────────────────────────────────┤
│        SAYS              │          THINKS                   │
│  (Verbatim quotes)       │  (Unspoken beliefs)               │
│  • "..."                 │  • "..."                          │
│  • "..."                 │  • "..."                          │
│                          │                                  │
├──────────────────────────┼──────────────────────────────────┤
│        DOES              │          FEELS                    │
│  (Observable actions)    │  (Emotional state)                │
│  • ...                   │  • Frustrated (intensity: X)     │
│  • ...                   │  • Anxious (intensity: X)        │
│  • ...                   │  • Confident (intensity: X)      │
├──────────────────────────┴──────────────────────────────────┤
│  PAINS                    │  GAINS                           │
│  • Functional: ...        │  • Desired outcomes: ...        │
│  • Emotional: ...         │  • Aspirations: ...             │
│  • Social: ...            │  • Success measures: ...        │
│  Severity: High/Med/Low   │  Importance: High/Med/Low       │
└───────────────────────────┴──────────────────────────────────┘
```

### Persona-to-Feature Matrix Template
```
| Feature | Primary ({name}) | Secondary ({name}) | Anti ({name}) | Weighted Score |
|---------|-----------------|-------------------|---------------|----------------|
| {feature} | {3/2/1/0/-1}  | {3/2/1/0/-1}     | {3/2/1/0/-1} | {calc}        |
| {feature} | {3/2/1/0/-1}  | {3/2/1/0/-1}     | {3/2/1/0/-1} | {calc}        |

Weights: Primary ×0.5, Secondary ×0.3, Anti ×0.0
Score = Primary × 0.5 + Secondary × 0.3 + Anti × 0.0
Thresholds: >2.0 = Build, 1.0-2.0 = Consider, <1.0 = Deprioritize
```

### Persona Validation Plan Template
```
Persona: {Name} | Version: {x.y}
Last Validated: {date} | Next Due: {date}

Hypotheses to Validate:
1. "{hypothesis}" — Confidence: {low/med/high}
   Evidence needed: {what would confirm or disprove}
   Method: {analytics / survey / interviews}
   Threshold: {success criteria}
   Status: {not started / in progress / validated / disproven}

2. "{hypothesis}" — Confidence: {low/med/high}
   ...

Low-Confidence Attributes (need further research):
- {attribute}: {reason for low confidence}

Validation Schedule:
- {date}: Analytics check ({metrics})
- {date}: Survey validation (n={target})
- {date}: Interview round ({n} participants)
```

## Success Metrics

### Persona Quality Metrics
```
Research rigor: Number of interviews per persona (target: 8-12)
  Survey validation sample size (target: 100-400 per segment)
  Data sources triangulated (target: 3+ sources)
  Confidence rating per attribute (target: >80% high confidence)

Team adoption: How often personas referenced in design reviews
  Discovery: Are stories tagged with personas?
  Sprint persona balance: % primary persona stories per sprint
  Feature rejection rate: How often anti-persona filters feature requests

Business impact: Persona-driven feature adoption vs generic
  Persona-specific onboarding activation improvement
  Task completion rate for persona-optimized flows
  NPS/CSAT improvement after persona-driven changes
```

### Persona Health Dashboard
```
Metric                    | Target | Current | Trend
Interview depth           | 8-12   | 10      | Steady
Survey validation         | 200+   | 142     | Needs refresh
Last updated              | <6 mo  | 3 mo    | Good
Team reference rate       | >80%   | 65%     | Improving
Primary persona fitness   | >0.7   | 0.72    | Good
Anti-persona feature reject| >5/mo | 3/mo    | Needs improvement
```

## Integration Patterns

### With User Research (product-user-research)
Handoff point: raw interview data, transcripts, recordings
Direction: Research → Persona Development
Persona development consumes research data; identifies gaps for new research.

### With Customer Journey Mapping (product-customer-journey)
Handoff point: completed personas with empathy maps
Direction: Persona Development → Customer Journey
Journey maps use personas as the lens; persona context informs journey stages.

### With Feature Prioritization (product-feature-prioritization)
Handoff point: persona-to-feature matrix with weighted scores
Direction: Persona Development → Feature Prioritization
Feature prioritization uses persona fit scores as input dimension.

### With A/B Testing (product-ab-testing)
Handoff point: persona-specific hypotheses for testing
Direction: Bidirectional
Personas generate hypotheses; A/B testing validates persona-driven designs.

### With User Story Mapping (planning-create-story)
Handoff point: persona-tagged user stories
Direction: Persona Development → Story Creation
Stories reference persona by name; acceptance criteria include persona validation.

## Persona-Driven Decision Framework

### Design Review Checklist
```
For each design decision, answer:
1. Which persona does this primarily serve? _________
2. Does it help or harm other personas? _________
3. Would the primary persona understand this within 5 seconds? Y/N
4. Does this reduce cognitive load for the primary persona? Y/N
5. Is this solving a real pain point from research? Y/N
6. Would the anti-persona benefit from this? (If yes, reconsider) Y/N
7. What behavioral evidence supports this decision? _________
```

### Feature Request Triage
```
Incoming feature request → apply persona filter:

Step 1: Which persona does this serve?
  Primary → Fast-track evaluation
  Secondary → Queue for capacity-based evaluation
  Anti → Decline with explanation referencing anti-persona definition
  Unknown → Ask: "What persona would use this? What research supports it?"

Step 2: Score feature against persona matrix (3=essential to -1=harmful)
  Calculate weighted score with persona weights

Step 3: Decision
  Score >2.0 → Add to roadmap
  Score 1.0-2.0 → Consider for future, tag as candidate
  Score <1.0 → Deprioritize or decline

Step 4: For accepted features
  Tag with persona and primary goal served
  Add to story map in persona journey order
  Include persona validation in acceptance criteria
```

### Conflict Resolution Between Personas
```
When primary and secondary personas have conflicting needs:

1. Identify the specific conflict: "{primary} needs X, {secondary} needs Y"
2. Score each option by persona priority
3. Evaluate alternatives:
   Option A: Optimize for primary → primary +3, secondary -1 → net +2.0
   Option B: Optimize for secondary → primary -1, secondary +3 → net +0.4
   Option C: Tiered approach → primary +2, secondary +2 → net +1.6
4. Select highest net score option
5. Validate with usability testing for both personas
6. If net scores are close, run a test to confirm assumptions
```

## Persona Communication and Adoption

### Team Integration
```
Onboarding new team members:
  Week 1: Read persona docs, watch persona video, review empathy/journey maps
  Week 2: Listen to 2 recorded research interviews, attend persona walkthrough
  Week 3: Participate in design critique using persona lens, write persona-tagged stories

Workspace:
  Display persona posters in team area with name, photo, key attributes
  Include persona cards in meeting rooms
  Create Slack/Teams bot that responds to "Would [persona name] use this?"

Rituals:
  Weekly standup: "Which persona are we helping today?"
  Sprint review: Reference persona impact, not just feature completion
  Design critique: Start with persona reminder before reviewing designs
  Quarterly: Persona health check as part of broader product review
```

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
  - references/persona-workshop-facilitation.md — Persona Workshop Facilitation
## Handoff
For journey mapping with persona context, hand off to `product-customer-journey`. For user research to validate personas, hand off to `product-user-research`. For feature prioritization using persona scores, hand off to `product-feature-prioritization`.
