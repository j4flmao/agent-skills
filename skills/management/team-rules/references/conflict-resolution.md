# Conflict Resolution

## Principles

- Conflict is natural — it indicates people care about the outcome
- Focus on the problem, not the person
- Seek to understand before being understood
- Assume good intent — most conflicts are not personal
- Best idea wins, regardless of seniority or tenure
- Psychological safety is non-negotiable: everyone can speak freely

## Conflict Levels

| Level | Description | Escalation | Resolution Path |
|-------|-------------|------------|-----------------|
| 1 — Technical | Disagreement on implementation approach | Tech lead | Technical decision via ADR, spike, or data |
| 2 — Process | Disagreement on workflow or practices | Team lead | Retro discussion, team vote, experiment |
| 3 — Interpersonal | Personality clash, communication breakdown | Manager | Facilitated conversation, mediation |
| 4 — Systemic | Policy, role, or organizational issue | Leadership | Policy review, HR involvement |

## Resolution Process

### Step 1: Direct Conversation
- Parties discuss the conflict one-on-one
- Use "I" statements: "I feel..." not "You always..."
- State your understanding of the other person's perspective
- Propose a solution together
- Timeframe: within 48 hours of conflict being identified

### Step 2: Facilitated Conversation
- If direct conversation doesn't resolve, bring in a neutral facilitator
- Facilitator sets ground rules, ensures equal airtime, keeps focus on resolution
- Each party states their perspective without interruption
- Facilitator summarizes shared ground and remaining differences
- Group brainstorms solutions together
- Timeframe: within 1 week of Step 1

### Step 3: Manager Escalation
- Manager hears both sides individually then together
- Manager may make a binding decision if consensus cannot be reached
- Decision is documented with rationale
- Manager follows up within 2 weeks to check resolution
- Timeframe: within 1 week of Step 2

### Step 4: Formal Resolution
- HR or leadership involvement for systemic or serious issues
- Formal investigation if policy violation is alleged
- Outcome documented and communicated to relevant parties
- Timeframe: as defined by organizational policy

## Conflict Resolution Script

For direct conversations, use this structure:

```
1. State the situation factually:
   "When {specific behavior/event} happened..."

2. State the impact:
   "...I felt/observed {impact}."

3. Ask for perspective:
   "Can you help me understand your perspective?"

4. Listen without interrupting.

5. Reflect back:
   "What I hear you saying is {summary}. Is that right?"

6. Find common ground:
   "We both agree that {shared goal}."

7. Propose solution:
   "What if we try {solution}?"

8. Agree on next steps:
   "So we'll {action} by {date}. Does that work for you?"

9. Follow up:
   "Let's check in on {date} to see how it's going."
```

## Technical Conflict Resolution

When the disagreement is about code/architecture:

1. **Separate facts from opinions** — is there data to support either approach?
2. **Write a comparison** — both approaches side by side, pros/cons listed
3. **Run an experiment** — spike both approaches, compare results
4. **Define evaluation criteria** — what matters most: performance, readability, maintainability?
5. **Involve a third party** — another senior engineer or tech lead reviews
6. **Document with ADR** — whichever approach wins, document the decision and rationale
7. **Disagree and commit** — once decided, move forward as a team

## Common Conflict Patterns

| Pattern | Symptom | Resolution Approach |
|---------|---------|---------------------|
| Technical preference | "My approach is better" | Spike both, compare data, agree on criteria first |
| Process frustration | "This process wastes our time" | Run an experiment with a different process for 1 sprint |
| Communication style | "They're too direct / too vague" | Discuss communication preferences in 1:1, agree on adjustments |
| Ownership boundary | "That's not my job / that's my area" | Clarify RACI, discuss in team meeting, update documentation |
| Feedback delivery | "They criticized my work" | Coach on feedback framework (SBI: Situation-Behavior-Impact) |

## Preventing Conflicts

- Establish team norms early (see working-agreements.md)
- Regular 1:1s catch issues before they escalate
- Retro includes a "conflict audit": is there any unresolved tension?
- Cross-team syncs prevent boundary confusion
- Pair programming builds shared understanding and reduces technical disagreements
- Document decisions before they become implicit expectations

## Escalation Path

```
Individual → Tech Lead → Engineering Manager → Director → VP Engineering → HR/Legal
    ↑            ↑               ↑                  ↑               ↑
 Technical    Interpersonal   Process/Policy     Systemic       Severe/Policy
  issue        issue           issue              issue          violation
```

All escalations should include:
- Factual timeline of events
- Steps already taken to resolve
- Desired outcome
- Any relevant documentation (emails, messages, PR comments)
