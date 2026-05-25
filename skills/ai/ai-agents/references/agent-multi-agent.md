# Multi-Agent Systems

## Communication Patterns

| Pattern | Description | Use Case |
|---------|-------------|----------|
| Direct messaging | Agent-to-agent with addressed messages | Known peers, fixed topology |
| Broadcast | One agent sends to all peers | Announcements, discovery |
| Pub/Sub | Agents subscribe to topics via broker | Loose coupling, dynamic membership |
| Blackboard | Shared state all agents read/write | Collaborative problem solving |

### Direct Messaging Example
```python
class AgentMessage:
    def __init__(self, sender, recipient, msg_type, payload):
        self.sender = sender
        self.recipient = recipient
        self.msg_type = msg_type
        self.payload = payload
        self.timestamp = time.time()

class Agent:
    def __init__(self, name, mailbox):
        self.name = name
        self.mailbox = mailbox

    def send(self, recipient, msg_type, payload):
        msg = AgentMessage(self.name, recipient, msg_type, payload)
        recipient.mailbox.put(msg)

    def receive(self):
        return self.mailbox.get()
```

## Coordination Patterns

### Supervisor/Worker
```
Supervisor receives task
  ├── Decomposes into subtasks
  ├── Assigns to workers
  ├── Collects results
  └── Assembles final output
```

### Debate/Consensus
```
Agent A produces answer
Agent B critiques answer
Agent A refines based on critique
  └── Repeat N rounds or until consensus
```

### Sequential Pipeline
```
Agent A (parse input)
  → Agent B (retrieve context)
  → Agent C (generate response)
  → Agent D (validate output)
```

## Agent Discovery

```python
class AgentRegistry:
    def __init__(self):
        self.agents = {}

    def register(self, name, agent, capabilities):
        self.agents[name] = {
            "agent": agent,
            "capabilities": capabilities,
            "status": "idle"
        }

    def find_by_capability(self, capability):
        return [
            name for name, info in self.agents.items()
            if capability in info["capabilities"]
        ]
```

## Error Handling in Multi-Agent Systems

| Failure Mode | Strategy |
|--------------|----------|
| Agent unresponsive | Timeout + reassign task |
| Invalid output | Validation gate + retry |
| Conflicting results | Voting/consensus mechanism |
| Deadlock | Escalation to supervisor |
| Resource exhaustion | Priority queue + preemption |

## Best Practices
- Each agent has single responsibility
- Messages are immutable and versioned
- Timeouts at every communication boundary
- Circuit breakers prevent cascade failures
- All inter-agent communication is logged
- Agent health is monitored with heartbeats
