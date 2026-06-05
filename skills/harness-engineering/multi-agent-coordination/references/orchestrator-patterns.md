# Orchestrator Patterns Reference Guide

## Overview

Orchestrator patterns define how multiple agents are coordinated to achieve complex goals.
The choice of orchestration pattern fundamentally impacts system scalability, fault tolerance,
latency, and operational complexity. This guide covers centralized, decentralized, and hybrid
orchestration architectures with production-grade implementations.

---

## 1. Hub-and-Spoke Orchestration

### Architecture

The hub-and-spoke pattern centralizes all coordination logic in a single orchestrator agent
(the hub) that dispatches tasks to worker agents (spokes) and aggregates their results.

```
                    ┌─────────────┐
                    │ Orchestrator│
                    │    (Hub)    │
                    └──────┬──────┘
               ┌───────┬──┴──┬───────┐
               ▼       ▼     ▼       ▼
          ┌────────┐┌────────┐┌────────┐┌────────┐
          │Worker A││Worker B││Worker C││Worker D│
          └────────┘└────────┘└────────┘└────────┘
```

### Characteristics

| Property           | Value                          |
|--------------------|--------------------------------|
| Coordination       | Centralized                    |
| Single Point of Failure | Yes (the hub)            |
| Scalability        | Limited by hub throughput      |
| Complexity         | Low                            |
| Latency            | Medium (all routes through hub)|
| Best For           | Small-to-medium agent pools    |

### Python Implementation

```python
import asyncio
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional
from enum import Enum
import uuid
import logging

logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"


@dataclass
class Task:
    task_id: str
    task_type: str
    payload: Dict[str, Any]
    status: TaskStatus = TaskStatus.PENDING
    assigned_worker: Optional[str] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    priority: int = 0
    dependencies: List[str] = field(default_factory=list)

    @staticmethod
    def create(task_type: str, payload: Dict[str, Any], **kwargs) -> "Task":
        return Task(
            task_id=str(uuid.uuid4()),
            task_type=task_type,
            payload=payload,
            **kwargs,
        )


@dataclass
class WorkerRegistration:
    worker_id: str
    capabilities: List[str]
    max_concurrent: int = 5
    current_load: int = 0
    is_healthy: bool = True
    handler: Optional[Callable] = None


class HubOrchestrator:
    """Centralized hub-and-spoke orchestrator with task routing and lifecycle management."""

    def __init__(self, max_retries: int = 3, timeout_seconds: float = 30.0):
        self._workers: Dict[str, WorkerRegistration] = {}
        self._task_queue: asyncio.PriorityQueue = asyncio.PriorityQueue()
        self._active_tasks: Dict[str, Task] = {}
        self._completed_tasks: Dict[str, Task] = {}
        self._max_retries = max_retries
        self._timeout = timeout_seconds
        self._running = False
        self._capability_index: Dict[str, List[str]] = {}

    def register_worker(self, worker: WorkerRegistration) -> None:
        """Register a worker agent with the orchestrator."""
        self._workers[worker.worker_id] = worker
        for capability in worker.capabilities:
            if capability not in self._capability_index:
                self._capability_index[capability] = []
            self._capability_index[capability].append(worker.worker_id)
        logger.info(f"Registered worker {worker.worker_id} with capabilities {worker.capabilities}")

    def deregister_worker(self, worker_id: str) -> None:
        """Remove a worker from the orchestrator registry."""
        if worker_id in self._workers:
            worker = self._workers[worker_id]
            for capability in worker.capabilities:
                if capability in self._capability_index:
                    self._capability_index[capability].remove(worker_id)
            del self._workers[worker_id]
            logger.info(f"Deregistered worker {worker_id}")

    async def submit_task(self, task: Task) -> str:
        """Submit a task to the orchestrator for execution."""
        self._active_tasks[task.task_id] = task
        await self._task_queue.put((-task.priority, task.task_id))
        logger.info(f"Task {task.task_id} submitted (type={task.task_type})")
        return task.task_id

    def _find_best_worker(self, task_type: str) -> Optional[str]:
        """Route task to the best available worker using least-loaded strategy."""
        candidate_ids = self._capability_index.get(task_type, [])
        available = [
            wid for wid in candidate_ids
            if self._workers[wid].is_healthy
            and self._workers[wid].current_load < self._workers[wid].max_concurrent
        ]
        if not available:
            return None
        # Least-loaded selection
        return min(available, key=lambda wid: self._workers[wid].current_load)

    async def _execute_task(self, task: Task) -> None:
        """Execute a single task on the assigned worker with timeout and retry."""
        worker_id = self._find_best_worker(task.task_type)
        if worker_id is None:
            logger.warning(f"No available worker for task {task.task_id} (type={task.task_type})")
            await self._task_queue.put((-task.priority, task.task_id))
            await asyncio.sleep(1)
            return

        worker = self._workers[worker_id]
        task.assigned_worker = worker_id
        task.status = TaskStatus.ASSIGNED
        worker.current_load += 1

        try:
            task.status = TaskStatus.IN_PROGRESS
            result = await asyncio.wait_for(
                worker.handler(task.payload),
                timeout=self._timeout,
            )
            task.result = result
            task.status = TaskStatus.COMPLETED
            self._completed_tasks[task.task_id] = task
            del self._active_tasks[task.task_id]
            logger.info(f"Task {task.task_id} completed by {worker_id}")
        except asyncio.TimeoutError:
            task.error = "Task execution timed out"
            await self._handle_failure(task)
        except Exception as e:
            task.error = str(e)
            await self._handle_failure(task)
        finally:
            worker.current_load -= 1

    async def _handle_failure(self, task: Task) -> None:
        """Handle task failure with retry logic."""
        task.retry_count += 1
        if task.retry_count <= task.max_retries:
            task.status = TaskStatus.RETRYING
            logger.warning(
                f"Task {task.task_id} failed (attempt {task.retry_count}/{task.max_retries}): "
                f"{task.error}. Retrying..."
            )
            await self._task_queue.put((-task.priority, task.task_id))
        else:
            task.status = TaskStatus.FAILED
            self._completed_tasks[task.task_id] = task
            del self._active_tasks[task.task_id]
            logger.error(f"Task {task.task_id} permanently failed: {task.error}")

    async def run(self) -> None:
        """Main orchestration loop."""
        self._running = True
        logger.info("Hub orchestrator started")
        while self._running:
            try:
                _, task_id = await asyncio.wait_for(self._task_queue.get(), timeout=1.0)
                if task_id in self._active_tasks:
                    task = self._active_tasks[task_id]
                    asyncio.create_task(self._execute_task(task))
            except asyncio.TimeoutError:
                continue

    def stop(self) -> None:
        self._running = False
```

### TypeScript Implementation

```typescript
interface TaskDefinition {
  taskId: string;
  taskType: string;
  payload: Record<string, unknown>;
  priority: number;
  dependencies: string[];
}

interface WorkerAgent {
  workerId: string;
  capabilities: string[];
  maxConcurrent: number;
  currentLoad: number;
  isHealthy: boolean;
  execute: (payload: Record<string, unknown>) => Promise<unknown>;
}

class HubSpokeOrchestrator {
  private workers = new Map<string, WorkerAgent>();
  private taskQueue: TaskDefinition[] = [];
  private capabilityIndex = new Map<string, string[]>();

  registerWorker(worker: WorkerAgent): void {
    this.workers.set(worker.workerId, worker);
    for (const cap of worker.capabilities) {
      const existing = this.capabilityIndex.get(cap) ?? [];
      existing.push(worker.workerId);
      this.capabilityIndex.set(cap, existing);
    }
  }

  async submitTask(task: TaskDefinition): Promise<unknown> {
    const workerId = this.findBestWorker(task.taskType);
    if (!workerId) throw new Error(`No worker available for ${task.taskType}`);
    const worker = this.workers.get(workerId)!;
    worker.currentLoad++;
    try {
      return await worker.execute(task.payload);
    } finally {
      worker.currentLoad--;
    }
  }

  private findBestWorker(taskType: string): string | null {
    const candidates = this.capabilityIndex.get(taskType) ?? [];
    const available = candidates.filter((id) => {
      const w = this.workers.get(id)!;
      return w.isHealthy && w.currentLoad < w.maxConcurrent;
    });
    if (available.length === 0) return null;
    return available.reduce((best, id) =>
      this.workers.get(id)!.currentLoad < this.workers.get(best)!.currentLoad ? id : best
    );
  }
}
```

---

## 2. Mesh Orchestration (Decentralized)

### Architecture

In mesh orchestration, every agent can communicate with every other agent directly.
There is no central coordinator. Agents discover peers, negotiate task ownership, and
propagate state changes via gossip protocols or direct messaging.

```
     ┌────────┐         ┌────────┐
     │Agent A │◄───────►│Agent B │
     └───┬────┘         └────┬───┘
         │  ╲              ╱  │
         │    ╲          ╱    │
         │      ╲      ╱      │
         │        ╲  ╱        │
     ┌───┴────┐   ╳╳   ┌────┴───┐
     │Agent D │◄──╱──╲─►│Agent C │
     └────────┘         └────────┘
```

### Gossip-Based Peer Discovery

```python
import random
import time
from dataclasses import dataclass, field
from typing import Dict, List, Set


@dataclass
class PeerInfo:
    agent_id: str
    address: str
    capabilities: List[str]
    last_heartbeat: float = field(default_factory=time.time)
    generation: int = 0


class GossipRegistry:
    """Gossip-based peer discovery for mesh agent networks."""

    def __init__(self, self_id: str, self_address: str, fanout: int = 3):
        self._self_id = self_id
        self._self_address = self_address
        self._fanout = fanout
        self._peers: Dict[str, PeerInfo] = {}
        self._dead_threshold = 30.0  # seconds

    def add_seed(self, peer: PeerInfo) -> None:
        """Add initial seed peer for bootstrapping."""
        self._peers[peer.agent_id] = peer

    def get_live_peers(self) -> List[PeerInfo]:
        """Return all peers considered alive."""
        now = time.time()
        return [
            p for p in self._peers.values()
            if now - p.last_heartbeat < self._dead_threshold
        ]

    def select_gossip_targets(self) -> List[PeerInfo]:
        """Select random peers for gossip propagation."""
        live = self.get_live_peers()
        return random.sample(live, min(self._fanout, len(live)))

    def merge_peer_list(self, incoming: List[PeerInfo]) -> None:
        """Merge received peer information using highest generation wins."""
        for peer in incoming:
            if peer.agent_id == self._self_id:
                continue
            existing = self._peers.get(peer.agent_id)
            if existing is None or peer.generation > existing.generation:
                self._peers[peer.agent_id] = peer

    def heartbeat(self) -> PeerInfo:
        """Generate a heartbeat message for self."""
        return PeerInfo(
            agent_id=self._self_id,
            address=self._self_address,
            capabilities=[],
            last_heartbeat=time.time(),
            generation=int(time.time()),
        )
```

---

## 3. Hierarchical Orchestration

### Architecture

Hierarchical orchestration uses a tree structure where top-level orchestrators delegate
to sub-orchestrators, which in turn manage their own pools of workers.

```
                 ┌──────────────────┐
                 │  Root Orchestrator│
                 └────────┬─────────┘
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        ┌──────────┐┌──────────┐┌──────────┐
        │Sub-Orch A││Sub-Orch B││Sub-Orch C│
        └─────┬────┘└─────┬────┘└─────┬────┘
         ┌────┼────┐  ┌───┼───┐  ┌────┼────┐
         ▼    ▼    ▼  ▼   ▼   ▼  ▼    ▼    ▼
        W1   W2   W3 W4  W5  W6 W7   W8   W9
```

### Implementation

```python
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import asyncio


@dataclass
class SubOrchestrator:
    orch_id: str
    domain: str
    workers: List[str]
    capacity: int
    current_load: int = 0


class HierarchicalOrchestrator:
    """Multi-level orchestration with domain-based routing."""

    def __init__(self, orch_id: str):
        self.orch_id = orch_id
        self._sub_orchestrators: Dict[str, SubOrchestrator] = {}
        self._domain_routing: Dict[str, List[str]] = {}

    def register_sub_orchestrator(self, sub_orch: SubOrchestrator) -> None:
        self._sub_orchestrators[sub_orch.orch_id] = sub_orch
        if sub_orch.domain not in self._domain_routing:
            self._domain_routing[sub_orch.domain] = []
        self._domain_routing[sub_orch.domain].append(sub_orch.orch_id)

    def route_task(self, domain: str) -> Optional[str]:
        """Route task to least-loaded sub-orchestrator in the target domain."""
        candidates = self._domain_routing.get(domain, [])
        available = [
            oid for oid in candidates
            if self._sub_orchestrators[oid].current_load
            < self._sub_orchestrators[oid].capacity
        ]
        if not available:
            return None
        return min(
            available,
            key=lambda oid: self._sub_orchestrators[oid].current_load,
        )

    async def decompose_and_dispatch(
        self, task: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Decompose a complex task across multiple sub-orchestrators."""
        subtasks = self._decompose(task)
        results = {}
        tasks = []
        for subtask in subtasks:
            domain = subtask["domain"]
            target = self.route_task(domain)
            if target is None:
                results[subtask["id"]] = {"error": f"No capacity for domain {domain}"}
                continue
            self._sub_orchestrators[target].current_load += 1
            tasks.append(self._dispatch_to_sub(target, subtask))
        completed = await asyncio.gather(*tasks, return_exceptions=True)
        for subtask, result in zip(subtasks, completed):
            results[subtask["id"]] = result
        return results

    def _decompose(self, task: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Decompose complex task into domain-specific subtasks."""
        # Domain-specific decomposition logic
        return task.get("subtasks", [task])

    async def _dispatch_to_sub(
        self, orch_id: str, subtask: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Dispatch subtask to a sub-orchestrator."""
        # In production, this would make an RPC call
        return {"orch_id": orch_id, "subtask": subtask, "status": "dispatched"}
```

---

## 4. Event-Driven Coordination

### Architecture

Event-driven coordination decouples agents using an event bus. Agents publish events
and subscribe to topics. This enables loose coupling and high scalability.

```
  ┌──────┐  publish   ┌──────────────┐  deliver  ┌──────┐
  │Agent1├────────────►│  Event Bus   ├──────────►│Agent3│
  └──────┘             │              │           └──────┘
  ┌──────┐  publish   │  ┌────────┐  │  deliver  ┌──────┐
  │Agent2├────────────►│  │Topics  │  ├──────────►│Agent4│
  └──────┘             │  └────────┘  │           └──────┘
                       └──────────────┘
```

### Python Implementation

```python
import asyncio
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional
from datetime import datetime
import uuid


@dataclass
class Event:
    event_id: str
    topic: str
    payload: Dict[str, Any]
    source_agent: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    correlation_id: Optional[str] = None

    @staticmethod
    def create(topic: str, payload: Dict[str, Any], source: str, correlation_id: Optional[str] = None) -> "Event":
        return Event(
            event_id=str(uuid.uuid4()),
            topic=topic,
            payload=payload,
            source_agent=source,
            correlation_id=correlation_id or str(uuid.uuid4()),
        )


class EventBus:
    """In-process event bus for agent coordination."""

    def __init__(self, max_history: int = 1000):
        self._subscribers: Dict[str, List[Callable]] = defaultdict(list)
        self._history: List[Event] = []
        self._max_history = max_history
        self._wildcard_subscribers: List[Callable] = []

    def subscribe(self, topic: str, handler: Callable) -> None:
        """Subscribe to a specific topic."""
        self._subscribers[topic].append(handler)

    def subscribe_all(self, handler: Callable) -> None:
        """Subscribe to all events (wildcard)."""
        self._wildcard_subscribers.append(handler)

    def unsubscribe(self, topic: str, handler: Callable) -> None:
        if handler in self._subscribers[topic]:
            self._subscribers[topic].remove(handler)

    async def publish(self, event: Event) -> None:
        """Publish an event to all subscribers of the topic."""
        self._history.append(event)
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]

        handlers = self._subscribers.get(event.topic, []) + self._wildcard_subscribers
        tasks = [asyncio.create_task(h(event)) for h in handlers]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    def get_history(self, topic: Optional[str] = None, limit: int = 50) -> List[Event]:
        """Retrieve event history, optionally filtered by topic."""
        events = self._history
        if topic:
            events = [e for e in events if e.topic == topic]
        return events[-limit:]


class EventDrivenAgent:
    """Base class for event-driven agents."""

    def __init__(self, agent_id: str, event_bus: EventBus):
        self.agent_id = agent_id
        self._bus = event_bus
        self._handlers: Dict[str, Callable] = {}

    def on(self, topic: str, handler: Callable) -> None:
        """Register an event handler for a topic."""
        self._handlers[topic] = handler
        self._bus.subscribe(topic, handler)

    async def emit(self, topic: str, payload: Dict[str, Any], correlation_id: Optional[str] = None) -> None:
        """Emit an event to the bus."""
        event = Event.create(topic, payload, self.agent_id, correlation_id)
        await self._bus.publish(event)
```

---

## 5. State Machine Orchestrator

### Architecture

State machine orchestrators model workflows as finite state machines. Each state
represents a phase of the workflow, and transitions are triggered by events or conditions.

```
  ┌─────────┐   task_submitted   ┌───────────┐   analysis_done   ┌──────────┐
  │  IDLE    ├──────────────────►│ ANALYZING  ├──────────────────►│ PLANNING │
  └─────────┘                    └───────────┘                    └────┬─────┘
                                                                      │
       ┌──────────────────────────────────────────────────────────────┘
       │ plan_ready
       ▼
  ┌──────────┐   all_done   ┌───────────┐   results_merged   ┌──────────┐
  │EXECUTING ├─────────────►│ MERGING   ├────────────────────►│COMPLETED │
  └─────┬────┘              └───────────┘                     └──────────┘
        │ task_failed
        ▼
  ┌──────────┐
  │  FAILED  │
  └──────────┘
```

### Python Implementation

```python
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Set
from enum import Enum


class WorkflowState(Enum):
    IDLE = "idle"
    ANALYZING = "analyzing"
    PLANNING = "planning"
    EXECUTING = "executing"
    MERGING = "merging"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Transition:
    from_state: WorkflowState
    to_state: WorkflowState
    trigger: str
    guard: Optional[Callable] = None
    action: Optional[Callable] = None


class StateMachineOrchestrator:
    """Finite state machine-based workflow orchestrator."""

    def __init__(self):
        self._state = WorkflowState.IDLE
        self._transitions: List[Transition] = []
        self._context: Dict[str, Any] = {}
        self._state_entry_actions: Dict[WorkflowState, Callable] = {}
        self._state_exit_actions: Dict[WorkflowState, Callable] = {}
        self._history: List[tuple] = []

    @property
    def current_state(self) -> WorkflowState:
        return self._state

    def add_transition(self, transition: Transition) -> None:
        self._transitions.append(transition)

    def on_enter(self, state: WorkflowState, action: Callable) -> None:
        self._state_entry_actions[state] = action

    def on_exit(self, state: WorkflowState, action: Callable) -> None:
        self._state_exit_actions[state] = action

    async def trigger(self, event: str, data: Optional[Dict] = None) -> bool:
        """Trigger a state transition."""
        for transition in self._transitions:
            if transition.from_state != self._state:
                continue
            if transition.trigger != event:
                continue
            if transition.guard and not transition.guard(self._context):
                continue

            # Execute exit action
            exit_action = self._state_exit_actions.get(self._state)
            if exit_action:
                await exit_action(self._context)

            old_state = self._state
            self._state = transition.to_state
            self._history.append((old_state, event, self._state))

            # Execute transition action
            if transition.action:
                await transition.action(self._context, data)

            # Execute entry action
            entry_action = self._state_entry_actions.get(self._state)
            if entry_action:
                await entry_action(self._context)

            return True
        return False

    def get_available_triggers(self) -> Set[str]:
        """Get all triggers available from the current state."""
        return {
            t.trigger for t in self._transitions
            if t.from_state == self._state
            and (t.guard is None or t.guard(self._context))
        }
```

---

## 6. Framework-Specific Patterns

### LangGraph Pattern

LangGraph models agent workflows as directed graphs with conditional edges.

```python
# LangGraph-style orchestration pattern
from typing import TypedDict, Annotated, Sequence
from dataclasses import dataclass


class AgentState(TypedDict):
    messages: list
    current_agent: str
    task_results: dict
    iteration_count: int


def should_continue(state: AgentState) -> str:
    """Conditional edge: determine next node."""
    if state["iteration_count"] >= 5:
        return "summarizer"
    if state["task_results"].get("needs_review"):
        return "reviewer"
    return "executor"


def create_multi_agent_graph():
    """
    Conceptual LangGraph multi-agent workflow.

    Graph structure:
        planner -> router -> executor -> reviewer -> summarizer
                     │                       │
                     └───────────────────────┘
    """
    # Node definitions
    nodes = {
        "planner": plan_task,
        "router": route_to_agent,
        "executor": execute_subtask,
        "reviewer": review_result,
        "summarizer": summarize_results,
    }

    # Edge definitions
    edges = {
        "planner": "router",
        "router": should_continue,  # conditional
        "executor": "reviewer",
        "reviewer": should_continue,  # conditional (loop or exit)
        "summarizer": "__end__",
    }
    return nodes, edges


async def plan_task(state: AgentState) -> AgentState:
    state["current_agent"] = "planner"
    return state


async def route_to_agent(state: AgentState) -> AgentState:
    state["current_agent"] = "router"
    return state


async def execute_subtask(state: AgentState) -> AgentState:
    state["current_agent"] = "executor"
    state["iteration_count"] += 1
    return state


async def review_result(state: AgentState) -> AgentState:
    state["current_agent"] = "reviewer"
    return state


async def summarize_results(state: AgentState) -> AgentState:
    state["current_agent"] = "summarizer"
    return state
```

### CrewAI Pattern

```python
# CrewAI-style role-based orchestration
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class CrewAgent:
    role: str
    goal: str
    backstory: str
    tools: List[str] = field(default_factory=list)
    allow_delegation: bool = True
    verbose: bool = True


@dataclass
class CrewTask:
    description: str
    agent: CrewAgent
    expected_output: str
    context: Optional[List["CrewTask"]] = None


def build_research_crew():
    """Build a CrewAI-style research crew."""
    researcher = CrewAgent(
        role="Senior Research Analyst",
        goal="Uncover cutting-edge developments in AI",
        backstory="Expert researcher with 10+ years experience",
        tools=["web_search", "arxiv_search"],
    )
    writer = CrewAgent(
        role="Technical Content Writer",
        goal="Craft compelling technical narratives",
        backstory="Award-winning technical writer",
        tools=["text_editor"],
    )
    reviewer = CrewAgent(
        role="Quality Assurance Reviewer",
        goal="Ensure accuracy and completeness",
        backstory="Meticulous reviewer with domain expertise",
        tools=["fact_checker"],
    )

    research_task = CrewTask(
        description="Research the latest advances in multi-agent systems",
        agent=researcher,
        expected_output="Detailed research report with citations",
    )
    writing_task = CrewTask(
        description="Write a comprehensive article based on research",
        agent=writer,
        expected_output="Well-structured technical article",
        context=[research_task],
    )
    review_task = CrewTask(
        description="Review article for accuracy and quality",
        agent=reviewer,
        expected_output="Reviewed and approved article",
        context=[writing_task],
    )
    return [research_task, writing_task, review_task]
```

### AutoGen Pattern

```python
# AutoGen-style conversational orchestration
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Callable


@dataclass
class ConversableAgent:
    name: str
    system_message: str
    llm_config: Optional[Dict[str, Any]] = None
    human_input_mode: str = "NEVER"
    code_execution_config: Optional[Dict] = None


class GroupChat:
    """AutoGen-style group chat orchestration."""

    def __init__(
        self,
        agents: List[ConversableAgent],
        max_round: int = 10,
        speaker_selection_method: str = "round_robin",
    ):
        self.agents = agents
        self.max_round = max_round
        self.selection_method = speaker_selection_method
        self.messages: List[Dict[str, str]] = []
        self._round = 0

    def select_speaker(self) -> ConversableAgent:
        """Select the next speaker based on the configured method."""
        if self.selection_method == "round_robin":
            return self.agents[self._round % len(self.agents)]
        elif self.selection_method == "random":
            import random
            return random.choice(self.agents)
        else:
            # Auto-selection based on conversation context
            return self._auto_select()

    def _auto_select(self) -> ConversableAgent:
        """Auto-select the most appropriate next speaker."""
        if not self.messages:
            return self.agents[0]
        last_msg = self.messages[-1]
        # Simple heuristic: if last message mentions code, select coder
        for agent in self.agents:
            if agent.name.lower() in last_msg.get("content", "").lower():
                return agent
        return self.agents[self._round % len(self.agents)]

    async def run(self, initial_message: str) -> List[Dict[str, str]]:
        """Run the group chat conversation."""
        self.messages.append({"role": "user", "content": initial_message})
        while self._round < self.max_round:
            speaker = self.select_speaker()
            # In production, this calls the LLM
            response = f"[{speaker.name}]: Response to round {self._round}"
            self.messages.append({"role": speaker.name, "content": response})
            self._round += 1
            if self._check_termination(response):
                break
        return self.messages

    def _check_termination(self, message: str) -> bool:
        return "TERMINATE" in message
```

---

## 7. Pattern Selection Decision Matrix

```
Task Complexity    Agent Count    Pattern Recommendation
─────────────────────────────────────────────────────────
Low                2-5            Hub-and-Spoke
Low                5-20           Event-Driven
Medium             2-10           Hierarchical
Medium             10-50          Mesh + Event Bus
High               2-10           State Machine
High               10+            Hierarchical + Mesh Hybrid
Variable           Any            LangGraph Conditional Graph
Role-Based         3-8            CrewAI Sequential
Conversational     2-6            AutoGen Group Chat
```

---

## 8. Anti-Patterns

| Anti-Pattern | Description | Consequence |
|---|---|---|
| God Orchestrator | Single orchestrator doing coordination AND business logic | Bottleneck, impossible to scale |
| Chatty Mesh | Every agent talks to every other agent on every event | Network saturation, O(n²) messages |
| Deep Hierarchy | More than 3 levels of orchestrator nesting | Latency amplification, state sync issues |
| Synchronous Fan-Out | Waiting for all workers sequentially | Total latency = sum of all worker latencies |
| Missing Timeouts | No timeout on worker execution | Zombie tasks, resource exhaustion |
| State in Transit | Relying on message payload as source of truth | Data loss on message failure |

---

## Cross-References

- Supervisor-worker details: `supervisor-worker-hierarchies.md`
- Communication protocols: `inter-agent-protocols.md`
- DAG-based workflows: `dag-task-decomposition.md`
- Shared state: `state-sharing-mechanisms.md`
- Failure handling: `failure-rate-mitigation.md`
- Role design: `role-specialization-patterns.md`
- Consensus: `consensus-coordination.md`
