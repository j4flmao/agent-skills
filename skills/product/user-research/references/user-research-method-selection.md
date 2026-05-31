# User Research Method Selection

## Method Selection Framework

Choosing the right research method depends on four factors: the product stage, the research question type, the data needed, and the constraints (time, budget, participants).

### Decision Tree

```
What product stage are you in?
├── Discovery (unknown problem)
│   └── What do you need to understand?
│       ├── User behavior and context → Field study, diary study
│       ├── User needs and pain points → Generative interviews
│       └── How users categorize content → Open card sorting
├── Alpha (exploring solution)
│   └── What do you need to validate?
│       ├── Does the concept resonate? → Concept testing
│       ├── Does the IA make sense? → Closed card sorting, tree testing
│       └── What features matter most? → Conjoint analysis, survey
├── Beta (testing solution)
│   └── What do you need to evaluate?
│       ├── Can users complete tasks? → Moderated usability testing
│       ├── How does it compare to baseline? → A/B test, unmoderated testing
│       └── What do users think? → Survey (SUS, NPS, CSAT)
└── Live (optimizing)
    └── What do you need to optimize?
        ├── Why are users churning? → Exit interviews, analytics
        ├── How satisfied are users? → Survey, user feedback analysis
        └── What would users want next? → Feature prioritization survey
```

### Method Comparison Matrix

| Method | Type | Question Type | Data Type | Participants | Timeline | Cost |
|--------|------|--------------|-----------|-------------|----------|------|
| Field study | Generative | What do users do in context? | Qualitative | 5-10 | 2-4 weeks | High |
| Diary study | Generative | How do users behave over time? | Qualitative | 8-12 | 2-4 weeks | High |
| Generative interview | Generative | What are user needs? | Qualitative | 5-8/segment | 1-2 weeks | Medium |
| Contextual inquiry | Generative | How does work flow? | Qualitative | 5-8 | 2-3 weeks | High |
| Card sorting (open) | Generative | How do users categorize? | Mixed | 20-50 | 1 week | Low |
| Co-creation workshop | Generative | What solutions could work? | Qualitative | 5-10 | 1-2 weeks | Medium |
| Concept testing | Evaluative | Does the concept resonate? | Mixed | 5-8 | 1-2 weeks | Medium |
| Moderated usability | Evaluative | Can users complete tasks? | Mixed | 5-8 | 1-2 weeks | Medium |
| Unmoderated usability | Evaluative | What are task metrics? | Quantitative | 20-50 | 3-5 days | Low |
| Tree testing | Evaluative | Can users find content? | Quantitative | 20-50 | 1 week | Low |
| A/B testing | Evaluative | Which variant performs better? | Quantitative | High volume | 2-4 weeks | Medium |
| Survey | Both | What do users think/feel? | Quantitative | 50-500 | 1 week | Low |
| Analytics review | Evaluative | What are users actually doing? | Quantitative | All users | 1 week | Low |
| Feedback analysis | Both | What are users saying? | Qualitative | Variable | 1 week | Low |
| Exit interview | Evaluative | Why did users leave? | Qualitative | 10-20 | 2-3 weeks | Medium |
| Benchmark study | Evaluative | How does product compare over time? | Mixed | 20+ | 2-3 weeks | High |

### Sample Size Guidelines by Method

| Method | Minimum | Recommended | Maximum | Rationale |
|--------|---------|-------------|---------|-----------|
| Generative interviews | 5 | 8 | 15 | Saturation typically at 6-8 |
| Diary study | 8 | 12 | 20 | Attrition expected (20-30%) |
| Field study | 5 | 8 | 15 | Deep but time-intensive |
| Card sorting | 20 | 30 | 50 | Statistical cluster validity |
| Tree testing | 20 | 30 | 50 | Confidence interval narrows at 30 |
| Moderated usability | 5 | 8 | 15 | ~85% issues at 5, diminishing returns |
| Unmoderated usability | 20 | 30 | 50 | Statistical power for metrics |
| Survey | 50 | 100 | 500 | Confidence interval depends on population |
| A/B test | Varies | Minimum detectable effect | N/A | Calculator: effect size, power, significance |
| Concept testing | 5 | 10 | 20 | Qualitative saturation |
| Co-creation workshop | 5 | 8 | 12 | Group dynamic affected by size |
| Benchmark study | 20 | 30 | 50 | Statistical comparison between rounds |
| Exit interview | 10 | 15 | 30 | Saturation depends on churn reason diversity |
| Feedback analysis | 50 | 100 | 1000+ | Depends on volume of available data |

### Method Selection by Constraint

When time is tight (1 week or less):
- Day 1-2: Unmoderated usability testing (20 participants, 3-5 days turnaround)
- Day 1-3: Survey (deploy, collect responses for 2-3 days)
- Day 1: Guerrilla testing (intercept 5 users in the wild)
- Day 1-5: Analytics deep dive (quantitative only)

When budget is tight (under $5K total):
- Unmoderated testing (no incentives needed, platform fee ~$500)
- Survey (free tools, incentives via gift card draw)
- Existing user intercept (no recruitment cost)
- Guerrilla testing (coffee shop, no incentives)

When you need deep understanding (high-risk decision):
- Generative interviews (8-12 per segment)
- Diary studies (longitudinal behavior)
- Moderated usability testing (rich qualitative + metrics)
- Field studies (real context observation)

### Combining Methods

Strong findings come from triangulation — using multiple methods to answer the same question from different angles.

Common method combinations:

| Combination | Purpose | Example |
|-------------|---------|---------|
| Survey + interviews | Quantify + understand | Survey finds 40% dissatisfied; interviews explain why |
| Analytics + usability | What + why | Analytics shows drop-off at step 3; usability reveals confusion |
| Card sorting + tree testing | Build + validate IA | Open card sort to understand mental model; tree test to validate |
| Diary study + interview | Longitudinal + deep dive | Diary captures daily behavior; interview explores key moments |
| Concept test + A/B test | Validate + optimize | Concept test validates direction; A/B test optimizes execution |
| Benchmark + survey | Trend + satisfaction | Task metrics improve but satisfaction drops — investigate disconnect |

## Generative Methods

### User Interviews

Best for: Understanding user needs, behaviors, motivations, and pain points in depth.

Strengths:
- Rich qualitative data with context
- Flexible: follow unexpected threads
- Builds empathy within the product team
- Identifies problems users didn't articulate

Limitations:
- Small sample size limits generalizability
- Self-reported behavior may not match actual behavior
- Requires skilled interviewer to avoid bias
- Time-intensive (analysis takes 2-3x session time)

Variations:

| Type | Description | Best For |
|------|-------------|----------|
| Structured | Fixed question order, all participants get same questions | Multiple interviewers, comparison across segments |
| Semi-structured | Question guide with flexibility to probe | Most common; balance of consistency and depth |
| Unstructured | Conversational, minimal guide | Early discovery, expert interviews |
| Contextual | Interview in user's environment | Understanding real context of use |
| Remote | Video call interviews | Geographic diversity, lower cost |
| In-person | Face-to-face interviews | Richer rapport, observation of environment |

### Diary Studies

Best for: Understanding behaviors, contexts, and emotions over time.

Strengths:
- Captures longitudinal behavior patterns
- Reduces recall bias (captured in the moment)
- Reveals context, frequency, and triggers
- Shows variation over time (weekdays vs weekends)

Limitations:
- High participant burden (dropout rates 20-40%)
- Requires motivated and articulate participants
- Analysis is time-intensive
- Less depth on any single event

Design considerations:
- Duration: 5-14 days typical
- Entry frequency: 1-3 per day (based on event frequency)
- Prompts: Mix of structured (ratings, checklist) and open-ended
- Tools: Dscout, Indeemo, dedicated app, or simple journal
- Incentives: Higher than interviews ($100-200 total)
- Check-in: Mid-point check to maintain engagement

### Field Studies / Ethnographic Research

Best for: Understanding user behavior in natural context.

Strengths:
- See what users actually do, not what they say
- Capture environmental factors affecting behavior
- Identify workarounds and adaptations
- Reveal unarticulated needs

Limitations:
- Very time-intensive (travel, observation, analysis)
- Expensive (travel costs, researcher time)
- Small sample sizes
- Observer effect (behavior changes when watched)

### Card Sorting

Best for: Understanding how users categorize information.

Types:

| Type | Process | Best For |
|------|---------|----------|
| Open | Users create own categories and labels | New IA, understanding mental models |
| Closed | Users sort into predefined categories | Validating proposed IA |
| Hybrid | Users sort into predefined categories but can suggest new ones | Iterative IA refinement |
| Reverse | Users assign items to categories to test clarity | Validating category definitions |

Analysis methods:
- Similarity matrix: % of participants who grouped each pair together
- Dendrogram: hierarchical clustering visualization
- Category agreement: % of participants who placed item in each category
- Label analysis: most common labels suggested by participants

### Contextual Inquiry

Best for: Understanding complex workflows and processes.

Master-apprentice model: Researcher learns from the user by observing and asking questions while the user works.

Four principles:
1. Context: Go to the user's workplace and observe
2. Partnership: User is the expert, researcher is the apprentice
3. Interpretation: Share interpretations during observation for validation
4. Focus: Maintain focus on the study's topic area

## Evaluative Methods

### Moderated Usability Testing

Best for: In-depth understanding of usability issues.

Strengths:
- Rich qualitative data + task metrics
- Moderator can probe and clarify
- Catches unexpected issues
- Can test both prototypes and live products

Limitations:
- Expensive per participant
- Small sample size
- Moderator bias risk
- Scheduling complexity

Session structure:
1. Introduction and consent (5 min)
2. Pre-test interview (5 min)
3. Tasks with think-aloud (25-30 min)
4. Post-test survey and debrief (10 min)
5. Total session: 45-60 min

Metrics tracked:
- Task completion (pass/fail)
- Time on task
- Error rate (number and type)
- SEQ (Single Ease Question) after each task
- SUS (System Usability Scale) after all tasks
- Net Promoter Score (optional)

### Unmoderated Usability Testing

Best for: Quantitative task metrics at scale.

Strengths:
- Large sample sizes (20-50+)
- Lower cost per participant
- Fast turnaround (results in 3-5 days)
- Geographic diversity

Limitations:
- No probing or clarification
- Less rich qualitative data
- Technical issues with platform
- Participant attention/quality concerns
- Requires very clear task instructions

Best practices:
- Pilot test tasks with 3 internal users first
- Keep sessions under 20 minutes to prevent drop-off
- Include a screener task to confirm understanding
- Add attention-check questions
- Use calibration questions to detect bot/fraud participants
- Write unambiguous task instructions (no facilitator to clarify)

### Survey

Best for: Measuring satisfaction, collecting quantitative data at scale.

Survey design principles:

| Element | Guideline |
|---------|-----------|
| Length | Max 20 questions or 10 minutes |
| Question types | Mix of Likert, multiple choice, rating, open-ended (max 3 open) |
| Likert scale | 5 or 7 points (odd number = neutral option) |
| Pilot test | 5 internal tests before launch |
| Response rate target | 10-30% (internal), 5-10% (external) |
| Incentive | $5-10 gift card draw or $25-50 fixed |

Common UX surveys:

| Survey | Questions | Purpose | Score Range |
|--------|-----------|---------|-------------|
| SUS | 10 | Overall usability | 0-100 |
| NPS | 1 (+follow-up) | Loyalty and referral | -100 to +100 |
| CSAT | 1-3 | Satisfaction with specific interaction | 1-5 or 0-100% |
| UMUX-LITE | 2 | Quick usability measure | 0-100 |
| SUPR-Q | 13 | Website quality | 0-100 |
| AttrakDiff | 28 | Pragmatic and hedonic quality | Semantic differential |

### A/B Testing

Best for: Comparing two variants to determine which performs better on a specific metric.

Requirements:
- Sufficient traffic (use power calculator)
- Clear success metric defined before launch
- Minimum 2 weeks runtime (to capture weekly cycles)
- Only one variable changed between variants
- Random assignment of users to variants

Common mistakes:
- Stopping test early when result looks significant
- Multiple comparisons without correction
- Not accounting for novelty effect
- Insufficient sample size
- Testing too many variants simultaneously

### Analytics Review

Best for: Understanding actual user behavior at scale.

Types of analysis:

| Analysis Type | Question Answered | Example |
|--------------|-------------------|---------|
| Funnel analysis | Where do users drop off? | Signup → Onboarding → Activation |
| Cohort analysis | How does behavior change over time? | D1/D7/D30 retention by acquisition channel |
| Segmentation | How do different users behave? | Power users vs casual users |
| Event tracking | What actions are users taking? | Feature usage frequency |
| Path analysis | What routes do users take? | Navigation patterns |
| Session replay | What are users seeing and doing? | Mouse movement, scrolling |

### Tree Testing

Best for: Validating navigation and information architecture.

Process:
1. Build text-only tree from proposed navigation
2. Write realistic findability tasks
3. Recruit 20-50 participants
4. Participants navigate tree to find each item
5. Measure success rate, directness, time

Metrics:
- Findability rate: % of participants who found the correct location
- Directness: % who took the optimal path (no backtracking)
- Time: How long to find each item
- First click distribution: Where do participants click first?

## Method Selection Templates

### Rapid Research Brief Template
```
Research Goal: {single sentence on what we need to learn}
Decision: {what specific decision will this research inform}

Constraint Check:
- Timeline: {days/weeks} — Fast / Medium / Long
- Budget: ${amount} — Low / Medium / High
- Participants: {access to} — Easy / Medium / Hard
- Risk tolerance: {Low / Medium / High} — how wrong can we afford to be?

Recommended Method: {method}
Rationale: {why this method fits the constraints and goal}
Alternative: {fallback if constraints change}

Participants: {N} from {segment}
Incentive: ${amount} per participant
Timeline: {start} → {recruitment} → {sessions} → {analysis} → {report}
```

### Method Fit Assessment Template
```
Method: {method name}
Fit for Research Goal: {Strong / Medium / Weak} — {rationale}
Fit for Timeline: {Strong / Medium / Weak} — {rationale}
Fit for Budget: {Strong / Medium / Weak} — {rationale}
Fit for Participants: {Strong / Medium / Weak} — {rationale}

Overall Assessment: {Recommended / Possible / Not Recommended}
```

### Multi-Method Research Plan Template
```
Research Question: {question}

Method 1: {method}
  Purpose: {what this method contributes}
  Participants: {N} in {segment}
  Timeline: {dates}
  Output: {artifact}

Method 2: {method}
  Purpose: {what this method contributes}
  Participants: {N} in {segment}
  Timeline: {dates}
  Output: {artifact}

Triangulation Plan:
- {How findings from method 1 and 2 will be combined}
- {What to do if findings conflict}
- {Decision criteria for conflicting evidence}

Total Timeline: {start} to {end}
Total Budget: ${amount}
Research Team: {people involved}
```

### Method Selection by Question Type Quick Reference

| Question | Recommended Methods | Alternative Methods |
|----------|-------------------|-------------------|
| What do users need? | Generative interviews | Diary study, field study |
| What are user pain points? | Generative interviews, support ticket analysis | Diary study, survey |
| How do users behave? | Analytics, field study | Diary study, session replay |
| Can users complete this task? | Moderated usability testing | Unmoderated usability testing |
| Which design is better? | A/B testing, preference test | Moderated usability (qual + metrics) |
| How satisfied are users? | Survey (SUS, NPS, CSAT) | Exit interviews, feedback analysis |
| Why are users churning? | Exit interviews | Survey, analytics (behavior before churn) |
| Does this IA work? | Tree testing | Reverse card sorting, first-click testing |
| How should we organize content? | Open card sorting | Closed card sorting |
| What features should we build? | Generative interviews, survey | Conjoint analysis, Kano survey |
| How does our product compare? | Benchmark study | Competitive usability testing |
| Do users understand our messaging? | Comprehension testing | A/B test of messaging variants |

## Method Cards Reference

### Interview
**Type:** Generative | **Participants:** 5-8 per segment | **Timeline:** 1-2 weeks
**Output:** Themes, pain points, needs, quotes
**Tools:** Zoom, Google Meet, recording software, transcription service
**Cost:** Medium ($100-200/participant including incentive + analysis time)

### Usability Testing (Moderated)
**Type:** Evaluative | **Participants:** 5-8 | **Timeline:** 1-2 weeks
**Output:** Task metrics, usability issues, recommendations
**Tools:** Zoom + Lookback, UserTesting, in-person lab
**Cost:** Medium ($150-300/participant)

### Usability Testing (Unmoderated)
**Type:** Evaluative | **Participants:** 20-50 | **Timeline:** 3-5 days
**Output:** Task metrics at scale, video recordings
**Tools:** UserTesting, Maze, UserZoom, Lookback
**Cost:** Low ($10-30/participant)

### Survey
**Type:** Both | **Participants:** 50-500 | **Timeline:** 1 week
**Output:** Quantitative metrics, open-ended feedback
**Tools:** Typeform, SurveyMonkey, Google Forms
**Cost:** Low (free tools, incentives optional)

### Card Sorting (Open)
**Type:** Generative | **Participants:** 20-50 | **Timeline:** 1 week
**Output:** Category clusters, suggested labels, similarity matrix
**Tools:** OptimalSort, Miro, UserZoom, physical cards
**Cost:** Low

### Card Sorting (Closed)
**Type:** Evaluative | **Participants:** 20-50 | **Timeline:** 1 week
**Output:** Category assignment accuracy, confusion matrix
**Tools:** OptimalSort, UserZoom
**Cost:** Low

### Diary Study
**Type:** Generative | **Participants:** 8-12 | **Timeline:** 2-4 weeks
**Output:** Longitudinal behavior patterns, context, emotions
**Tools:** Dscout, Indeemo, paper journal
**Cost:** High ($200-400/participant)

### Tree Testing
**Type:** Evaluative | **Participants:** 20-50 | **Timeline:** 1 week
**Output:** Findability rate, directness, time-on-task
**Tools:** Treejack, UserZoom
**Cost:** Low

### Field Study
**Type:** Generative | **Participants:** 5-10 | **Timeline:** 2-4 weeks
**Output:** Rich contextual observations, workflow analysis
**Tools:** Notebook, camera, audio recorder
**Cost:** High (travel, researcher time)

### Contextual Inquiry
**Type:** Generative | **Participants:** 5-8 | **Timeline:** 2-3 weeks
**Output:** Workflow models, artifacts, interpretation
**Tools:** Notebook, camera, audio recorder
**Cost:** High

### Concept Testing
**Type:** Evaluative | **Participants:** 5-8 | **Timeline:** 1-2 weeks
**Output:** Concept reactions, comprehension, appeal
**Tools:** Prototype + interview setup
**Cost:** Medium

### A/B Testing
**Type:** Evaluative | **Participants:** High volume | **Timeline:** 2-4 weeks
**Output:** Statistical comparison of variants
**Tools:** Google Optimize, Optimizely, VWO
**Cost:** Medium

### Benchmark Study
**Type:** Evaluative | **Participants:** 20+ per round | **Timeline:** 2-3 weeks per round
**Output:** Comparative metrics over time
**Tools:** Usability testing tools + consistent protocol
**Cost:** High per round

### Exit Interview
**Type:** Evaluative | **Participants:** 10-20 | **Timeline:** 2-3 weeks
**Output:** Churn reasons, feedback, improvement suggestions
**Tools:** Phone, video call, survey
**Cost:** Medium

## Method Selection for Unique Situations

### Mobile-Only Products
- Unmoderated testing (test on actual devices)
- Diary studies enriched with screenshots
- Analytics (app analytics tools)
- In-app intercept surveys (purpose-specific, triggered by behavior)

### Enterprise/B2B Products
- Generative interviews (hard to recruit, make each session count)
- Contextual inquiry (observe in real work context)
- Beta programs (continuous feedback loop)
- Customer advisory board (ongoing relationship, strategic input)

### Early-Stage Startups
- Generative interviews (low cost, high insight)
- Guerrilla testing (any prototype, any available users)
- Analytics (free tools: PostHog, Amplitude free tier)
- Lean surveys (Typeform, target 50 responses)

### Products with Low User Base
- Every user is precious — make each session count
- Deep-dive interviews (longer sessions, more tasks)
- Diary studies (rich longitudinal data from few participants)
- Expert review (heuristic evaluation as supplement)
- No surveys (statistically invalid with small base)

### Accessibility Research
- Recruit participants with disabilities specifically
- Use assistive technology compatible platforms
- Allow extra time for sessions (some tasks take longer with AT)
- Screen reader testing: test with VoiceOver and NVDA
- Ensure your prototype/test environment is accessible
