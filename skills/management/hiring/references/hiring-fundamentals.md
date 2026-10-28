# Hiring Fundamentals for Engineering Teams

The basics of running a fair, predictive and efficient hiring process: defining the role, structured interviews, scorecards, interviewer calibration, debriefs and candidate experience. Detailed rubrics and question banks are in `interview-rubrics.md`, `evaluation-rubric.md` and `interview-questions.md`; process design in `interview-process.md`.

## Principles

| Principle | Why |
|-----------|-----|
| Define success before interviewing | You cannot assess against an undefined bar |
| Structured interviews | Research on selection methods consistently finds structured interviews more predictive and less biased than unstructured ones |
| Each interview assesses specific competencies | Avoids duplicated signal and gaps |
| Independent written feedback before discussion | Prevents anchoring and groupthink |
| Evidence over impressions | "Designed retry with idempotency keys" beats "seemed smart" |
| Consistent experience for all candidates | Fairness and legal defensibility |

## 1. Role Definition (Intake)

Agree with the hiring manager before sourcing:
- Mission of the role and outcomes expected at 6 and 12 months.
- Level and scope (use the company's career ladder).
- 4-6 competencies to assess, each with what "meets the bar" looks like at this level.
- Must-haves vs nice-to-haves (keep must-haves few; long lists filter out strong, non-traditional candidates).
- Compensation band, location/remote policy, interview loop, decision makers, timeline.

## 2. Job Description

- Lead with impact and team context, then responsibilities, then requirements.
- Separate requirements from preferences; avoid inflated years-of-experience thresholds.
- Use inclusive, plain language; publish salary ranges where required by law (several US states, and the EU Pay Transparency Directive's obligations phase in from 2026) and as good practice.

## 3. Loop Design

| Stage | Purpose | Typical competencies |
|-------|---------|----------------------|
| Recruiter screen | Logistics, motivation, basic fit | Communication, role alignment |
| Hiring manager screen | Scope and experience match | Ownership, relevant experience |
| Technical assessment | Core skills | Coding/problem solving, or practical exercise |
| System design (mid-level and above) | Architecture judgment | Trade-offs, scalability, operability |
| Behavioural interview | Past behaviour as predictor | Collaboration, ownership, conflict, learning |
| Team/values conversation | Mutual fit and candidate questions | Communication |

Map competencies to interviews in a matrix so each competency is covered at least once (ideally twice) and no interview tries to cover everything.

## 4. Structured Interview Questions

- Behavioural: "Tell me about a time when..." with follow-ups using STAR (Situation, Task, Action, Result).
- Situational: "How would you handle..." for scenarios the candidate may not have faced.
- Technical: same problem (or calibrated equivalents) for all candidates at a level, with defined hints and follow-ups.

Example behavioural question with probes:

```
Q: Tell me about a production incident you were responsible for resolving.
Probes: What was your role? How did you find the cause? What did you change afterwards?
Listen for: ownership, systematic debugging, communication, follow-up actions.
```

## 5. Scorecards

```
Competency: Problem solving (Senior)
1 - Strong no: could not decompose the problem; needed the solution given
2 - No: partial approach, missed key constraints even with hints
3 - Yes: decomposed problem, working solution, reasonable trade-offs
4 - Strong yes: elegant solution, proactively discussed edge cases and alternatives
Evidence: <specific quotes and observations>
```

- Even-numbered scales avoid neutral fence-sitting.
- Interviewers rate only their assigned competencies and write evidence before seeing others' feedback.

## 6. Interviewer Training and Calibration

- Train on the rubric, legal constraints (no questions about protected characteristics, family plans, age, religion, health), and note-taking.
- Shadow, then reverse-shadow before interviewing solo.
- Calibrate quarterly: compare scores on the same recorded/mock interviews; review score distributions per interviewer for consistent harshness or leniency.

## 7. Debrief and Decision

1. Everyone submits written feedback and a recommendation independently.
2. Facilitator (hiring manager or recruiter) reviews evidence per competency, starting with the most junior interviewers or with written summaries to reduce anchoring.
3. Discuss disagreements by evidence, not seniority.
4. Decision maker decides against the defined bar; "not sure" usually means no hire, unless the gap can be closed with a targeted follow-up interview.
5. Record the rationale.

## 8. Candidate Experience

- Tell candidates the stages, timeline and what each interview assesses; share prep material.
- Keep total time reasonable; avoid long unpaid take-home assignments (time-box or pay).
- Accommodations on request (extra time, different format).
- Respond within agreed timelines; give feedback where policy allows.
- Every candidate, hired or not, should be able to say the process was fair and respectful.

## 9. Metrics

| Metric | Use |
|--------|-----|
| Time to hire / time in stage | Process speed, bottlenecks |
| Pass-through rate per stage | Calibration of screens and loops |
| Offer acceptance rate | Competitiveness, candidate experience |
| Candidate satisfaction (survey) | Experience quality |
| Diversity of pipeline per stage | Detect where candidates drop disproportionately |
| Quality of hire (performance and retention at 6-12 months) | Predictive validity of the process |

## Checklist

- [ ] Intake doc with outcomes, level, competencies, must-haves
- [ ] Competency-to-interview matrix
- [ ] Structured questions and anchored rubrics per interview
- [ ] Trained, calibrated interviewers
- [ ] Independent written feedback before debrief
- [ ] Decision and rationale recorded
- [ ] Candidate communication plan and accommodations
- [ ] Funnel and quality-of-hire metrics reviewed
