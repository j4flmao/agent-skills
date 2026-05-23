# Buddy System Guide

## Buddy Role

A buddy is a peer (not a manager) who guides a new team member through their first 2-4 weeks. The buddy pairs on environment setup, first PR, and provides a safe first point of contact.

## Buddy Selection Criteria

| Criteria | Requirement | Why |
|----------|-------------|-----|
| Tenure | 6+ months on the team | Knows the codebase, processes, and team dynamics |
| Communication | Patient, clear, approachable | New hires should feel safe asking anything |
| Availability | 20% capacity reduction during buddy period | Effective onboarding requires real-time pairing |
| Experience | Has shipped at least 5 PRs to this codebase | Can explain the full development cycle |
| Empathy | Remembers what it's like to be new | Avoids assuming knowledge the new hire lacks |

## Buddy Week 1 Checklist

### Pre-Arrival (Before Day 1)
- [ ] Calendar blocked: Mon-Wed 9-12, Thu-Fri 10-11 (pairing sessions)
- [ ] Small scoped ticket prepared with clear acceptance criteria
- [ ] Known environment setup issues documented or fixed
- [ ] Pairing environment ready (VS Code Live Share, tmux, or Tuple)
- [ ] Welcome message sent to new hire

### Day 1 — Setup
- [ ] Pair on `bin/setup` execution (don't solve problems for them — guide)
- [ ] Document any missing setup steps as GitHub issues
- [ ] Guide through first test suite run
- [ ] Explain README and any ARCHITECTURE.md
- [ ] End-of-day check: "How was day 1? What was confusing?"

### Day 2 — Architecture
- [ ] Walk through directory structure (15 min)
- [ ] Walk through request flow (15 min)
- [ ] Explain deployment pipeline (15 min)
- [ ] Introduce to key team members in Slack
- [ ] Pair on finding where a specific feature lives

### Day 3 — First PR
- [ ] Assign the prepared ticket
- [ ] Pair on: branch creation, first commit, test writing
- [ ] Guide through opening a draft PR
- [ ] Explain CI pipeline and how to read build output
- [ ] Don't write code for them — guide them to write it

### Day 4 — Review
- [ ] Review the draft PR thoroughly
- [ ] Explain each review comment — why it matters, what to fix
- [ ] Arrange second reviewer
- [ ] Guide through addressing feedback
- [ ] Celebrate the merge

### Day 5 — Retro
- [ ] Lead retrospective session
- [ ] Collect feedback: what worked, what was confusing, what should change
- [ ] Ensure top 3 improvements have tracking tickets
- [ ] Plan week 2 with manager
- [ ] Transition from active pairing to async support

## Buddy Scripts

### Explaining a Code Review Comment
```
"The reviewer suggested we use `map` instead of `forEach` here.
The reason is that `map` returns a new array, which makes the
transformation explicit and easier to test. Let me show you
both approaches side by side..."
```

### When the New Hire is Stuck
```
"Let's approach this differently. What's the smallest thing
we can do to make progress? Can we write a test first that
describes what we want?"
```

### Giving Positive Feedback
```
"Great catch on that edge case — I wouldn't have thought of
that. That shows you're thinking about how the system
actually behaves in production."
```

## Common Buddy Mistakes

| Mistake | Instead Do |
|---------|------------|
| Solving problems for them | Guide them to the answer with questions |
| Assuming prior knowledge | Explain everything, assume nothing |
| Rushing through setup | Let them drive, even if it takes longer |
| Skipping context | Explain why things work, not just how |
| Overloading with information | One concept at a time, let it sink in |
| Not checking understanding | Ask "Does that make sense?" frequently |
| Going too fast | Match their pace, not yours |

## Buddy Capacity Allocation

```
Week 1: 20% capacity (8 hours/week)
Week 2: 10% capacity (4 hours/week)
Weeks 3-4: 5% capacity (2 hours/week)
After week 4: Normal capacity, async support
```

The buddy's sprint commitments should be adjusted accordingly. Product managers and tech leads should account for buddy capacity when planning sprints.

## Buddy Offboarding

After 4 weeks, the buddy writes a brief handoff:

```
Buddy Handoff: {new_hire_name}
Date: {YYYY-MM-DD}

## Strengths
- {area}: {specific observation}
- {area}: {specific observation}

## Areas for Growth
- {area}: {specific observation and suggestion}

## Documentation Improvements Made
- {PR link} — {what was improved}

## Recommendations
- {ongoing support needed}
- {process improvement suggestions}

Handoff to: {manager_name}
```

## Multiple Buddies

For larger teams or complex codebases, consider:
- **Primary buddy**: Guides the overall onboarding, handles processes, team introduction
- **Stack buddy**: If the codebase spans multiple technologies (frontend + backend), assign a buddy per stack
- **Rotation**: After 2 weeks, rotate to a new buddy for fresh perspective
- **Shadowing**: Week 3-4, the new hire shadows the on-call rotation with a senior engineer

## Buddy Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| First PR merged | By end of week 1 | GitHub PR merged date |
| Independent PR | By end of week 2 | PR without buddy pairing |
| New hire satisfaction | 4/5+ on buddy support | Week 4 survey |
| Documentation PRs | 2+ in first month | GitHub PRs fixing docs |
| Buddy satisfaction | 3/5+ on experience | End-of-cycle survey |
