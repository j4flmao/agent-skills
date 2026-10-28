---
name: sprint-retro
description: >
  Use this skill when the user says 'retrospective', 'sprint retro', 'retro format', 'start stop continue', 'sailboat retro', 'facilitate a retro', 'retro action items', 'our retros are boring', 'same issues every retro'. It plans and facilitates sprint retrospectives: format selection, the five-phase agenda, safety, turning discussion into owned experiments, and tracking action-item follow-through. Do NOT use for: incident postmortems (use devops/incident-response), running other Scrum events (use agile-scrum), team structure problems (use team-topology).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [management, agile, retrospective, facilitation, continuous-improvement]
---

# Sprint Retrospective

## Purpose
Help a team inspect how it worked and commit to one to three concrete improvements per sprint — then verify they happened. A retro succeeds when action items get done and recurring problems disappear, not when the board is full.

## Agent Protocol

### Trigger
"retro", "retrospective", "sprint retro", "retro format", "facilitate retro", "retro action items", "retros feel pointless", "recurring retro issues".

### Input Context
- Team size, remote/in-person, sprint length.
- What happened this sprint (goal met?, incidents, carry-over, morale signals).
- Status of last retro's action items.

### Output Artifact
Retro plan (agenda, format, prompts) or a summary with owned action items.

### Response Format
```
Format: {name} — why it fits this sprint
Agenda ({N} min): {phase: minutes, activity}
Prompts: {questions per column}
Actions (max 3): {action} | owner {name} | due {date} | success signal {observable}
Follow-up: {where tracked, reviewed at next retro start}
```

## Five-Phase Agenda (Derby & Larsen, *Agile Retrospectives*)

| Phase | 60-min retro | Purpose |
|-------|--------------|---------|
| 1. Set the stage | 5 min | Goal of the session, working agreement, quick check-in, review last actions |
| 2. Gather data | 15 min | Silent writing on the format's columns; add sprint facts (goal met, incidents, cycle time) |
| 3. Generate insights | 15 min | Cluster, dot-vote (3 votes each), discuss top clusters, ask "why" |
| 4. Decide what to do | 15 min | 1–3 SMART actions/experiments with owners |
| 5. Close | 10 min | Recap actions, appreciations, quick "retro of the retro" |

Scrum Guide time-box: at most 3 hours for a one-month sprint; usually shorter for shorter sprints (45–90 min for two weeks).

## Choosing a Format

| Situation | Format | Columns/prompts |
|-----------|--------|-----------------|
| New team, first retros | Start / Stop / Continue | What to start, stop, keep |
| Balanced sprint, emotions matter | Glad / Sad / Mad | Feelings about events |
| Process/blocker focus with a goal ahead | Sailboat | Wind (helps), Anchors (slows), Rocks (risks), Island (goal) |
| Stagnation, need nuance | Starfish | Keep, More of, Less of, Stop, Start |
| Learning focus | 4Ls | Liked, Learned, Lacked, Longed for |
| Rough sprint, need safety | Rose / Thorn / Bud | Positive, problem, opportunity |
| Pruning practices | DAKI | Drop, Add, Keep, Improve |
| Team wants to choose topics | Lean Coffee | Propose topics, vote, time-boxed discussions |
| Data-driven | Metrics retro | Cycle time, carry-over, escaped defects, incidents |
Rotate between 2–3 formats; the same format every sprint produces the same answers.

## Facilitation Practices
- Silent writing first (brainwriting) so quiet members contribute before discussion.
- Anonymous input when trust is low; read the room with a 1–5 safety check — if scores are low, discuss safety itself.
- Facilitator stays neutral; rotate the facilitator role every few sprints.
- Managers attend by team invitation only; if present, they listen rather than direct.
- Language: "we" and systems, not individuals ("the review queue delayed us", not "Sam was slow").
- Time-box each phase visibly; park overflow topics.
- Remote: one shared board (Miro, Mural, FigJam, Parabol, EasyRetro), cameras optional, explicit turn order.

## From Discussion to Action

```
Can it be done within the next sprint?
├── Yes → one owner, due date, success signal
├── Too large → slice it, or run a time-boxed experiment ("try X for 2 sprints, then evaluate")
├── Unknown solution → time-boxed spike with a question to answer
└── Outside team control → escalate with impact evidence; owner tracks the escalation
```

Good action: "Add a PR-size check that warns over 400 changed lines — owner Lan — by Wed — signal: median PR size drops next sprint."
Bad action: "Communicate better."

Put actions on the sprint board (they consume capacity) and review them in phase 1 of the next retro.

## Tracking Follow-Through

```python
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True, slots=True)
class RetroAction:
    description: str
    owner: str
    due: date
    success_signal: str
    done: bool = False


def completion_rate(actions: list[RetroAction]) -> float:
    if not actions:
        raise ValueError("No retro actions recorded; cannot compute completion rate")
    return sum(a.done for a in actions) / len(actions)


def recurring_topics(topics_by_sprint: list[list[str]], min_sprints: int = 3) -> list[str]:
    counts: dict[str, int] = {}
    for topics in topics_by_sprint:
        for topic in {t.strip().lower() for t in topics}:
            counts[topic] = counts.get(topic, 0) + 1
    return sorted(t for t, n in counts.items() if n >= min_sprints)
```
Signals worth tracking per sprint: action completion rate, topics recurring for 3+ retros (escalate them), and the team's own rating of retro usefulness.

## Anti-Patterns

| Anti-pattern | Fix |
|--------------|-----|
| No action items | End every retro with 1–3 owned actions |
| 10+ actions | Vote; keep the top 1–3 |
| Same issue every sprint | Escalate, or try an experiment that changes the system |
| Blame | Focus on process; facilitator redirects |
| Skipping retros when busy | Do a 20-minute version; pressure is when it matters |
| Actions never reviewed | Phase 1 reviews last actions |
| Only complaints | Include appreciations and what worked |
| Overrunning | Hard stop; park topics |

## Checklist
- [ ] Last retro's actions reviewed first
- [ ] Format chosen for this sprint's situation
- [ ] Everyone contributed (silent writing / round-robin)
- [ ] ≤3 actions, each with owner, due date, success signal
- [ ] Actions placed on the sprint board

## References
- `references/retro-formats.md` — format catalogue
- `references/facilitation-guide.md` — facilitation techniques
- `references/retro-techniques.md` — activities per phase
- `references/action-item-tracking.md` — follow-through
- `references/retro-metrics.md` — measuring retro effectiveness
- `references/sprint-retrospective.md` — overview
- `references/sprint-retro-fundamentals.md`
- `references/sprint-retro-advanced.md`
