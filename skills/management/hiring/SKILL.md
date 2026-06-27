---
name: management-hiring
description: >
  Use this skill when the user says 'hiring', 'interviewing', 'technical interview', 'coding interview', 'system design interview', 'interview rubric', 'candidate assessment', 'interview debrief', 'offer decision', 'interview process', 'phone screen', 'onsite interview', 'behavioral interview', 'HackerRank', 'CodeSignal', 'interview pipeline', 'candidate evaluation', 'interview scoring', 'anti-bias hiring'. This skill enforces: structured interview rubrics with scoring criteria per skill dimension, multi-format technical assessment (coding, system design, debugging), behavioral evaluation aligned to company values using STAR method, consistent debrief process with calibration, data-driven offer decisions using decision matrix, anti-bias practices, and positive candidate experience. Do NOT use for: performance reviews, career development, or team structuring.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [management, hiring, phase-10]
---

# Hiring and Interviewing

## Purpose
Design a structured hiring process with objective rubrics,
consistent evaluation, bias-resistant practices, and clear
decision criteria for technical and behavioral roles.
Covers pipeline design, rubric creation, coding platforms,
system design framework, debrief protocol, offer matrix,
and candidate experience.

## Framework and Methodology

### Structured Hiring Framework
The structured hiring methodology rests on four pillars:
1. **Job analysis** -- define competencies before sourcing.
2. **Multi-signal evaluation** -- each interview targets distinct dimensions.
3. **Calibrated scoring** -- rubrics standardise judgement across interviewers.
4. **Data-driven decisions** -- offer matrix replaces gut feeling.

### Competency-Based Assessment
Every dimension evaluated must trace back to on-the-job performance.
Map each rubric criterion to a specific job behaviour:

```
Competency: Distributed Systems Design
  Sub-dimension        Evidence Source            Weight
  Data partitioning    System design session      30%
  Consistency models   System design session      25%
  Fault tolerance      System design session      25%
  Trade-off analysis   System design session      20%
```

### STAR Behavioural Method
Situation, Task, Action, Result framework for behavioural questions.
Evaluate candidates on specific past behaviour, not hypothetical answers.

```
Question: Tell me about a time you handled a production incident.
  S: Service degrading under load, customer complaints.
  T: Restore service, identify root cause, prevent recurrence.
  A: Triaged, rolled back, wrote post-mortem, added monitoring.
  R: P50 latency reduced, no repeat incident in 6 months.
```

### Decision Matrix Architecture
Weighted scoring across all interviewers and dimensions.
Normalise scores before combining. Apply must-have gates first.

```
Dimension          Weight  Score  Weighted
Coding             40%     3.5    1.40
System Design      30%     3.0    0.90
Behavioral         30%     4.0    1.20
Total              100%    3.50   3.50 (pass >= 3.0)
Must-haves met: yes
```

## Agent Protocol

### Trigger
"hiring", "interviewing", "technical interview",
"coding interview", "system design interview",
"interview rubric", "candidate assessment",
"interview debrief", "offer decision",
"interview process", "phone screen", "onsite interview",
"behavioral interview", "interview pipeline",
"candidate evaluation", "interview scoring",
"HackerRank", "CodeSignal", "interview bias",
"structured interview", "STAR method", "interview calibration".

### Input Context
- Role level (junior, mid, senior, staff, principal)
- Role type (backend, frontend, mobile, DevOps, ML, data, SRE)
- Team size and composition
- Company stage (startup, growth, enterprise)
- Interview stages currently in use
- Existing rubric or evaluation form (if any)
- Hiring volume (continuous vs batch)

### Output Artifact
Hiring plan with interview format per stage,
evaluation rubrics, question bank outline,
debrief process, and offer decision framework.

### Response Format
```
Hiring Plan: {role}
Level: {level}
Stages: {n}
+-- Phone Screen ({length} min): {format}
+-- Coding ({length} min): {rubric}
+-- System Design ({length} min): {rubric}
+-- Behavioral ({length} min): {rubric}
Debrief: {same-day/next-day}, {n} interviewers
Offer Criteria: {threshold} across {n} dimensions
```
No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output -- why use many token when few do trick.

### Completion Criteria
- [ ] Interview stages defined with time allocation per stage
- [ ] Rubrics created for each interview type
- [ ] Question bank outline with difficulty levels per stage
- [ ] Debrief process with calibration and conflict resolution
- [ ] Offer decision criteria with must-haves vs nice-to-haves
- [ ] Bias mitigation measures documented
- [ ] Candidate experience process defined
- [ ] Anti-bias training and practices documented

### Max Response Length
400 lines

## Workflow

### Step 1: Design Interview Pipeline
Stage 1 -- Phone screen: 30 minutes.
Resume review against 5-7 must-have criteria.
Criteria defined before job posting.
Cover motivation, availability, salary, basic role alignment.
Score 1-5: 1-2 reject, 3 advance, 4-5 strong advance.

Stage 2 -- Technical assessment.
Choose format per role:
Take-home (4-8 hours, compensated for senior).
Async coding on HackerRank or CodeSignal.
Pairing session (45 min live -- preferred signal).

Stage 3 -- Onsite: 3-4 sessions.
Coding 45-60 min, system design 45-60 min,
behavioral 45 min, optional debugging or API design.
Sessions scored independently -- no shared rubrics.

Stage 4 -- Debrief within 24 hours.
Stage 5 -- Offer with reference checks.

**Pipeline metrics to track:**
- Conversion rate per stage (screen -> onsite -> offer -> accept)
- Average days per stage
- Drop-off by demographic group
- Interviewer score distribution (calibration)

### Step 2: Create Rubrics
Scale 1-4:
1: Strong no -- clear gap, would not hire.
2: No -- some signals but insufficient to advance.
3: Yes -- meets expectations, strong enough to hire.
4: Strong yes -- exceptional candidate, rare.

Coding rubric dimensions:
- Problem-solving: approach, exploration, tradeoffs.
- Communication: clarity, questions, thinking aloud.
- Code quality: clean, idiomatic, well-structured.
- Testing: edge cases, error states, testability.

System design rubric dimensions:
- Requirements: clarification, scope, priorities.
- Architecture: structure, components, data flow.
- Scalability: sharding, caching, CDN, queues.
- Tradeoffs: multiple options with rationale.

Behavioral rubric dimensions:
- Collaboration: teamwork, unblocking, inclusion.
- Ownership: proactive, drives outcomes.
- Growth mindset: seeks feedback, improves.
- Communication: clear, concise, tailored.

**Rubric calibration process:**
1. All interviewers score a sample recorded interview independently.
2. Compare scores and discuss deviations larger than 1 point.
3. Align on interpretation of each rubric level.
4. Repeat quarterly or after every 20 candidates.

### Step 3: Build Question Bank
Coding by difficulty:
Easy: string manipulation, array algorithms.
Medium: graph traversal, dynamic programming.
Hard: distributed algorithm, optimization.

System design by scope:
Small: URL shortener, rate limiter.
Medium: chat system, news feed, payment.
Large: distributed database, video streaming.

Behavioral categories:
Conflict resolution, failure and learning,
cross-team collaboration, leadership without authority,
prioritization, influencing.

Each question includes: prompt, expected solution outline,
scoring guidance, common mistakes, follow-up questions.
Tagged by role type and seniority level.
Review quarterly for freshness and relevance.

**Question freshness rules:**
- Retire questions exposed in public repositories.
- Rotate pool so no candidate receives identical questions.
- Track question discrimination index: does the question differentiate strong from weak candidates.

### Step 4: Conduct Debrief
Schedule within 24 hours of onsite completion.
Attendees: all interviewers, hiring manager, recruiter.

Each submits written scores silently before meeting.
Prevents anchoring on first opinion shared.

Discussion: each shares score and rationale.
Focus on specific behaviors observed.
Calibrate discrepancies: one scores 1, others 3.
Discuss signals, not personalities.

Flag bias signals:
- Similarity bias: liking candidate like self.
- Halo effect: one strong trait colors all.
- Negativity bias: one mistake dominates.
- Confirmation bias: seeking evidence for first impression.

Decisions:
- Hire: average >= 3, no dimension under 2.
- No-hire: average under 2.5, any critical under 2.
- Leaning-no: discuss, consider extra interview or feedback.

**Debrief escalation:**
If consensus cannot be reached after 15 minutes of discussion,
the hiring manager makes the final call and documents rationale.

### Step 5: Make Offer Decision
Compile scores across dimensions and interviewers.
Decision matrix: weigh by role priority.
Backend: coding 40%, design 30%, behavioral 30%.
Manager: behavioral 40%, design 30%, coding 30%.

Must-haves: minimum score on each critical dimension.
Nice-to-haves: additional signals that differentiate.

Consider: interview performance, experience level,
team fit (behavioral criteria only), growth trajectory,
counteroffer risk.

Set offer range from market data, level, location.
Expiration: 7-10 business days standard.

Reference checks: 2-3 professional references.
Focus on collaboration, growth, impact.
Verify must-haves against reference feedback.

**Offer negotiation playbook:**
- Know walk-away threshold before making offer.
- Escalate counteroffers to recruiter for creative packages.
- Track accept/reject rate by offer band.

### Step 6: Candidate Experience
Pre-onsite: send schedule and names 24 hours before.
Clear format, duration, and tools per session.
Ask about accommodation needs proactively.

Post-onsite: feedback within 48 hours.
Rejection within 24 hours with actionable feedback.
No ghosting -- every candidate receives outcome.

Collect NPS after each onsite.
"How likely to recommend this process?"

Track: time-to-fill (30-45 days), stage drop-off,
offer acceptance (over 80%), NPS (over 50),
demographic breakdown at each stage.

**Candidate experience benchmarks:**
- NPS over 50: good candidate experience.
- Time-to-offer under 14 days for top candidates.
- Response to application within 5 business days.

### Step 7: Anti-Bias Practices
Structured: same questions, rubric, time, criteria
for every candidate in the same role.

Panel diversity: at least one interviewer from
underrepresented group. Rotate across candidates.

Score first, discuss second: prevents anchoring
and groupthink in evaluation discussions.

Blind resume: remove name, photo, university,
graduation year, years of experience initially.

Criteria defined before interviews begin.
No moving goalposts mid-process.

Mandatory interviewer training: bias awareness,
structured interview technique, rubric calibration.
Track demographics to detect pipeline bias.

**Bias detection metrics:**
- Pass rate variance across demographic groups at each stage.
- Interviewer score pattern analysis (consistently scores groups differently).
- Language analysis of debrief notes (use of stereotypical language).

## Common Pitfalls

1. **Evaluating candidates against each other** rather than against rubric. Always score independently before comparing.
2. **Recency bias**: weighting the last interview more heavily. Collect and review all scores before debrief.
3. **Using culture fit as a dimension**: too vague and bias-prone. Use specific behavioral criteria instead.
4. **Asking trick questions**: brainteasers and riddles have no correlation with job performance.
5. **Allowing one interviewer to dominate debrief**: silent scoring prevents anchoring from loud voices.
6. **Moving goalposts mid-process**: changing criteria after some candidates have been evaluated invalidates comparison.
7. **Neglecting reference checks**: references catch red flags missed in interviews.
8. **Slow feedback**: candidates lose interest if process drags beyond 2 weeks.
9. **Over-weighting coding over communication**: both matter for team effectiveness.
10. **No interviewer training**: untrained interviewers produce inconsistent, biased evaluations.

## Best Practices

- Run a pilot hiring round with the rubric before opening the role to all candidates.
- Rotate interviewers across stages to prevent fatigue.
- Write feedback in terms of specific observable behaviour, not personality traits.
- Use a standardised feedback form with required fields for every dimension.
- Benchmark question difficulty by having the team solve it first.
- Calibrate rubrics with mock interviews before going live.
- Share aggregated demographics at each pipeline stage with the hiring team.
- Provide structured feedback to rejected candidates within 24 hours.
- Use a decision matrix that weighs dimensions by role seniority.
- Conduct stay interviews with new hires after 90 days to validate hiring process.

## Compared With

| Approach | Strengths | Weaknesses |
|---|---|---|
| Structured rubric (this skill) | Fair, repeatable, bias-resistant | Requires upfront work |
| Unstructured conversation | Quick, feels natural | Bias-prone, inconsistent |
| Take-home project | Real-world signal | High candidate time cost |
| Whiteboard coding | Tests problem-solving under pressure | Unnatural, anxiety-inducing |
| Hackathon-style | Observes collaboration over hours | Hard to scale |
| Work sample test | Best predictor of performance | Requires job-relevant task design |
| Behavioral event interview | Validated by research | Needs trained interviewers |
| Brainteasers | Fun for interviewers | Zero predictive validity |

## Templates and Tools

### Score Sheet Template
```
Candidate: __________  Interviewer: __________  Stage: __________
Dimension              Score (1-4)   Evidence
Problem-solving        ___
Communication          ___
Code quality           ___
Testing                ___
Overall                ___
Must-haves met:  Y / N
Red flags:
```

### Debrief Agenda Template
```
1. Silent score review (5 min)
2. Round-robin each interviewer (15 min)
3. Calibrate discrepancies (10 min)
4. Final decision vote (5 min)
5. Action items: offer, rejection, or extra round (5 min)
```

### Reference Check Template
```
Candidate: __________  Reference: __________  Relationship: __________
1. How would you rate the candidate's collaboration skills?
2. Tell me about a time the candidate handled a disagreement.
3. What areas of growth did the candidate have?
4. Would you hire this person again? Why or why not?
5. Is there anything else we should know?
```

## Rules
- Every interviewer scores on rubric before discussion.
- No "culture fit" as dimension -- use specific behavioral criteria.
- Must-haves vs nice-to-haves defined before process starts.
- Structured interviews reduce bias -- same questions, time, rubric for all candidates.
- Debrief based on average scores, not loudest voice.
- Interview training mandatory before conducting any interviews.
- Feedback written in actionable terms, not generic.
- Timely, respectful communication to every candidate within 24 hours of decision.
- Rubric calibration every 3-6 months across entire interviewing team.
- Track funnel metrics to identify and fix bias by demographic group.
- No brainteasers or trick questions in any interview.
- At least one interviewer from underrepresented group on every panel.
- Reference checks conducted for all offer candidates.
- Offer decision documented with rationale, not just score.
- Interview questions reviewed quarterly for freshness and discrimination power.
- Score first, discuss second in every debrief session.

## References
  - references/evaluation-rubric.md -- Evaluation Rubric
  - references/hiring-advanced.md -- Hiring Advanced Topics
  - references/hiring-fundamentals.md -- Hiring Fundamentals
  - references/interview-process.md -- Interview Process Design
  - references/interview-questions.md -- Interview Questions
  - references/interview-rubrics.md -- Interview Rubrics
  - references/hiring-interview-frameworks.md -- Hiring Interview Frameworks
  - references/hiring-evaluation-decision.md -- Hiring Evaluation and Decision

## Handoff
`management/team-rules` for onboarding new hires
`planning/create-roadmap` for capacity planning

## Architecture Decision Trees

### Interview Process Design
| Decision Point | Option A | Option B | Decision Criteria |
|---|---|---|---|
| Interview format | Structured (consistent, fair) | Unstructured (conversational) | Legal compliance, scale, role type |
| Technical assessment | Take-home project (realistic) | Live coding (pressure test) | Candidate preference, time constraints |
| Panel size | 2-3 interviewers (efficient) | 4-5 interviewers (diverse input) | Seniority of role, bias reduction goals |

### Role Leveling Decision
- Individual Contributor → Technical screen + coding + system design + behavioral
- Manager → Technical screen + people scenarios + case study + stakeholder panel
- Executive → Presentation + strategy case + board panel + culture fit with CEO

## Implementation Patterns

### Interview Scorecard Template
`markdown
## Candidate: {name} | Role: {title} | Interviewer: {name}

### Technical Competence (1-5)
- Problem-solving approach: ___
- Code quality & structure: ___
- Edge case handling: ___
- Communication: ___

### Behavioral (1-5)
- Collaboration examples: ___
- Conflict resolution: ___
- Ownership demonstrated: ___

### Verdict
- Score: ___/40
- Recommendation: [Strong Yes / Yes / No / Strong No]
- Notes: ___
`

### Offer Letter Template
`markdown
Dear {candidate},

We are delighted to offer you the position of {title} at {company}.

## Offer Details
- Base salary: {amount}
- Equity: {shares / options}
- Start date: {date}
- Reporting to: {manager}

## Benefits
- Health insurance: {details}
- PTO: {days}
- Remote policy: {details}

This offer expires {date}. Please sign and return by {deadline}.
`

## Production Considerations

### Pipeline Management
- **SLA for feedback**: Require interviewer feedback within 24 hours. Use reminder automation for pending feedback.
- **Candidate experience**: Send timely updates at each stage. Provide constructive rejection feedback when possible.
- **Offer velocity**: Target < 5 business days from final interview to offer. Have offer approval pre-authorized for strong candidates.

### Legal Compliance
- **Structured interviews**: Use same questions for all candidates for same role. Document interview process for audit.
- **EEO compliance**: Track diversity metrics across pipeline. Review for adverse impact on protected groups.
- **Data retention**: Store candidate data per GDPR/CCPA requirements. Auto-delete after 12 months post-decision.

## Anti-Patterns

| Anti-Pattern | Symptom | Solution |
|---|---|---|
| Culture fit as excuse | Homogenous hiring | Define culture add, not culture fit. Use structured values assessment |
| Resume screening bias | Skipping qualified non-traditional candidates | Blind resume review, skills-based assessment first |
| Panel groupthink | First impression dominates | Collect scores independently before discussion |
| Ghosting candidates | Bad Glassdoor reputation | Set expectations on timeline, send auto-updates |
| Over-indexing on whiteboarding | Misses great engineers | Offer alternative assessment formats |

## Performance Optimization

### Time-to-Hire Reduction
- **Asynchronous screening**: Use recorded video answers for initial screening. Review on-demand, schedule only promising candidates.
- **Calibrated interviewers**: Quarterly calibration sessions to align scoring. Reduce false negatives from overly strict interviewers.
- **Offer acceleration**: Pre-approve offer ranges for common roles. Delegated signing authority for hiring managers.

### Quality of Hire
- **Skills-based hiring**: Replace resume screens with work-sample tests. Validate actual ability, not credential signaling.
- **Structured reference checks**: Use competency-based reference questions. Call references after final interview, not before.
- **Hiring manager training**: Train managers on interviewing best practices. Reduce interviewer bias through awareness training.

## Security Considerations

### Data Privacy
- **Candidate data**: Encrypt resumes and interview notes at rest. Limit access to hiring team and HR only.
- **Background checks**: Obtain explicit consent before running background checks. Store results in separate secured system.
- **Interview recordings**: Obtain consent for recorded interviews. Delete recordings within 30 days of decision.

### Anti-Fraud
- **Identity verification**: Verify candidate identity during video interviews. Use background checks for final candidates.
- **Credential verification**: Verify claimed degrees and certifications. Check work history references thoroughly.
- **Offer security**: Send offers through secure portals, not unencrypted email. Require signed acceptance with ID verification.
