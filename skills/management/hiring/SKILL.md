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
  windsurf: true
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
├── Phone Screen ({length} min): {format}
├── Coding ({length} min): {rubric}
├── System Design ({length} min): {rubric}
└── Behavioral ({length} min): {rubric}
Debrief: {same-day/next-day}, {n} interviewers
Offer Criteria: {threshold} across {n} dimensions
```
No preamble. No postamble. No explanations. No filler/hedging/transitions.
Compress output — why use many token when few do trick.

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
Stage 1 — Phone screen: 30 minutes.
Resume review against 5-7 must-have criteria.
Criteria defined before job posting.
Cover motivation, availability, salary, basic role alignment.
Score 1-5: 1-2 reject, 3 advance, 4-5 strong advance.

Stage 2 — Technical assessment.
Choose format per role:
Take-home (4-8 hours, compensated for senior).
Async coding on HackerRank or CodeSignal.
Pairing session (45 min live — preferred signal).

Stage 3 — Onsite: 3-4 sessions.
Coding 45-60 min, system design 45-60 min,
behavioral 45 min, optional debugging or API design.
Sessions scored independently — no shared rubrics.

Stage 4 — Debrief within 24 hours.
Stage 5 — Offer with reference checks.

### Step 2: Create Rubrics
Scale 1-4:
1: Strong no — clear gap, would not hire.
2: No — some signals but insufficient to advance.
3: Yes — meets expectations, strong enough to hire.
4: Strong yes — exceptional candidate, rare.

Coding rubric dimensions:
Problem-solving: approach, exploration, tradeoffs.
Communication: clarity, questions, thinking aloud.
Code quality: clean, idiomatic, well-structured.
Testing: edge cases, error states, testability.

System design rubric dimensions:
Requirements: clarification, scope, priorities.
Architecture: structure, components, data flow.
Scalability: sharding, caching, CDN, queues.
Tradeoffs: multiple options with rationale.

Behavioral rubric dimensions:
Collaboration: teamwork, unblocking, inclusion.
Ownership: proactive, drives outcomes.
Growth mindset: seeks feedback, improves.
Communication: clear, concise, tailored.

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
Similarity bias: liking candidate like self.
Halo effect: one strong trait colors all.
Negativity bias: one mistake dominates.
Confirmation bias: seeking evidence for first impression.

Decisions:
Hire: average ≥ 3, no dimension under 2.
No-hire: average under 2.5, any critical under 2.
Leaning-no: discuss, consider extra interview or feedback.

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

### Step 6: Candidate Experience
Pre-onsite: send schedule and names 24 hours before.
Clear format, duration, and tools per session.
Ask about accommodation needs proactively.

Post-onsite: feedback within 48 hours.
Rejection within 24 hours with actionable feedback.
No ghosting — every candidate receives outcome.

Collect NPS after each onsite.
"How likely to recommend this process?"

Track: time-to-fill (30-45 days), stage drop-off,
offer acceptance (over 80%), NPS (over 50),
demographic breakdown at each stage.

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

## Rules
- Every interviewer scores on rubric before discussion
- No "culture fit" as dimension — use specific behavioral criteria
- Must-haves vs nice-to-haves defined before process starts
- Structured interviews reduce bias — same for all candidates
- Debrief based on average scores, not loudest voice
- Interview training mandatory before any interviews
- Feedback written in actionable terms, not generic
- Timely, respectful communication to every candidate
- Rubric calibration every 3-6 months across team
- Track funnel metrics to identify and fix bias

## References
  - references/evaluation-rubric.md — Evaluation Rubric
  - references/hiring-advanced.md — Hiring Advanced Topics
  - references/hiring-fundamentals.md — Hiring Fundamentals
  - references/interview-process.md — Interview Process Design
  - references/interview-questions.md — Interview Questions
  - references/interview-rubrics.md — Interview Rubrics
## Handoff
`management/team-rules` for onboarding new hires
`planning/create-roadmap` for capacity planning
