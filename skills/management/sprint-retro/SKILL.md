---
name: management-sprint-retro
description: >
  Use this skill when the user says 'sprint retro', 'sprint retrospective', 'retro', 'retrospective', 'sprint review', 'what went well', 'sprint improvement', 'agile retro', 'retro format'. Facilitate structured sprint retrospectives with data collection, format selection, and action item tracking. Do NOT use for: sprint planning or daily standups.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [management, agile, retro, phase-7]
version: "1.0.0"
author: "j4flmao"
license: "MIT"
---

# Management Sprint Retro

## Purpose
Facilitate structured sprint retrospectives that produce actionable improvements. Collects sprint data for an objective baseline, guides the team through reflection formats matched to their current mood, enforces timeboxed activities for psychological safety, and converts insights into concrete action items with named owners and deadlines.

Retrospectives are the engine of continuous improvement in agile teams. Without structure, they devolve into venting sessions or shallow praise that changes nothing in the next sprint. This skill provides a complete, repeatable framework: gather objective sprint metrics before the meeting, select a retro format aligned to the team's emotional state, enforce strict timeboxes that keep the meeting productive, and convert discussion into a maximum of three actionable improvements per sprint with clear accountability. The output is not just a feel-good exercise — it is a prioritized process improvement backlog with owners and deadlines.

The most important rule is that retro output must change behavior. An action item without a named owner and a specific deadline is just a wish. An action item that is too vague to verify will not be done. The three-action-item limit is backed by research on team throughput: teams that commit to fewer improvements reliably complete more of them sprint over sprint.

## Agent Protocol

### Trigger
"sprint retro", "sprint retrospective", "retro", "retrospective", "sprint review", "what went well", "sprint improvement", "agile retro", "retro format"

### Input Context
- Sprint dates, duration, team member names and roles
- Sprint metrics: velocity (points/story count), completed vs committed %, bug count by severity, cycle time distribution (P50/P95), deployment frequency, rollback count, incident count
- Previous retro action items with status: done, in progress, blocked, not started

### Output Artifact
- Retro board with team input organized by format categories, affinity-grouped with named themes, dot vote counts
- Top 3 action items with specific description, one named owner, deadline, success criterion
- Previous action item follow-up with updated status

### Response Format
- Chosen retro format name with one-line justification
- Board structure as markdown table: one column per category, sticky notes with vote counts
- Grouped themes with dot vote distribution
- Action items table: Action | Owner | Deadline | Success Criterion
- Previous items table: Action | Status | Notes
- No preamble. No postamble. No explanations. Compress output.

### Completion Criteria
Retro board populated with categorized team input from silent writing phase. Top 3 action items selected via dot voting. Each action item has exactly one named owner with a deadline. Previous retro items reviewed and statuses updated.

### Max Response Length
2500 tokens

## Framework and Methodology

### Retro Format Selection Guide

| Team Mood | Sprint Outcome | Recommended Format | Why |
|-----------|---------------|-------------------|-----|
| Neutral | Standard, balanced | Start/Stop/Continue | Simple, action-oriented, low friction |
| Reflective | Post-milestone | 4Ls (Liked/Learned/Lacked/Longed For) | Uncovers deeper patterns |
| Complex | Many factors | Sailboat | Metaphor surfaces hidden dynamics |
| Emotional | Tough sprint | Mad/Sad/Glad | Safety-first, emotional processing |
| Positive | Great sprint | Appreciative Inquiry | Build on what works |
| Stagnant | Same issues recurring | Five Whys | Root cause analysis |
| Overwhelmed | Too much WIP | Speed Boat | Identify anchors slowing progress |
| Conflict | Interpersonal tension | Timeline Retro | Objectively review sequence of events |
| New team | First retro together | Team Radar | Check team health holistically |
| Distributed | Remote team | Lean Coffee | Democratic agenda setting |

### Retro Format Decision Tree

```
What is the team's current emotional state?
  ├── Neutral or positive
  │   ├── Standard sprint → Start/Stop/Continue
  │   └── Great sprint, want to amplify → Appreciative Inquiry
  ├── Reflective or thoughtful
  │   └── Post-milestone or significant event → 4Ls
  ├── Complex or confused
  │   ├── Many factors at play → Sailboat
  │   └── Same problems every sprint → Five Whys
  ├── Negative or frustrated
  │   ├── Tough sprint, low morale → Mad/Sad/Glad
  │   ├── Team conflict or tension → Timeline Retro
  │   └── Overwhelmed by workload → Speed Boat
  └── New team or first retro
      └── Team Radar or Lean Coffee
```

### 10 Retro Format Descriptions

**Start/Stop/Continue:** Three columns. Team writes what they should start doing, stop doing, and continue doing. Best for balanced sprints. Simple and action-oriented.

**4Ls (Liked/Learned/Lacked/Longed For):** Four columns. What did you like? What did you learn? What did you lack? What did you long for? Drives deeper reflection after milestones.

**Sailboat:** Metaphor-based. Sail (wind) = what propelled us forward. Anchor = what held us back. Rocks = risks ahead. Iceberg = hidden dangers. Good for surfacing hidden dynamics.

**Mad/Sad/Glad:** Emotional categorization. What made you mad? What made you sad? What made you glad? Best after tough sprints. Builds psychological safety.

**Appreciative Inquiry:** Focus on what went well and how to amplify it. Four stages: Discover (what worked), Dream (what could be), Design (how to make it happen), Destiny (commit to action). Best for positive teams.

**Five Whys:** Start with a problem statement, ask "why" five times to reach root cause. One problem per retro. Best for recurring issues.

**Speed Boat:** Imagine the team is a speed boat. Anchors (things slowing you down) are identified and prioritized. Best for overwhelmed teams.

**Timeline Retro:** Draw a timeline of the sprint. Team adds events, feelings, and observations at each point. Discuss patterns. Best for conflict or emotional sprints.

**Team Radar (Glad/Sad/Confused):** Variant of Start/Stop/Continue. Three columns: Glad (what made you happy), Sad (what frustrated you), Confused (what was unclear). Best for new teams.

**Lean Coffee:** Democratic format. Team generates topics, votes on priority, discusses in order. Timebox per topic. Best for distributed or self-organizing teams.

## Workflow

### Step 1: Collect Data

Gather sprint metrics before the retro meeting for an objective baseline. Collect: velocity trend over the last 3-6 sprints (are we accelerating, stable, or slowing?), the completed vs committed ratio (how predictable are our estimates), bug counts by severity (is quality trending up or down?), cycle time P50 and P95 for completed stories (are we delivering faster or slower?), deployment frequency and success rate, and any P1/P2 incidents with durations. Present this data as a simple dashboard at the start of the retro to ground the subjective discussion in objective facts before the team starts writing sticky notes.

### Step 2: Choose Retro Format

Match the format to the team's current mood and the sprint's character. Start/Stop/Continue is the default for balanced, normal sprints with no dominant emotional event. 4Ls (Liked/Learned/Lacked/Longed For) drives deeper reflection and is ideal after a significant milestone like a major launch or a large migration. Sailboat (Wind/Anchor/Rocks/Iceberg) uses metaphor to help the team express complex dynamics, hidden risks, and systemic issues that are hard to articulate directly. Mad/Sad/Glad focuses on emotional safety and is best after a particularly tough sprint or when trust needs active rebuilding. Rotate formats every 2-3 sprints to prevent retro fatigue.

### Step 3: Timebox Activities

A 45-minute retro has five strict timeboxes. 5 minutes: individual silent writing, each person writes one thought per sticky note, no talking or discussion yet. 10 minutes: round-robin sharing, each person reads one note per round, rounds continue until all notes are shared, no cross-talk during sharing. 15 minutes: discussion and affinity grouping, the team clusters related notes together on the board, names each cluster with a theme, discusses patterns and root causes. 10 minutes: dot voting, each person gets 3 votes on which discussion topics to prioritize, the top vote-getters become action items. 5 minutes: retro retro, the team rates the retro format on a 1-5 scale and gives one piece of facilitator feedback.

### Step 4: Select Action Items

Convert the top-voted discussion topics into concrete action items. Each action item must pass the SMART test: specific (what exactly will be done), measurable (how will we know it is complete), achievable (within the team's control), relevant (addresses an actual problem surfaced in the retro), time-bound (deadline no later than the next retro). Assign exactly one owner per item. Set a specific deadline. Maximum of 3 items per sprint — research shows that more than 3 action items guarantees none get done.

### Step 5: Follow-Up at Next Retro

Every retro begins with a review of the previous retro's action items. For each item evaluate: done (completed, verify the success criterion), in progress (active work continues, not yet complete), blocked (cannot proceed without external input, needs re-assessment), or not started (no action taken, discuss barriers). For completed items, a brief acknowledgment. For blocked items, decide whether to re-commit, revise the approach, or close. For not-started items, discuss what prevented action and whether re-committing is realistic.

### Step 6: Facilitate Remote Retros

For distributed teams: use a digital retro board (Miro, Mural, Retrium, or even a shared Google Doc with columns). Start with a 2-minute check-in to gauge energy levels. Use Lean Coffee format for democratic agenda setting. Keep the retro shorter (30 minutes for teams in different time zones). Use emoji reactions instead of dot votes. Record the retro for absent team members. Ensure everyone has time to write before sharing.

### Step 7: Track Action Item Completion Between Sprints

Create a visible tracker for retro action items (Kanban board column, Jira board, or physical chart). Update status at daily standup if relevant. If an action item is not completed by the next retro, discuss barriers and re-commit or close. Celebrate completed action items — recognition reinforces the behavior. Track action item completion rate as a retro metric: target > 80% of committed items completed per sprint.

### Step 8: Run Periodic Big Picture Retros

Quarterly, run a retrospective on the retrospective process itself. Review: which formats worked best, what is the action item completion rate, are the same issues recurring, is the retro still valuable. Adjust format rotation, timeboxes, or facilitation approach based on feedback. Consider a semi-annual team health check as a separate exercise.

### Step 9: Build Retro Facilitation Skills

Rotate facilitator role each sprint. Provide facilitation guides for each format. The facilitator's role: enforce timeboxes, ensure psychological safety, prevent blame, keep discussion focused on systems not people. After the retro, the facilitator ensures action items are documented and tracked. Facilitator training topics: active listening, time management, conflict de-escalation, inclusive participation.

### Step 10: Integrate Retros with Other Ceremonies

Link retro output to sprint planning: start planning by reviewing what was agreed in the retro. Link to backlog refinement: retro insights may generate new backlog items or reprioritization. Link to individual growth: retro patterns may inform personal development goals.

## Models

### 45-Minute Retro Timebox
```
 5 min  — Individual silent writing (generate notes)
10 min  — Round-robin sharing (share notes, no discussion)
15 min  — Discussion and affinity grouping (cluster and name themes)
10 min  — Dot voting and top 3 action items
 5 min  — Retro retro (rate format, facilitator feedback)
```

### Action Item SMART Checklist
- [ ] Specific — exactly what will be done, not vague
- [ ] Measurable — how to verify completion
- [ ] Achievable — within team's control
- [ ] Relevant — addresses a real retro finding
- [ ] Time-bound — deadline before next retro

### Retro Effectiveness Metrics
| Metric | Definition | Target |
|--------|------------|--------|
| Action Item Completion Rate | Items completed by next retro / total items | > 80% |
| Issue Recurrence Rate | Same issue appearing in 3+ consecutive retros | < 10% |
| Participation Rate | Active participants / total team members | > 90% |
| Retro Net Promoter Score | "Would you recommend this retro format?" | > 50 |
| Time to Value | Days from action item creation to completion | < 14 days |
| Format Diversity | Number of different formats used per quarter | > 3 |

## Common Pitfalls

### Pitfall 1: No Action Items
The team discusses problems but commits to nothing. Fix: enforce the dot voting and action item selection phase. No retro ends without at least one action item.

### Pitfall 2: Action Items Without Owners
"Let's improve testing" with no owner means it will not happen. Fix: every action item has exactly one named owner. Shared ownership = no ownership.

### Pitfall 3: Too Many Action Items
Teams commit to 8 items and complete none. Fix: maximum 3 items per sprint. One is perfectly acceptable.

### Pitfall 4: Blame-Oriented Discussion
"Bob's deployment broke everything" instead of "the deployment process had a gap." Fix: enforce systems focus. No names on sticky notes. Refer to processes, not people.

### Pitfall 5: Same Format Every Sprint
Start/Stop/Continue every time leads to retro fatigue and diminishing returns. Fix: rotate formats every 2-3 sprints. Use the format selection guide.

### Pitfall 6: Skipping Previous Item Review
Starting fresh each time means old problems resurface. Fix: always start by reviewing previous action items. Non-negotiable.

### Pitfall 7: Dominant Voices
Senior team members dominate discussion, quieter members disengage. Fix: silent writing first, round-robin sharing, anonymous voting.

### Pitfall 8: Complaints Without Solutions
Team identifies problems but does not propose solutions. Fix: action items must include what the team will do differently, not just what went wrong.

### Pitfall 9: Retro Rushing
Running out of time before selecting action items. Fix: enforce timeboxes strictly. If discussion runs long, cut it and move to voting.

### Pitfall 10: Not Celebrating Success
Only focusing on problems is demoralizing. Fix: every retro format should include a positive category. Celebrate wins and completed action items.

## Best Practices

- **Blame-free environment, always** — Retro is about processes, systems, and interactions. No names on negative sticky notes.
- **Maximum 3 action items per sprint** — More than 3 guarantees none get done.
- **Action items must be SMART and concrete** — "Improve testing" is not an action item. "Add Jest pre-commit hook" is.
- **Singular owner is mandatory** — Each action item has exactly one named owner. Shared ownership = nobody drives it.
- **Review previous items first, always** — Every retro starts with previous commitments. Non-negotiable.
- **Rotate formats regularly** — Same format every sprint causes retro fatigue. Rotate every 2-3 sprints.
- **Retro is separate from sprint review** — Demo stakeholders != team introspection. Never combine them.
- **Rotate the facilitator role** — Different person each sprint brings fresh perspective.
- **Present data before discussion** — Objective metrics ground subjective opinions.
- **Silent writing before group discussion** — Prevents anchoring and groupthink.

## Compared With

| Format | Strengths | Weaknesses |
|--------|-----------|------------|
| Start/Stop/Continue | Simple, action-oriented | Shallow for complex issues |
| 4Ls | Deep reflection, uncovers patterns | Time-intensive |
| Sailboat | Surfaces hidden dynamics, engaging | Metaphor can confuse |
| Mad/Sad/Glad | Emotional safety, trust-building | May feel too touchy-feely |
| Five Whys | Root cause analysis | One topic per retro |
| Speed Boat | Identifies blockers | Focuses on negatives |
| Timeline Retro | Objective event review | Requires detailed preparation |
| Appreciative Inquiry | Positive, energizing | May ignore real problems |
| Lean Coffee | Democratic, flexible | Less structured output |
| Team Radar | Holistic team health | Broad, not deep |

## Templates and Tools

### Retro Board Template (Start/Stop/Continue)
```
| Start Doing | Stop Doing | Continue Doing |
|-------------|------------|----------------|
| {note} (3 votes) | {note} (2 votes) | {note} (4 votes) |
| {note} (1 vote) | {note} (3 votes) | {note} (1 vote) |
```

### Action Item Tracking Template
| Action | Owner | Deadline | Success Criterion | Status |
|--------|-------|----------|-------------------|--------|
| Add lint-staged pre-commit hook | Alice | Sprint 5 | PRs show zero lint errors | Done |
| Write acceptance criteria before dev starts | Bob | Sprint 6 | 100% of stories have AC before sprint planning | In Progress |

### Retro Retro Template
```
Rate this retro format (1-5): {score}
What worked well: {feedback}
What could be improved: {feedback}
Next retro format suggestion: {suggestion}
```

### Sprint Metrics Dashboard
```
Sprint {n} Metrics:
  Velocity: {n} points (trend: up/stable/down)
  Completed vs Committed: {n}%
  Bugs: {n} (Blocker: {n}, Critical: {n}, Major: {n})
  Cycle Time P50: {n} days (P95: {n} days)
  Deployments: {n}/week
  Incidents: {n} (P1: {n}, P2: {n})
```

## Rules

- Blame-free environment, always — retro is about processes, systems, tools
- Maximum 3 action items per sprint — focus over volume
- Action items must be SMART — specific, measurable, achievable, relevant, time-bound
- Singular owner is mandatory — each item has exactly one named owner
- Review previous items first, always — demonstrates accountability
- Rotate formats every 2-3 sprints — prevents retro fatigue
- Retro is separate from sprint review — different purposes, different ceremonies
- Rotate the facilitator role — brings fresh perspectives
- Present sprint metrics before discussion — objective baseline for subjective input
- Silent writing before group sharing — prevents anchoring and groupthink
- Action items without completion by next retro need re-commit or close
- Celebrate completed action items — recognition reinforces the behavior
- Retro output must change behavior — no change means wasted retro
- Same issue in 3 consecutive retros means the approach needs to change, not just the effort

## Retro Format Deep Dives

### Start/Stop/Continue — Detailed Protocol
```
Facilitator Setup: Create 3 columns on board (digital or physical)
Prep: Bring sprint metrics dashboard, previous action items

Phase 1 — Silent Writing (5 min):
  Each person writes stickies for each column. No discussion.
  Prompt: "What should we start doing (new practices), stop doing (waste),
  and continue doing (strengths)?"

Phase 2 — Round-Robin Sharing (10 min):
  One person reads all their notes. Next person reads theirs.
  Facilitator clusters duplicates silently. No cross-talk.

Phase 3 — Discussion (15 min):
  Review each cluster. Ask: "Why did multiple people note this?"
  Vote on top 3 clusters needing action. Focus on start/stop over continue.

Phase 4 — Action Items (10 min):
  Convert top-voted clusters into SMART action items.
  Assign owners, deadlines, success criteria.

Phase 5 — Retro Retro (5 min):
  Rate format 1-5. Note one improvement for next retro.
```

### 4Ls (Liked/Learned/Lacked/Longed For) — Detailed Protocol
```
When: Post-milestone (launch, migration, major release)
Duration: 60 min (longer than standard — more depth)

Liked (10 min):
  "What specifically went well? Be concrete — name the commit, decision, or moment."
  Capture as: "Liked: {specific event/outcome} because {reason}"

Learned (10 min):
  "What did you learn about the technology, the process, the user, or the team?"
  Capture as: "Learned: {insight} — this changes how we will {action}"

Lacked (15 min):
  "What was missing? Tools, information, support, clarity, time?"
  Capture as: "Lacked: {gap} — this caused {specific negative outcome}"

Longed For (15 min):
  "What do you wish had been different? This is aspirational."
  Capture as: "Longed For: {ideal scenario} — if we had this we could {outcome}"

Action Item Generation (10 min):
  Each L generates potential improvements.
  Vote and select top 2-3.
```

### Sailboat Retro — Detailed Protocol
```
Metaphor mapping:
  Wind (Tailwinds): What propelled us forward? Accelerators, lucky breaks, great decisions.
  Anchor: What held us back? Repeated blockers, slow processes, friction.
  Rocks: What risks are ahead? Upcoming deadlines, known issues not yet addressed.
  Iceberg: What hidden dangers exist? Unseen risks that could sink the sprint.

Process:
  1. Prep (before retro): Collect sprint data. Draw the boat metaphor.
  2. Silent generation (5 min): Notes per category. "What was our wind, anchor, rocks, iceberg?"
  3. Place anchors first (most concrete), then wind, then rocks/iceberg.
  4. Discuss the relationships: "Is this rock connected to that anchor?"
  5. Prioritize: Which anchor, if removed, would have the biggest impact?
  6. Action items from the highest-priority anchor.

Facilitation tips:
  - Keep the metaphor alive throughout — refer to it during discussion
  - The iceberg is the most important quadrant (hidden risks = biggest danger)
  - If the team struggles with any quadrant, that is itself a data point
```

### Mad/Sad/Glad — Detailed Protocol
```
When: Tough sprint, low morale, team conflict or burnout risk
Duration: 45 min (emotional work is draining — keep it tight)

Ground Rules (read aloud):
  - No names on sticky notes — talk about events and systems
  - All feelings are valid — no arguing about how someone felt
  - Focus on what we can change, not what we cannot

Silent Writing (5 min):
  Mad: What frustrated, angered, or disappointed you?
  Sad: What made you feel discouraged, let down, or worried?
  Glad: What made you happy, proud, or grateful?

Sharing (15 min):
  Read all Mad notes first (vent first, then process).
  Then Sad, then Glad (end on a positive note).
  Facilitator validates: "I hear that {event} was really frustrating."

Discussion (15 min):
  "What patterns do we see across these emotions?"
  "What one thing, if changed, would reduce the Mad and Sad by the most?"

Action Items (10 min):
  Top 1-2 items. Hard minimum: 1 action item.
  Celebrate the Glad items briefly before closing.
```

### Five Whys — Detailed Protocol
```
Prep: Select ONE problem from the sprint. Not "everything went wrong" — one specific,
observable negative outcome.

Process:
  Problem Statement: "During this sprint, {specific bad outcome} occurred."
  Why 1: "Because {direct cause}"
  Why 2: "Why did that happen? Because {underlying cause}"
  Why 3: "Why? Because {systemic cause}"
  Why 4: "Why? Because {process/policy cause}"
  Why 5: "Why? Because {root cause — cultural, structural, or environmental}"

Example:
  Problem: Production hotfix was deployed without review.
  Why 1: Because the CI pipeline was broken and couldn't block the merge.
  Why 2: Because the CI config hadn't been updated after the infra migration.
  Why 3: Because the infra migration didn't include CI pipeline migration in scope.
  Why 4: Because the migration checklist only covered runtime infrastructure.
  Why 5: Because we have no standard migration checklist template.

Root Cause: No standard migration checklist covering CI/CD pipeline migration.

Action: Create migration checklist template covering all pipeline stages + assign owner.

Rules:
  - One problem per retro — depth over breadth
  - Answers must be factual, not speculative
  - Stop earlier if the answer is outside the team's control
  - Each "why" should get progressively more systemic
  - The root cause is usually a process gap, not a person failure
```

### Appreciative Inquiry — Detailed Protocol
```
When: Great sprint, high morale, want to amplify strengths
Philosophy: Rather than fix problems, amplify what works

Four Ds (requires 60 min):
1. Discover (15 min):
   "What was the best moment of this sprint?"
   "What did the team do that made you proud?"
   "When did you feel most effective?"

2. Dream (15 min):
   "If this sprint were the new normal, what would be different?"
   "What would an ideal sprint look like based on what worked?"
   Capture positive vision statements.

3. Design (15 min):
   "What two things can we do to make the Dream more likely?"
   "What systems, practices, or tools would support our strengths?"
   Design concrete propositions.

4. Destiny (15 min):
   "What is our commitment to make this happen?"
   "Who will own each element?"
   Commit to 1-2 amplifying actions.

Warning: Do NOT use when major problems exist — it will feel dismissive.
Only use when the team genuinely had a strong sprint and wants to build on it.
```

### Lean Coffee Retro — Detailed Protocol
```
When: Distributed teams, self-organizing teams, democratic process needed
Duration: 45-60 min

Process:
  1. Agenda Building (5 min):
     Each person adds topics to the board: "{topic} | {name}"
     Topics are problems, ideas, or discussion items.

  2. Voting (3 min):
     Each person gets 3 dot votes. Vote on topics to discuss.
     Top 5-8 topics form the agenda.

  3. Discussion Rounds (30-40 min):
     Timebox per topic: 5-7 minutes (set a timer).
     At time, group votes: "One more round?" or "Move on?"
     Capture key discussion points and potential actions.

  4. Action Items (5 min):
     Convert discussion outcomes into concrete actions.
     If a topic generated no action, it was a vent — acknowledge and move on.

Facilitation rules:
  - Anyone can call "move on" if the topic is not productive
  - Capture parking lot items for later
  - End on time — do not extend for one more topic
```

### Timeline Retro — Detailed Protocol
```
When: Conflict, emotional sprints, need to establish objective facts
Duration: 60 min

Prep:
  - Draw a horizontal timeline of the sprint dates
  - Mark known events: ceremonies, milestones, releases, incidents
  - Leave space above and below for notes

Process:
  1. Populate Timeline (10 min):
     Each person adds events they remember — stickies on the timeline.
     Use green for positive events, red for negative, yellow for neutral.
     No discussion during population.

  2. Identify Patterns (15 min):
     Look for clusters of negative events. "What happened around Sprint Day 3?"
     Look for causality chains. "Did the deploy failure cause the late bug fix?"
     Identify emotional peaks and valleys.

  3. Discuss Key Moments (15 min):
     Pick 2-3 most impactful moments on the timeline.
     "What led to this moment?"
     "What could have been different?"

  4. Action Items (10 min):
     Focus on process changes that prevent the negative pattern.
     Assign owners and deadlines.

  5. Timeline Review (10 min):
     "Does the timeline tell a different story than we remember?"
     "What would we tell ourselves at the start of this sprint if we knew then what we know now?"
```

### Speed Boat Retro — Detailed Protocol
```
When: Team feels overwhelmed, blocked, or slowed down
Duration: 45 min

Metaphor:
  The team is a speedboat heading toward a destination (sprint goal).
  Anchors are things slowing the boat down, threatening progress.
  Waves are external factors the team cannot control.

Process:
  1. Draw the Speedboat (5 min):
     Boat on left, destination on right (sprint goal).
     Anchors hanging from the boat. Waves in the water.

  2. Identify Anchors (10 min):
     Each person writes anchors: "What is slowing us down?"
     One anchor per sticky. Place them on the anchor chains.
     Examples: slow CI, unclear decisions, waiting for review, context switching.

  3. Identify Waves (5 min):
     What external factors are making the journey harder?
     Examples: reorg, market changes, stakeholder churn.

  4. Prioritize Anchors (10 min):
     Which anchor, if removed, would increase speed the most?
     Dot vote on anchors. Top 2-3 anchors selected.

  5. Action Plan (10 min):
     For each top anchor: "What can we do to cut this anchor loose?"
     Assign owner and deadline per anchor.

  6. Wave Management (5 min):
     Waves cannot be removed, but the boat can be prepared.
     "How can we navigate these waves better?"
```

### Team Radar (Glad/Sad/Confused/Neutral) — Detailed Protocol
```
When: New team's first retro, or checking overall team health
Simplified version of Mad/Sad/Glad with additional dimension

Process (45 min):
  1. Silent Writing (5 min):
     Glad: What made you happy or proud this sprint?
     Sad: What frustrated or disappointed you?
     Confused: What is unclear about the process, direction, or expectations?
     Neutral (optional): What didn't you have a strong feeling about?

  2. Sharing (15 min):
     Round-robin read all notes. Facilitator sorts into logical groups.

  3. Discussion (15 min):
     Focus on Confused items first — these are easiest to resolve.
     Then Sad items — prioritize by frequency.
     Glad items — reinforce what is working.

  4. Action Items (10 min):
     Max 3 items. Prioritize Confused resolution (quick wins).

Ideal for: First 2-3 retros of a new team, or after team composition changes.
```

## Retro Format Selection — Advanced Decision Matrix

| Team State | Sprint Outcome | Primary Format | Backup Format | Timebox |
|------------|---------------|----------------|---------------|---------|
| New team (0-2 sprints together) | Any | Team Radar | Start/Stop/Continue | 60 min |
| Stable, predictable | Standard | Start/Stop/Continue | 4Ls | 45 min |
| Post-launch / milestone | Successful | Appreciative Inquiry | 4Ls | 60 min |
| Post-launch / milestone | Rocky | 4Ls | Timeline Retro | 60 min |
| Recurring same issues | Unchanged | Five Whys | Sailboat | 60 min |
| Low morale / burnout signs | Negative | Mad/Sad/Glad | Sailboat | 45 min |
| Team conflict | Negative | Timeline Retro | Mad/Sad/Glad | 60 min |
| Distributed / async | Any | Lean Coffee | Start/Stop/Continue | 45 min |
| Overwhelmed / blocked | Any | Speed Boat | Lean Coffee | 45 min |
| Pre-release / high stress | Any | Sailboat | Speed Boat | 45 min |
| Holiday / end-of-year | Any | Appreciative Inquiry | Start/Stop/Continue | 30 min |

## Retro Experimentation Playbook

### Experiment 1: Format Rotation Impact
```
Hypothesis: Rotating formats every 2 sprints increases retro NPS by 20%.
Measure: Retro NPS per sprint, action item completion rate.
Method: For 4 sprints: rotate vs. fixed Start/Stop/Continue.
Expected: Higher engagement and insight quality with rotation.
```

### Experiment 2: Timebox Compression
```
Hypothesis: 30-minute retros are more focused than 60-minute retros.
Measure: Action item quality (SMART score), completion rate.
Method: Alternate 30-min and 60-min retros for 4 sprints.
Expected: Tighter timeboxes force prioritization, better action items.
```

### Experiment 3: Facilitator Rotation
```
Hypothesis: Rotating facilitators improves format diversity and team ownership.
Measure: Format variety, participation score, action item quality.
Method: Fixed facilitator vs. rotated (2 sprints each).
Expected: Rotated facilitator leads to more format experimentation.
```

### Experiment 4: Silent Retro (Async)
```
Hypothesis: Async written retros produce deeper insights than synchronous.
Measure: Insight depth (rated by team), participation rate.
Method: Alternate async (shared doc, 48h window) with synchronous.
Target async audiences: distributed teams, introverted team members.
```

### Experiment 5: Anonymous Voting Effects
```
Hypothesis: Anonymous dot voting produces different priorities than public voting.
Measure: Vote distribution, action item selection, post-retro satisfaction.
Method: Alternate anonymous and public voting across 4 retros.
Expected: Anonymous voting surfaces more "unpopular but important" items.
```

## Retro Formats Compared — Full Decision Table

| Format | Prep Time | Session Time | Depth | Best Mood | Worst For |
|--------|-----------|-------------|-------|-----------|-----------|
| Start/Stop/Continue | 5 min | 45 min | Medium | Neutral/Positive | Complex problems |
| 4Ls | 10 min | 60 min | Deep | Reflective | Time-constrained |
| Sailboat | 10 min | 60 min | Deep | Complex | Concrete thinkers |
| Mad/Sad/Glad | 5 min | 45 min | Medium | Emotional | Avoidant teams |
| Appreciative Inquiry | 10 min | 60 min | Deep | Positive | Major problems |
| Five Whys | 15 min | 60 min | Very deep | Recurring issues | Multiple problems |
| Speed Boat | 5 min | 45 min | Medium | Overwhelmed | Blame culture |
| Timeline Retro | 20 min | 60 min | Deep | Conflict | Tight schedules |
| Team Radar | 5 min | 45 min | Medium | New team | Experienced teams |
| Lean Coffee | 5 min | 45 min | Variable | Distributed | Directive cultures |

## References
  - references/action-item-tracking.md — Action Item Tracking
  - references/facilitation-guide.md — Retro Facilitation Guide
  - references/retro-formats.md — Retro Formats
  - references/retro-metrics.md — Retro Metrics
  - references/retro-techniques.md — Retro Techniques
  - references/sprint-retro-advanced.md — Sprint Retro Advanced
  - references/sprint-retro-fundamentals.md — Sprint Retro Fundamentals

## Handoff
sprint-retro (schedule next retro with new action item tracking), okr-kpi (align retro improvement themes with team goals).
