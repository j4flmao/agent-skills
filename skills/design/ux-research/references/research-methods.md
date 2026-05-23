# Research Methods Reference

## Generative vs Evaluative

| Dimension | Generative | Evaluative |
|-----------|------------|------------|
| Question | "What should we build?" | "Does it work?" |
| When | Discovery, early alpha | Beta, live |
| Methods | Interviews, diary studies, field observation | Usability testing, surveys, A/B testing |
| Output | Problem definition, opportunity areas | Usability scores, satisfaction metrics |
| Participants | 5-8 per segment | 5 per segment (qual), 50+ (quant) |

## Method Selection Matrix

| Need | Method | Participants | Timeline | Tooling |
|------|--------|-------------|----------|---------|
| Understand user behavior | Diary study | 8-12 | 2-3 weeks | Dscout, Indeemo |
| Validate problem | Interviews | 5-8 | 1-2 weeks | Zoom, Lookback |
| Test information architecture | Card sort | 20-50 | 1 week | Optimal Workshop |
| Test navigation | Tree test | 20-50 | 1 week | Treejack |
| Test usability (moderated) | Moderated test | 5-8 | 1-2 weeks | Lookback, UserTesting |
| Test usability (unmoderated) | Unmoderated test | 20-50 | 3-5 days | Maze, UserZoom |
| Measure satisfaction | Survey | 50-500 | 1 week | SurveyMonkey, Typeform |
| Validate visual design | Preference test | 50+ | 3-5 days | UsabilityHub |

## User Interviews — Protocol Structure

### Section 1: Introduction (5 min)
- Thank participant, explain format, get consent
- "There are no wrong answers — your honest experience is what we need"
- Confirm recording permission

### Section 2: Warm-up (5 min)
- "Tell me a bit about your role and what you do day-to-day"
- "What tools do you currently use for [task area]?"
- Build rapport before diving into sensitive topics

### Section 3: Main Exploration (20-25 min)
Use behavioral questions — not hypothetical:

| Good Question | Bad Question |
|---------------|--------------|
| "Tell me about the last time you [task]" | "Would you use this feature?" |
| "What was frustrating about that?" | "Do you think it's good?" |
| "Walk me through how you [subtask]" | "How would you improve this?" |
| "What happened next?" | "Is this what you expected?" |

### Section 4: Concept Response (10 min) — if applicable
- Show prototype, mockup, or concept
- "What's your initial reaction?"
- "What questions come to mind?"
- Avoid: "Do you like it?" — leads to social desirability bias

### Section 5: Debrief (5 min)
- "Is there anything we should have asked?"
- "Any final thoughts?"
- Thank and confirm incentive delivery

## Moderated Usability Testing

### Task Design
Scenarios should be realistic and goal-oriented:
- "You received an email about a late order. Find that order and check its status."
- Avoid: "Click on the Orders tab" (too specific, tests instruction-following not usability)

### Metrics per Task
| Metric | Definition | Target |
|--------|------------|--------|
| Task completion | Did user succeed? | ≥ 80% |
| Time-on-task | How long to complete? | Varies by task |
| Error rate | How many mistakes? | ≤ 2 per task |
| SEQ (Single Ease Question) | "How difficult?" (1-7) | ≥ 5.5 |
| CES (Customer Effort Score) | "How much effort?" (1-5) | ≤ 2 |

### Test Session Flow
1. Introduction + consent (5 min)
2. Pre-test interview (5 min)
3. Tasks (20-30 min) — think-aloud protocol
4. Post-test SUS survey (5 min)
5. Debrief (5 min)

## Unmoderated Testing

Tools: UserTesting, Maze, UserZoom, Lookback.

### Best Practices
- Write unambiguous task instructions — no facilitator to clarify
- Include a screener task confirming understanding
- Keep sessions under 20 minutes to prevent drop-off
- Use screener surveys to recruit qualified participants
- Include at least one calibration question (known answer) to detect bots

## Surveys

### Best For
- Satisfaction measurement (CSAT, NPS, SUS)
- Feature prioritization
- Demographic validation
- Quantitative validation of qualitative findings

### Survey Design Rules

| Element | Guideline |
|---------|-----------|
| Length | ≤ 10 minutes, ≤ 20 questions |
| Likert scale | 5 or 7 points (odd = neutral option) |
| Open-ended | Optional, max 3 per survey |
| Pilot | 5 internal tests before launch |
| Incentive | Gift card draw or fixed amount |

### SUS (System Usability Scale)
10 questions, 5-point Likert. Score range: 0-100.
- Above 68 = above average
- Above 80 = excellent
- Below 50 = unacceptable

### NPS (Net Promoter Score)
"Would you recommend to a friend?" (0-10)
- 9-10 = Promoters
- 7-8 = Passives
- 0-6 = Detractors
- Score = %Promoters - %Detractors

### CSAT (Customer Satisfaction)
"How satisfied are you with [feature]?" (1-5)
- 4-5 = Satisfied
- Target: ≥ 80% satisfied
