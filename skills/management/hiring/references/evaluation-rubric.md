# Evaluation Rubric

## Score Definitions

| Score | Label | Definition | Action |
|-------|-------|------------|--------|
| 1 | Strong No | Clear gap, below expectations | Reject |
| 2 | No | Some signals but insufficient | Reject |
| 3 | Yes | Meets expectations | Hire |
| 4 | Strong Yes | Exceeds expectations, exceptional | Strong hire |

## Coding Rubric

| Dimension | 1 | 2 | 3 | 4 |
|-----------|---|---|---|---|
| Problem-solving | No clear approach, jumps to code | Basic approach, needs multiple hints | Systematic approach, explores tradeoffs | Elegant solution, optimizes independently |
| Code quality | Unreadable, no structure | Functional but messy | Clean, idiomatic, well-organized | Production-quality, handles all edge cases |
| Communication | Cannot explain reasoning | Explains with prompting | Clear explanation throughout | Teaches interviewer, asks clarifying questions |
| Testing | No testing consideration | Basic happy path | Covers edge cases and errors | TDD approach, testability built in |
| Time management | Spends all time on wrong part | Needs guidance to pace | Good allocation across phases | Efficient, finishes early with verification |

## System Design Rubric

| Dimension | 1 | 2 | 3 | 4 |
|-----------|---|---|---|---|
| Requirements gathering | No clarifying questions | Basic clarification | Systematic: functional + non-functional | Challenges assumptions, prioritizes |
| Architecture | No coherent design | Simple but works | Well-structured components | Distributed, fault-tolerant, evolvable |
| Scalability | No consideration | Vague mentions | Concrete: sharding, caching, CDN | Quantitative tradeoffs with bottleneck analysis |
| Data model | Not defined | Simple but incomplete | Well-defined schema, access patterns | Optimized for read/write, indexing strategy |
| Tradeoffs | None mentioned | One when prompted | Multiple with rationale | Quantitative comparison of alternatives |

## Behavioral Rubric

| Dimension | 1 | 2 | 3 | 4 |
|-----------|---|---|---|---|
| Collaboration | Blames others, no team examples | Works alone but can collaborate | Strong team player, unblocks others | Elevates team, mentors, inclusive |
| Ownership | Blames circumstances, no accountability | Takes ownership when asked | Proactively owns outcomes | Goes beyond scope, drives results |
| Growth mindset | Resists feedback, defensive | Accepts but doesn't act | Seeks feedback, improves | Teaches others, creates learning culture |
| Communication | Unclear, rambling | Gets point across but not structured | Clear, concise, adjusts to audience | Persuasive, inspires action |

## Role-Specific Weighting

| Role | Coding | System Design | Behavioral |
|------|--------|--------------|------------|
| Junior Engineer | 50% | 20% | 30% |
| Mid Engineer | 40% | 30% | 30% |
| Senior Engineer | 30% | 35% | 35% |
| Staff+ Engineer | 20% | 40% | 40% |
| Engineering Manager | 20% | 30% | 50% |
| Frontend Engineer | 45% | 25% | 30% |

## Decision Rules

- Average >= 3.0 AND no dimension below 2 → Hire
- Average < 2.5 OR any critical dimension < 2 → No-hire
- Average 2.5-2.9 → Discuss, consider additional interview
- All "Strong No" (score 1) in any dimension → evaluate for role mismatch
- Discrepancy > 1 point between interviewers on same dimension → discuss and recalibrate

## Calibration Process

- Every 3 months: all interviewers review 2-3 recorded interviews
- Score independently, then compare and discuss discrepancies
- Flag interviewers scoring consistently >0.5 above or below team average
- New interviewers: shadow 3, co-interview 3, solo with buddy review for first 3
- Calibration sessions are documented and shared with the team

## Bias Mitigation in Scoring

| Bias | Description | Mitigation |
|------|-------------|------------|
| Halo effect | One strong trait colors all dimensions | Score each dimension independently |
| Similarity bias | Favoring candidates like the interviewer | Explicit criteria, diverse panel |
| Confirmation bias | Seeking evidence for first impression | Score after interview, not during |
| Contrast effect | Comparing to previous candidate | Score against rubric, not other candidates |
| Recency bias | Remembering last interaction most | Take notes, score immediately after |

## Scorecard Template

```
Candidate: {name} | Role: {title} | Interviewer: {name}
Session: {coding / design / behavioral}

Scores:
- Dimension 1: {score} — {evidence quote}
- Dimension 2: {score} — {evidence quote}
- Dimension 3: {score} — {evidence quote}
- Dimension 4: {score} — {evidence quote}

Overall: {score}
Recommendation: {Strong No / No / Yes / Strong Yes}

Key observations:
{2-3 specific behaviors or responses that informed the score}

Red flags (if any):
{concerns that could affect hire decision}
```
