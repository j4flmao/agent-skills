# Retro Facilitation Guide

## Creating a Safe Environment

### Psychological Safety Foundations
- **Confidentiality**: Retro contents stay in the room — never share individual comments outside
- **Blame-free**: Focus on systems, processes, and interactions, not individuals
- **Equal voice**: Every team member's perspective has equal weight
- **Vulnerability**: Facilitator models openness by sharing their own mistakes and learnings
- **No retribution**: What is said in retro cannot be used against anyone later

### Setting the Stage
```
Opening script (facilitator):

"This retro is for us as a team. The goal is to identify one to three things we can 
improve for the next sprint. Everything shared here stays in this room. We focus on 
processes and systems, not people. There is no blame — we are all on the same team 
trying to get better together."
```

### Building Trust Over Time
- Start every retro with a round of appreciations (each person thanks someone for something specific)
- Acknowledge when the team takes a risk or admits a mistake
- If the facilitator notices blame language, gently reframe: "What about the process allowed that to happen?"
- Follow through on action items — nothing destroys trust faster than repeated unactioned items

## Timeboxing

### Why Timeboxing Matters
- Creates urgency and focus
- Prevents discussions from going down rabbit holes
- Ensures all parts of the retro get attention
- Respects the team's time — a well-facilitated 45-min retro beats a 90-min unfocused one
- Builds trust that the retro will not drag on

### 45-Minute Retro Timebox

| Phase | Duration | Activity | Facilitator Role |
|-------|----------|----------|-----------------|
| Check-in | 5 min | Each person shares one word about the sprint | Model brevity, validate all responses |
| Data gathering | 10 min | Silent writing + round-robin sharing | Collect data, ensure everyone contributes |
| Discussion | 15 min | Cluster, theme, discuss root causes | Keep discussion focused, prevent tangents |
| Prioritization | 10 min | Dot voting, select top 3 action items | Ensure voting is fair, watch for groupthink |
| Wrap-up | 5 min | Action items, retro retro, close | Confirm owners, collect retro feedback |

### 60-Minute Retro Timebox
| Phase | Duration |
|-------|----------|
| Check-in | 5 min |
| Data gathering | 15 min |
| Discussion | 20 min |
| Prioritization | 15 min |
| Wrap-up | 5 min |

### Timebox Management
- Use a visible timer (phone, screen share, physical timer)
- Give 2-minute warnings before phase transitions
- If a discussion is productive but running over, ask the team: "This is valuable — should we extend this phase by 5 minutes and shorten the next one?"
- If a discussion is stuck, park it: "This needs more time. Let's add it to the parking lot and set up a follow-up session within 48 hours."

## Ensuring Equal Participation

### Silent Writing (mandatory)
Before any discussion, every person writes their thoughts silently. Benefits:
- Prevents loud voices from dominating
- Introverts and deep thinkers get equal airtime
- Captures ideas before people are influenced by others
- Produces more ideas than brainstorming out loud

### Round-Robin Sharing
- One item per person per round
- Each person reads one of their sticky notes aloud
- Rounds continue until all notes are shared
- No cross-talk during sharing
- Facilitator keeps the pace brisk but not rushed

### Balancing Participation
```
Technique: Token-based speaking
- Each person gets 3 tokens (coins, stickers, checkmarks)
- Each token represents one comment during discussion
- When tokens run out, listen only
- Ensures no one dominates and no one is silent
```

### Quiet Team Members
- Notice who has not spoken and invite them directly: "Alice, you've been quiet — what's your perspective on the deployment issue?"
- Use written formats (silent writing, anonymous surveys) when verbal participation is uneven
- Follow up 1:1 after the retro to check if they had ideas they didn't share

### Dominant Speakers
- Use the token system explicitly
- Paraphrase and redirect: "Thanks, Bob. I want to hear from others who haven't spoken yet."
- In private, coach the dominant speaker on giving space
- Remember: dominance is often well-intentioned (eagerness, passion), not malicious

## Action Item Ownership

### Writing Good Action Items
```
Template:
Action: [Verb] [specific thing] by [timeframe]
Owner: [single person]
Success Criterion: [how we verify it's done]
```

### Examples
```
✅ Good: "Alice will create a pre-commit hook for test runners by Wednesday."
❌ Bad: "Improve testing practices." (Too vague, no owner, no deadline)
✅ Good: "Bob will schedule a 30-min session with the DevOps team to discuss CI pipeline issues before Friday."
❌ Bad: "Fix the pipeline." (No owner, no specific change)
```

### Owner Accountability
- One owner per item — shared ownership is no ownership
- Owner is accountable for completion, but can recruit help
- Owner reports status at the next retro (or daily standup for time-sensitive items)
- If the owner cannot complete the item, they must escalate before the deadline

### Maximum Three Action Items
Research consistently shows that more than 3 action items guarantees none get completed. Three is focus. One is perfectly acceptable for a shorter sprint cycle. The rest go to the process improvement backlog.

## Follow-Up

### Next Retro Start
Every retro starts with a review of the previous retro's action items:

```
Previous Action Items Review:
| Action | Owner | Status | Notes |
|--------|-------|--------|-------|
| Pre-commit hook for tests | Alice | ✅ Done | Hook running for 2 weeks |
| CI pipeline meeting | Bob | 🔄 In progress | Meeting scheduled for Friday |
| Onboarding docs update | Carol | ❌ Blocked | Waiting for access to wiki |
```

### Status Definitions
- **Done**: Completed and verified per the success criterion
- **In Progress**: Active work continues, not yet complete
- **Blocked**: Cannot proceed without external input or resolution
- **Not Started**: No action taken — discuss barriers
- **Closed**: Item is no longer relevant or has been superseded

### Handling Incomplete Items
- One sprint late: Discuss barriers, recommit or revise approach
- Two sprints late: Escalate to manager, reconsider if item is a priority
- Three sprints late: Close the item — the team has signaled it won't happen

## Metrics-Driven Retros

Using data to supplement the subjective discussion:

| Metric | What It Reveals | How to Present |
|--------|----------------|----------------|
| Velocity trend | Team stability, scope creep | 3-6 sprint rolling average |
| Completed vs committed | Predictability | Percentage per sprint |
| Cycle time trend | Flow, bottlenecks | P50 and P95 over time |
| Bug count by severity | Quality trend | Bar chart per sprint |
| Action item completion rate | Team accountability | Percentage per retro cycle |
| Incident count | Operational health | Count per sprint |

### Data Before Discussion
Present metrics as a 2-minute dashboard before the silent writing phase. This grounds the subjective discussion in objective data. Example:

```
Sprint 12 Dashboard
- Velocity: 32 points (avg 30) — trend: stable ↑
- Completion: 86% (committed 37, completed 32)
- Cycle time: P50=2.5d, P95=6.5d — trend: improving
- Bugs: 3 major, 1 critical — increased from last sprint
- Incidents: 2 P2, 0 P1
- Action items carried over: 2 of 3 completed
```

## Remote Retro Facilitation

### Tool Recommendations
- **Miro / Mural**: Virtual board with sticky notes, voting, timer
- **Retromat**: Random retro format generator
- **FunRetro**: Specialized retro tool
- **TeamRetro**: Retro tool with action item tracking
- **Confluence + Slack**: Simple alternative

### Remote-Specific Tips
- Use breakout rooms for pair/share before the full-group discussion
- Camera on (if the team agrees) — seeing faces improves engagement
- Digital timer on the shared screen
- Chat for parallel contributions (especially introverts)
- Use reactions (thumbs up, emoji) for quick polling
- Schedule 5 extra minutes for technical transitions

## References
- Agile Retrospectives: Making Good Teams Great — Esther Derby & Diana Larsen (2006)
- The Retrospective Handbook — Patrick Kua
- Remote Retrospectives — Sven Reimes (FunRetro)
- Facilitator's Guide to Participatory Decision-Making — Sam Kaner
- https://retromat.org/ — Retro format generator
