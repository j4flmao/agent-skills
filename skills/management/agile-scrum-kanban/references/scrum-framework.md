# Scrum Framework

## Roles

### Product Owner (PO)
- Owns the product backlog and its ordering
- Defines and communicates the product vision and goals
- Makes prioritization decisions based on value and business need
- Is a single person, not a committee — one PO per product
- Collaborates with stakeholders and represents their needs
- Accepts or rejects increment at sprint review
- Available to the team for backlog questions during the sprint

### Scrum Master (SM)
- Coaches the team on Scrum theory, practices, and rules
- Facilitates Scrum events (sprint planning, daily, review, retro)
- Removes impediments blocking team progress
- Shields the team from external disruptions during the sprint
- Helps the PO with backlog management techniques
- Guides the organization in adopting Scrum
- Does not assign work — the team self-organizes

### Developers
- Self-organizing — no one assigns work to team members
- Cross-functional — collectively have all skills to deliver
- Accountable for creating the sprint plan and increment
- Own estimation, task breakdown, and technical decisions
- Typically 3-9 people per scrum team
- Full-time commitment to one team (ideally)

## Events

### Sprint Planning (max 2h for 2-week sprint)
- **What**: The team decides what to deliver in the sprint and how
- **Input**: Product backlog prioritized by PO, team velocity, capacity
- **Output**: Sprint goal, sprint backlog, plan for delivery
- **Two parts**: What (select items by capacity) and How (task breakdown)
- **Done when**: Every selected item meets the Definition of Done

### Daily Scrum / Standup (15 min)
- **What**: Inspect progress toward sprint goal, adapt plan
- **Three questions**: What did I do yesterday? What will I do today? What blockers?
- **Not a status report**: Focus on coordination and adjustments
- **Format**: Walk the board, focus on flow, identify blockers
- **Time**: Strictly 15 minutes — follow-up conversations happen after

### Sprint Review (1h for 2-week sprint)
- **What**: Inspect the increment and adapt the backlog
- **Who**: Team + PO + stakeholders (not just the team)
- **Not a demo**: It is a working session with feedback
- **Done when**: PO accepts or rejects items; backlog is updated

### Sprint Retrospective (45 min for 2-week sprint)
- **What**: Team inspects its processes and plans improvements
- **Focus**: People, relationships, process, tools — not the product
- **Output**: Actionable improvements for the next sprint
- **Confidential**: The retro is for the team, not management

## Artifacts

### Product Backlog
- Ordered list of everything needed in the product
- Dynamic — changes as the product and market evolve
- Items at the top are smaller and more refined
- Items at the bottom are larger and less defined
- The PO is accountable for the backlog, but the team maintains it

### Sprint Backlog
- The selected product backlog items for the sprint
- The plan for delivering them (tasks, breakdown)
- Visible to the team and updated in real-time
- Owned by the developers — only they can change it

### Increment
- The sum of all completed product backlog items in a sprint
- Must meet the Definition of Done — each increment is potentially releasable
- An increment is done only if all items are done; partial items are not increment

### Definition of Done (DoD)
- A formal description of the state when an item meets quality standards
- Shared across the organization — applies to all teams
- Examples: code reviewed, tested (unit + integration), documented, deployed to staging
- If DoD is not met, the item does not count as done

## Sprint Burndown

```
Day:      1   2   3   4   5   6   7   8   9   10
Ideal:   100  90  80  70  60  50  40  30  20  10
Actual:  100  95  85  70  65  55  40  30  25  20
```

### Reading the Burndown
- **Above the ideal line**: Behind schedule — scope is larger than capacity
- **Below the ideal line**: Ahead of schedule — reducing scope or overdelivering
- **Flat periods**: Blockers, dependencies, or unplanned work
- **Spikes up**: New work discovered mid-sprint

### Burndown Best Practices
- Track remaining work (hours or points), not completed work
- Update daily — stale burndowns are worse than no burndown
- Use at the daily standup as a conversation starter
- A flat burndown for 3+ days signals a blocking issue
- Sprint goal should guide what to drop if burndown is off-track

## Scrum Values

| Value | Meaning |
|-------|---------|
| Commitment | Team commits to sprint goal and supports each other |
| Courage | Team members speak up about problems and try new approaches |
| Focus | Team focuses on sprint goal and minimizes context switching |
| Openness | Team is transparent about work, challenges, and progress |
| Respect | Team members respect each other's skills, time, and opinions |

## Common Scrum Anti-Patterns

| Anti-Pattern | Symptom | Fix |
|---|---|---|
| Hero culture | Same person saves every sprint | Rotate work, pair program, share knowledge |
| Zombie standup | Boring status reports, no problem-solving | Walk the board, focus on blockers, skip follow-ups |
| Sprint review as demo | Stakeholders ignored, no feedback | Make it a working session with real feedback |
| Velocity as KPI | Team inflates estimates to look good | Use cycle time and throughput instead |
| Part-time PO | Backlog is stale, team waits for decisions | Full-time PO or defined backup |
| No DoD | Done means different things to different people | Agree on DoD as a team, write it down, enforce it |
| PO on the team | Conflicts of interest in prioritization | PO is stakeholder, not a team member |

## References
- Scrum Guide (2020) — https://scrumguides.org/scrum-guide.html
- The State of Scrum Report — annual trends in Scrum adoption and practices
