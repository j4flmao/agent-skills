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

The most important rule is that retro output must change behavior. An action item without a named owner and a specific deadline is just a wish. An action item that is too vague to verify ("improve testing") will not be done. The three-action-item limit is backed by research on team throughput: teams that commit to fewer improvements reliably complete more of them sprint over sprint.

## Agent Protocol

### Trigger
"sprint retro", "sprint retrospective", "retro", "retrospective", "sprint review", "what went well", "sprint improvement", "agile retro", "retro format"

### Input Context
- Sprint dates: start date, end date, duration in calendar days, number of working days
- Team member names and roles (for action item assignment, voting pool, and participant count)
- Sprint metrics: velocity in points or story count, completed vs committed percentage, bug count by severity (blocker, critical, major, minor), cycle time distribution (P50 median and P95 tail), deployment frequency per day, rollback count, P1/P2 incident count with durations
- Previous retro action items with their current status: done, in progress, blocked, not started, closed

### Output Artifact
- Retro board: all team input organized into the chosen format's categories, affinity-grouped with named themes, and dot vote counts
- Top 3 action items: each with a specific description, one named owner, a deadline before the next retro, and a clear success criterion
- Previous action item follow-up: each item with its updated status and any relevant notes

### Response Format
- Chosen retro format name with a one-line justification of why it fits the current sprint context
- Board structure as a markdown table: one column per retro category, sticky note content in each cell with vote counts appended
- Grouped themes with their dot vote distribution to show where the team focused energy
- Action items table: Action (SMART description) | Owner (single person) | Deadline (specific date or next retro) | Success Criterion (how to verify completion)
- Previous items table: Action | Status (done/in-progress/blocked/not-started) | Notes
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
Retro board populated with categorized team input from the silent writing phase. Top 3 action items selected via dot voting with clear winners. Each action item has exactly one named owner with a deadline. Previous retro items reviewed and statuses updated.

### Max Response Length
2500 tokens

## Workflow

1. **Collect data** — Gather sprint metrics before the retro meeting for an objective baseline. Collect: velocity trend over the last 3-6 sprints (are we accelerating, stable, or slowing?), the completed vs committed ratio (how predictable are our estimates), bug counts by severity (is quality trending up or down?), cycle time P50 and P95 for completed stories (are we delivering faster or slower?), deployment frequency and success rate, and any P1/P2 incidents with durations. Present this data as a simple dashboard at the start of the retro to ground the subjective discussion in objective facts before the team starts writing sticky notes.

2. **Choose retro format** — Match the format to the team's current mood and the sprint's character. Start/Stop/Continue is the default for balanced, normal sprints with no dominant emotional event. 4Ls (Liked/Learned/Lacked/Longed For) drives deeper reflection and is ideal after a significant milestone like a major launch or a large migration. Sailboat (Wind/Anchor/Rocks/Iceberg) uses metaphor to help the team express complex dynamics, hidden risks, and systemic issues that are hard to articulate directly. Mad/Sad/Glad focuses on emotional safety and is best after a particularly tough sprint or when trust within the team needs active rebuilding. Rotate formats every 2-3 sprints to prevent retro fatigue.

3. **Timebox activities** — A 45-minute retro has five strict timeboxes. 5 minutes: individual silent writing, each person writes one thought per sticky note, no talking or discussion yet. 10 minutes: round-robin sharing, each person reads one note per round, rounds continue until all notes are shared, no cross-talk during sharing. 15 minutes: discussion and affinity grouping, the team clusters related notes together on the board, names each cluster with a theme, discusses patterns and root causes. 10 minutes: dot voting, each person gets 3 votes on which discussion topics to prioritize, the top vote-getters become action items. 5 minutes: retro retro, the team rates the retro format on a 1-5 scale and gives one piece of facilitator feedback.

4. **Select action items** — Convert the top-voted discussion topics into concrete action items. Each action item must pass the SMART test: specific (what exactly will be done — "add a pre-commit hook for the test runner" not "improve testing"), measurable (how will we know it is complete), achievable (within the team's control), relevant (addresses an actual problem surfaced in the retro), time-bound (deadline no later than the next retro). Assign exactly one owner per item. Set a specific deadline. Maximum of 3 items per sprint — research shows that more than 3 action items guarantees none get done.

5. **Follow-up at next retro** — Every retro begins with a review of the previous retro's action items. For each item evaluate: done (completed, verify the success criterion), in progress (active work continues, not yet complete), blocked (cannot proceed without external input, needs re-assessment), or not started (no action taken, discuss barriers). For completed items, a brief acknowledgment. For blocked items, decide whether to re-commit, revise the approach, or close. For not-started items, discuss what prevented action and whether re-committing is realistic. The follow-up demonstrates that the team takes retro outputs seriously and holds itself accountable.

## Models

### Format Selection Guide
| Team Mood | Sprint Outcome | Recommended Format | Why |
|---|---|---|---|
| Neutral | Standard, balanced | Start/Stop/Continue | Simple, action-oriented, low friction |
| Reflective | Post-milestone | 4Ls | Uncovers deeper patterns |
| Complex | Many factors | Sailboat | Metaphor surfaces hidden dynamics |
| Emotional | Tough sprint | Mad/Sad/Glad | Safety-first, emotional processing |

### 45-Minute Retro Timebox
```
 5 min  — Individual silent writing (generate notes)
10 min  — Round-robin sharing (share notes, no discussion)
15 min  — Discussion and affinity grouping (cluster and name themes)
10 min  — Dot voting and top 3 action items
 5 min  — Retro retro (rate format, facilitator feedback)
```

## Rules

- **Blame-free environment, always** — The retro is exclusively about processes, systems, tools, and interactions — never about individuals as people. Refer to "the deployment process" not "Bob's deployment." No names appear on negative sticky notes.
- **Maximum 3 action items per sprint** — Research consistently shows that more than 3 action items guarantees that none of them get done. Three is focus. One is perfectly acceptable for a shorter sprint cycle.
- **Action items must be SMART and concrete** — "Improve testing practices" is not an action item because it is not specific or measurable. "Add a pre-commit hook that runs Jest on all changed files before committing" is an action item.
- **Singular owner is mandatory** — Each action item has exactly one named owner. Shared ownership consistently results in nobody driving the item. The owner is accountable for completion but may recruit help.
- **Review previous items first, always** — Every retro starts with a review of the previous retro's commitments. This is non-negotiable. It demonstrates accountability and prevents the same issues from recurring sprint after sprint.
- **Rotate formats regularly** — Using the same format every sprint causes retro fatigue and diminishing returns. Rotate formats every 2-3 sprints to keep the exercise fresh and encourage different types of reflection.
- **Retro is separate from the sprint review** — The sprint review (demo to stakeholders, product feedback) and the retrospective (team introspection, process improvement) are different ceremonies with different purposes. Never combine them.
- **Rotate the facilitator role** — A different person facilitates the retro each sprint. This prevents one person's facilitation style from dominating, distributes facilitation skills across the team, and brings fresh perspectives to the format choice.

## Related Skills

- **okr-kpi** — Align retro improvement themes with team OKRs and quarterly KPI targets
- **risk-management** — Review risk register during the retro as part of the monitoring cadence
- **tech-debt-tracker** — Review debt backlog progress and ROI changes alongside retro action items
- **team-rules** — Update team working agreements and coding standards based on retro outcomes
- **pm** — Coordinate retro findings with the product manager for process and priority adjustments

## References

- [Retro Formats](references/retro-formats.md)

## Handoff
sprint-retro (schedule next retro with new action item tracking), okr-kpi (align retro improvement themes with team goals).
