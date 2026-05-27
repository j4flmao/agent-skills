# Sprint Retrospective

## Retrospective Formats

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
```

## Action Item Tracking

```python
@dataclass
class ActionItem:
    description: str
    owner: str
    due_date: datetime
    status: str = "open"
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: datetime = None

class ActionItemTracker:
    def __init__(self):
        self.items: List[ActionItem] = []

    def add_action_item(self, description: str, owner: str, due_date: datetime):
        self.items.append(ActionItem(description=description, owner=owner, due_date=due_date))

    def complete_item(self, index: int):
        if 0 <= index < len(self.items):
            self.items[index].status = "completed"
            self.items[index].completed_at = datetime.now()

    def get_open_items(self) -> List[ActionItem]:
        return [item for item in self.items if item.status == "open"]

    def get_overdue_items(self) -> List[ActionItem]:
        return [item for item in self.items
                if item.status == "open" and item.due_date < datetime.now()]

    def get_completion_rate(self) -> float:
        if not self.items:
            return 0.0
        completed = len([i for i in self.items if i.status == "completed"])
        return completed / len(self.items)
```

## Key Points

- Hold retrospectives at the end of each sprint
- Rotate retrospective formats for fresh perspectives
- Focus on actionable improvements, not blame
- Track action items with owners and due dates
- Review previous action items at each retro
- Use anonymous input for honest feedback
- Limit discussion time per topic
- Celebrate wins and improvements
- Document retro outcomes and share with team
- Follow up on action items between sprints
- Measure action item completion rate
- Experiment with different retro techniques
