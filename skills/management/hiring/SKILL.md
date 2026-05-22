---
name: management-hiring
description: >
  Use this skill when the user says 'hiring', 'interviewing', 'technical interview', 'coding interview', 'system design interview', 'interview rubric', 'candidate assessment', 'interview debrief', 'offer decision', 'interview process', 'phone screen', 'onsite interview', 'behavioral interview'. This skill enforces: structured interview rubrics with scoring criteria per skill dimension, multi-format technical assessment (coding, system design, debugging), behavioral evaluation aligned to company values, consistent debrief process with calibration, and data-driven offer decisions. Do NOT use for: performance reviews, career development, or team structuring.
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
Design a structured hiring process with objective rubrics, consistent evaluation, bias-resistant practices, and clear decision criteria for technical and behavioral roles.

## Agent Protocol

### Trigger
"hiring", "interviewing", "technical interview", "coding interview", "system design interview", "interview rubric", "candidate assessment", "interview debrief", "offer decision", "interview process", "phone screen", "onsite interview", "behavioral interview", "interview pipeline", "candidate evaluation", "interview scoring".

### Input Context
- Role level (junior, mid, senior, staff, principal)
- Role type (backend, frontend, mobile, DevOps, ML, data, full-stack, SRE)
- Team size and composition
- Company stage (startup, growth, enterprise)
- Interview stages currently in use
- Existing rubric or evaluation form (if any)

### Output Artifact
Hiring plan with interview format per stage, evaluation rubrics, question bank outline, debrief process, and offer decision framework.

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
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Interview stages defined with time allocation per stage
- [ ] Rubrics created for each interview type (coding, system design, behavioral)
- [ ] Question bank outline with difficulty levels per stage
- [ ] Debrief process with calibration and conflict resolution
- [ ] Offer decision criteria with must-haves vs nice-to-haves
- [ ] Bias mitigation measures documented (structured scoring, panel diversity)

### Max Response Length
400 lines

## Workflow

### Step 1: Design Interview Pipeline
Phone screen (30 min): resume review + motivation + basic technical verification — go/no-go. Take-home or coding assessment: asynchronous — optional for senior roles. Onsite: coding (45-60 min) + system design (45-60 min) + behavioral/cultural (45 min) + optional debugging/API design/architecture. Debrief: all interviewers within 24h.

### Step 2: Create Rubrics
Each rubric has 3-4 scoring dimensions rated 1-4 (strong no, no, yes, strong yes). Coding rubric: problem-solving approach, communication, code quality/readability, testing awareness. System design rubric: requirements clarification, architecture decisions, scalability considerations, tradeoff analysis. Behavioral rubric: collaboration, ownership, growth mindset, communication.

### Step 3: Conduct Debrief
No ranking or comparison to other candidates — evaluate against the rubric only. Start with each interviewer giving their score and rationale before any discussion. Identify signal discrepancies (one interviewer scores 1 while others score 3 — calibrate). Flag bias signals (similarity bias, halo effect, negativity bias). Decision: hire (average ≥ 3, no dimension < 2), no-hire (average < 2.5, any critical dimension < 2), discuss (mixed signals).

### Step 4: Make Offer Decision
Compile scores across all interviewers. Verify against must-have criteria for the role. Consider: interview performance, experience level, team fit, growth trajectory, counteroffers. Set offer with competitive range based on level and market data. Define expiration (7-10 days standard).

## Rules
- Every interviewer scores on the rubric before discussion — no anchoring on first opinion
- No "culture fit" as a dimension — replace with specific behavioral criteria
- Must-haves vs nice-to-haves are defined before the interview process starts, not after
- Structured interviews reduce bias — same questions, same rubric, same evaluation for all candidates
- Debrief decisions are based on average scores, not the loudest voice in the room
- Interview training is mandatory for all interviewers before conducting interviews
- Feedback is written in actionable terms — never "not a good fit" without specifics

## References
- `references/interview-rubrics.md` — Rubric design principles, coding evaluation criteria, system design scoring, behavioral competencies, scoring calibration
- `references/interview-process.md` — Interview pipeline stages, phone screen guide, onsite structure, debrief protocol, offer decision framework, candidate experience

## Handoff
`management/team-rules` for onboarding new hires into team workflows
`planning/create-roadmap` for capacity planning based on new hire start dates
