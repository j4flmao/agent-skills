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
Design and execute UX research with method selection, structured protocols, and systematic synthesis. Covers generative and evaluative methods, user interview protocols, moderated and unmoderated usability testing, data-driven persona creation, journey mapping, and findings synthesis frameworks. The goal is to reduce design risk by validating assumptions with real user data.

## Agent Protocol

### Trigger
Exact user phrases: "UX research", "user research", "usability testing", "user interview", "persona", "user journey", "information architecture", "card sorting", "research plan", "research method", "user study", "affinity mapping", "thematic analysis", "moderated test", "unmoderated test", "NPS", "SUS", "CSAT".

### Input Context
Before activating, verify:
- Product stage: discovery / alpha / beta / live
- Research question or hypothesis
- Available participants and timeline
- Budget and tools available (remote testing platforms, recording)
- Existing UX artifacts (analytics, support tickets, previous research)
- Stakeholder expectations and key decisions riding on this research
- Acceptable risk level (how wrong can we afford to be?)

### Output Artifact
UX research plan with method selection, interview or test protocol, and synthesis framework.

### Response Format
- Research plan: method, participants, timeline
- Protocol: questions, tasks, scenarios with time allocations
- Synthesis framework: affinity mapping, persona, journey map
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Research question defined with hypothesis
- [ ] Method selected (generative or evaluative) with rationale
- [ ] Participant criteria defined (segments, sample size, screener)
- [ ] Interview or test protocol written with timed sections
- [ ] Synthesis method chosen (affinity mapping, thematic analysis)
- [ ] Output artifacts specified (personas, journey maps, findings report)
- [ ] Metrics defined for evaluative research (task completion, SUS, NPS)
- [ ] Research artifacts stored in shared repository
- [ ] Findings presented to stakeholders with actionable recommendations

### Max Response Length
150 lines of plan and protocol.

## Framework/Methodology

### The Research Funnel

```
Business Problem
  ↓
Research Goal (what we need to know)
  ↓
Research Question (specific, answerable question)
  ↓
Method Selection (generative vs evaluative)
  ↓
Study Design (participants, protocol, metrics)
  ↓
Data Collection (sessions, surveys, observations)
  ↓
Analysis & Synthesis (patterns, themes, insights)
  ↓
Reporting (findings, recommendations, next steps)
```

### Method Selection by Product Stage

| Stage | Question Type | Primary Methods | Secondary Methods | Output |
|-------|--------------|-----------------|-------------------|--------|
| Discovery | What should we build? | Generative interviews, diary studies, field observation | Competitive analysis, contextual inquiry | Problem space definition, user needs |
| Alpha | Does this concept work? | Concept testing, prototype feedback, co-creation | Card sorting, tree testing | Concept validation, IA direction |
| Beta | Can users use this? | Moderated usability testing, A/B testing | Surveys, analytics review | Usability issues, metrics baseline |
| Live | Should we change this? | Unmoderated testing, surveys, analytics | Longitudinal studies, log analysis | Optimization opportunities, satisfaction data |

### Research Methods Matrix

| Method | Type | Phase | Data | Participants | Cost |
|--------|------|-------|------|-------------|------|
| User interviews | Generative | Discovery | Qualitative | 5-8/segment | Medium |
| Diary study | Generative | Discovery | Qualitative | 8-12 | High |
| Field observation | Generative | Discovery | Qualitative | 5-10 | High |
| Card sorting | Generative | Alpha | Mixed | 20-50 | Low |
| Contextual inquiry | Generative | Discovery | Qualitative | 5-8 | High |
| Concept testing | Evaluative | Alpha | Qualitative | 5-8 | Medium |
| Moderated usability | Evaluative | Beta | Mixed | 5-8 | Medium |
| Unmoderated usability | Evaluative | Beta | Quantitative | 20-50 | Low |
| Tree testing | Evaluative | Alpha/Beta | Quantitative | 20-50 | Low |
| A/B testing | Evaluative | Live | Quantitative | High volume | Medium |
| Surveys | Evaluative | Any | Quantitative | 50-500 | Low |
| Analytics | Evaluative | Live | Quantitative | All users | Low |
| Customer feedback | Generative | Live | Qualitative | Variable | Low |

### Triangulation Framework
Strongest insights come from combining multiple methods:

```
Qualitative (why?)
  + Quantitative (how many?)
  + Behavioral (what do they actually do?)
  = Triangulated Insight (confident, actionable understanding)
```

Example: Low NPS score (quantitative) → User interviews (qualitative) reveal top frustration → Session replays (behavioral) confirm frequency → Triangulated insight: specific feature redesign needed.

## Workflow

### Step 1: Define Research Question & Hypothesis
Format: "How do [users] currently [task] and what prevents them from [desired outcome]?"
Hypothesis: "We believe [proposed solution] will [outcome] because [reason]."

Align question with product stage:

| Stage | Question Type | Method |
|-------|---------------|--------|
| Discovery | Open-ended exploration | Interviews, diary studies |
| Alpha | Concept validation | Concept testing, prototypes |
| Beta | Usability validation | Moderated/unmoderated testing |
| Live | Satisfaction/retention | Surveys, analytics |

Research question quality checklist:
- Is it specific enough to be answered within the study?
- Is it broad enough to allow unexpected findings?
- Does it focus on user behavior, not product features?
- Does it avoid leading toward a particular answer?
- Would the answer inform a concrete decision?

### Step 2: Select Research Method

| Method | Type | Participants | Best For |
|--------|------|-------------|----------|
| User interviews | Generative | 5-8 per segment | Deep understanding, problem discovery |
| Diary study | Generative | 8-12 | Longitudinal behavior tracking |
| Usability testing (moderated) | Evaluative | 5-8 | In-depth usability issues |
| Usability testing (unmoderated) | Evaluative | 20-50 | Scale, task completion metrics |
| Survey | Evaluative | 50-500 | Satisfaction, NPS, feature prioritization |
| Card sorting | Generative | 20-50 | Information architecture validation |
| Tree testing | Evaluative | 20-50 | Navigation findability |

### Step 3: Participant Recruitment
Define screener criteria: demographics, behavior (frequency of use, tool familiarity), attitudinal (openness to change).

| Channel | Cost | Speed | Best For |
|---------|------|-------|----------|
| Existing user base | Low | Fast | Current users |
| Panels (UserTesting, etc.) | Medium-High | Fast | General population |
| Social media | Low | Medium | Niche audiences |
| Intercept/on-site recruitment | Low | Slow | In-product users |

Incentives: $50-100/hr for professionals, gift cards for consumers.

Screener best practices:
- 5-10 questions (filtering only, not research questions)
- Include at least one behavior-based question ("How often do you...")
- Include attention check questions to detect bots
- Over-recruit by 20% to account for no-shows
- Confirm consent and recording permission at screening stage

### Step 4: Write Research Protocol

| Section | Duration | Content |
|---------|----------|---------|
| Introduction | 5 min | Consent, recording, "there are no wrong answers" |
| Warm-up | 5 min | Background, current tools, role |
| Main tasks | 20-30 min | Scenarios, observe don't guide, think-aloud |
| Debrief | 5 min | Reflection, "anything we missed?" |

Question types:
- "Tell me about the last time you [task]" — open-ended, behavioral
- "What was frustrating about that?" — pain points
- "Walk me through how you [subtask]" — process mapping

Avoid: leading questions, hypotheticals ("would you use..."), double-barreled questions.

Probing techniques:
- Active listening: Repeat back what user said to confirm understanding
- Laddering: "Why is that important to you?" repeated until core value emerges
- Silence: Wait 5-7 seconds after user finishes speaking — they often add more
- Clarifying: "Help me understand what you mean by X"
- Echo: Repeat the last 2-3 words as a question

### Step 5: Conduct Moderated Usability Testing
Tasks should be scenario-based: "You need to find a specific order from last week. Please try to do that now."
Measure: task completion (pass/fail), time-on-task, error rate, satisfaction rating.
After each task: Single Ease Question (SEQ) — "Overall, how difficult was this task?" (1-7).

Moderator best practices:
- Read tasks verbatim from protocol (don't paraphrase)
- If user gets stuck, wait 30 seconds before prompting
- Use "What are you thinking?" instead of guiding
- Do NOT help users complete tasks (unless the test measures support needs)
- Take notes on observations, not interpretations
- Switch observers during the session for fresh perspective

### Step 6: Synthesize Findings

| Method | Output | Tool |
|--------|--------|------|
| Affinity mapping | Themed clusters | Miro, Mural, FigJam, physical sticky notes |
| Persona creation | Data-driven archetype | Template with goals, frustrations, behaviors |
| Journey mapping | Visual timeline | Miro, Smaply, LucidChart |

Affinity mapping process:
1. Transcribe sessions → extract atomic observations
2. Cluster naturally — no labels yet
3. Label clusters when stable
4. Prioritize by frequency, severity, or business impact
5. Write one insight sentence per cluster

Persona template: Name, role, photo, bio (2-3 sentences), goals (primary + secondary), frustrations (3-5), behaviors, quote.

Persona quality criteria:
- Based on data from at least 3 participants per persona
- Includes specific behaviors, not just demographics
- Distinguishable from other personas (unique goals, pain points)
- Grounded in real quotes and observations
- Actionable for design and product decisions

Journey mapping stages:
1. Define scope: which persona, which scenario, which timeframe
2. List stages: Awareness → Consideration → Decision → Onboarding → Usage → Support
3. Per stage: actions, thoughts, feelings, pain points, opportunities
4. Emotional journey line showing highs and lows
5. Opportunities and recommendations per stage

### Step 7: Produce Findings Report
Structure: executive summary → method overview → participant profile → 3-5 key findings (each with evidence, severity) → opportunities/recommendations → appendix.

Every finding links to source evidence (participant quote, task metric, screenshot).

Finding severity classification:

| Severity | Definition | Action Required |
|----------|------------|-----------------|
| Critical | Users cannot complete core task | Fix immediately |
| Major | Users can complete but with significant friction | Fix before next release |
| Minor | Users complete but experience frustration | Address in near term |
| Suggestion | Improvement opportunity | Prioritize against other work |

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Leading questions | "How would you improve X?" assumes they should | "Tell me about your current process" |
| Hypotheticals | "Would you use this feature?" unreliable | Observe behavior with a prototype |
| Confirmation bias | Asking questions to prove a hypothesis | Listen for disconfirming evidence |
| Small sample for surveys | <50 responses not statistically significant | Don't report percentages from small samples |
| Personas based on assumptions | No research behind persona attributes | Every attribute must trace to research data |
| Ignoring edge cases | Only studying mainstream users | Recruit power users and non-users |
| No pilot test | Protocol bugs discovered during real sessions | Always pilot with 1-2 internal participants |
| Solutioneering | Participants become feature request machines | Redirect: "Tell me what you're trying to do" |
| Culture of agreement | Participants want to be helpful, give positive feedback | Normalize criticism: "We need your honest feedback to improve" |
| Analysis delay | Waiting too long to synthesize between sessions | Synthesize within 48 hours of each session |

## Best Practices

| Practice | Why |
|----------|-----|
| 5 participants per segment | Catches ~85% of usability issues (Nielsen Norman) |
| Pilot test your protocol | Catches ambiguous questions, timing issues |
| Record sessions | Enables post-hoc analysis and quote extraction |
| Mix qualitative and quantitative | Qualitative explains why, quantitative confirms patterns |
| Include a debrief question | "Is there anything we should have asked?" catches blind spots |
| Take individual notes before group synthesis | Prevents groupthink in analysis |
| Share raw data alongside synthesized findings | Allows others to verify your conclusions |
| Timebox synthesis sessions | Prevents analysis paralysis: 2x research time |
| Present findings as opportunities, not just problems | Drives action, not blame |
| Research repository enables longitudinal insights | Prevents re-studying known issues |

## Templates & Tools

### Research Plan Template
```
Project: {project name}
Date: {date}
Researcher: {name}
Stakeholders: {names}

Research Question: {question}
Decision: {what we will decide based on findings}

Method: {method name}
Participants: {N} from {segment}
Session Length: {minutes}
Timeline: {start} to {end}

Protocol Sections:
1. {section} — {duration} — {purpose}
2. {section} — {duration} — {purpose}

Metrics (evaluative only):
- Task completion: target >{X}%
- SEQ: target >{X}
- SUS: target >{X}

Outputs:
- {artifact}
- {artifact}
```

### Usability Test Task Template
```
Task {N}: {scenario description}
Scenario: "{realistic scenario text}"
Success Criteria: {what counts as task completion}

Measurement:
- [ ] Task completed (first attempt)
- [ ] Task completed (with help)
- [ ] Task failed
- Time on task: {measurement}
- Errors: {count and describe}

Post-task: SEQ score: {1-7 scale}
Post-task: Any comments: {open text}

Observer Notes:
{observations during task}
```

### Research Repository Structure
```
/research
  /{year}-{project-name}
    /raw-data
      session-recordings/
      transcripts/
      survey-responses.csv
    /analysis
      affinity-map.{tool}
      themes.md
      personas.md
    /reports
      findings-report.{format}
      presentation.{format}
    /artifacts
      consent-form.pdf
      screener.pdf
      protocol.pdf
```

### Tools by Research Activity

| Activity | Tools |
|----------|-------|
| Session recording | Zoom, Lookback, UserTesting, Riverside |
| Transcripts | Dovetail, Otter.ai, Rev, Descript |
| Affinity mapping | Miro, Mural, FigJam, Excel |
| Survey | Typeform, SurveyMonkey, Google Forms |
| Card sorting | OptimalSort, UserZoom, Miro |
| Tree testing | Treejack, UserZoom |
| Prototype testing | Maze, UserTesting, Lookback |
| Research repository | Dovetail, Condens, Aurelius, Airtable |

## Case Studies

### Case Study 1: Diary Study Reveals Hidden Workflow
A collaboration SaaS assumed users worked in linear project phases (plan, execute, review). A 2-week diary study with 10 project managers showed that work was actually highly iterative and non-linear with frequent context switching. The study uncovered that the product's linear workflow was the #1 cause of user frustration. Redesigning for non-linear workflows reduced task completion time by 35% and improved satisfaction by 40%.

Method: 14-day diary study with 10 project managers, daily prompts + weekly interviews
Key insight: User workflow was non-linear and iterative, opposite of product design assumption
Impact: Task completion time -35%, satisfaction +40%

### Case Study 2: Unmoderated Usability Testing at Scale
An e-commerce platform needed to test a redesigned checkout flow. Using an unmoderated testing platform, they collected data from 45 participants in 3 days (vs 2-3 weeks for moderated). The study identified 7 critical issues and 12 minor issues. The critical issues included: unclear shipping cost display, confusing payment options, and a non-obvious "apply coupon" interaction. Fixing these issues recovered an estimated 8% in checkout conversion.

Method: Unmoderated usability testing (45 participants, 3 days)
Key insight: Cost-effective scale unmoderated testing catches issues quickly
Impact: 8% checkout conversion recovered by fixing critical issues

### Case Study 3: Persona-Driven Redesign
A B2B analytics platform had a single dashboard design for all users. UX research involving 18 interviews and a 200-person survey revealed 4 distinct user types with fundamentally different needs. The "Executive" persona needed high-level KPIs and trends; the "Analyst" persona needed raw data exploration and export. Creating persona-specific dashboards increased daily active usage by 45% and reduced support tickets by 30%.

Method: 18 interviews + 200-response survey → 4 validated personas
Key insight: One-size-fits-all design was serving no segment well
Impact: DAU +45%, support tickets -30%

## Rules
- Interview questions are always open-ended first — never lead the participant
- Usability tests measure task completion, time-on-task, error rate, and satisfaction
- Personas are based on research data, not assumptions
- Journey maps include emotional highs and lows — not just actions
- Findings without evidence are opinions — tag every finding to a participant quote
- Sample size of 5 per segment catches ~85% of usability issues (Nielsen Norman)
- Never use customers as designers — ask "what do you do", not "what should we build"
- Always pilot test the protocol with 1-2 internal participants before real sessions
- Record sessions only with explicit participant consent
- Transcribe sessions within 72 hours for accurate analysis
- Decompress between sessions (take 10 min minimum break)
- Include observers from cross-functional teams in at least some sessions
- Report severity alongside every finding
- Limit survey length to 20 questions or 10 minutes
- Debrief as a team within 2 hours of each session day
- Timebox affinity mapping to avoid analysis paralysis (2x session time)
- Offer participants the option to review their quotes in context before publication

## References
  - references/research-methods.md — Research Methods Reference
  - references/synthesis-frameworks.md — Synthesis Frameworks Reference
  - references/synthesis.md — Synthesis
  - references/usability-testing-guide.md — Usability Testing Guide
  - references/ux-research-advanced.md — Ux Research Advanced Topics
  - references/ux-research-fundamentals.md — Ux Research Fundamentals
  - references/ux-research-methods.md — UX Research Methods
  - references/ux-research-data-analysis.md — UX Research Data Analysis
## Handoff
`design-prototyping` for interactive prototypes based on research insights.
Carry forward: research findings, persona profiles, journey maps.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Architecture Decision Trees

### Research Method Decision Tree
`
What phase is the product in?
  ├── Discovery → Generative research (interviews, diary studies, field observation)
  ├── Definition → Descriptive research (surveys, competitive analysis, analytics)
  └── Evaluation → Evaluative research (usability testing, A/B testing, tree testing)
       What is the research question type?
       ├── Behavioral (what users do) → Analytics, usability testing, field studies
       └── Attitudinal (what users say) → Surveys, interviews, focus groups
            Required confidence level?
            ├── High (statistically significant) → Quantitative (surveys, A/B tests, analytics)
            └── Medium (directional) → Qualitative (interviews, usability tests, diary studies)
`

### Participant Recruiting Decision Tree
`
Who are the target users?
  ├── Existing customers → In-app recruitment, CRM outreach, email lists
  └── New/prospective users → Third-party panels (UserInterviews, Respondent), social media
       How many participants needed?
       ├── Qualitative (5-8 per segment) → Saturated insights, detailed feedback
       └── Quantitative (100+ per segment) → Statistical significance, segmentation analysis
            Budget for incentives?
            ├── Yes → Professional recruiting with screened participants
            └── No  → Internal recruiting, friends-and-family, social media
`

## Test Plan: [Feature Name]
### Goals
- [Primary research question]
- [Secondary research question]
### Methodology
- Type: Moderated/Unmoderated remote
- Duration: 45 minutes
- Participants: 6-8 per segment
### Tasks
1. [Task name] - [Success criteria] - [Metric: success rate, time on task]
2. [Task name] - [Success criteria] - [Metric: success rate, time on task]
### Analysis Plan
- Task success rate threshold: 80%
- Time on task benchmark: < 2 minutes
- SUS score target: > 68
### Artifacts
- Task scenarios document
- Consent form
- Screen reader checklist
`
