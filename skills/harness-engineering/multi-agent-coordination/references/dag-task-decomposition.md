# DAG-Based Task Decomposition Reference Guide

## Overview

Directed Acyclic Graph (DAG) based task decomposition is the foundation of efficient
multi-agent workflow execution. By modeling tasks and their dependencies as a DAG,
orchestrators can identify parallelizable work, determine optimal execution order,
calculate critical paths, and maximize throughput. This guide covers DAG construction,
topological sorting, parallel execution, dependency resolution, and critical path analysis.

---

## 1. DAG Fundamentals

### Definition

A Directed Acyclic Graph G = (V, E) where:
- **V** = set of task nodes
- **E** = set of directed dependency edges
- **Acyclic**: No path from any vertex back to itself

```
  ┌───┐     ┌───┐     ┌───┐
  │ A ├────►│ C ├────►│ E │
  └───┘     └─┬─┘     └───┘
              │
  ┌───┐     ┌─▼─┐     ┌───┐
  │ B ├────►│ D ├────►│ F │
  └───┘     └───┘     └───┘

  Dependencies:
    A → C (C depends on A)
    C → E (E depends on C)
    B → D (D depends on B)
    C → D (D depends on A via C)
    D → F (F depends on D)

  Parallel sets:
    Level 0: {A, B}     (no dependencies)
    Level 1: {C}        (depends on A)
    Level 2: {D}        (depends on B, C)
    Level 3: {E, F}     (E depends on C; F depends on D)
```

### Properties

| Property | Description |
|---|---|
| Source nodes | Nodes with no incoming edges (entry points) |
| Sink nodes | Nodes with no outgoing edges (final outputs) |
| In-degree | Number of incoming edges (dependencies) |
| Out-degree | Number of outgoing edges (dependents) |
| Critical path | Longest path through the DAG (minimum completion time) |
| Width | Maximum number of tasks executable in parallel |

---

## 2. DAG Construction

### Python Implementation

```python
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple
from collections import defaultdict, deque
from enum import Enum
import uuid


class TaskNodeStatus(Enum):
    PENDING = "pending"
    READY = "ready"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class TaskNode:
    node_id: str
    task_type: str
    payload: Dict[str, Any]
    status: TaskNodeStatus = TaskNodeStatus.PENDING
    estimated_duration: float = 1.0  # seconds
    actual_duration: Optional[float] = None
    result: Optional[Any] = None
    error: Optional[str] = None
    assigned_agent: Optional[str] = None
    priority: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)

    @staticmethod
    def create(task_type: str, payload: Dict = None, **kwargs) -> "TaskNode":
        return TaskNode(
            node_id=str(uuid.uuid4())[:8],
            task_type=task_type,
            payload=payload or {},
            **kwargs,
        )


class TaskDAG:
    """
    Directed Acyclic Graph for task dependency modeling.
    Supports construction, validation, topological sorting,
    parallel level computation, and critical path analysis.
    """

    def __init__(self):
        self._nodes: Dict[str, TaskNode] = {}
        self._edges: Dict[str, Set[str]] = defaultdict(set)     # node -> dependents
        self._reverse: Dict[str, Set[str]] = defaultdict(set)    # node -> dependencies
        self._is_validated = False

    # ── Construction ───────────────────────────────────────────

    def add_node(self, node: TaskNode) -> str:
        """Add a task node to the DAG."""
        self._nodes[node.node_id] = node
        self._is_validated = False
        return node.node_id

    def add_edge(self, from_node: str, to_node: str) -> None:
        """Add a dependency edge: to_node depends on from_node."""
        if from_node not in self._nodes:
            raise ValueError(f"Source node {from_node} not found")
        if to_node not in self._nodes:
            raise ValueError(f"Target node {to_node} not found")
        if from_node == to_node:
            raise ValueError("Self-loops are not allowed in a DAG")
        self._edges[from_node].add(to_node)
        self._reverse[to_node].add(from_node)
        self._is_validated = False

    def remove_node(self, node_id: str) -> None:
        """Remove a node and all its edges."""
        if node_id in self._nodes:
            del self._nodes[node_id]
            # Remove outgoing edges
            for dep in self._edges.pop(node_id, set()):
                self._reverse[dep].discard(node_id)
            # Remove incoming edges
            for parent in self._reverse.pop(node_id, set()):
                self._edges[parent].discard(node_id)
            self._is_validated = False

    def remove_edge(self, from_node: str, to_node: str) -> None:
        """Remove a dependency edge."""
        self._edges[from_node].discard(to_node)
        self._reverse[to_node].discard(from_node)
        self._is_validated = False

    # ── Queries ────────────────────────────────────────────────

    def get_node(self, node_id: str) -> Optional[TaskNode]:
        return self._nodes.get(node_id)

    def get_dependencies(self, node_id: str) -> Set[str]:
        """Get all nodes that this node depends on."""
        return set(self._reverse.get(node_id, set()))

    def get_dependents(self, node_id: str) -> Set[str]:
        """Get all nodes that depend on this node."""
        return set(self._edges.get(node_id, set()))

    def get_source_nodes(self) -> List[str]:
        """Get nodes with no dependencies (entry points)."""
        return [
            nid for nid in self._nodes
            if not self._reverse.get(nid)
        ]

    def get_sink_nodes(self) -> List[str]:
        """Get nodes with no dependents (exit points)."""
        return [
            nid for nid in self._nodes
            if not self._edges.get(nid)
        ]

    @property
    def node_count(self) -> int:
        return len(self._nodes)

    @property
    def edge_count(self) -> int:
        return sum(len(deps) for deps in self._edges.values())

    # ── Validation ─────────────────────────────────────────────

    def validate(self) -> Tuple[bool, List[str]]:
        """
        Validate the DAG:
        1. Check for cycles
        2. Check for orphan nodes
        3. Check all edge references are valid
        Returns (is_valid, list_of_errors)
        """
        errors = []

        # Check for cycles using DFS
        if self._has_cycle():
            errors.append("DAG contains a cycle")

        # Check for valid references
        for from_node, to_nodes in self._edges.items():
            if from_node not in self._nodes:
                errors.append(f"Edge references non-existent source: {from_node}")
            for to_node in to_nodes:
                if to_node not in self._nodes:
                    errors.append(f"Edge references non-existent target: {to_node}")

        self._is_validated = len(errors) == 0
        return self._is_validated, errors

    def _has_cycle(self) -> bool:
        """Detect cycles using DFS with three-color marking."""
        WHITE, GRAY, BLACK = 0, 1, 2
        color = {nid: WHITE for nid in self._nodes}

        def dfs(node: str) -> bool:
            color[node] = GRAY
            for neighbor in self._edges.get(node, set()):
                if color.get(neighbor) == GRAY:
                    return True  # Back edge = cycle
                if color.get(neighbor) == WHITE and dfs(neighbor):
                    return True
            color[node] = BLACK
            return False

        for node in self._nodes:
            if color[node] == WHITE:
                if dfs(node):
                    return True
        return False

    # ── Topological Sort ───────────────────────────────────────

    def topological_sort(self) -> List[str]:
        """
        Kahn's algorithm for topological sorting.
        Returns nodes in dependency-respecting execution order.
        """
        in_degree = {nid: len(self._reverse.get(nid, set())) for nid in self._nodes}
        queue = deque([nid for nid, deg in in_degree.items() if deg == 0])
        sorted_order = []

        while queue:
            node = queue.popleft()
            sorted_order.append(node)
            for dependent in self._edges.get(node, set()):
                in_degree[dependent] -= 1
                if in_degree[dependent] == 0:
                    queue.append(dependent)

        if len(sorted_order) != len(self._nodes):
            raise ValueError("DAG contains a cycle; topological sort impossible")

        return sorted_order

    def topological_sort_dfs(self) -> List[str]:
        """DFS-based topological sort (alternative implementation)."""
        visited = set()
        stack = []

        def dfs(node: str):
            visited.add(node)
            for dependent in self._edges.get(node, set()):
                if dependent not in visited:
                    dfs(dependent)
            stack.append(node)

        for node in self._nodes:
            if node not in visited:
                dfs(node)

        return list(reversed(stack))

    # ── Parallel Levels ────────────────────────────────────────

    def compute_parallel_levels(self) -> List[List[str]]:
        """
        Compute execution levels where all tasks in the same level
        can execute in parallel (all their dependencies are in earlier levels).
        """
        in_degree = {nid: len(self._reverse.get(nid, set())) for nid in self._nodes}
        current_level = [nid for nid, deg in in_degree.items() if deg == 0]
        levels = []

        while current_level:
            levels.append(list(current_level))
            next_level = []
            for node in current_level:
                for dependent in self._edges.get(node, set()):
                    in_degree[dependent] -= 1
                    if in_degree[dependent] == 0:
                        next_level.append(dependent)
            current_level = next_level

        return levels

    @property
    def max_parallelism(self) -> int:
        """Maximum number of tasks executable simultaneously."""
        levels = self.compute_parallel_levels()
        return max((len(level) for level in levels), default=0)

    # ── Critical Path Analysis ─────────────────────────────────

    def critical_path(self) -> Tuple[List[str], float]:
        """
        Find the critical path: the longest path through the DAG
        based on estimated task durations. This determines the
        minimum possible total execution time.

        Returns (path_node_ids, total_duration)
        """
        topo_order = self.topological_sort()

        # Forward pass: compute earliest start time (EST) for each node
        est: Dict[str, float] = {}
        predecessor: Dict[str, Optional[str]] = {}

        for node_id in topo_order:
            deps = self._reverse.get(node_id, set())
            if not deps:
                est[node_id] = 0.0
                predecessor[node_id] = None
            else:
                max_finish = -1.0
                max_pred = None
                for dep in deps:
                    dep_finish = est[dep] + self._nodes[dep].estimated_duration
                    if dep_finish > max_finish:
                        max_finish = dep_finish
                        max_pred = dep
                est[node_id] = max_finish
                predecessor[node_id] = max_pred

        # Find the node with the maximum (EST + duration) = project finish
        finish_times = {
            nid: est[nid] + self._nodes[nid].estimated_duration
            for nid in topo_order
        }
        critical_end = max(finish_times, key=lambda nid: finish_times[nid])
        total_duration = finish_times[critical_end]

        # Backtrack to build the critical path
        path = []
        current = critical_end
        while current is not None:
            path.append(current)
            current = predecessor[current]
        path.reverse()

        return path, total_duration

    def compute_slack(self) -> Dict[str, float]:
        """
        Compute slack (float) for each task.
        Slack = Latest Start Time - Earliest Start Time.
        Tasks with zero slack are on the critical path.
        """
        topo_order = self.topological_sort()

        # Forward pass: Earliest Start Time (EST)
        est: Dict[str, float] = {}
        for nid in topo_order:
            deps = self._reverse.get(nid, set())
            if not deps:
                est[nid] = 0.0
            else:
                est[nid] = max(
                    est[dep] + self._nodes[dep].estimated_duration
                    for dep in deps
                )

        # Project finish time
        finish = max(
            est[nid] + self._nodes[nid].estimated_duration
            for nid in topo_order
        )

        # Backward pass: Latest Start Time (LST)
        lst: Dict[str, float] = {}
        for nid in reversed(topo_order):
            dependents = self._edges.get(nid, set())
            if not dependents:
                lst[nid] = finish - self._nodes[nid].estimated_duration
            else:
                lst[nid] = min(
                    lst[dep] - self._nodes[nid].estimated_duration
                    for dep in dependents
                )

        # Slack = LST - EST
        return {nid: lst[nid] - est[nid] for nid in topo_order}

    # ── Visualization ──────────────────────────────────────────

    def to_ascii(self) -> str:
        """Generate ASCII representation of the DAG."""
        levels = self.compute_parallel_levels()
        lines = []
        lines.append("DAG Execution Levels:")
        lines.append("=" * 50)
        for i, level in enumerate(levels):
            nodes_str = "  ".join(
                f"[{nid}: {self._nodes[nid].task_type}]" for nid in level
            )
            lines.append(f"  Level {i}: {nodes_str}")
            if i < len(levels) - 1:
                lines.append("           │")
                lines.append("           ▼")
        lines.append("=" * 50)

        cp, duration = self.critical_path()
        cp_str = " → ".join(cp)
        lines.append(f"  Critical Path: {cp_str}")
        lines.append(f"  Min Duration: {duration:.1f}s")
        lines.append(f"  Max Parallelism: {self.max_parallelism}")
        return "\n".join(lines)
```

---

## 3. Parallel Execution Engine

### Executing DAGs with Maximum Parallelism

```python
import asyncio
import time
from typing import Callable


class DAGExecutor:
    """
    Executes a TaskDAG with maximum parallelism, respecting dependencies.
    Uses an event-driven approach where completed tasks trigger their dependents.
    """

    def __init__(
        self,
        dag: TaskDAG,
        max_concurrent: int = 10,
        timeout: float = 300.0,
    ):
        self._dag = dag
        self._max_concurrent = max_concurrent
        self._timeout = timeout
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._task_handlers: Dict[str, Callable] = {}
        self._completion_events: Dict[str, asyncio.Event] = {}

    def register_handler(self, task_type: str, handler: Callable) -> None:
        """Register an async handler for a task type."""
        self._task_handlers[task_type] = handler

    async def execute(self) -> Dict[str, Any]:
        """Execute the entire DAG, returning results for all nodes."""
        # Validate DAG first
        is_valid, errors = self._dag.validate()
        if not is_valid:
            raise ValueError(f"Invalid DAG: {errors}")

        # Initialize completion events
        for nid in self._dag._nodes:
            self._completion_events[nid] = asyncio.Event()

        # Start execution from source nodes
        start_time = time.time()
        tasks = []
        for nid in self._dag._nodes:
            tasks.append(asyncio.create_task(self._execute_node(nid)))

        # Wait for all tasks with timeout
        try:
            await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=self._timeout,
            )
        except asyncio.TimeoutError:
            raise TimeoutError(f"DAG execution timed out after {self._timeout}s")

        elapsed = time.time() - start_time

        # Collect results
        results = {}
        for nid, node in self._dag._nodes.items():
            results[nid] = {
                "task_type": node.task_type,
                "status": node.status.value,
                "result": node.result,
                "error": node.error,
                "duration": node.actual_duration,
            }

        results["__meta__"] = {
            "total_duration": elapsed,
            "node_count": self._dag.node_count,
            "edge_count": self._dag.edge_count,
        }
        return results

    async def _execute_node(self, node_id: str) -> None:
        """Execute a single node after its dependencies complete."""
        node = self._dag.get_node(node_id)
        if node is None:
            return

        # Wait for all dependencies to complete
        dependencies = self._dag.get_dependencies(node_id)
        for dep_id in dependencies:
            await self._completion_events[dep_id].wait()
            dep_node = self._dag.get_node(dep_id)
            if dep_node and dep_node.status == TaskNodeStatus.FAILED:
                node.status = TaskNodeStatus.SKIPPED
                node.error = f"Dependency {dep_id} failed"
                self._completion_events[node_id].set()
                return

        # Execute with concurrency control
        async with self._semaphore:
            node.status = TaskNodeStatus.RUNNING
            start = time.time()
            try:
                handler = self._task_handlers.get(node.task_type)
                if handler is None:
                    raise ValueError(f"No handler for task type: {node.task_type}")

                # Collect dependency results as input
                dep_results = {}
                for dep_id in dependencies:
                    dep_node = self._dag.get_node(dep_id)
                    if dep_node:
                        dep_results[dep_id] = dep_node.result

                node.result = await handler(node.payload, dep_results)
                node.status = TaskNodeStatus.COMPLETED
            except Exception as e:
                node.status = TaskNodeStatus.FAILED
                node.error = str(e)
            finally:
                node.actual_duration = time.time() - start
                self._completion_events[node_id].set()
```

---

## 4. Dependency Resolution

### Dependency Resolution Algorithms

```python
class DependencyResolver:
    """Resolves task dependencies with conflict detection and cycle prevention."""

    def __init__(self, dag: TaskDAG):
        self._dag = dag

    def resolve_all(self) -> List[List[str]]:
        """
        Resolve all dependencies and return execution waves.
        Each wave contains tasks that can be executed in parallel.
        """
        return self._dag.compute_parallel_levels()

    def get_ready_tasks(self) -> List[str]:
        """Get all tasks that are ready to execute (all deps completed)."""
        ready = []
        for nid, node in self._dag._nodes.items():
            if node.status != TaskNodeStatus.PENDING:
                continue
            deps = self._dag.get_dependencies(nid)
            all_done = all(
                self._dag.get_node(d).status == TaskNodeStatus.COMPLETED
                for d in deps
            )
            if all_done:
                ready.append(nid)
        return ready

    def transitive_dependencies(self, node_id: str) -> Set[str]:
        """Get all transitive dependencies of a node (recursive)."""
        result = set()
        stack = list(self._dag.get_dependencies(node_id))
        while stack:
            dep = stack.pop()
            if dep not in result:
                result.add(dep)
                stack.extend(self._dag.get_dependencies(dep))
        return result

    def transitive_dependents(self, node_id: str) -> Set[str]:
        """Get all transitive dependents of a node."""
        result = set()
        stack = list(self._dag.get_dependents(node_id))
        while stack:
            dep = stack.pop()
            if dep not in result:
                result.add(dep)
                stack.extend(self._dag.get_dependents(dep))
        return result

    def impact_analysis(self, failed_node: str) -> Dict[str, str]:
        """Determine impact of a node failure on downstream tasks."""
        affected = self.transitive_dependents(failed_node)
        impact = {failed_node: "FAILED"}
        for nid in affected:
            impact[nid] = "BLOCKED"
        return impact

    def find_optional_dependencies(self) -> List[Tuple[str, str]]:
        """
        Find edges that can be removed without changing the semantics
        (transitive reduction). These are redundant dependencies.
        """
        redundant = []
        for from_node in self._dag._edges:
            for to_node in self._dag._edges[from_node]:
                # Check if there's another path from from_node to to_node
                # If yes, this edge is redundant
                other_deps = self._dag._edges[from_node] - {to_node}
                for intermediate in other_deps:
                    if to_node in self.transitive_dependents(intermediate):
                        redundant.append((from_node, to_node))
                        break
        return redundant
```

---

## 5. Advanced DAG Patterns

### Dynamic DAG Modification

```python
class DynamicDAG(TaskDAG):
    """DAG that supports runtime modifications during execution."""

    def __init__(self):
        super().__init__()
        self._version = 0
        self._change_log: List[Dict[str, Any]] = []

    def add_node_runtime(self, node: TaskNode, dependencies: List[str] = None) -> str:
        """Add a node at runtime (e.g., when a task discovers additional work)."""
        nid = self.add_node(node)
        for dep in (dependencies or []):
            self.add_edge(dep, nid)
        self._version += 1
        self._change_log.append({
            "action": "add_node",
            "node_id": nid,
            "version": self._version,
        })
        return nid

    def split_node(self, node_id: str, sub_tasks: List[TaskNode]) -> List[str]:
        """
        Split a single node into multiple sub-tasks.
        The sub-tasks collectively replace the original node.
        """
        original = self.get_node(node_id)
        if original is None:
            raise ValueError(f"Node {node_id} not found")

        deps = self.get_dependencies(node_id)
        dependents = self.get_dependents(node_id)

        # Remove original node
        self.remove_node(node_id)

        # Add sub-tasks with original's dependencies
        sub_ids = []
        for sub_task in sub_tasks:
            sid = self.add_node(sub_task)
            sub_ids.append(sid)
            for dep in deps:
                self.add_edge(dep, sid)

        # Connect dependents to all sub-tasks (they need all sub-results)
        for dep_id in dependents:
            for sid in sub_ids:
                self.add_edge(sid, dep_id)

        self._version += 1
        return sub_ids

    def merge_results_node(
        self, predecessor_ids: List[str], merge_task: TaskNode
    ) -> str:
        """Add a merge/aggregation node after a set of parallel tasks."""
        merge_id = self.add_node(merge_task)
        for pred_id in predecessor_ids:
            self.add_edge(pred_id, merge_id)
        self._version += 1
        return merge_id
```

### Conditional DAG Edges

```python
@dataclass
class ConditionalEdge:
    from_node: str
    to_node: str
    condition: Callable[[Any], bool]
    description: str = ""


class ConditionalDAG(TaskDAG):
    """DAG with conditional edges that are evaluated at runtime."""

    def __init__(self):
        super().__init__()
        self._conditional_edges: List[ConditionalEdge] = []

    def add_conditional_edge(
        self,
        from_node: str,
        to_node: str,
        condition: Callable[[Any], bool],
        description: str = "",
    ) -> None:
        """Add an edge that is only active when its condition is true."""
        self._conditional_edges.append(ConditionalEdge(
            from_node=from_node,
            to_node=to_node,
            condition=condition,
            description=description,
        ))

    def resolve_conditional_edges(self, results: Dict[str, Any]) -> None:
        """Evaluate conditions and activate/deactivate edges."""
        for edge in self._conditional_edges:
            result = results.get(edge.from_node)
            if edge.condition(result):
                self.add_edge(edge.from_node, edge.to_node)
            else:
                self.remove_edge(edge.from_node, edge.to_node)
                # Mark the target and its descendants as skipped
                target = self.get_node(edge.to_node)
                if target and not self.get_dependencies(edge.to_node):
                    target.status = TaskNodeStatus.SKIPPED
```

---

## 6. TypeScript Implementation

```typescript
interface DAGNode {
  nodeId: string;
  taskType: string;
  payload: Record<string, unknown>;
  status: "pending" | "ready" | "running" | "completed" | "failed" | "skipped";
  estimatedDuration: number;
  actualDuration?: number;
  result?: unknown;
  error?: string;
}

class TaskDAGTS {
  private nodes = new Map<string, DAGNode>();
  private edges = new Map<string, Set<string>>();
  private reverseEdges = new Map<string, Set<string>>();

  addNode(node: DAGNode): string {
    this.nodes.set(node.nodeId, node);
    return node.nodeId;
  }

  addEdge(from: string, to: string): void {
    if (!this.edges.has(from)) this.edges.set(from, new Set());
    if (!this.reverseEdges.has(to)) this.reverseEdges.set(to, new Set());
    this.edges.get(from)!.add(to);
    this.reverseEdges.get(to)!.add(from);
  }

  topologicalSort(): string[] {
    const inDegree = new Map<string, number>();
    for (const nid of this.nodes.keys()) {
      inDegree.set(nid, this.reverseEdges.get(nid)?.size ?? 0);
    }

    const queue: string[] = [];
    for (const [nid, deg] of inDegree) {
      if (deg === 0) queue.push(nid);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);
      for (const dep of this.edges.get(node) ?? []) {
        const newDeg = (inDegree.get(dep) ?? 1) - 1;
        inDegree.set(dep, newDeg);
        if (newDeg === 0) queue.push(dep);
      }
    }

    if (sorted.length !== this.nodes.size) {
      throw new Error("DAG contains a cycle");
    }
    return sorted;
  }

  computeParallelLevels(): string[][] {
    const inDegree = new Map<string, number>();
    for (const nid of this.nodes.keys()) {
      inDegree.set(nid, this.reverseEdges.get(nid)?.size ?? 0);
    }

    const levels: string[][] = [];
    let currentLevel = [...inDegree.entries()]
      .filter(([, deg]) => deg === 0)
      .map(([nid]) => nid);

    while (currentLevel.length > 0) {
      levels.push([...currentLevel]);
      const nextLevel: string[] = [];
      for (const node of currentLevel) {
        for (const dep of this.edges.get(node) ?? []) {
          const newDeg = (inDegree.get(dep) ?? 1) - 1;
          inDegree.set(dep, newDeg);
          if (newDeg === 0) nextLevel.push(dep);
        }
      }
      currentLevel = nextLevel;
    }
    return levels;
  }

  criticalPath(): { path: string[]; duration: number } {
    const topoOrder = this.topologicalSort();
    const est = new Map<string, number>();
    const predecessor = new Map<string, string | null>();

    for (const nid of topoOrder) {
      const deps = this.reverseEdges.get(nid);
      if (!deps || deps.size === 0) {
        est.set(nid, 0);
        predecessor.set(nid, null);
      } else {
        let maxFinish = -1;
        let maxPred: string | null = null;
        for (const dep of deps) {
          const depFinish = (est.get(dep) ?? 0) + (this.nodes.get(dep)?.estimatedDuration ?? 0);
          if (depFinish > maxFinish) {
            maxFinish = depFinish;
            maxPred = dep;
          }
        }
        est.set(nid, maxFinish);
        predecessor.set(nid, maxPred);
      }
    }

    let criticalEnd = topoOrder[0];
    let maxDuration = 0;
    for (const nid of topoOrder) {
      const finish = (est.get(nid) ?? 0) + (this.nodes.get(nid)?.estimatedDuration ?? 0);
      if (finish > maxDuration) {
        maxDuration = finish;
        criticalEnd = nid;
      }
    }

    const path: string[] = [];
    let current: string | null = criticalEnd;
    while (current !== null) {
      path.unshift(current);
      current = predecessor.get(current) ?? null;
    }

    return { path, duration: maxDuration };
  }

  async execute(
    handlers: Map<string, (payload: Record<string, unknown>, deps: Record<string, unknown>) => Promise<unknown>>,
    maxConcurrent = 10
  ): Promise<Map<string, unknown>> {
    const levels = this.computeParallelLevels();
    const results = new Map<string, unknown>();

    for (const level of levels) {
      const batch = level.map(async (nid) => {
        const node = this.nodes.get(nid)!;
        const handler = handlers.get(node.taskType);
        if (!handler) throw new Error(`No handler for ${node.taskType}`);

        const depResults: Record<string, unknown> = {};
        for (const dep of this.reverseEdges.get(nid) ?? []) {
          depResults[dep] = results.get(dep);
        }

        const start = Date.now();
        try {
          const result = await handler(node.payload, depResults);
          node.status = "completed";
          node.result = result;
          node.actualDuration = (Date.now() - start) / 1000;
          results.set(nid, result);
        } catch (err: any) {
          node.status = "failed";
          node.error = err.message;
          node.actualDuration = (Date.now() - start) / 1000;
        }
      });
      await Promise.all(batch);
    }
    return results;
  }
}
```

---

## 7. DAG Optimization Strategies

| Strategy | Description | When to Use |
|---|---|---|
| Transitive Reduction | Remove redundant edges | Simplify complex graphs |
| Node Fusion | Merge sequential nodes with no other deps | Reduce scheduling overhead |
| Speculative Execution | Start likely-needed tasks early | When deps have predictable outcomes |
| Pipeline Parallelism | Stream partial results between stages | Data processing pipelines |
| Task Cloning | Duplicate critical-path tasks for redundancy | High-reliability requirements |
| Lazy Evaluation | Only execute nodes whose results are needed | When sink nodes are selective |

---

## 8. Common DAG Patterns

```
Fan-Out:              Fan-In:              Diamond:
   A                 A  B  C                 A
  /|\                 \ | /                 / \
 B C D                  E                  B   C
                                            \ /
                                             D

Pipeline:            Map-Reduce:          Fork-Join:
A → B → C → D        A                    A
                    / | \                / | \
                   B  C  D              B  C  D
                    \ | /                \ | /
                      E                    E
                      │
                      F
```

---

## Cross-References

- Orchestration patterns: `orchestrator-patterns.md`
- Supervisor hierarchies: `supervisor-worker-hierarchies.md`
- Communication protocols: `inter-agent-protocols.md`
- Shared state: `state-sharing-mechanisms.md`
- Failure handling: `failure-rate-mitigation.md`
- Role design: `role-specialization-patterns.md`
- Consensus: `consensus-coordination.md`
