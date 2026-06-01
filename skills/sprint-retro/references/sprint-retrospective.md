# Sprint Retrospective

## Overview
Sprint retrospectives are regular team ceremonies that inspect the last sprint and create actionable improvements. This reference covers retrospective formats, facilitation techniques, action item management, and continuous improvement metrics.

## Retrospective Formats

### Format Selection Decision Tree
```
What's the team's current dynamic?
├── New team building trust → Start/Stop/Continue (simple, non-threatening)
├── Good sprint, want to celebrate → Glad/Sad/Mad (balanced, positive)
├── Need to address blockers → Sailboat (visual metaphor for forces)
├── Sprint went poorly, need healing → Rose/Thorn/Bud (emotionally safe)
├── Need deep process analysis → Starfish (5 action categories)
├── Team is burnt out → Lean Coffee (self-directed topics)
├── Need data-driven discussion → Metrics-based (velocity, bug rate)
├── Team avoids conflict → DAKI (anonymous submissions)
└── Want fresh perspective → 4Ls (Liked, Learned, Lacked, Longed For)
```

### Start/Stop/Continue Implementation
```python
from dataclasses import dataclass, field
from typing import List, Dict
from datetime import datetime
from enum import Enum

class RetroFormat(Enum):
    START_STOP_CONTINUE = "start_stop_continue"
    GLAD_SAD_MAD = "glad_sad_mad"
    FOUR_LS = "four_ls"
    SAILBOAT = "sailboat"
    STARFISH = "starfish"
    DAKI = "daki"
    ROSE_THORN_BUD = "rose_thorn_bud"

@dataclass
class RetroItem:
    author: str
    content: str
    category: str
    timestamp: datetime = field(default_factory=datetime.now)
    votes: int = 0

class SprintRetrospective:
    def __init__(self, sprint_number: int, format: RetroFormat = RetroFormat.START_STOP_CONTINUE):
        self.sprint_number = sprint_number
        self.format = format
        self.items: List[RetroItem] = []
        self.action_items: List[str] = []
        self.date = datetime.now()

    def add_item(self, author: str, content: str, category: str):
        self.items.append(RetroItem(author=author, content=content, category=category))

    def vote_item(self, item_index: int):
        if 0 <= item_index < len(self.items):
            self.items[item_index].votes += 1

    def get_top_items(self, n: int = 3) -> List[RetroItem]:
        sorted_items = sorted(self.items, key=lambda x: x.votes, reverse=True)
        return sorted_items[:n]

    def add_action_item(self, action: str):
        self.action_items.append(action)

    def generate_summary(self) -> dict:
        return {
            "sprint": self.sprint_number,
            "format": self.format.value,
            "date": self.date.isoformat(),
            "participants": len(set(i.author for i in self.items)),
            "total_items": len(self.items),
            "top_items": [
                {"content": i.content, "category": i.category, "votes": i.votes}
                for i in self.get_top_items(5)
            ],
            "action_items": self.action_items,
            "action_item_count": len(self.action_items),
        }

    def categorize_by_format(self):
        """Return items organized by the retro format's categories."""
        return {
            category: [item for item in self.items if item.category == category]
            for category in self._get_categories()
        }

    def _get_categories(self) -> List[str]:
        category_map = {
            RetroFormat.START_STOP_CONTINUE: ["start", "stop", "continue"],
            RetroFormat.GLAD_SAD_MAD: ["glad", "sad", "mad"],
            RetroFormat.FOUR_LS: ["liked", "learned", "lacked", "longed_for"],
            RetroFormat.SAILBOAT: ["wind", "anchor", "rocks", "island"],
            RetroFormat.STARFISH: ["keep", "less", "more", "stop", "start"],
            RetroFormat.DAKI: ["do", "keep", "add", "improve"],
            RetroFormat.ROSE_THORN_BUD: ["rose", "thorn", "bud"],
        }
        return category_map.get(self.format, ["general"])
```

## Action Item Tracking

### Complete Action Item System
```python
@dataclass
class ActionItem:
    description: str
    owner: str
    due_date: datetime
    status: str = "open"
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: datetime = None
    sprint_created: int = 0
    blocked_reason: str = ""
    priority: str = "medium"  # high, medium, low
    tags: List[str] = field(default_factory=list)

class ActionItemTracker:
    def __init__(self):
        self.items: List[ActionItem] = []
        self.completion_history: List[float] = []

    def add_action_item(self, description: str, owner: str, due_date: datetime,
                       priority: str = "medium", tags: List[str] = None):
        item = ActionItem(
            description=description,
            owner=owner,
            due_date=due_date,
            priority=priority,
            tags=tags or [],
            sprint_created=len(self.completion_history) + 1,
        )
        self.items.append(item)

    def complete_item(self, index: int):
        if 0 <= index < len(self.items):
            self.items[index].status = "completed"
            self.items[index].completed_at = datetime.now()

    def block_item(self, index: int, reason: str):
        if 0 <= index < len(self.items):
            self.items[index].status = "blocked"
            self.items[index].blocked_reason = reason

    def get_open_items(self) -> List[ActionItem]:
        return [item for item in self.items if item.status == "open"]

    def get_overdue_items(self) -> List[ActionItem]:
        return [
            item for item in self.items
            if item.status == "open" and item.due_date < datetime.now()
        ]

    def get_completion_rate(self) -> float:
        if not self.items:
            return 0.0
        completed = len([i for i in self.items if i.status == "completed"])
        return completed / len(self.items)

    def get_blocked_items(self) -> List[ActionItem]:
        return [item for item in self.items if item.status == "blocked"]

    def get_items_by_owner(self, owner: str) -> List[ActionItem]:
        return [item for item in self.items if item.owner == owner]

    def calculate_velocity(self) -> dict:
        """Track action item completion trends across sprints."""
        if not self.completion_history:
            return {"trend": "stable", "avg_rate": 0.0}
        recent = self.completion_history[-3:]
        avg = sum(recent) / len(recent)
        return {
            "avg_completion_rate": avg,
            "trend": "improving" if len(recent) >= 2 and recent[-1] > recent[-2] else "declining",
            "history": self.completion_history,
        }

    def record_sprint_completion(self):
        """Call at end of sprint to record completion rate for this sprint."""
        rate = self.get_completion_rate()
        self.completion_history.append(rate)
```

## Facilitation Techniques

### Agenda Template (60-minute retro)
```python
retro_agenda = [
    ("Set the stage", 5, [
        "Review last sprint's action items",
        "Check-in question (e.g., 'Rate your energy 1-5')",
        "Remind of retro principles (blameless, improvement-focused)",
    ]),
    ("Gather data", 15, [
        "Silent brainwriting (5 min individual)",
        "Share items with team",
        "Place items on board in categories",
    ]),
    ("Generate insights", 15, [
        "Group related items",
        "Discuss patterns and root causes",
        "Vote on top items (3 votes per person)",
    ]),
    ("Decide what to do", 15, [
        "Discuss top 3-5 voted items",
        "Create SMART action items",
        "Assign owners and due dates",
    ]),
    ("Close", 10, [
        "Review action items aloud",
        "One-sentence takeaway from each person",
        "Rate the retro (1-5 for improvement)",
        "Thank the team",
    ]),
]
```

### Remote Retro Best Practices
- Use a shared board (Miro, Mural, FigJam, or digital whiteboard)
- Share screen or use a timer visible to all
- Use breakout rooms for large teams (>8 people)
- Send agenda ahead of time
- Use anonymous input for sensitive topics
- Have a dedicated facilitator (not the Scrum Master or manager)
- Use round-robin to ensure everyone speaks
- Keep video on for engagement
- Record action items visible in a shared doc
- End with a positive note or appreciation round

### Handling Difficult Retros

#### When Sprint Was Terrible
1. Acknowledge feelings first: "This was a tough sprint. Let's learn from it."
2. Use Rose/Thorn/Bud format (emotionally safe)
3. Focus on systemic issues, not individual blame
4. Identify 1-2 small actionable improvements
5. Celebrate what did go right, even if small
6. End with appreciation for effort

#### When No One Speaks
1. Use anonymous input (digital board, sticky notes, Google Form)
2. Start with something easy: "What's one thing that went well?"
3. Use round-robin: everyone shares one item
4. Break into pairs for discussion, then share back
5. Try a different format (Lean Coffee works well)
6. Ask open-ended questions

#### When Same Issues Recur
1. Review action item completion rate
2. Ask: "What stopped us from implementing this?"
3. Escalate blockers that need manager support
4. Try an experiment: "Do X for 2 sprints, then evaluate"
5. Create a spike task to investigate root cause
6. Consider if the issue is actually outside team control

## Metrics and Tracking

### Sprint Health Dashboard
```python
@dataclass
class SprintHealth:
    sprint: int
    action_items_created: int
    action_items_completed: int
    completion_rate: float
    top_issue_categories: List[str]
    team_morale: float  # 1-5 scale
    velocity_change: float
    bug_count: int
    participant_count: int

    def analyze(self, history: List['SprintHealth']) -> dict:
        if not history:
            return {"trend": "needs more data"}
        avg_morale = sum(h.team_morale for h in history) / len(history)
        avg_completion = sum(h.completion_rate for h in history) / len(history)
        return {
            "morale": {
                "current": self.team_morale,
                "average": round(avg_morale, 1),
                "trend": "up" if self.team_morale > avg_morale else "down",
            },
            "completion": {
                "current": f"{self.completion_rate:.0%}",
                "average": f"{avg_completion:.0%}",
                "trend": "improving" if self.completion_rate > avg_completion else "declining",
            },
            "recurring_issues": self._find_recurring_categories(history),
            "participation": f"{self.participant_count} participants",
        }

    def _find_recurring_categories(self, history: List['SprintHealth']) -> List[str]:
        all_categories = []
        for h in history:
            all_categories.extend(h.top_issue_categories)
        return [
            cat for cat in set(all_categories)
            if all_categories.count(cat) >= 3
        ]
```

## Key Points
- Hold retrospectives at the end of each sprint (timeboxed)
- Rotate retro formats for fresh perspectives and engagement
- Focus on actionable improvements, not blame
- Track action items with owners and due dates (SMART)
- Review previous action items at the start of each retro
- Use anonymous input for honest feedback when needed
- Limit discussion time per topic to stay within timebox
- Celebrate wins and improvements alongside problems
- Document retro outcomes and share with stakeholders
- Follow up on action items between sprints
- Measure action item completion rate as a health metric
- Experiment with different retro techniques (keep it fresh)
- Use data (velocity, bug counts, incident reports) alongside feelings
- Invite external stakeholders when relevant
- Escalate systemic blockers that need organizational support
- Practice blameless postmortem culture
- Create psychological safety for honest discussion
- Rotate facilitator role among team members
- End on a positive note (appreciation round)
- Track retro effectiveness with team feedback surveys

## Key Anti-Patterns
- No action items created from discussions
- Same topics every sprint (systemic issues not addressed)
- Blaming individuals instead of processes
- Management dictating retro outcomes (reduces psychological safety)
- Skipping retros when busy (most needed under pressure)
- Too many action items (focus on top 2-3)
- Action items without owners or due dates
- Not reviewing previous action items at start
- Same format every sprint (causes boredom)
- Only focusing on problems (ignore celebrations)
- Going significantly over timebox
- Dominant voices drowning out quiet team members
- Not documenting or sharing outcomes
- No follow-up on action items between sprints
- Treating retros as complaints sessions
- Not escalating outside the team when needed
- Over-reliance on metrics without qualitative context
- Skipping the "decide what to do" phase
