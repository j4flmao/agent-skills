# Sprint Retrospective Skill

## Overview
Sprint retrospectives are regular team ceremonies to inspect processes, identify improvements, and create actionable plans. This skill covers retrospective formats, facilitation techniques, action item management, and continuous improvement patterns.

## Decision Tree: Retrospective Format

### Choosing a Format
```
What's the team's current state?
├── New team, first retro → Start/Stop/Continue (simple, low barrier)
├── Good sprint, want to celebrate → Glad/Sad/Mad (balanced, positive framing)
├── Issues with process/blockers → Sailboat (identify anchors vs wind)
├── Need deep analysis → Starfish (5 categories: keep, less, more, stop, start)
├── Team is burned out → Lean Coffee (self-organizing topics, vote on priorities)
├── Sprint was rough, need healing → Rose/Thorn/Bud (emotionally safe)
├── Need to focus on outcomes → 4Ls (Liked, Learned, Lacked, Longed For)
├── Team avoiding conflict → DAKI (Do, Keep, Add, Improve — anonymous suggestions)
└── Need data-driven retro → Metrics-based (velocity, bug rate, cycle time)
```

### Facilitation Mode Decision
```
Team preference?
├── In-person → Physical board with sticky notes (most engaging)
├── Remote synchronous → Miro/Mural/FigJam board (structured online)
├── Remote async → Google Doc / Slack thread (flexible timing)
├── Hybrid → Digital board + in-person sticky notes hybrid
├── Small team (<5) → Free-form discussion (skip structured format sometimes)
└── Large team (>10) → Breakout groups + report out (keep everyone engaged)
```

## Retrospective Process

### Standard Agenda (60 min)
```
Time    Activity                    Purpose
5m      Set the stage              Frame, safety check, review last action items
15m     Gather data                Silent brainwriting on topic areas
15m     Generate insights          Group, cluster, discuss, vote
15m     Decide what to do          Form SMART action items
10m     Close the retro            Review agreements, retro retro, appreciations
```

### Virtual Retro Facilitation
```typescript
async function runRetro(format: string, team: string[]) {
  const board = await createBoard(format);
  const timer = new Timer();

  // Phase 1: Set the stage (5 min)
  await board.addSection('Check-in question:', 'What energy level are you bringing today?');
  await board.showLastSprintActionItems();
  timer.start(5);

  // Phase 2: Gather data (15 min)
  await board.addSection('What happened this sprint?');
  await board.enableSilentBrainwriting(15);

  // Phase 3: Generate insights (15 min)
  const clusters = await board.groupItems();
  await board.addVoting(clusters, 3); // 3 votes per person

  // Phase 4: Decide actions (15 min)
  const topItems = board.getTopItems(3);
  const actions = await board.createActionItems(topItems);

  // Phase 5: Close (10 min)
  await board.addSection('One thing to improve next sprint');
  await board.recordActionItems(actions);
  await board.shareRetroSummary();
}
```

## Action Item Management

### SMART Action Pattern
```python
@dataclass
class ActionItem:
    description: str          # Specific: what exactly will be done
    owner: str                # Measurable: who is responsible
    due_date: datetime        # Time-bound: when is it done
    success_criteria: str     # Achievable: how we know it's done
    status: str = "open"      # Trackable: current state
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: datetime | None = None
    blocked_reason: str | None = None  # Relevant: what's blocking

    def is_overdue(self) -> bool:
        return self.status == "open" and self.due_date < datetime.now()

    def days_overdue(self) -> int:
        if self.is_overdue():
            return (datetime.now() - self.due_date).days
        return 0

    def complete(self):
        self.status = "completed"
        self.completed_at = datetime.now()

    def block(self, reason: str):
        self.status = "blocked"
        self.blocked_reason = reason
```

### Action Item Decision Tree
```
Can this item be completed in one sprint?
├── YES → Assign owner, set due date within next sprint
├── NO, too large → Break into smaller sub-tasks
│   Create an experiment: "Try X for 2 weeks, then evaluate"
├── NO, needs more research → Create spike task
│   "Investigate solution for X by [date]"
└── NOT actionable → Discard or park in "icebox"

Who should own it?
├── Single person → Direct assignment
├── Multiple people → Assign one accountable owner
├── Team-wide change → Assign rotating responsibility
└── Manager action → Manager owns it

Is there resistance?
├── "We don't have time" → Re-evaluate priority; drop lowest-value task
├── "That won't work" → Run a 2-week experiment instead of full implementation
├── "Someone else should do it" → Assign specific owner; no diffusion
└── "Maybe next sprint" → If recurring every retro, escalate
```

## Retrospective Formats

### Start/Stop/Continue Template
```
START doing:
  - New practices to try
  - Tools or processes to adopt
  - Experiments for next sprint

STOP doing:
  - Practices that waste time
  - Processes that don't add value
  - Behaviors that cause friction

CONTINUE doing:
  - What's working well
  - Effective practices to keep
  - Positive behaviors to reinforce
```

### Glad/Sad/Mad Template
```
GLAD (celebrations):
  - Wins and achievements
  - Personal growth moments
  - Team accomplishments

SAD (improvements):
  - Missed opportunities
  - Process frustrations
  - Communication gaps

MAD (blockers):
  - External dependencies
  - Resource constraints
  - Organizational issues
```

### Sailboat Retro
```
WIND (what's pushing us forward?):
  - Accelerators and enablers
  - Tools and practices helping us
  - Team strengths

ANCHORS (what's holding us back?):
  - Process bottlenecks
  - Technical debt
  - Inefficient workflows

ROCKS (what risks do we see ahead?):
  - Upcoming deadlines
  - Known risks
  - Uncertainty areas

ISLAND (what does success look like?):
  - Vision for next sprint
  - Goals and outcomes desired
```

## Continuous Improvement

### Metrics Tracking
```python
@dataclass
class SprintHealth:
    sprint: int
    action_items_created: int
    action_items_completed: int
    completion_rate: float
    top_issues: list[str]
    team_morale: float  # 1-5 scale
    velocity_change: float  # percentage

    def analyze_trends(self, history: list) -> dict:
        avg_completion = sum(h.completion_rate for h in history) / len(history)
        return {
            'avg_completion_rate': avg_completion,
            'completion_trend': 'up' if self.completion_rate > avg_completion else 'down',
            'recurring_issues': self._find_recurring(history),
            'mood_trend': 'improving' if self.team_morale > 3 else 'declining' if self.team_morale < 3 else 'stable',
        }

    def _find_recurring(self, history: list) -> list[str]:
        all_issues = []
        for h in history:
            all_issues.extend(h.top_issues)
        return [issue for issue in set(all_issues) if all_issues.count(issue) >= 3]
```

## Key Anti-Patterns
- **No action items**: Discussion without follow-through wastes everyone's time
- **Same topics every sprint**: Indicates systemic issues not being fixed
- **Blaming individuals**: Retro is about processes, not people
- **Management dictating outcomes**: Retro should be a safe space for the team
- **Skipping retros when busy**: Most important when team is under pressure
- **Too many action items**: Focus on 2-3 high-impact changes per sprint
- **No owner on action items**: Unassigned action items never get done
- **No review of previous action items**: Start every retro with status check
- **Same format every time**: Variety keeps retros fresh and engaging
- **Not celebrating wins**: Teams need recognition, not just problem-solving
- **Going over time**: Respect the timebox; better to end early than run over
- **Quiet team members**: Use anonymous input or round-robin to include everyone
- **Retro without context**: Refer to sprint data (velocity, bugs, incidents)
- **Action items without due dates**: Incomplete assignments breed procrastination
- **Not escalating systemic blockers**: Some issues need manager/org-level support

## Retro Tool Integration
```javascript
// Example: Retro bot for Slack
async function postRetroSummary(channel, actions, metrics) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `Sprint Retro #${metrics.sprint} Summary` },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Completion Rate:* ${metrics.completionRate}%` },
        { type: 'mrkdwn', text: `*Team Mood:* ${metrics.morale}/5` },
      ],
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: '*Action Items:*' },
    },
    ...actions.map((a) => ({
      type: 'section',
      text: { type: 'mrkdwn', text: `• *${a.description}* — @${a.owner}, due ${a.dueDate}` },
    })),
  ];

  await slackClient.chat.postMessage({ channel, blocks });
}
```

## Agile Retrospectives Anti-Patterns Quick Reference
| Problem | Symptom | Fix |
|---------|---------|-----|
| Blame culture | "He didn't" statements | Use "we" language, focus on process |
| Action item pileup | 10+ items per retro | Limit to top 3 by vote |
| Same issues recurring | "We talked about this last time" | Escalate; try different format |
| Low participation | Silent team members | Anonymous input, round-robin |
| No improvement | Same velocity/bugs | Review action completion first |
| Too much negativity | Only complaints | Force appreciations/celebrations |
| Too much positivity | No criticism | Use "Even Better If" questions

## Implementation Patterns

### Retro Board Service

```python
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime
import json
import hashlib

@dataclass
class RetroItem:
    author: str
    text: str
    category: str
    timestamp: datetime = field(default_factory=datetime.now)
    vote_count: int = 0
    id: str = ""

    def __post_init__(self):
        if not self.id:
            raw = f"{self.author}:{self.text}:{self.timestamp.isoformat()}"
            self.id = hashlib.md5(raw.encode()).hexdigest()[:12]

    def vote(self):
        self.vote_count += 1

@dataclass
class ActionItem:
    description: str
    owner: str
    due_date: str
    status: str = "open"
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    completed_at: Optional[str] = None
    id: str = ""

    def __post_init__(self):
        if not self.id:
            self.id = hashlib.md5(f"{self.description}:{self.owner}".encode()).hexdigest()[:8]

class RetroBoard:
    def __init__(self, sprint_id: str, format_type: str = "start_stop_continue"):
        self.sprint_id = sprint_id
        self.format_type = format_type
        self.items: List[RetroItem] = []
        self.action_items: List[ActionItem] = []
        self.categories = self._get_categories()

    def _get_categories(self) -> List[str]:
        formats = {
            "start_stop_continue": ["start", "stop", "continue"],
            "glad_sad_mad": ["glad", "sad", "mad"],
            "sailboat": ["wind", "anchor", "rock", "island"],
            "starfish": ["keep", "less", "more", "stop", "start"],
            "four_ls": ["liked", "learned", "lacked", "longed_for"],
            "rose_thorn_bud": ["rose", "thorn", "bud"],
            "daki": ["do", "keep", "add", "improve"],
        }
        return formats.get(self.format_type, ["good", "bad", "action_items"])

    def add_item(self, author: str, text: str, category: str) -> RetroItem:
        if category not in self.categories:
            raise ValueError(f"Invalid category '{category}'. Must be one of {self.categories}")
        item = RetroItem(author=author, text=text, category=category)
        self.items.append(item)
        return item

    def add_action_item(self, description: str, owner: str, due_date: str) -> ActionItem:
        item = ActionItem(description=description, owner=owner, due_date=due_date)
        self.action_items.append(item)
        return item

    def complete_action_item(self, item_id: str):
        for item in self.action_items:
            if item.id == item_id:
                item.status = "completed"
                item.completed_at = datetime.now().isoformat()
                break

    def get_top_items(self, limit: int = 3, category: Optional[str] = None) -> List[RetroItem]:
        filtered = [i for i in self.items if category is None or i.category == category]
        return sorted(filtered, key=lambda x: -x.vote_count)[:limit]

    def summarize(self) -> Dict:
        return {
            "sprint_id": self.sprint_id,
            "format": self.format_type,
            "total_items": len(self.items),
            "items_by_category": {
                cat: len([i for i in self.items if i.category == cat])
                for cat in self.categories
            },
            "top_voted_items": [
                {"text": i.text[:100], "category": i.category, "votes": i.vote_count}
                for i in self.get_top_items(5)
            ],
            "action_items": {
                "total": len(self.action_items),
                "open": sum(1 for a in self.action_items if a.status == "open"),
                "completed": sum(1 for a in self.action_items if a.status == "completed"),
                "overdue": sum(1 for a in self.action_items if a.status == "open" and a.due_date < datetime.now().isoformat()),
            },
        }

class RetroFacilitator:
    def __init__(self, team_size: int, is_remote: bool = True):
        self.team_size = team_size
        self.is_remote = is_remote

    def select_format(self, sprint_health: Dict) -> str:
        mood = sprint_health.get("mood", "neutral")
        completion_rate = sprint_health.get("completion_rate", 0.5)
        recurring_issues = sprint_health.get("recurring_issues", 0)

        if completion_rate > 0.8 and mood == "positive":
            return "glad_sad_mad"
        elif completion_rate < 0.4:
            return "sailboat"
        elif recurring_issues > 3:
            return "starfish"
        elif mood == "negative":
            return "rose_thorn_bud"
        elif self.team_size > 8:
            return "start_stop_continue"
        return "four_ls"

    def get_timings(self) -> Dict:
        if self.team_size <= 4:
            return {"setup": 3, "gather": 10, "discuss": 10, "action": 10, "close": 5}
        elif self.team_size <= 8:
            return {"setup": 5, "gather": 15, "discuss": 15, "action": 15, "close": 10}
        return {"setup": 5, "gather": 20, "discuss": 25, "action": 15, "close": 10}

class RetroAnalytics:
    def __init__(self):
        self.sprint_history: List[Dict] = []

    def add_sprint(self, health: Dict):
        self.sprint_history.append(health)

    def get_completion_trend(self) -> Dict:
        if len(self.sprint_history) < 2:
            return {"trend": "insufficient_data", "avg_completion": 0}
        rates = [s.get("completion_rate", 0) for s in self.sprint_history]
        avg = sum(rates) / len(rates)
        recent_avg = sum(rates[-3:]) / min(3, len(rates))
        return {
            "trend": "improving" if recent_avg > avg else "declining" if recent_avg < avg else "stable",
            "avg_completion": round(avg, 2),
            "recent_avg": round(recent_avg, 2),
        }

    def get_recurring_themes(self) -> List[Dict]:
        all_issues = []
        for sprint in self.sprint_history:
            for issue in sprint.get("top_issues", []):
                all_issues.append(issue.lower().strip())
        from collections import Counter
        recurring = Counter(all_issues)
        return [{"issue": k, "count": v} for k, v in recurring.most_common(10) if v >= 2]
```

## Architecture Decision Trees

### Retro Format Selection

```
What's the team's current situation?
├── Team is new (<3 sprints together)
│   └── Start/Stop/Continue → Simple, builds foundational habits
│
├── Good sprint with wins to celebrate
│   └── Glad/Sad/Mad → Balanced positivity and improvement
│
├── Rough sprint with setbacks
│   ├── Team is frustrated → Rose/Thorn/Bud → Emotionally safe
│   └── Team wants deep analysis → Sailboat → Structured problem solving
│
├── Stagnant / recurring issues
│   └── Starfish → Forces change in 5 dimensions
│
├── Low team morale / burnout risk
│   └── Lean Coffee → Self-organizing, team chooses what matters
│
└── Need quantitative improvement
    └── Metrics-based retro → Data-driven, track velocity/bugs/lead time
```

### Action Item Tracking Strategy

```
Can this action be completed next sprint?
├── YES
│   ├── Single owner → Assign directly
│   ├── Multiple people → One accountable, others contributors
│   └── Team-wide change → Rotating responsibility
│
├── NO, too large
│   ├── Break into smaller sub-tasks (max 1 sprint each)
│   └── Create experiment with go/no-go decision after 2 weeks
│
├── NO, needs investigation
│   └── Create spike task with timebox (max 1 day)
│
└── NOT actionable (systemic, org-level)
    └── Escalate to management with impact analysis
```

## Production Considerations

- **Retro tool integration**: Connect retro boards to project management tools (Jira, Linear, Asana). Automatically create action items as tickets with proper labels and sprint assignments.
- **Anonymous input for sensitive topics**: Support anonymous submissions in digital retros. Anonymize by default, allow opt-in attribution for action items.
- **Retro data persistence**: Store retro data in a searchable format. Enables trend analysis across sprints and quarter-over-quarter comparison.
- **Facilitator rotation**: Avoid the same person facilitating every retro. Rotate every 2-3 sprints to bring fresh perspectives and prevent facilitator fatigue.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| No action items from retro | Discussion without action wastes time | Mandatory 2-3 action items per retro |
| Same action items every sprint | Systemic issues not being addressed | Escalate recurring items, change formats |
| Blaming individuals | Defensiveness shuts down open discussion | Focus on processes, use "we" language |
| Management attends all retros | Team self-censors with managers present | Management attends every 3rd, focus on listening not directing |
| Too many action items | None get completed | Limit to top 3 by team vote |
| Skipping retros when busy | Most important when under pressure | Even 15-min retro is better than none |
| Same format every sprint | Becomes routine, loses engagement | Alternate between 2-3 formats |
| Not reviewing previous actions | Same issues re-appear | Start every retro with action item status check |
| Going significantly over time | Loses team trust in timebox | Hard stop at time limit, park overflow items |

## Performance Optimization

- **Pre-populate retro board**: Before the retro, pre-populate the board with sprint data (completed stories, bugs, incidents, velocity). Saves 5-10 minutes of context-setting.
- **Action item auto-assignment**: Use historical data to suggest owners for action items based on expertise and current workload.
- **Retro templates**: Save successful retro formats as templates with pre-configured categories and timing. Reduces setup time by 80%.
- **Async retro option**: For distributed teams, enable asynchronous retro input over 24 hours before synchronous discussion. Increases participation from quiet team members. |
