# Usability Testing Guide

## Test Types

| Type | When | Participants | Goal | Duration |
|------|------|--------------|------|----------|
| Formative | Early design | 5-8 per round | Identify usability issues | 30-60 min |
| Summative | Before launch | 20+ | Benchmark against metrics | 20-30 min |
| A/B test | Live product | Hundreds+ | Compare two variants | 1-4 weeks |
| Guerilla | Any time | 5-10 (ad hoc) | Quick feedback | 5-10 min |
| Remote moderated | Distributed teams | 5-8 per round | Same as formative, remote | 30-45 min |
| Remote unmoderated | Scale | 20+ | Task completion data | 15-20 min |

## Participant Recruitment

### Sample Size Rules
- Formative: 5 participants per distinct user type catches 85% of issues (Nielsen)
- Summative: Minimum 20 for statistically significant results
- Each additional user type adds 3-5 participants

### Screening Criteria

```
Must-have:
- {criterion 1}: e.g. "uses our app at least 3×/week"
- {criterion 2}: e.g. "has not participated in a study in last 6 months"
- {criterion 3}: e.g. "is not a direct competitor employee"

Nice-to-have:
- Mix of new (≤3 months) and experienced (>6 months) users
- Mix of desktop and mobile users
- Range of technical skill levels
```

## Test Plan Template

```
# Usability Test Plan: {Feature/Product Name}

## Research Questions
1. Can users complete {primary task} without assistance?
2. Where do users get confused or stuck?
3. Do users understand {key concept}?
4. How long does it take to complete {critical task}?

## Method
- Type: {Remote moderated / In-person / Unmoderated}
- Duration: {30} minutes per session
- Participants: {8} existing users ({4} new, {4} experienced)
- Incentive: ${amount} gift card per participant

## Tasks
1. {Task 1 description} — {success criteria}
2. {Task 2 description} — {success criteria}
3. {Task 3 description} — {success criteria}

## Metrics
- Task success rate: {target > 80%}
- Time on task: {target < 120 seconds}
- Error rate: {target < 3 errors per task}
- SUS score: {target > 68}
- Net Promoter Score: {target > 30}

## Equipment
- Screen recording software (e.g. Lookback, UserTesting, Zoom + OBS)
- Prototype or staging URL
- Consent forms
- Task scenarios (printed or shared screen)
```

## Task Scenarios

### Good Task
```
"You're planning a team dinner for 8 people.
Find a restaurant that has vegetarian options,
is within a 15-minute walk of the office,
and book a table for next Friday at 7 PM."
```

This is good because it: gives a clear goal, specifies constraints, doesn't hint at the interface, feels realistic.

### Bad Task
```
"Click on the search bar, type 'Italian restaurant',
then click the filter icon and select 'vegetarian'
and 'within 1 km', then click on a result and
click 'Book now', then select the date and time."
```

This is bad because it: describes interface actions (too leading), doesn't test real-world reasoning, tells them exactly what to do (no discovery).

## Moderator Script

### Introduction (2 min)
```
"Hi {name}, thanks for joining today. I'm going to
ask you to try out a few tasks with a prototype.
This is not a test of you — we're testing the design.
If something is confusing or breaks, that's our fault,
not yours. Please think out loud as you work:
tell me what you see, what you're thinking, and what
you expect to happen when you click something.

I'll be taking notes, so I might be quiet at times.
That means I'm watching and learning, not that
you're doing something wrong. Any questions?"
```

### During Tasks
```
Good prompts:
- "What are you thinking right now?"
- "What do you expect to happen if you click that?"
- "Is that what you expected?"
- "What would you do next?"

Bad prompts (leading):
- "Do you think you should click the search icon?"
- "That button there — should you press it?"
- "Would you normally use the menu for that?"
```

### Debrief (3 min)
```
- "Overall, what did you think?"
- "What was the most confusing part?"
- "If you could change one thing, what would it be?"
- "Would you use this feature in your daily work?"
```

## Metrics

### Task Success
```
Success: User completes task without help (3 pts)
Partial: User completes with minor help (1 pt)
Failure: User cannot complete or gives up (0 pts)

Score = (total points / max possible) × 100
Target: > 80%
```

### System Usability Scale (SUS)

```
1. I think I would use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think I would need technical support to use this.
5. I found the functions were well integrated.
6. I thought there was too much inconsistency.
7. I would imagine most people would learn this quickly.
8. I found the system very cumbersome to use.
9. I felt confident using the system.
10. I needed to learn a lot before I could get going.

Scale: 1 (Strongly disagree) to 5 (Strongly agree)
Score: Sum of (odd Qs: score-1) + (even Qs: 5-score), × 2.5
Average SUS: ~68
```

### Error Classification

| Type | Example | Severity |
|------|---------|----------|
| Slip | Clicked wrong button | Low |
| Mistake | Misunderstood what a feature does | Medium |
| Omission | Missed an important element | Medium |
| Recovery error | Made things worse trying to fix | High |
| Dead end | Cannot proceed without help | Critical |

## Finding Analysis

### Issue Severity Rating

| Severity | Impact | Frequency | Persistence | Action |
|----------|--------|-----------|-------------|--------|
| Critical | Cannot complete task | > 50% of users | Every attempt | Fix before launch |
| Major | Very difficult | 30-50% of users | Most attempts | Fix soon |
| Minor | Some confusion | 10-30% of users | Some attempts | Fix if time |
| Cosmetic | Slight annoyance | < 10% of users | Rare | Consider for backlog |

### Issue Card Format

```
ID: U-{NNN}
Task: {name}
Severity: {critical/major/minor/cosmetic}

Description:
{What happened, what the user said/did}

Frequency:
{n} of {n} participants experienced this

Evidence:
[Link to video clip or screenshot]

Recommendation:
{What to change and why}
```

## Report Template

```
# Usability Test Report: {Feature Name}
Date: {YYYY-MM-DD}
Participants: {n} ({demographics})
Prototype version: {v1.0}

## Executive Summary
{1-2 paragraphs: key findings, top 3 issues, SUS score}

## Key Metrics
- Task success rate: {X%} (target: X%)
- Average time on task: {X}s (target: Xs)
- SUS score: {X} (benchmark: 68)
- Top issue: {description}

## Findings by Task

### Task 1: {name}
Success rate: {X%}
Avg time: {Xs}
Issues found: {n}
- Critical: {n} — {summaries}
- Major: {n} — {summaries}

### Task 2: {name}
...

## Top Issues
1. U-001: {issue} — Critical — {recommendation}
2. U-002: {issue} — Major — {recommendation}
3. U-003: {issue} — Major — {recommendation}

## Recommendations
1. {fix for issue 1} — effort: {small/medium/large}
2. {fix for issue 2} — effort: {small/medium/large}
3. {fix for issue 3} — effort: {small/medium/large}

## Appendix
- Participant demographics
- Task scenarios
- Raw data
- Video clips (link)
```

## Common Usability Issues

| Issue | How to Detect | Fix |
|-------|---------------|-----|
| Users don't see CTA | No clicks on primary action | Increase visual weight, move above fold |
| Confusing navigation | Users lost, backtracking | Simplify IA, add breadcrumbs |
| Form abandonment | Users start but don't submit | Reduce fields, add progress indicator |
| Error message ignored | Repeated same error | Make errors visible, inline, specific |
| Unclear terminology | Users pause on labels | Use plain language, test labels |
| Hidden features | Users ask "how do I..." | Surface features, add tooltips |
| Slow perceived performance | Users click multiple times | Add immediate visual feedback, skeleton |
