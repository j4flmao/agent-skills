# Research Synthesis for Product Briefs

## Overview

Research synthesis is the process of transforming raw user research data (interviews, surveys, analytics, competitive analysis) into structured insights that inform the Product Brief. Without synthesis, research findings remain scattered across notes, recordings, and spreadsheets -- raw data that cannot drive decisions. This reference covers methods, frameworks, and templates for synthesizing research into brief-ready format.

### Why Synthesis Matters Before the Brief

- Prevents building on assumptions rather than evidence
- Reduces the risk of misidentifying the target user
- Provides concrete data for success metrics and feature prioritization
- Creates an auditable trail from user need to product decision
- Saves time in later phases (PRD, design, engineering) by getting scope right the first time

### When to Synthesize

| Phase | Synthesis Activity | Output |
|-------|-------------------|--------|
| Pre-brief (discovery) | Analyze existing research, competitive landscape, market data | Research brief input |
| During brief Q&A | Capture user answers, identify gaps, flag assumptions | Structured Q&A notes |
| Post-brief validation | Compare brief against synthesized research findings | Gap analysis memo |

---

## Research Sources for Brief Input

### Primary Research

**User interviews**: Semi-structured 1:1 conversations with target users. Best for: understanding pain points, workflows, and emotional context.

**Surveys**: Quantitative data collection at scale. Best for: validating interview findings, measuring problem prevalence, segmenting users.

**Usage analytics**: Behavioral data from existing products. Best for: identifying power users, drop-off points, feature popularity.

**Support tickets / feedback logs**: Existing user complaints and feature requests. Best for: identifying pain points validated by real user frustration.

### Secondary Research

**Competitive analysis**: Direct and indirect competitor products. Best for: identifying market gaps, differentiators, feature expectations.

**Market reports**: Industry analyst reports (Gartner, Forrester, CB Insights). Best for: market sizing, growth trends, category definitions.

**Academic / domain research**: Published papers, domain-specific studies. Best for: understanding underlying user behavior principles, especially in health, finance, or education.

### Source Quality Matrix

| Source Type | Reliability | Time Cost | Sample Size | Best For |
|-------------|-------------|-----------|-------------|----------|
| User interviews | High | High | 5-15 | Deep understanding |
| Surveys | Medium | Medium | 100+ | Validation at scale |
| Analytics | High | Low | All users | Behavioral patterns |
| Support tickets | Medium | Low | High volume | Pain point identification |
| Competitive analysis | Medium | Medium | 5-10 competitors | Market positioning |
| Market reports | High | Low | Industry-wide | Market sizing |

---

## Synthesis Methods

### Affinity Mapping

Group raw observations into thematic clusters. The most versatile method for interview and survey data.

```
Process:
1. Extract individual observations from research notes (one per sticky/sticky note).
2. Group observations by similarity without predefined categories.
3. Label each group with a theme (e.g., "Users feel overwhelmed by setup").
4. Subgroup within themes to find nuance.
5. Identify 3-5 core themes that appear across most participants.
```

**Output for brief**: The core themes become inputs to the Problem Statement. Direct quotes from users become evidence for the problem's severity.

**Tooling**: Miro, Mural, FigJam, physical sticky notes.

### Jobs To Be Done (JTBD) Synthesis

Map user progress toward a goal, focusing on the functional, social, and emotional dimensions.

```
JTBD Statement template:
"When [situation], I want to [motivation] so I can [desired outcome]."

Process:
1. For each interview/survey respondent, extract the situation, motivation, and desired outcome.
2. Group similar JTBD statements.
3. Identify the primary JTBD (most common or most urgent).
4. Identify hiring criteria: why does the user "hire" a solution?
5. Identify competing solutions: what does the user use today (even non-digital)?
```

**Output for brief**: JTBD directly feeds the Problem Statement and Core Value Proposition. The hiring criteria inform feature priorities. Competing solutions inform the Differentiation section.

### Kano Model Analysis

Classify features into categories based on user satisfaction impact.

| Category | User Satisfaction if Present | User Dissatisfaction if Absent | Examples |
|----------|----------------------------|-------------------------------|----------|
| Basic needs (Must-be) | Neutral | High | Login, security, reliability |
| Performance (One-dimensional) | Linear increase | Linear increase | Speed, battery life, accuracy |
| Delighters (Attractive) | High increase | None | Surprise bonus features, polish |
| Indifferent | None | None | Rarely-used options |
| Reverse | Decrease | Increase | Over-engineering, complexity |

**Process**:
1. List every potential feature from research.
2. Categorize each using survey data (functional/dysfunctional questions) or team estimation.
3. Prioritize: must-be features first, then performance, then delighters (for differentiation).
4. Brief's Key Features (MVP) should include all must-be + highest-impact performance features.

**Output for brief**: Feature categorization that prevents shipping delighters without basics. Ensures Out of Scope list accounts for must-be features that will be needed post-MVP.

### Persona Synthesis

Distill interview clusters into 1-3 representative personas.

```
Persona template:
- Name: Archetypal name
- Role/Title: Job title or user role
- Technical level: Low / Medium / High
- Primary goal: What they want to accomplish
- Pain points: Top 3 frustrations
- Current solution: What they use today
- Quote: Representative user voice

Process:
1. Cluster interview respondents by similar goals and pain points.
2. For each cluster, identify the modal responses (most common answers).
3. Write one persona per cluster. Aim for 1-3 personas, never more.
4. Validate personas with stakeholders before committing to brief.**
```

**Output for brief**: The Target Users section of the brief is populated from the primary persona. Secondary personas inform future phases.

### Problem Statement Derivation

Synthesize research findings into a concise, specific problem statement.

```
Template:
[Target user type] has a problem with [current situation].
Current solutions fail because [reason].
This costs them [impact: time, money, frustration, missed opportunity].

Example:
"Product managers at mid-size B2B SaaS companies have a problem with competitive intelligence. Current solutions are either too manual (spreadsheets) or too expensive (analyst subscriptions). This costs them 8 hours per week per PM and causes missed competitive moves."

Process:
1. Start with the primary JTBD or persona goal.
2. Identify what makes the current situation painful.
3. Quantify the impact if possible (hours wasted, revenue lost, users churned).
4. Narrow until the statement fits in 2-3 sentences.
```

**Output for brief**: The problem statement becomes the Brief's Problem Statement section.

---

## Synthesizing Different Types of Research

### Interview Synthesis

**Raw interview data**: Transcripts or detailed notes from each session.

**Synthesis steps per interview**:
1. Highlight verbatim quotes that reveal emotion, unmet needs, or specific workflows.
2. Identify the interviewee's primary goal for the session.
3. Note any contradictions (user says one thing, their story reveals another).
4. Classify the user's current solution maturity: manual (spreadsheet/paper), basic (one tool), or sophisticated (multi-tool stack).
5. Rate problem severity on a 1-5 scale based on user's emotional response and behavioral indicators.

**Cross-interview synthesis**:
1. Lay out all interviews in a grid (interviewees as columns, themes as rows).
2. Fill in evidence per cell. Use checkmarks for agreement, X for disagreement, blank for not mentioned.
3. Count agreement frequency. Themes with 70%+ agreement across interviewees are high-confidence.
4. Identify outliers: does one interviewee disagree strongly? That can indicate a market segment or a misunderstanding.
5. Draft the brief input statement from the highest-agreement themes.

### Survey Synthesis

**Response cleaning**: Remove incomplete responses, bots (check for nonsensical text entries, same-IP duplicates), and speeders (completed in under 30 seconds for a 10-question survey).

**Quantitative analysis**:
1. Calculate distribution for each question (mean, median, mode for scales; percentages for categorical).
2. Segment responses by demographics (role, company size, industry) to find subgroup patterns.
3. Cross-tabulate: does problem severity correlate with company size? With current solution maturity?
4. Identify statistical significance for segmentation differences (p < 0.05 minimum).

**Qualitative analysis**:
1. Code open-text responses into categories (affinity mapping).
2. Count code frequency. Compare to interview findings.
3. Extract representative verbatim quotes.

**Integration**: Compare survey findings to interview findings. Do they agree? If not, the discrepancy may indicate: sample bias (interviews were a specific type), question framing (survey question was leading), or genuine market segmentation (different user types have different needs).

### Competitive Analysis Synthesis

**Direct competitors**: Products that solve the same problem for the same user.

**Indirect competitors**: Products that solve a different problem for the same user, or the same problem for a different user.

**Analysis framework (per competitor)**:
1. What is their core value proposition?
2. What user segment do they serve?
3. What is their pricing model?
4. What are their top 3 strengths (from reviews)?
5. What are their top 3 weaknesses (from reviews)?
6. What is their market share / funding / growth trajectory?

**Comparative analysis**:
| Dimension | Competitor A | Competitor B | Competitor C | Our Product |
|-----------|-------------|-------------|-------------|-------------|
| Target user | Mid-market | Enterprise | SMB | TBD |
| Core strength | UX | Compliance | Price | TBD |
| Key weakness | Cost | UX | Limited features | TBD |
| Pricing | $99/mo | Custom | $19/mo | TBD |
| Distribution | Self-serve | Sales-led | PLG | TBD |

**Output for brief**: The competitive analysis directly feeds the Differentiation section. If the market is saturated, the brief must articulate a clear differentiation strategy. If the market is new, validate that the problem is worth solving (users willing to pay).

### Analytics Synthesis

**Behavioral patterns from existing products**:
1. Identify the core action flow (e.g., sign up -> create project -> invite team -> complete first task).
2. Calculate drop-off rates at each step.
3. Segment users by: acquisition channel, device type, user role, feature usage.
4. Identify power users (top 10% by engagement) and analyze their behavior.
5. Identify the activation milestone: the action that separates users who retain from those who churn.

**Output for brief**: Analytics data provides real behavior (not self-reported) for validating interview/survey findings. Activation milestones can become success metrics. Power user behavior can inform feature prioritization.

---

## Synthesis to Brief Mapping

### Theme to Brief Section Mapping

| Research Theme | Brief Section | Example |
|----------------|---------------|---------|
| JTBD primary statement | Problem Statement | "Users need to track project budgets without spreadsheets" |
| User persona (primary) | Target Users | "Freelance designers managing 5+ client projects simultaneously" |
| Value driver identified | Core Value Proposition | "A tool that helps freelancers track budgets by connecting payments with project tasks" |
| Kano must-be features | Key Features (MVP) | "Payment reconciliation" (must-have for budget tracking) |
| Competitive gap | Core Value Proposition | "Unlike existing tools, ours automatically categorizes expenses" |
| User scale data | Success Metrics | "Activation rate: 60% within 7 days" |
| Technical constraints from market | Technical Constraints | "Must work offline for remote users" |

### Evidence Quality Levels

| Level | Source | Confidence | Brief Impact |
|-------|--------|------------|--------------|
| Level 1 | Direct user quote, multiple interviews | High | Include as evidence in Problem Statement |
| Level 2 | Survey data, N > 50, statistically significant | High | Use for Success Metrics |
| Level 3 | Competitive analysis, well-documented | Medium | Use for Differentiation |
| Level 4 | Team assumption, no user data | Low | Flag in brief as "assumption to validate" |
| Level 5 | Exec mandate, no user evidence | Low | Include but recommend validation |

**Rule**: Every claim in the Brief should trace to at least Level 3 evidence. If a claim is Level 4 or below, mark it explicitly: "Assumption: users will pay for this feature."

---

## Synthesis Templates

### Interview Summary Template

```
## Interview Summary

**Participant**: {role, company size, industry}
**Date**: {YYYY-MM-DD}
**Format**: {30-min video call}

### Key Quotes
- "{quote 1}" -- context
- "{quote 2}" -- context

### Current Workflow
1. {step 1}
2. {step 2}
3. {step 3}

### Pain Points
- {pain 1} (severity: 4/5)
- {pain 2} (severity: 3/5)

### Current Solutions Used
- {tool or method}

### JTBD Statement
When [{situation}], [{user}] wants to [{motivation}] so [{outcome}].

### Problem Severity Rating
{1-5 scale}

### Researcher Notes
{anything surprising, contradictory, or notable}
```

### Cross-Interview Synthesis Grid Template

```
## Theme Frequency Grid

| Theme | P1 | P2 | P3 | P4 | P5 | Frequency |
|-------|----|----|----|----|----|-----------|
| Setup is too slow | X | X | X |   | X | 80% |
| Can't collaborate | X |   | X | X |   | 60% |
| Mobile access needed |   | X |   | X | X | 60% |
| Too expensive | X | X |   |   | X | 60% |
| Missing reporting |   |   | X |   | X | 40% |

### High-Confidence Themes (70%+)
1. Setup is too slow (4/5)
2. [next theme]

### Medium-Confidence Themes (40-70%)
3. Can't collaborate (3/5)
4. Mobile access needed (3/5)

### Low-Confidence Themes (<40%)
5. Missing reporting (2/5)

### Segments Observed
- Segment A: {description, key needs}
- Segment B: {description, key needs}
```

### Competitive Analysis Template

```
## Competitive Analysis

### Direct Competitors
| | Competitor A | Competitor B | Competitor C |
|---|-------------|-------------|-------------|
| Target user | | | |
| Value prop | | | |
| Pricing | | | |
| Strengths | | | |
| Weaknesses | | | |
| Market share | | | |
| Growth trend | | | |

### Indirect Competitors
| | Indirect A | Indirect B |
|---|-----------|-----------|
| What problem | | |
| Who they serve | | |
| Why they're not direct | | |
| Threat level | | |

### Gap Analysis
- What users want but no competitor provides well:
- What competitors do but we should avoid:
- Our potential differentiation:
```

### User Persona Template

```
## Persona: {Name}

**Role**: {Title}
**Company**: {Size, Industry}
**Technical Level**: {Low / Medium / High}
**Age Range**: {e.g., 28-40}

### Goals
- {Goal 1}
- {Goal 2}

### Pain Points
- {Pain 1}
- {Pain 2}
- {Pain 3}

### Current Solutions
{tools or methods they use today}

### Day in a Life Before Our Product
{Short narrative: what their workflow looks like today}

### Day in a Life After Our Product
{Short narrative: how the product changes their workflow}

### Key Quote
"{A quote that captures this persona's mindset}"

### Why This Persona Matters for the Brief
{How this persona's needs shape the Problem Statement, Features, and Success Metrics}
```

---

## Common Synthesis Pitfalls

### Confirmation Bias

Synthesizers gravitate toward evidence that supports their pre-existing beliefs about the problem.

**Mitigation**: Before synthesis, write down 3 things you expect to find. After synthesis, check whether you found them. If all 3 confirmed, you likely had confirmation bias. Seek disconfirming evidence deliberately.

### Over-weighting the Loudest Voice

The most articulate or opinionated interview participant influences synthesis disproportionately.

**Mitigation**: Count evidence across participants, not weight by eloquence. A quiet participant who gives 5 data points outweighs a loud participant who gives 1.

### Cherry-picking Quotes

Selecting quotes that support the desired narrative while ignoring contradictory evidence.

**Mitigation**: For every quote included in synthesis output, find at least one contradictory quote (or state that none exists). If no contradictory quote exists, the finding is high confidence. If contradictory quotes exist, explain the discrepancy.

### Premature Categorization

Grouping observations into pre-existing categories rather than letting themes emerge from the data.

**Mitigation**: Do an initial pass of open coding (no categories). Then group. Then label the groups. If you start with categories, you will find evidence for them whether it's there or not.

### Neglecting Edge Cases

Synthesis focuses on common themes (70%+ agreement). This can cause neglect of important edge cases that represent valuable market segments.

**Mitigation**: Review the 30% minority themes separately. Could they indicate a distinct user segment worth targeting? Could they predict future mainstream needs?

### Failing to Capture Uncertainty

Synthesis outputs often present findings with false precision.

**Mitigation**: Label every finding with a confidence level (Level 1-5 from the evidence quality table). The brief should indicate which claims are validated and which are assumptions.

---

## Synthesis-Driven Brief Checklist

- [ ] Interview themes mapped and prioritized (frequency matrix completed)
- [ ] Survey data analyzed and cross-tabulated with interview findings
- [ ] Competitive analysis completed for at least 3 direct competitors
- [ ] Primary persona defined with specific role, goal, and pain points
- [ ] JTBD statement written and validated against interview data
- [ ] Problem statement derived from research evidence, not assumption
- [ ] Kano model classification for each potential feature
- [ ] Success metrics grounded in behavioral data (or explicitly marked as assumptions)
- [ ] Edge cases reviewed and either included or explicitly deferred
- [ ] Confidence levels assigned to each major claim in the brief
- [ ] Stakeholders aligned on synthesis findings before brief is written
- [ ] Raw research data archived in docs/research/ for future reference

---

## Research Artifact Automation

### Interview Recording and Transcription

```bash
# Transcribe audio file using Whisper
whisper interview-recording.mp3 --model medium --language en --output_dir docs/research/transcripts/

# Extract timestamps and speaker diarization
whisper interview-recording.mp3 --model large --language en --output_dir docs/research/transcripts/ --word_timestamps True
```

### Survey Data Processing

```python
import pandas as pd
import json

def process_survey_responses(csv_path):
    df = pd.read_csv(csv_path)
    # Remove incomplete responses
    df = df[df['completed'] == True]
    # Remove speeders (completed in < 30 seconds)
    df = df[df['duration_seconds'] > 30]
    # Calculate distribution for Likert-scale questions
    likert_columns = [col for col in df.columns if 'likert_' in col]
    distributions = {}
    for col in likert_columns:
        distributions[col] = df[col].value_counts(normalize=True).to_dict()
    # Cross-tabulation by segment
    if 'company_size' in df.columns:
        cross_tab = pd.crosstab(df['company_size'], df['problem_severity'])
    else:
        cross_tab = None
    return {
        'total_valid_responses': len(df),
        'distributions': distributions,
        'cross_tabulation': cross_tab.to_dict() if cross_tab is not None else None
    }

# Output as JSON for the brief
result = process_survey_responses('data/survey-responses.csv')
with open('docs/research/survey-analysis.json', 'w') as f:
    json.dump(result, f, indent=2)
```

### Affinity Mapping Data Structure

```json
{
  "sessions": [
    {
      "participant_id": "P1",
      "date": "2025-01-15",
      "quotes": [
        {"text": "Setting up takes too long.", "theme": "onboarding friction"},
        {"text": "I need my team to see the same dashboard.", "theme": "collaboration"},
        {"text": "The mobile app crashes every time.", "theme": "stability"}
      ],
      "jtbd": {
        "situation": "Starting a new project with a remote team",
        "motivation": "Get everyone aligned on scope and deadlines",
        "outcome": "Ship on time without daily status meetings"
      },
      "severity": 4
    }
  ],
  "themes": [
    {
      "name": "onboarding friction",
      "frequency": 0.8,
      "participants": ["P1", "P2", "P3", "P5"],
      "representative_quote": "Setting up takes too long.",
      "confidence": "high"
    }
  ]
}
```

---

## Synthesis Communication to Stakeholders

### The Synthesis Readout Deck

A synthesis readout communicates findings to stakeholders (product leadership, design, engineering) before the brief is written.

**Standard structure**:
1. **Research approach**: Who we talked to, how many, what methods.
2. **Top 3 findings**: The most important themes, each with evidence and a direct quote.
3. **Personas**: 1-3 personas with name, role, goals, pain points.
4. **JTBD statement**: The primary job the product should help users accomplish.
5. **Competitive landscape**: Gap analysis showing where competitors fail.
6. **Recommendations**: How findings should shape the brief (problem statement, target users, features, success metrics).
7. **Uncertainties**: What we don't know and should validate.

### Stakeholder Alignment Protocol

1. **Share synthesis output 48 hours before alignment meeting**. Stakeholders need time to process.
2. **In the meeting, start with the evidence, not the recommendations**. Let stakeholders react to data first.
3. **Ask: "What contradicts your experience?"** This surfaces assumptions that differ from research.
4. **Ask: "What's missing?"** Stakeholders often know about constraints not captured in research.
5. **Capture disagreements as assumptions to validate**. Do not argue. If a stakeholder disagrees with research, it is a hypothesis to test, not a fight to win.
6. **End with explicit agreement on the 3 key findings that drive the brief**. Without this, the brief will be pulled in multiple directions.

---

## Synthesis Quality Assessment

### Criteria for Quality Synthesis

| Criterion | Good | Excellent |
|-----------|------|-----------|
| Sample coverage | All key segments represented | Multiple participants per segment |
| Evidence depth | Quotes support themes | Quotes + frequency data + statistical validation |
| Alternative explanations | Not addressed | Explicitly considered and ruled out |
| Uncertainty | Not mentioned | Confidence levels for each finding |
| Actionability | Findings are descriptive | Findings directly inform brief sections |
| Reproducibility | Another researcher could follow the method | Another researcher would reach similar conclusions |

### Red Flags in Synthesis

- **Theme names are too vague**: "User experience issues" is not a theme. "Users cannot find the search function" is a theme.
- **No quantitative evidence**: If every finding is qualitative, the synthesis lacks validation.
- **All evidence supports one conclusion**: If there is no contradictory evidence, confirmation bias is likely present.
- **Themes match the team's pre-existing beliefs exactly**: Research should surface surprises. No surprises means the research was likely biased.
- **Synthesis took too long**: A good synthesis for a brief should take 1-2 days for 10 interviews. Longer indicates process inefficiency or scope creep.

---

## Advanced Synthesis Techniques

### Grounded Theory for Deep Discovery

Grounded theory builds theory from data rather than testing existing hypotheses. Useful for novel problem spaces where no existing framework applies.

**Process**:
1. Open coding: label every observation with a descriptive code.
2. Axial coding: group codes into categories and identify relationships.
3. Selective coding: identify the central category that ties all others together.
4. Build theory: write a narrative that explains the relationships.

**When to use**: First-of-its-kind product, no existing competitors, completely new user behavior.

**When not to use**: Mature market with established frameworks. Grounded theory requires significant data (20+ interviews) and analysis time.

### Mental Model Diagram

Map the user's mental model of their domain: how they think about the problem, what mental categories they use, and where their understanding breaks down.

**Process**:
1. From interviews, extract domain concepts the user mentions.
2. Map relationships between concepts (causes, leads to, prevents, requires).
3. Identify mental "chokepoints" where the user's model differs from reality.
4. Design the product's conceptual model to align with the user's mental model.

**Example for a project management tool**: User thinks in terms of "who owes me what by when" not "Gantt charts with dependency mapping."

### Outcome-Driven Innovation (ODI)

Focus on desired outcomes rather than features. Each outcome is a metric that is important to the user.

**Process**:
1. List all outcomes users care about (minimize time to X, maximize accuracy of Y).
2. Rate each outcome on importance and satisfaction (survey).
3. Plot on an opportunity matrix (importance vs. satisfaction).
4. Outcomes with high importance and low satisfaction are the highest-opportunity areas.

**Output for brief**: The Core Value Proposition becomes "helps users achieve [outcome] by [mechanism]" rather than "has [feature]."

---

## Synthesis Data Visualization

### Theme Frequency Visualization

Present synthesis findings visually to stakeholders for faster alignment.

```
Theme Frequency Chart (illustrative)
                                    0%  20%  40%  60%  80%  100%
Setup is too slow                  [=====]
Collaboration broken               [====]
Mobile access needed               [===]
Too expensive                      [===]
Missing reporting                  [==]
Learning curve too steep           [=]
```

### Opportunity Matrix (Importance vs. Satisfaction)

```
Satisfaction
    High |  Maintain       |  Over-invest
         |  (low priority) |   Stop doing
         |                 |
    Low  |  Low priority   |  HIGH OPPORTUNITY
         |  Ignore         |   Invest here
         +-----------------+----------------
            Low                 High
                    Importance
```

Features in the high-opportunity quadrant (high importance, low satisfaction) are the most promising candidates for the brief's Core Value Proposition and Key Features.

### Persona Comparison Radar Chart

Map persona attributes on parallel axes to compare segments:

```
Persona comparison dimensions:
                       Tech-savvy
                           |
          Budget-conscious -+- Feature-hungry
                           |
                       Time-poor

Persona A: Tech-savvy, budget-conscious freelancer
Persona B: Feature-hungry, time-poor enterprise manager
```

---

## Cross-Method Triangulation

### Why Triangulate

Each research method has blind spots. Interviews miss scale. Surveys miss depth. Analytics miss motivation. Triangulation combines methods to compensate for each other's weaknesses.

### Triangulation Matrix

| Finding | Interview Evidence | Survey Evidence | Analytics Evidence | Confidence |
|---------|-------------------|-----------------|-------------------|------------|
| Setup too slow | 8/10 users mentioned it | 72% agree (N=200) | Avg setup time: 45min | High |
| Collaboration needed | 5/10 users mentioned it | 58% agree (N=200) | 31% use sharing features | Medium |
| Mobile access | 3/10 users mentioned it | 45% agree (N=200) | 22% mobile traffic | Low-Medium |

**Confidence levels**:
- **High**: All 3 sources agree. Can be stated as fact in brief.
- **Medium**: 2 of 3 sources agree. Flag as "validated insight" in brief.
- **Low**: 1 of 3 sources. Flag as "emerging pattern" that needs validation.

### Reconciling Conflicting Evidence

When interview findings contradict survey data:

1. **Check survey question wording**: Was it leading? Was the scale ambiguous?
2. **Check interview sample**: Was the interview sample biased toward one user type?
3. **Check interpretation**: Is the apparent contradiction actually about different aspects of the same problem?
4. **Design a follow-up study**: A targeted survey or interview round focused on the discrepancy.
5. **Document both perspectives**: In the brief, state: "Interviews suggest X, but survey data shows Y. This may indicate segment differences."

---

## Advanced Qualitative Analysis

### Thematic Saturation Tracking

Track whether your research has reached saturation (no new themes emerging from additional interviews).

```
Saturation Log
Interview # | New Themes | Cumulative Themes
------------|------------|------------------
1           | 5          | 5
2           | 3          | 8
3           | 2          | 10
4           | 1          | 11
5           | 1          | 12
6           | 0          | 12  <- Saturation reached at 6 interviews
7           | 0          | 12
8           | 0          | 12
```

**Rule of thumb**: For a brief (not academic research), 5-8 interviews per segment usually reach saturation. If new themes still emerge at interview 8, continue. If nothing new appears after interview 5, stop.

### Sentiment Analysis of Interview Transcripts

Code interview transcripts for emotional valence to identify the most impactful problem areas.

| Emotion | Indicator Phrases | Signal Strength |
|---------|------------------|-----------------|
| Frustration | "I hate", "this is ridiculous", "waste of time" | Strong |
| Resignation | "I guess I have to", "there's no alternative" | Medium |
| Excitement | "I wish there was", "if only", "that would be amazing" | Strong |
| Confusion | "I don't understand", "how do I", "what does this mean" | Medium |

**Brief implication**: Problems mentioned with strong negative emotion (frustration) are higher priority than problems mentioned neutrally.

### Narrative Analysis for Problem Understanding

Instead of extracting discrete facts, analyze the full narrative arc of an interview.

**Narrative structure**:
1. **Setup**: User's context and goals before encountering the problem.
2. **Conflict**: The moment the problem manifests.
3. **Attempted resolution**: What the user tried to solve it.
4. **Outcome**: How the situation resolved (or didn't).
5. **Emotional resolution**: How the user feels about the outcome.

**Brief implication**: The "attempted resolution" step reveals what users consider acceptable alternatives. The "emotional resolution" reveals how much the problem matters.

---

## Synthesis Documentation Standards

### Research Archive Structure

```
docs/research/
  raw/
    interviews/
      participant-01-transcript.md
      participant-02-transcript.md
    surveys/
      survey-responses.csv
      survey-analysis.json
    analytics/
      product-analytics-export.csv
  synthesis/
    affinity-map.json
    cross-interview-grid.md
    competitive-analysis.md
    personas.md
    synthesis-summary.md
    theme-frequency-analysis.md
  brief-inputs/
    problem-statement-draft.md
    persona-summary.md
    feature-candidates.md
    success-metric-candidates.md
```

### Synthesis Summary Document Template

```markdown
# Research Synthesis Summary: {Project Name}

## Overview
- **Research period**: {start date} to {end date}
- **Methods**: {interviews, surveys, analytics, competitive analysis}
- **Participants**: {N} interviews, {N} survey responses

## Key Findings
1. {Finding 1}: {evidence summary, confidence level}
2. {Finding 2}: {evidence summary, confidence level}
3. {Finding 3}: {evidence summary, confidence level}

## Personas
- {Persona 1}: {brief description}
- {Persona 2}: {brief description}

## JTBD Statement
{Primary job statement}

## Competitive Landscape
- {Key gap identified}
- {Key threat identified}

## Implications for the Brief
- Problem Statement: {recommended wording}
- Target Users: {recommended persona priority}
- MVP Features: {recommended feature list}
- Success Metrics: {recommended metrics}

## Uncertainties
- {What we don't know and how to validate}

## Appendix
- Interview guide
- Survey instrument
- Competitive analysis details
```

---

## Statistical Methods for Brief Research

### Sample Size Determination

```python
import math

def required_sample_size(population_size, confidence_level=0.95, margin_of_error=0.05):
    """
    Calculate minimum sample size for survey research.
    """
    z_scores = {0.90: 1.645, 0.95: 1.96, 0.99: 2.576}
    z = z_scores[confidence_level]
    p = 0.5  # Maximum variability (worst case)
    
    n = (z**2 * p * (1-p)) / margin_of_error**2
    
    if population_size > 0:
        # Finite population correction
        n = n / (1 + (n-1) / population_size)
    
    return math.ceil(n)

# Example: 5000 potential users, 95% confidence, 5% margin
print(required_sample_size(5000))  # ~357 respondents
```

### Statistical Significance Testing

```python
import scipy.stats as stats

def compare_segments(segment_a_responses, segment_b_responses):
    """
    Compare two user segments on a Likert-scale question.
    Uses Mann-Whitney U test for ordinal data.
    """
    stat, p_value = stats.mannwhitneyu(segment_a_responses, segment_b_responses)
    is_significant = p_value < 0.05
    return {
        'test': 'Mann-Whitney U',
        'statistic': stat,
        'p_value': p_value,
        'significant': is_significant,
        'interpretation': 'Segments differ' if is_significant else 'No significant difference'
    }

# Example: SMB vs Enterprise satisfaction ratings
smb = [3, 4, 2, 3, 4, 5, 3]  # Satisfaction ratings 1-5
enterprise = [2, 3, 2, 2, 3, 4, 2]
result = compare_segments(smb, enterprise)
```

### Confidence Intervals for Survey Data

```python
import math

def confidence_interval(proportion, sample_size, z_score=1.96):
    """
    Calculate 95% confidence interval for a proportion.
    """
    se = math.sqrt((proportion * (1 - proportion)) / sample_size)
    ci_lower = proportion - z_score * se
    ci_upper = proportion + z_score * se
    return (max(0, ci_lower), min(1, ci_upper))

# Example: 72% of 200 users say setup is too slow
ci = confidence_interval(0.72, 200)
print(f"72% agree (95% CI: {ci[0]:.1%} - {ci[1]:.1%})")
# Output: 72% agree (95% CI: 65.8% - 78.2%)
```

---

## References

- `brief-examples.md` -- Brief Examples
- `brief-strategies.md` -- Brief Writing Strategies
- `brief-template.md` -- Product Brief Template
- `create-brief-advanced.md` -- Advanced Brief Creation
- `brief-stakeholder-alignment.md` -- Stakeholder Alignment for Briefs
- Interview Synthesis Framework by Indi Young
- JTBD methodology by Clayton Christensen / Tony Ulwick
- Kano Model by Noriaki Kano
- Grounded Theory by Strauss & Corbin
- Outcome-Driven Innovation by Anthony Ulwick
- Thematic Analysis by Braun & Clarke
- Survey Methodology by Fowler
- Statistical Methods for Product Research
