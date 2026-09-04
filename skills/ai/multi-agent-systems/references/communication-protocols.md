# Agent Communication Protocols

When 5 different agents are working on the same codebase, how do they share information without appending 50,000 tokens of conversational history to every single LLM API call?

## 1. The Message Passing Problem
If Agent A writes a 1,000-line Python file and sends it in a chat message to Agent B, and Agent B sends it back with comments to Agent C, the conversational history explodes. The LLM hits its token limit, latency spikes, and costs skyrocket.

## 2. The Blackboard Pattern (Shared State)
Derived from 1980s AI research, the **Blackboard Pattern** solves the token explosion problem.
- **The Blackboard**: A centralized, structured JSON object (or database) that holds the current state of the world.
- **The Agents**: They do not talk to each other directly. They read from the Blackboard, do their specialized work, and write the result back to the Blackboard.

```json
// The Global Blackboard State
{
  "task_description": "Create a login API",
  "draft_code": "def login(): pass",
  "review_comments": ["Missing JWT validation"],
  "current_assignee": "CoderAgent"
}
```
*Why this works*: The LLM is only fed the specific keys of the Blackboard it cares about. The `ReviewerAgent` doesn't need to see the entire chat history; it only needs to see `draft_code` and `task_description`.

## 3. The Actor Model (Decentralized State)
For highly distributed systems (e.g., an agent running on a user's phone communicating with an agent on a cloud server), the Blackboard pattern creates a bottleneck.
Instead, use the **Actor Model** (inspired by Erlang/Akka).
- Every agent has a private, internal state that no other agent can read or mutate.
- Agents communicate exclusively by firing asynchronous messages (Events) to other agents' mailboxes.
- If the `DatabaseAgent` needs a query from the `UserAgent`, it sends an event. It does not block; it goes to sleep or processes other messages until the `UserAgent` replies.
