# User Research Synthesis and Reporting

## Synthesis Framework Overview

Synthesis is the process of transforming raw research data into actionable insights. It involves finding patterns, identifying themes, and connecting observations to recommendations.

### Synthesis Pipeline

```
Raw Data → Observations → Patterns → Themes → Insights → Recommendations
  (notes,       (atomic     (recurring   (clusters    (actionable   (prioritized
   transcripts,  findings)   patterns)    of patterns)  findings)     next steps)
   recordings)
```

Each stage adds abstraction and reduces volume. The goal is to preserve the richness of the data while making it useful for decision-making.

### Synthesis Principles

| Principle | Description | Application |
|-----------|-------------|-------------|
| Ground in evidence | Every insight must trace to a specific observation | Tag findings to participant quotes or metrics |
| Seek patterns, not outliers | Look for recurring themes across participants | A single passionate quote is not a pattern |
| Include disconfirming evidence | Actively look for data that contradicts your hypothesis | Document counterexamples alongside supporting evidence |
| Distinguish observation from interpretation | Raw data is what happened; interpretation is what it means | Label each finding: Observation vs Insight |
| Timebox synthesis | Synthesis can expand to fill available time | Budget 2x session time for synthesis |
| Involve the team | Multiple perspectives improve analysis | Include observers in synthesis sessions |
| Prioritize by impact | Not all insights are equally important | Rate each insight by severity, frequency, and business impact |

## Step-by-Step Synthesis Process

### Step 1: Data Preparation

Transcribe all sessions within 72 hours. Clean transcripts by removing filler words but preserving meaning. Organize data:

- Transcripts with timestamps and speaker labels
- Session notes (observer observations, not just transcripts)
- Task metrics (completion rates, time on task, errors)
- Survey data (if applicable)
- Screenshots or video clips of key moments

Tools: Dovetail, Condens, Otter.ai, Rev, Descript

### Step 2: Extract Atomic Observations

An atomic observation is a single, discrete finding from one data point. It should be:

- Specific: One observation per note
- Grounded: References a specific participant or metric
- Neutral: Describes what happened, not interpretation
- Verbatim: Uses participant's words when relevant

Examples of good atomic observations:
- "P3 spent 45 seconds looking for the search bar on the dashboard"
- "P5 said: 'I never know which tab to click first when I log in'"
- "4 of 8 participants clicked the wrong button on step 3 of the form"

Bad atomic observations (too vague or interpretive):
- "Users were confused by the navigation" (vague, interpretive)
- "The design needs improvement" (opinion, not observation)
- "P2 had a bad experience" (subjective, not specific)

Extraction technique: Read through transcript and highlight every moment that relates to the research question. Each highlight becomes one atomic observation.

### Step 3: Affinity Mapping

Affinity mapping clusters atomic observations into themes based on natural relationships.

Process:

1. Write each atomic observation on a sticky note (physical or digital)
2. Place all notes on a wall or digital board
3. Silently cluster: group notes that seem related
4. Do NOT pre-label categories — let patterns emerge
5. Continue clustering until all notes are in groups (or remain as singletons)
6. Name each cluster with a descriptive label
7. Create hierarchy: group related clusters into themes
8. Prioritize clusters by size (frequency) and severity

Digital tools: Miro, Mural, FigJam, Miro, Dovetail

Best practices:
- Involve cross-functional team in clustering (brings diverse perspectives)
- Do not force-fit observations into predetermined categories
- Keep singletons (unclustered observations) — they may indicate edge cases
- Take photos of the board at each stage for process documentation
- Timebox: 2-4 hours for clustering 100-200 observations

### Step 4: Write Insight Statements

Each theme cluster should be expressed as a single insight statement:

Format: "[Observation about user behavior/need] which leads to [impact/consequence]"

Examples:
- "Users expect the search function to work across all content types, causing frustration when results are incomplete"
- "New users need immediate value within the first 5 minutes, otherwise they abandon the product entirely"
- "Power users develop workarounds for missing features, indicating unmet needs that may be product opportunities"

Insight quality criteria:
- Based on evidence from multiple participants (minimum 3 for qualitative)
- Actionable: suggests what to do differently
- Specific: names the behavior, context, and impact
- Neutral: describes user reality without judgment

### Step 5: Severity and Priority Ratings

Rate each insight on three dimensions:

| Dimension | Scale | Definition |
|-----------|-------|------------|
| Severity | Critical / Major / Minor / Suggestion | Impact on user experience |
| Frequency | High / Medium / Low | Number of participants or occurrences |
| Business impact | High / Medium / Low | Effect on business metrics |

Severity definitions:

| Severity | Description | Action Required |
|----------|-------------|----------------|
| Critical | Users cannot complete a core task; data loss; safety issue | Fix immediately |
| Major | Users can complete but with significant effort, frustration, or errors | Fix before next release |
| Minor | Users experience friction but complete tasks | Address in near term |
| Suggestion | Improvement opportunity that would enhance experience | Prioritize against other work |

Priority calculation:
Priority = Severity + Frequency + Business Impact
- High priority: At least two dimensions rated "High" or "Critical"
- Medium priority: Two or more dimensions rated "Medium" or above
- Low priority: All dimensions "Low" or "Suggestion"

### Step 6: Persona Creation

Personas synthesize user characteristics into distinct archetypes.

Process:
1. List all user attributes from research (demographics, behaviors, goals, pain points)
2. Identify which attributes cluster together naturally
3. Define 3-5 distinct clusters (personas)
4. Write persona profiles based on each cluster

Persona template:

```
Persona Name: {Name}
Role: {Job title or user type}
Quote: "{verbatim quote that captures their perspective}"

Bio:
{2-3 sentences describing their context, routine, and relationship to the product}

Demographics:
- Age range: {range}
- Location: {type}
- Company size: {size}
- Role: {specific role}

Goals:
1. Primary: {main goal when using product}
2. Secondary: {supporting goal}

Pain Points:
1. {Pain point} — "{supporting quote}"
2. {Pain point} — "{supporting quote}"
3. {Pain point} — "{supporting quote}"

Behaviors:
- {Behavioral pattern} (evidence: {N} of {total} participants)
- {Behavioral pattern} (evidence: {N} of {total} participants)

Current solutions: {What they use instead of or alongside the product}
```

Persona quality checklist:
- Based on data from at least 3 participants
- Includes specific behaviors, not just demographics
- Distinguishable from other personas
- Grounded in real quotes
- Actionable for design and product decisions
- Avoids stereotypes and assumptions

### Step 7: Journey Mapping

Journey maps visualize the user's end-to-end experience.

Journey map components:

| Component | Description | Content |
|-----------|-------------|---------|
| Persona | Who is the journey for? | Name, role, scenario |
| Scenario | What task or goal? | Specific context and objective |
| Stages | Phases of the journey | Awareness → Consideration → Decision → Onboarding → Usage → Support |
| Actions | What user does at each stage | Specific behaviors and steps |
| Thoughts | What user is thinking | Internal monologue, questions |
| Feelings | Emotional state | Emotional line: positive, neutral, negative |
| Pain points | Friction and frustration | Specific problems at each stage |
| Opportunities | How to improve | Recommendations per stage |

Journey mapping process:

1. Define scope: one persona, one scenario, clear timeframe
2. List chronological stages of the journey
3. Per stage, brainstorm: what user does, thinks, feels
4. Plot emotional journey line (highs and lows)
5. Identify pain points and opportunities
6. Prioritize opportunities by impact and effort

## Reporting

### Findings Report Structure

A well-structured findings report helps stakeholders understand and act on research.

Recommended structure:

1. **Executive Summary** (1 page)
   - Research goal and method
   - Top 3-5 key findings
   - Top 3-5 recommendations
   - Confidence level in findings

2. **Method Overview** (1/2 page)
   - Research method(s) used
   - Participant count and segments
   - Session structure and duration
   - Timeline
   - Limitations

3. **Participant Profile** (1/2 page)
   - Demographics overview
   - Recruitment criteria
   - Participant summary table

4. **Key Findings** (main body, 3-5 pages)
   - Each finding: statement, evidence, severity, frequency, business impact
   - Supporting quotes, screenshots, video clips, or metrics
   - Organized by theme or priority

5. **Recommendations** (1-2 pages)
   - Prioritized list of recommended actions
   - Expected impact per recommendation
   - Effort estimate (if available)
   - Who is responsible

6. **Appendix** (as needed)
   - Full protocol
   - Raw data summary
   - Consent form template
   - Detailed participant information

### Finding Documentation Template

```
Finding #{N}: {short title}
Severity: {Critical / Major / Minor / Suggestion}
Frequency: {High / Medium / Low} — {N} of {total} participants
Business Impact: {High / Medium / Low}

Statement:
{Clear, concise description of what was found}

Evidence:
- Quote: "{verbatim participant quote}" — Participant {ID}
- Observation: {description of observed behavior}
- Metric: {quantitative data if applicable} ({detail})

Interpretation:
{What this finding means for the product or design}

Recommendation:
{Specific, actionable next step}

Supporting Artifacts:
- [Screen recording: link]
- [Screenshot: link]
- [Related finding: #{N}]
```

### Report Writing Best Practices

| Practice | Rationale |
|----------|-----------|
| Lead with the finding, not the method | Stakeholders care about what you found, not how you found it |
| Use subheadings for scannability | Reports are often skimmed; make key points visible |
| Include visuals (quotes, screenshots, charts) | Visual evidence is more memorable and credible |
| Keep executive summary to 1 page | Decision-makers need the bottom line first |
| Use severity ratings | Helps stakeholders prioritize action items |
| Connect findings to business impact | Answers "why should we care?" |
| Distinguish observation from recommendation | Keeps facts separate from opinions |
| Include disconfirming evidence | Builds credibility by showing balanced analysis |
| Use participant IDs, not names | Protects participant privacy |
| Provide raw data access | Enables others to verify findings |

### Presenting Findings to Stakeholders

Presentation format guidelines:

| Format | Best For | Length | Interactivity |
|--------|----------|--------|---------------|
| Live presentation + discussion | Strategic decisions, stakeholder buy-in | 30-60 min | High — Q&A throughout |
| Written report | Reference documentation, distributed teams | 5-15 pages | Low |
| Executive summary only | Busy executives, high-level decisions | 1 page | Medium — offer follow-up |
| Highlight reel (video clips) | Emotional impact, team empathy building | 5-10 min | Low |
| Findings workshop | Co-creating solutions based on research | 60-90 min | High — interactive |

Presentation tips:
- Start with a surprising finding to grab attention
- Use video clips of participants (people connect with people)
- Show the emotional journey (pain points create empathy)
- End with clear, actionable recommendations
- Identify who owns each recommendation
- Get commitment on next steps before closing

### Research Repository Management

Maintain a research repository for longitudinal insights and organizational memory.

Repository structure:
```
/projects
  /{year}-{project-name}
    /plan
      research-plan.md
      screener.pdf
      protocol.md
    /raw-data
      transcripts/
      recordings/
      survey-data/
      notes/
    /analysis
      affinity-map.{format}
      themes.md
      personas.md
      journey-maps/
    /report
      findings-report.{format}
      presentation.{format}
      executive-summary.{format}
    /artifacts
      consent-form.pdf
      incentives-log.xlsx
```

Repository best practices:
- Tag findings by topic, product area, and severity
- Link related studies (cross-reference insights)
- Include limitations and methodology notes for context
- Make searchable with consistent naming
- Update index/readme for new additions
- Archive studies older than 2 years to separate storage

## Synthesis Methods Reference

### Thematic Analysis

A systematic method for identifying, analyzing, and reporting patterns in qualitative data.

Phases:
1. Familiarize with data: Read transcripts, watch recordings
2. Generate initial codes: Label segments of data
3. Search for themes: Group codes into potential themes
4. Review themes: Check themes against data
5. Define and name themes: Refine specifics of each theme
6. Produce report: Final analysis with evidence

Best for: Rigorous, methodical analysis in academic or research-mature organizations

### Grounded Theory

A method where theory emerges from data rather than being imposed.

Process:
- Open coding: Label every segment of data
- Axial coding: Relate codes to each other
- Selective coding: Identify core category
- Theory emerges from patterns

Best for: Developing new theories about user behavior from scratch
Note: Time-intensive; rarely used fully in industry UX research

### Framework Analysis

A method using a predefined framework (matrix) to organize data.

Process:
1. Familiarization
2. Identifying a thematic framework
3. Indexing (applying framework to data)
4. Charting (arranging data in matrix)
5. Mapping and interpretation

Best for: Applied research with specific questions and tight timelines

### Jobs To Be Done (JTBD) Synthesis

Focuses on the progress users are trying to make in specific circumstances.

Output:
- Job statement: "When [situation], I want to [motivation] so I can [expected outcome]"
- Functional job: What the user wants to accomplish
- Emotional job: How the user wants to feel
- Social job: How the user wants to be perceived

Best for: Product strategy, identifying unmet needs, competitive positioning

## Synthesis Templates

### Affinity Mapping Session Plan
```
Preparation:
- Transcribe all sessions
- Extract atomic observations (one per sticky note)
- Print/sticky notes or set up digital board
- Invite cross-functional team (design, product, engineering)

Session Agenda:
| Time | Activity | Facilitator |
|------|----------|-------------|
| 0-10 min | Context setting: research goal, method, participants | Researcher |
| 10-20 min | Read-through: team reviews observations silently | Individual |
| 20-50 min | Silent clustering: team groups observations | Individual + group |
| 50-60 min | Label clusters: name each group | Facilitator leads |
| 60-75 min | Hierarchy: group clusters into themes | Facilitator leads |
| 75-90 min | Prioritize: rate themes by frequency and severity | Team votes |

Output: Themed clusters with labels and priority ratings
```

### Finding Priority Matrix

```
                    High Business Impact
                         |
            High Priority | High Priority
            Act This Cycle | Act Immediately
                         |
    Low Frequency --------+-------- High Frequency
                         |
            Low Priority  | Medium Priority
            Monitor       | Address When Possible
                         |
                    Low Business Impact
```

### Insight-to-Recommendation Mapping

```
Insight: {finding statement}
Evidence: {supporting data}

Recommendation 1: {action}
  Expected Impact: {effect on user experience or business metrics}
  Effort: {Low / Medium / High}
  Owner: {team or person}

Recommendation 2: {action}
  Expected Impact: {effect on user experience or business metrics}
  Effort: {Low / Medium / High}
  Owner: {team or person}

Success Metric: {how we'll know if the recommendation worked}
```

## Advanced Synthesis Techniques

### Qualitative Coding Framework

For structured analysis of interview transcripts.

Code types:
- Descriptive codes: Topic labels (e.g., "pricing concerns", "onboarding friction")
- Interpretive codes: Researcher's interpretation (e.g., "trust deficit", "status signaling")
- Pattern codes: Emerging relationships (e.g., "trust increases with transparency")

Coding process:
1. Start with 10-20 descriptive codes based on interview guide
2. Add codes as new topics emerge (inductive coding)
3. After 3-4 transcripts, codes stabilize (saturation)
4. Apply finalized codebook to remaining transcripts
5. Count code frequencies for quantitative summary

### Participant Summaries

Create a one-page summary per participant for rapid reference:

```
Participant ID: {P1}
Segment: {segment name}
Session Date: {date}

Key Quotes:
- "{quote}" — context
- "{quote}" — context

Top Pain Points:
1. {pain point}
2. {pain point}
3. {pain point}

Key Behaviors:
- {behavior}
- {behavior}

Notable Observations:
- {observation}
- {observation}

Rating (if applicable):
- SUS: {score}
- NPS: {score}
```

### Cross-Study Synthesis

When multiple studies exist on the same topic, synthesize across studies:

1. List all studies with their methods, participants, and key findings
2. Identify findings that are consistent across studies (high confidence)
3. Identify findings that conflict (needs further investigation)
4. Note findings that appear in only one study (low confidence without replication)
5. Write integrated insights with confidence ratings

## Synthesis Quality Assurance

### Audit Trail

Maintain a traceable path from raw data to final recommendation:

```
Raw Data → Code/Observation → Theme → Insight → Recommendation
P3 transcript → "Clicked search twice → Navigation confusion → Users can't find → Add search to
line 142"      before finding"  is a top issue      content easily"     every page
```

Each link in the chain should be documented. This enables:
- Verification of findings (someone can trace back to source)
- Credibility with skeptical stakeholders
- Organizational knowledge transfer

### Inter-Rater Reliability

When multiple analysts code the same data:

1. Two or more analysts independently code 20% of transcripts
2. Compare coding: calculate agreement percentage
3. Discuss discrepancies and refine codebook
4. Re-apply refined codebook
5. Target >80% agreement

If single analyst: Self-audit 10% of coding by re-coding and comparing to original.

### Debrief memo writing

After each synthesis session, write a brief memo documenting:

- Date and participants
- Key decisions made during synthesis
- Contradictions or tensions in the data
- Questions that remain unanswered
- Initial hypotheses generated
- Next steps

## Reporting Templates

### Executive Summary Template
```
# Research Executive Summary
## {Study Name}

**Goal:** {research question}
**Method:** {method} with {N} participants
**Timeline:** {dates}

---

**Top Findings:**

1. {Finding} — {severity}
   {1-sentence description}

2. {Finding} — {severity}
   {1-sentence description}

3. {Finding} — {severity}
   {1-sentence description}

---

**Top Recommendations:**

1. {Action} → Expected impact: {metric}
2. {Action} → Expected impact: {metric}
3. {Action} → Expected impact: {metric}

**Confidence:** {High / Medium / Low} — {rationale}
```

### Full Findings Report Template
```
# Research Findings: {Study Name}

## 1. Executive Summary
{One page: goal, method, top findings, top recommendations}

## 2. Method
- Approach: {method}
- Participants: {N} across {segments}
- Session length: {minutes}
- Date range: {start} to {end}
- Research team: {names}

### Limitations
{What could affect the reliability or generalizability}

## 3. Participant Overview
{Table with key demographics and attributes}

## 4. Key Findings

### Finding 1: {Title}
{Evidence, severity, frequency, business impact}
{Supporting quotes, screenshots, metrics}

### Finding 2: {Title}
{Evidence, severity, frequency, business impact}
{Supporting quotes, screenshots, metrics}

### Finding 3: {Title}
{Evidence, severity, frequency, business impact}
{Supporting quotes, screenshots, metrics}

## 5. Personas
{Persona profiles as documented above}

## 6. Journey Maps
{Journey maps as documented above}

## 7. Recommendations

| # | Recommendation | Impact | Effort | Owner |
|---|----------------|--------|--------|-------|
| 1 | {action} | {high/med/low} | {high/med/low} | {team} |
| 2 | {action} | {high/med/low} | {high/med/low} | {team} |
| 3 | {action} | {high/med/low} | {high/med/low} | {team} |

## 8. Appendix
- Protocol
- Screener
- Raw data access link
- Consent form
```

### Recommendation Tracking Template
```
| Recommendation | Priority | Owner | Status | Due Date | Notes |
|----------------|----------|-------|--------|----------|-------|
| {action} | {P0/P1/P2} | {person} | {Not Started / In Progress / Done / Deferred} | {date} | {notes} |
| {action} | {P0/P1/P2} | {person} | {Not Started / In Progress / Done / Deferred} | {date} | {notes} |
```

## Synthesis and Reporting Timeline

### Typical Timeline for Qualitative Study (10 interview sessions)

| Day | Activity | Duration |
|-----|----------|----------|
| 1-5 | Conduct 2 interviews per day | 5 days |
| 6-10 | Transcribe sessions (while conducting) | 5 days |
| 11-12 | Read transcripts, extract atomic observations | 2 days |
| 13 | Affinity mapping session (team) | 1 day |
| 13-14 | Write insight statements, rate severity | 1.5 days |
| 14-15 | Create personas and journey maps | 1.5 days |
| 16-17 | Write findings report | 2 days |
| 18 | Prepare presentation | 1 day |
| 19 | Present findings to stakeholders | 1 day |
| 19-20 | Finalize and archive report | 1 day |
| Total | | 20 days |

### Timeline Compression Options

| Technique | Savings | Trade-off |
|-----------|---------|-----------|
| Conduct interviews back-to-back (3-4/day) | -3 days | Researcher fatigue, less reflection between sessions |
| Use automated transcription | -3 days | Less accurate for accents or technical terms; needs cleanup |
| Skip formal transcripts, code from recordings | -4 days | Harder to extract precise quotes; for experienced researchers only |
| Limit personas to 2, not 3-5 | -1 day | May miss important segment differences |
| Combine findings writing with synthesis | -2 days | Risk of premature conclusions |
| One-page executive summary only | -3 days | Less stakeholder context, no detailed reference |
| Rapid synthesis within 2 hours of each session | Incorporated into process | Requires discipline and protected time |

## Ethics in Synthesis and Reporting

### Participant Privacy
- Use participant IDs (P1, P2), never names in reports
- Remove identifying details (company names, specific locations)
- Get consent for quotes and video clips
- Allow participants to review their quotes before publication
- Store raw data securely with access controls

### Honest Reporting
- Include disconfirming evidence (data that contradicts hypotheses)
- Report limitations honestly (small sample, specific segment, narrow task focus)
- Do not cherry-pick quotes to support a predetermined narrative
- Distinguish between observed behavior and interpretation
- Report confidence levels alongside findings

### Stakeholder Management
- Present findings objectively, without advocacy
- Let the data speak — resist pressure to soften negative findings
- Frame negative findings as opportunities, not criticism
- Acknowledge when research contradicts stakeholder assumptions
- Provide recommendations, not ultimatums
