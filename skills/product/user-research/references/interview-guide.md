# User Interview Guide

## Interview Types

| Type | Purpose | Duration | Participants | Output |
|------|---------|----------|--------------|--------|
| Discovery | Understand user needs and pain points | 30-60 min | 5-8 per segment | Problem statements |
| Usability | Test prototype or existing product | 20-45 min | 5 per round | Usability issues |
| Concept test | Validate idea before building | 30-45 min | 5-10 per concept | Go/no-go decision |
| Contextual inquiry | Observe user in their environment | 60-90 min | 3-5 per role | Workflow maps |
| Exit interview | Understand why users leave | 15-30 min | 10-20 | Churn reasons |

## Interview Preparation

### Recruiting Screener
```yaml
screener:
  criteria:
    - "Uses competitor product at least weekly"
    - "Involved in purchase decisions"
    - "Has not participated in research in last 3 months"
  quotas:
    - "3 small companies (<50 employees)"
    - "3 mid-size (50-500)"
    - "2 enterprise (500+)"
  incentives:
    - "30 min: $50 gift card"
    - "60 min: $100 gift card"
    - "Enterprise: $200+"
```

### Discussion Guide Structure
```
1. Introduction (5 min)
   - Thank participant, explain purpose
   - Get consent to record
   - Set expectations (no right/wrong answers)

2. Background & Context (10 min)
   - Tell me about your role and responsibilities
   - Walk me through a typical day
   - What tools do you use and why?

3. Problem Exploration (15 min)
   - Tell me about the last time you [specific task]
   - What was frustrating about the process?
   - What would an ideal solution look like?

4. Concept Testing (15 min) — if applicable
   - Show prototype/concept
   - What do you think this does?
   - How would this fit into your workflow?

5. Closing (5 min)
   - Is there anything else we should know?
   - What was most important to you today?
   - Thank you, next steps
```

## Active Interviewing Techniques

### Probing Questions
```
"Tell me more about that..."
"What happened next?"
"How did that make you feel?"
"Why did you choose that approach?"
"What would you have done if X wasn't available?"
"Can you give me a specific example?"
```

### Avoiding Leading Questions
```
Bad: "Wouldn't it be great if we added X?"
Good: "How would you handle [situation] today?"

Bad: "Do you find the current tool frustrating?"
Good: "Tell me about your experience with [tool]."

Bad: "Would this feature save you time?"
Good: "Walk me through how you would use this feature."
```

## Note-Taking Template

```markdown
## Interview Notes
**Participant:** P-001
**Role:** Product Manager
**Company:** Mid-size SaaS (200 employees)
**Date:** 2026-03-15

### Key Quotes
> "I spend 3 hours every Monday manually compiling reports."

> "If the data was automatically available, I could focus on analysis instead of data prep."

### Observations
- Anxious when discussing current manual processes
- Lit up when shown the automated dashboard concept
- Struggled to complete the task in prototype (button placement)

### Themes
1. **Manual data work is painful** — mentioned by all participants
2. **Time is the biggest cost** — not money, but hours spent
3. **Automation is the key desire** — "set and forget"

### Action Items
- [ ] Investigate button placement issue (3 participants struggled)
- [ ] Consider "automated reports" as primary value prop
- [ ] Follow up with P-001 for beta program
```

## Synthesis

### Affinity Mapping Process
```
1. Extract all observations as individual notes
2. Group by theme (silent grouping)
3. Label each group with a theme name
4. Identify patterns across groups
5. Prioritize by frequency and severity
6. Write findings and recommendations
```

### Common Themes Table
| Theme | Frequency | Severity | Evidence |
|-------|-----------|----------|----------|
| Manual reporting is painful | 8/8 | High | "3 hours every Monday" |
| Need better collaboration | 5/8 | Medium | "Can't share with team" |
| Mobile experience lacking | 4/8 | Low-Medium | "Don't use on phone" |

## Research Report Template

```markdown
## Research: Reporting Pain Points
**Method:** 60-min interviews with 8 product managers
**Date:** March 2026

### Key Findings
1. Manual report generation takes 3+ hours/week (all participants)
2. Current tools require technical skills to customize (6/8)
3. Automation is the #1 desired feature (7/8)

### Recommendations
1. Build automated report scheduler (high impact, medium effort)
2. Improve template customization (medium impact, low effort)
3. Add team sharing to reports (medium impact, medium effort)

### Supporting Evidence
Quotes, affinity map, video timestamps
```
