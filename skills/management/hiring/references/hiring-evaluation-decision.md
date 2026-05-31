# Hiring Evaluation and Decision

## Purpose
Provide a comprehensive system for evaluating candidates across multiple interview signals, making data-driven offer decisions, handling edge cases, and continuously improving the evaluation process. Covers scoring methodology, decision matrices, calibration, conflict resolution, and post-hire validation.

## Table of Contents
1. [Evaluation Architecture](#evaluation-architecture)
2. [Scoring Methodology](#scoring-methodology)
3. [Decision Matrix Design](#decision-matrix-design)
4. [Calibration and Norming](#calibration-and-norming)
5. [Debrief Process](#debrief-process)
6. [Conflict Resolution](#conflict-resolution)
7. [Offer Decision Framework](#offer-decision-framework)
8. [Edge Cases](#edge-cases)
9. [Post-Hire Validation](#post-hire-validation)
10. [Continuous Improvement](#continuous-improvement)
11. [Tools and Templates](#tools-and-templates)

---

## Evaluation Architecture

### System Overview

The evaluation system is built on four layers:

```
Layer 1: Signal Collection
  Individual interview scores (1-4 per dimension)
  Interviewer notes with behavioral evidence
  Must-have pass/fail flags

Layer 2: Score Aggregation
  Average across interviewers per dimension
  Weighted composite by role priorities
  Variance calculation for calibration check

Layer 3: Decision Rules
  Must-have gates (any fail = no hire)
  Composite threshold ( >= 3.0 = hire )
  Rounding rules and tiebreakers

Layer 4: Output
  Hire/No-hire decision
  Confidence level (strong, marginal, leaning)
  Offer parameters (level, band, equity)
```

### Signal Quality Hierarchy

Not all signals are equal. Weight signals by reliability:

| Signal Type | Reliability | Weight Multiplier |
|---|---|---|
| Work sample / Take-home | Highest | 1.3x |
| Structured interview | High | 1.2x |
| Reference check | Medium-High | 1.1x |
| Resume | Low-Medium | 0.8x |
| Unstructured conversation | Low | 0.6x |
| GitHub/Portfolio review | Low (selection bias) | 0.5x |
| Brainteaser | None | 0.0x |

### Signal Combination Rules

```
Final Score = sum(weight_i * score_i) / sum(weight_i)

Where:
  weight_i = base_weight * reliability_multiplier
  score_i = normalized score for that signal type

Signals must include at minimum:
  - 1 technical interview
  - 1 behavioral interview
  - 1 reference check (for offers)
```

---

## Scoring Methodology

### Scale Definition (1-4)

| Score | Label | Meaning | Action |
|---|---|---|---|
| 1 | Strong No | Clear gap, would not hire under any circumstances | Definite no-hire |
| 2 | No | Some signals but insufficient overall | Tending no-hire |
| 3 | Yes | Meets expectations, confident to hire | Tending hire |
| 4 | Strong Yes | Exceptional, rare, would advocate strongly | Definite hire |

### Behavioral Anchors

Each score level needs concrete behavioral examples per dimension:

#### Example: Problem-Solving Dimension

| Score | Behavioral Anchor |
|---|---|
| 1 | Unable to understand or approach problem. Gives up without trying alternative strategies. |
| 2 | Attempts one approach, gets stuck, needs significant prompting to try alternatives. |
| 3 | Independently explores multiple approaches, identifies tradeoffs, selects reasonable solution. |
| 4 | Systematically evaluates landscape of solutions, identifies optimal approach with clear rationale. |

### Normalization

Normalize scores to account for interviewer strictness:

```
Individual interviewer average: 3.2 (strict)
Department average: 3.5
Adjustment: +0.3

Adjusted score = raw_score + (department_avg - interviewer_avg)
```

### Removing Outliers

If 3+ interviewers evaluate the same dimension:

```
Sort scores: [2, 3, 3, 4, 4]
Remove highest and lowest: [3, 3, 4]
Average: 3.33
```

### Score Components per Interview Type

#### Coding Score (composite)
```
Final coding score = 0.35 * Problem_solving
                   + 0.25 * Communication
                   + 0.25 * Code_quality
                   + 0.15 * Testing
```

#### System Design Score (composite)
```
Final design score = 0.30 * Requirements
                   + 0.25 * Architecture
                   + 0.25 * Scalability
                   + 0.20 * Tradeoffs
```

#### Behavioral Score (composite)
```
Final behavioral score = 0.30 * Collaboration
                       + 0.30 * Ownership
                       + 0.20 * Growth_mindset
                       + 0.20 * Communication
```

---

## Decision Matrix Design

### Role Weight Templates

#### Backend Engineer
```
Dimension                  Weight  Minimum
Coding                     40%     2.5
System design              30%     2.5
Behavioral                 30%     2.5
```

#### Frontend Engineer
```
Dimension                  Weight  Minimum
Coding (browser)           40%     2.5
Component design           30%     2.5
Behavioral                 30%     2.5
```

#### Engineering Manager
```
Dimension                  Weight  Minimum
Behavioral                 40%     3.0
System design              30%     2.5
Coding                     30%     2.0
```

#### SRE/DevOps
```
Dimension                  Weight  Minimum
Debugging/Troubleshooting  35%     2.5
System design              35%     2.5
Behavioral                 30%     2.5
```

#### Data Scientist
```
Dimension                  Weight  Minimum
Analysis/Coding            35%     2.5
Statistical reasoning      35%     2.5
Behavioral                 30%     2.5
```

### Must-Have vs Nice-to-Have

Must-haves are non-negotiable. Failure on any must-have dimension results in no-hire regardless of overall score.

Example must-haves for senior backend role:
```
Must-haves:
  - Coding score >= 2.5
  - System design score >= 2.5
  - Behavioral score >= 2.5
  - Production deployment experience (verified in behavioral)
  - Experience with distributed systems (verified in design)

Nice-to-haves:
  - Open source contributions
  - Specific framework experience
  - Published technical content
  - Conference speaking
```

### Scoring Threshold Adjustments

Base thresholds adjust by seniority:

| Level | Hire Threshold | Strong Hire Threshold |
|---|---|---|
| Junior | 2.75 | 3.25 |
| Mid | 3.0 | 3.5 |
| Senior | 3.0 | 3.5 |
| Staff | 3.25 | 3.75 |
| Principal | 3.25 | 3.75 |

---

## Calibration and Norming

### Initial Calibration

Before the first candidate, calibration session:

```
1. Select a recorded interview (or mock candidate).
2. All interviewers watch/read independently.
3. Each scores on the rubric without discussion.
4. Share scores and identify variance.
5. Discuss each dimension where scores differ > 1 point.
6. Agree on interpretation of each level.
7. Repeat with 2-3 more examples until variance < 1.0.
```

### Ongoing Calibration

- **Quarterly:** Full calibration session with recorded interviews.
- **After every 20 candidates:** Statistical review of score distribution per interviewer.
- **New interviewer:** Must complete calibration before conducting real interviews.

### Statistical Calibration

Track per-interviewer metrics:

```
Interviewer: Jane Doe
  Average score given: 3.4 (dept avg: 3.5)
  Standard deviation: 0.6 (dept avg: 0.7)
  Interview count: 24
  Hire recommendation accuracy: 85%
  Bias flag: None detected

Interviewer: John Smith
  Average score given: 2.8 (dept avg: 3.5) -- possible strictness bias
  Standard deviation: 1.2 (dept avg: 0.7) -- high variance
  Interview count: 6
  Hire recommendation accuracy: 70%
  Bias flag: May need recalibration
```

### Calibration Adjustment Formula

```
adjusted_score = raw_score + (population_mean - interviewer_mean)

Where:
  population_mean = average of all interviewers' scores
  interviewer_mean = average of this interviewer's scores historically
```

---

## Debrief Process

### Pre-Debrief

```
Actions before debrief meeting:
1. All interviewers submit scores in writing.
2. Recruiter compiles score summary.
3. Identify discrepancies > 1 point between interviewers.
4. Prepare discussion topics for each discrepancy.
5. Share anonymized score summary with debrief attendees.
```

### Debrief Meeting

**Duration:** 30 minutes per candidate
**Attendees:** All interviewers, hiring manager, recruiter

```
Agenda:

1. Score review (5 min)
   - Silent review of compiled scores
   - Recruiter reads overall result (hire/no-hire/leaning)

2. Round-robin (15 min)
   - Each interviewer shares score and 1-2 key observations
   - Focus on behavioral evidence, not opinions
   - One person speaks at a time, no interruptions

3. Calibration discussion (8 min)
   - Address discrepancies > 1 point
   - Discuss specific evidence, not personalities
   - Hiring manager guides consensus

4. Decision (2 min)
   - Vote: hire, no-hire, or leaning
   - If leaning, decide next step (extra interview, etc.)
   - Document rationale

5. Next steps (2 min)
   - Offer details or rejection plan
   - Assign action items
```

### Post-Debrief

```
After debrief:
1. Update candidate record in ATS with decision and rationale.
2. If hire: recruiter prepares offer within 24 hours.
3. If no-hire: recruiter sends rejection within 24 hours with feedback.
4. If leaning-no: schedule extra interview within 1 week.
5. Aggregate scores for pipeline analytics.
```

---

## Conflict Resolution

### Types of Conflict

| Type | Description | Resolution |
|---|---|---|
| Score discrepancy | Different scores on same dimension | Check for behavioral evidence, recalibrate interpretation |
| Signal conflict | One interview says hire, another says no-hire | Review weight of each signal type, check for bias |
| Must-have disagreement | Interviewers disagree on must-have assessment | Clarify criteria definition, bring additional evidence |
| Process concern | Interviewer believes process was flawed | Note concern, decide if re-interview is needed |

### Resolution Framework

```
Step 1: Focus on evidence, not opinions
  "What specific behavior did you observe that led to your score?"

Step 2: Check for bias
  "Could this assessment be influenced by similarity, halo, or negativity bias?"

Step 3: Compare against rubric
  "Using the rubric definition, what score does this behavior map to?"

Step 4: Seek additional signal
  "Is there another data point we can consult? Reference check? Extra interview?"

Step 5: Escalate if needed
  "We cannot reach consensus. Hiring manager makes final decision."
```

### Decision Escalation

```
If debrief cannot reach consensus after 15 minutes of discussion:

Level 1: Hiring manager makes decision with documented rationale.
Level 2: Skip-level manager or HRBP reviews if hiring manager was an interviewer.
Level 3: Panel of 3 senior engineers reviews if there are concerns about process integrity.

Escalation must be documented with:
  - Disagreement summary
  - Evidence from each side
  - Decision rationale
  - Any mitigating actions (extra interview, etc.)
```

---

## Offer Decision Framework

### Decision Categories

```
Strong Hire (score >= 3.5, all must-haves met):
  - Expedite offer
  - Consider above-market compensation
  - CEO/CTO call for senior roles
  - Close within 5 business days

Hire (score 3.0-3.49, all must-haves met):
  - Standard offer process
  - Competitive compensation
  - Close within 10 business days

Marginal Hire (score 2.75-2.99, must-haves met):
  - Discuss in debrief
  - Consider extra interview round
  - Lower band within level
  - Probation period with 30-day check-in

No Hire (score < 2.75 or must-have failure):
  - Rejection with actionable feedback
  - Consider for different role if appropriate
  - Reapplication eligibility in 6-12 months

Strong No Hire (any 1-score or red flag):
  - Rejection
  - Flag in ATS for future applications
  - No reapplication eligibility (unless circumstances change)
```

### Offer Level Determination

```
Score-based level calibration:

Scoring range maps to proficiency within level:
  3.0-3.25: Entry-level within band
  3.25-3.5: Mid-level within band
  3.5-3.75: Top of band
  3.75-4.0: Consider next level (if experience supports)
```

### Compensation Band Placement

```
Base salary adjustment from midpoint:
  Score 3.0: 90% of midpoint
  Score 3.25: 100% of midpoint
  Score 3.5: 110% of midpoint
  Score 3.75+: 120% of midpoint or next level

Equity adjustment:
  Strong hire: 1x grant
  Exceptional: 1.5x grant

Sign-on bonus:
  For candidates with competing offers
  Not for marginal hires
```

### Offer Letter

```
Must include:
  - Base salary
  - Equity grant (type, vesting schedule)
  - Start date
  - Offer expiration date (7-10 business days)
  - Contingencies (background check, reference check)
  - Benefits overview
  - At-will employment statement

For senior roles:
  - Hiring manager welcome note
  - Team information
  - First 30-day plan
  - Contact for questions
```

---

## Edge Cases

### Candidate Who Improves Over Process

If a candidate scores low in early rounds but high in later rounds:
- Use average across all rounds, not just best or worst.
- Consider if early round signal was due to nerves or format unfamiliarity.
- Weight later rounds more if candidate improved with practice (growth signal).

### Candidate with One Weak Interview

If a candidate has one significantly lower score among otherwise strong scores:
- Check if there was a confounding factor (bad interviewer, technical issues, time pressure).
- Consider scheduling a supplemental interview in the same format.
- Do not discard the low score unless there is clear evidence of process failure.

### Re-Interviewing After Rejection

Policy for candidates who previously received a no-hire:
- Minimum 6-month waiting period.
- Must address previously identified gaps.
- New interview process (different questions, different interviewers).
- Previous scores reviewed but not used in new evaluation.

### Internal Transfers

For internal candidates:
- Same rubric applies but adjust for known performance data.
- Include skip-level manager and peer feedback.
- Shorter process (2-3 interviews vs 4-5).
- Focus on growth potential and new role competencies.
- Weigh internal knowledge and reduced ramp-up time.

### Stretch Candidates

For candidates who meet potential but not all current requirements:
- Must have clear growth trajectory evidence (learning agility, past promotions).
- Must have strong behavioral scores (3.5+).
- Must have at least 3.0 in technical dimensions.
- Offer lower band within level with structured ramp plan.
- 60-day check-in with clear success criteria.

### Candidates with Non-Traditional Backgrounds

For self-taught, bootcamp, or career-change candidates:
- Prioritize behavioral evidence of learning ability.
- Weight take-home or work sample more heavily.
- Do not penalize for lack of CS degree or specific credentials.
- Check for resume gaps -- ask about them, don't assume.

### Cross-Functional Roles

For roles touching multiple functions (e.g., developer advocate, solutions architect):
- Include interviewers from each function the role touches.
- Use weighted matrix reflecting actual time split.
- Must-have minimums in each function area.

### Senior Executive Hires

For VP, CTO, or other executive roles:
- Use external executive assessment firm.
- Structured reference program (15+ references).
- Case study with board presentation.
- Cultural add assessment by CEO/board.
- 360-degree interview format.

---

## Post-Hire Validation

### 90-Day Check-In

```
Evaluate new hire against interview scores:
  Technical accuracy: Did their skill match interview assessment?
  Behavioral accuracy: Did their collaboration style match behavioral assessment?
  Onboarding velocity: How fast did they ramp up?
  Team integration: How well did they integrate?

Compare predicted performance vs actual:
  If actual < predicted: Revisit interview calibration
  If actual > predicted: Review what interview missed
```

### Performance Correlation

Track correlation between interview scores and performance ratings:

```
Dimension        Correlation   Action if Low
Coding           0.35           Update coding questions
System design    0.40           Keep current
Behavioral       0.45           Keep current
Overall          0.42           Acceptable
```

Target correlation > 0.30 per dimension for interview validity.

### Process Improvement Metrics

| Metric | Target | Action if Missed |
|---|---|---|
| Interview-to-performance correlation | > 0.30 | Revise rubric |
| Offer acceptance rate | > 80% | Review offer competitiveness |
| 90-day retention | > 95% | Review sourcing accuracy |
| 1-year performance rating | > 3.0/4.0 | Raise hiring bar |
| Demographic pass rate variance | < 10% | Investigate bias |
| Interviewer score reliability (Cronbach alpha) | > 0.70 | Recalibrate interviewers |
| Time-to-fill | 30-45 days | Streamline process |
| Candidate NPS | > 50 | Improve experience |

---

## Continuous Improvement

### Quarterly Review

```
Review items:
1. Score distribution by interviewer (identify drift).
2. Demographic pass rates (identify bias).
3. Offer acceptance rate and reasons for rejection.
4. Performance correlation analysis.
5. Question discrimination power analysis.
6. Inter-rater reliability (Cronbach alpha).
7. Debrief process feedback from interviewers.
```

### Interviewer Health

Monitor interviewer engagement and burnout:

```
- Max 2 interviews per week per interviewer.
- Rotate interviewers to prevent fatigue.
- Monthly calibration breaks.
- Interviewer effectiveness feedback from candidates.
- Recognition program for top interviewers.
```

### Annual Audit

```
Full evaluation system audit:
1. Job analysis review: are we assessing the right competencies?
2. Rubric review: are score levels still appropriate?
3. Question bank audit: remove outdated questions, add new ones.
4. Bias audit: comprehensive demographic analysis.
5. Interviewer certification: recertification for all active interviewers.
6. Benchmarking: compare process against industry best practices.
7. Legal review: compliance with local hiring regulations.
```

---

## Tools and Templates

### Score Aggregation Sheet

| Candidate | Interviewer | Coding | Design | Behavioral | Composite |
|---|---|---|---|---|---|
| A | I1 | 3.5 | 3.0 | 4.0 | 3.50 |
| A | I2 | 3.0 | 3.5 | 3.5 | 3.33 |
| A | I3 | 4.0 | 3.0 | 4.0 | 3.67 |
| **Total** | | **3.50** | **3.17** | **3.83** | **3.50** |

### Decision Matrix Calculator

```
Composite Score = (Coding * 0.40) + (Design * 0.30) + (Behavioral * 0.30)

Must-have check:
  Coding >= 2.5: Yes/No
  Design >= 2.5: Yes/No
  Behavioral >= 2.5: Yes/No

Decision:
  Composite >= 3.0 and all must-haves met: HIRE
  Composite < 3.0 or any must-have failed: NO-HIRE
```

### Debrief Decision Log

| Field | Value |
|---|---|
| Candidate | Jane Doe |
| Role | Senior Backend Engineer |
| Composite Score | 3.50 |
| Must-haves | All met |
| Decision | Hire |
| Confidence | Strong |
| Rationale | Strong across all dimensions, exceptional problem-solving |
| Offer Level | Senior, mid-band |
| Interviewer Agreement | Unanimous |

### Rejection Feedback Template

```
Dear {candidate},

Thank you for your time and effort throughout our interview process.
We appreciated learning about your experience with {specific topic}.

After careful consideration, we have decided not to move forward
with your candidacy at this time.

Areas where we saw strength:
  - {specific positive observation}

Areas for development identified by the team:
  - {specific, actionable feedback}

We encourage you to apply again in 6-12 months.

Best regards,
{recruiter name}
```

### Interviewer Scorecard

```
Interviewer: {name}
Role evaluated: {role}
Candidates interviewed: {count}

Score Distribution:
  1s: {count} ({pct}%)
  2s: {count} ({pct}%)
  3s: {count} ({pct}%)
  4s: {count} ({pct}%)

Average: {avg} (department: {dept_avg})
Std Dev: {std} (department: {dept_std})

Calibration Status:
  Last calibration: {date}
  Variance from department: {variance}
  Action needed: {none/recalibration/training}
```

## Handoff
`hiring-interview-frameworks.md` for interview framework selection and design.
`../SKILL.md` for the parent hiring process skill.
