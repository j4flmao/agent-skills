# Ramp-Up Plan

## Week 1: Environment and First PR

| Day | Goal | Activities | Verification |
|-----|------|------------|--------------|
| 1 | Dev environment running | Setup pairing, test suite, health check | `curl localhost:3000/health` → 200 |
| 2 | Architecture understood | Walkthrough, directory tour, request flow | Draw flow from memory |
| 3 | First code change | Pair on small ticket, write tests, draft PR | Draft PR open, CI green |
| 4 | First PR merged | Address review, merge, verify in staging | PR merged to main |
| 5 | Retro and plan | Retro write-up, improvement tickets, week 2 plan | Tickets created |

## Week 2: Independence Building

| Day | Goal | Activities | Verification |
|-----|------|------------|--------------|
| 6-7 | First independent ticket | Small scoped ticket, minimal buddy support | PR opened without pairing |
| 8-9 | Code review without buddy | Self-review, submit for team review | PR approved by non-buddy |
| 10 | Deploy own change | Deploy to staging, monitor, verify | Change in production |

### Week 2 Checkpoints
- Buddy check-ins reduce to daily async + 2 sync sessions
- New hire should be asking questions in public channels, not DMs to buddy
- First on-call shadowing session scheduled

## Week 3-4: Deepening

| Area | Activities | Success Criteria |
|------|------------|------------------|
| Codebase depth | Work on cross-cutting feature touching 3+ modules | Understands module interactions |
| Testing | Write integration tests for a new feature | Can set up test fixtures independently |
| Reviewing | Review 2 PRs from other team members | Provides useful, constructive feedback |
| Domain | Shadow product meetings, read domain docs | Can explain business domain basics |
| Operations | Shadow on-call, review runbooks | Can triage a SEV3 incident with guidance |

### Week 3-4 Checkpoints
- Buddy transitions to async support only
- Manager 1:1 focuses on career growth, team integration
- New hire joins regular rotation for PR reviews
- On-call shadowing: follow an on-call engineer for 1 shift

## Month 2: Full Integration

| Area | Activities | Success Criteria |
|------|------------|------------------|
| Velocity | Normal sprint capacity (no capacity reduction) | Delivers 80%+ of expected velocity |
| Code reviews | Regular reviewer on team PRs | Consistent, constructive reviews |
| On-call | Join on-call rotation with senior backup | Handles SEV3 incidents independently |
| Architecture | Participate in architecture discussions | Contributes to design decisions |
| Mentoring | Start documenting findings for next hire | Creates docs improvement PRs |
| Domain | Deep product area knowledge | Can answer questions about their area |

## Month 3: Ownership

- Owns at least one module or feature area
- Leads a medium-sized feature from spec to deployment
- Participates in sprint planning with accurate estimates
- Starts mentoring a new team member (if hiring cycle aligns)
- Contributes to tech debt reduction initiatives

## Ramp-Up Acceleration Techniques

| Technique | Description | When to Use |
|-----------|-------------|-------------|
| Pair programming | Buddy drives, new hire navigates | Complex features, first PR |
| Mob programming | Whole team on one screen, rotating driver | Learning full deployment pipeline |
| Code reading | Read through a feature end-to-end with buddy | Understanding existing code |
| Test-driven exploration | Write tests to understand behavior | Unfamiliar code areas |
| Documentation-driven | Fix docs as you learn | Setup, troubleshooting, runbooks |
| Structured shadowing | Follow team members through their day | Operations, on-call, meetings |

## Common Ramp-Up Delays

| Delay | Symptom | Intervention |
|-------|---------|-------------|
| Environment issues | Can't run dev server after day 2 | Escalate to DevOps, create tracking issue |
| Impostor syndrome | Hesitates to ask questions, works in isolation | Buddy increases check-in frequency |
| Unclear scope | Doesn't know what to work on next | Manager provides clear prioritized list |
| Tool unfamiliarity | Slow with git, editor, terminal | Pair on workflow, share config and aliases |
| Domain complexity | Struggles with business concepts | Assign domain pairing with product manager |
| Social integration | Not engaging with team | Intentionally include in team activities |

## Ramp-Up Milestones

```
Week 1: ────■─── Setup and first PR
              ● Dev server running
              ● PR merged to main

Week 2: ────────■─── Independent contribution
                  ● First PR without pairing
                  ● First code review

Month 1: ────────■─── Full development cycle
                  ● 3+ PRs merged
                  ● Reviewed 2+ PRs
                  ● Shadowed on-call

Month 2: ────────■─── Full integration
                  ● Normal velocity
                  ● Regular reviewer
                  ● On-call rotation

Month 3: ────────■─── Ownership
                  ● Module ownership
                  ● Feature lead
                  ● Contribution to process
```

## Adjusting the Plan

- Frontend-only developers can skip backend deep-dive weeks
- Experienced hires may skip week 1 setup if they prefer independent setup
- Junior developers may need an extra 2-4 weeks before joining on-call
- Contractors get a condensed 1-week plan focused on environment + first PR
- Remote team members need more structured async communication and daily video check-ins
