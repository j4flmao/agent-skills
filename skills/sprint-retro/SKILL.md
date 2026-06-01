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
| Too much positivity | No criticism | Use "Even Better If" questions |
