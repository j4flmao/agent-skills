# Goal Decomposition Trees for AI Agents

## Theoretical Foundation

Goal decomposition is the process of breaking a high-level user objective into a hierarchy of sub-goals, ultimately producing atomic tasks that an agent can execute directly. In feedforward control systems, goal decomposition occurs AFTER intent classification and BEFORE constraint propagation, serving as the structural backbone of the execution plan.

A goal decomposition tree $T = (G, E, \tau)$ is defined as:

$$T = (G, E, \tau) \text{ where:}$$
- $G = \{g_0, g_1, \ldots, g_n\}$ is the set of goal nodes
- $E \subseteq G \times G$ is the set of parent-child edges
- $\tau: G \rightarrow \{\text{AND}, \text{OR}, \text{LEAF}\}$ is the node type function

The root node $g_0$ represents the top-level user goal. Internal nodes are decomposed into sub-goals. Leaf nodes are atomic tasks ready for execution.

**AND-nodes** require ALL children to succeed for the parent to succeed:
$$\text{success}(g) = \bigwedge_{c \in \text{children}(g)} \text{success}(c) \quad \text{if } \tau(g) = \text{AND}$$

**OR-nodes** require at least ONE child to succeed:
$$\text{success}(g) = \bigvee_{c \in \text{children}(g)} \text{success}(c) \quad \text{if } \tau(g) = \text{OR}$$

```
+--------------------------------------------------------------------------+
|                    GOAL DECOMPOSITION PIPELINE                            |
|                                                                          |
|   [User Goal]                                                            |
|        │                                                                 |
|        ├──► [Intent Analysis] → What does the user want?                 |
|        │                                                                 |
|        ├──► [Goal Refinement] → Break into sub-goals                     |
|        │        ├── AND decomposition (all required)                     |
|        │        └── OR decomposition (alternatives)                      |
|        │                                                                 |
|        ├──► [Leaf Task Generation] → Atomic executable actions           |
|        │                                                                 |
|        ├──► [Dependency Analysis] → Build execution DAG                  |
|        │                                                                 |
|        ├──► [Critical Path Computation] → Identify bottlenecks           |
|        │                                                                 |
|        └──► [Prioritization] → Order tasks by urgency and impact         |
+--------------------------------------------------------------------------+
```

---

## AND/OR Goal Trees

### AND Decomposition

AND decomposition splits a goal into sub-goals that MUST ALL be completed. This is the most common decomposition pattern for structured tasks.

```
[Refactor Auth Module] (AND)
├── [Read existing code] (LEAF)
├── [Design new structure] (LEAF)
├── [Implement changes] (AND)
│   ├── [Modify auth.py] (LEAF)
│   ├── [Update middleware.py] (LEAF)
│   └── [Update config.py] (LEAF)
└── [Update tests] (LEAF)
```

### OR Decomposition

OR decomposition provides alternative approaches. Only ONE child needs to succeed. The agent selects the best alternative based on cost, risk, or feasibility.

```
[Fix Import Error] (OR)
├── [Install missing package] (LEAF) — Cost: Low, Risk: Low
├── [Add package to requirements.txt] (AND)
│   ├── [Edit requirements.txt] (LEAF)
│   └── [Run pip install] (LEAF)
└── [Replace with stdlib alternative] (LEAF) — Cost: Medium, Risk: Low
```

### Mixed AND/OR Trees

Real-world goals typically produce mixed trees combining AND and OR nodes.

```
[Deploy Application] (AND)
├── [Build Application] (OR)
│   ├── [Docker build] (LEAF)
│   └── [Native build] (AND)
│       ├── [Install dependencies] (LEAF)
│       └── [Compile source] (LEAF)
├── [Run Tests] (AND)
│   ├── [Unit tests] (LEAF)
│   └── [Integration tests] (LEAF)
├── [Select Target] (OR)
│   ├── [Deploy to staging] (LEAF)
│   └── [Deploy to production] (LEAF)
└── [Post-Deploy Verification] (LEAF)
```

---

## Python Implementation: Goal Decomposition Engine

```python
import json
import uuid
from typing import Dict, List, Optional, Set, Tuple, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
from collections import deque


class GoalType(Enum):
    AND = "AND"
    OR = "OR"
    LEAF = "LEAF"


class GoalStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class GoalPriority(Enum):
    CRITICAL = 4
    HIGH = 3
    MEDIUM = 2
    LOW = 1


@dataclass
class GoalNode:
    """A node in the goal decomposition tree."""
    goal_id: str
    name: str
    description: str
    goal_type: GoalType
    parent_id: Optional[str] = None
    children: List[str] = field(default_factory=list)
    status: GoalStatus = GoalStatus.PENDING
    priority: GoalPriority = GoalPriority.MEDIUM
    preconditions: List[str] = field(default_factory=list)
    postconditions: List[str] = field(default_factory=list)
    estimated_cost: float = 0.0  # Token cost estimate
    actual_cost: float = 0.0
    dependencies: List[str] = field(default_factory=list)  # Goal IDs this depends on
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def is_leaf(self) -> bool:
        return self.goal_type == GoalType.LEAF

    @property
    def is_composite(self) -> bool:
        return self.goal_type in (GoalType.AND, GoalType.OR)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "goal_id": self.goal_id,
            "name": self.name,
            "description": self.description,
            "type": self.goal_type.value,
            "status": self.status.value,
            "priority": self.priority.name.lower(),
            "children": self.children,
            "dependencies": self.dependencies,
            "estimated_cost": self.estimated_cost,
            "preconditions": self.preconditions,
            "postconditions": self.postconditions,
        }


class GoalTree:
    """
    Hierarchical goal decomposition tree supporting AND/OR semantics,
    dependency tracking, and critical path analysis.
    """

    def __init__(self):
        self.nodes: Dict[str, GoalNode] = {}
        self.root_id: Optional[str] = None

    def set_root(self, goal: GoalNode) -> None:
        """Set the root goal of the tree."""
        self.nodes[goal.goal_id] = goal
        self.root_id = goal.goal_id

    def add_child(self, parent_id: str, child: GoalNode) -> None:
        """Add a child goal to a parent node."""
        if parent_id not in self.nodes:
            raise ValueError(f"Parent '{parent_id}' not found in tree")

        child.parent_id = parent_id
        self.nodes[child.goal_id] = child
        self.nodes[parent_id].children.append(child.goal_id)

    def add_dependency(self, goal_id: str, depends_on: str) -> None:
        """Add a dependency edge between goals."""
        if goal_id in self.nodes and depends_on in self.nodes:
            self.nodes[goal_id].dependencies.append(depends_on)

    def get_leaves(self) -> List[GoalNode]:
        """Get all leaf nodes (atomic tasks)."""
        return [n for n in self.nodes.values() if n.is_leaf]

    def get_depth(self, goal_id: Optional[str] = None) -> int:
        """Get the depth of the tree from a given node."""
        if goal_id is None:
            goal_id = self.root_id
        if goal_id is None:
            return 0

        node = self.nodes.get(goal_id)
        if node is None or not node.children:
            return 0

        return 1 + max(self.get_depth(child_id) for child_id in node.children)

    def evaluate_success(self, goal_id: Optional[str] = None) -> bool:
        """
        Evaluate whether a goal has been achieved based on
        AND/OR semantics and child statuses.
        """
        if goal_id is None:
            goal_id = self.root_id
        if goal_id is None:
            return False

        node = self.nodes[goal_id]

        if node.is_leaf:
            return node.status == GoalStatus.COMPLETED

        child_results = [
            self.evaluate_success(child_id)
            for child_id in node.children
        ]

        if node.goal_type == GoalType.AND:
            return all(child_results)
        elif node.goal_type == GoalType.OR:
            return any(child_results)

        return False

    def compute_total_cost(self, goal_id: Optional[str] = None) -> float:
        """Compute total estimated cost for a subtree."""
        if goal_id is None:
            goal_id = self.root_id
        if goal_id is None:
            return 0.0

        node = self.nodes[goal_id]

        if node.is_leaf:
            return node.estimated_cost

        if node.goal_type == GoalType.AND:
            # AND: sum of all children (all must execute)
            return sum(
                self.compute_total_cost(child_id)
                for child_id in node.children
            )
        elif node.goal_type == GoalType.OR:
            # OR: minimum cost child (best alternative)
            if node.children:
                return min(
                    self.compute_total_cost(child_id)
                    for child_id in node.children
                )
            return 0.0

        return 0.0

    def get_execution_order(self) -> List[str]:
        """
        Get a valid execution order for leaf tasks
        respecting dependencies (topological sort).
        """
        leaves = {n.goal_id for n in self.get_leaves()}

        # Build adjacency for leaf dependencies only
        in_degree: Dict[str, int] = {lid: 0 for lid in leaves}
        adjacency: Dict[str, List[str]] = {lid: [] for lid in leaves}

        for leaf_id in leaves:
            node = self.nodes[leaf_id]
            for dep_id in node.dependencies:
                if dep_id in leaves:
                    adjacency[dep_id].append(leaf_id)
                    in_degree[leaf_id] += 1

        # Kahn's algorithm
        queue = deque([lid for lid, deg in in_degree.items() if deg == 0])
        order = []

        while queue:
            # Priority-based tie breaking
            current = min(queue, key=lambda x: -self.nodes[x].priority.value)
            queue.remove(current)
            order.append(current)

            for neighbor in adjacency[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(order) != len(leaves):
            raise ValueError("Circular dependency detected in goal tree")

        return order

    def to_ascii(self, goal_id: Optional[str] = None,
                 indent: str = "", is_last: bool = True) -> str:
        """Generate ASCII representation of the tree."""
        if goal_id is None:
            goal_id = self.root_id
        if goal_id is None:
            return "(empty tree)"

        node = self.nodes[goal_id]
        connector = "└── " if is_last else "├── "
        type_label = f"({node.goal_type.value})" if node.is_composite else "(TASK)"
        status_icon = {
            GoalStatus.PENDING: "○",
            GoalStatus.IN_PROGRESS: "◐",
            GoalStatus.COMPLETED: "●",
            GoalStatus.FAILED: "✗",
            GoalStatus.SKIPPED: "−",
        }.get(node.status, "?")

        lines = [f"{indent}{connector}{status_icon} {node.name} {type_label}"]

        child_indent = indent + ("    " if is_last else "│   ")
        for i, child_id in enumerate(node.children):
            child_is_last = (i == len(node.children) - 1)
            lines.append(self.to_ascii(child_id, child_indent, child_is_last))

        return "\n".join(lines)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize the tree to a dictionary."""
        return {
            "root_id": self.root_id,
            "node_count": len(self.nodes),
            "leaf_count": len(self.get_leaves()),
            "depth": self.get_depth(),
            "total_estimated_cost": self.compute_total_cost(),
            "nodes": {nid: n.to_dict() for nid, n in self.nodes.items()},
        }
```

---

## Goal Refinement Patterns

Goal refinement transforms abstract goals into concrete sub-goals. The following patterns cover the most common refinement scenarios in agent systems.

### Pattern 1: Sequential Decomposition

Break a goal into steps that must execute in strict order.

```
[Modify Configuration File] (AND)
├── [1. Read current config] (LEAF) → deps: []
├── [2. Parse config format] (LEAF) → deps: [1]
├── [3. Apply changes] (LEAF) → deps: [2]
└── [4. Write updated config] (LEAF) → deps: [3]
```

### Pattern 2: Parallel Decomposition

Break a goal into independent tasks that can execute concurrently.

```
[Analyze Repository] (AND)
├── [Scan file structure] (LEAF) → deps: []
├── [Read package.json] (LEAF) → deps: []
├── [Check git history] (LEAF) → deps: []
└── [Inspect CI config] (LEAF) → deps: []
```

### Pattern 3: Alternative Decomposition

Provide multiple approaches and select the best one.

```
[Resolve Type Error] (OR)
├── [Add type assertion] (LEAF) → cost: 200 tokens
├── [Update type definition] (LEAF) → cost: 500 tokens
└── [Refactor to generic] (AND) → cost: 1500 tokens
    ├── [Create generic interface] (LEAF)
    └── [Update all usages] (LEAF)
```

### Pattern 4: Conditional Decomposition

Select sub-goals based on runtime conditions.

```
[Install Dependencies] (OR)
├── [package.json exists?] → [npm install] (LEAF)
├── [requirements.txt exists?] → [pip install] (LEAF)
├── [go.mod exists?] → [go mod download] (LEAF)
└── [Cargo.toml exists?] → [cargo build] (LEAF)
```

---

## Dependency Graphs

### DAG Construction

Task dependencies form a Directed Acyclic Graph (DAG). The DAG determines the valid execution orders.

```
Dependency DAG Example:

    t1 (Read auth.py)
   / \
  ▼   ▼
 t2   t3 (Modify auth.py, Read tests.py)
  \   /
   ▼ ▼
   t4 (Update tests.py)
    │
    ▼
   t5 (Run tests)
```

### Python Implementation: Dependency Graph

```python
class DependencyGraph:
    """
    Directed acyclic graph for task dependencies.
    Supports topological sorting, critical path analysis,
    and parallel execution group detection.
    """

    def __init__(self):
        self.edges: Dict[str, Set[str]] = {}  # node -> successors
        self.reverse_edges: Dict[str, Set[str]] = {}  # node -> predecessors
        self.node_weights: Dict[str, float] = {}  # node -> execution time estimate

    def add_node(self, node_id: str, weight: float = 1.0) -> None:
        """Add a node with an execution time weight."""
        if node_id not in self.edges:
            self.edges[node_id] = set()
        if node_id not in self.reverse_edges:
            self.reverse_edges[node_id] = set()
        self.node_weights[node_id] = weight

    def add_edge(self, from_node: str, to_node: str) -> None:
        """Add a dependency edge: from_node must complete before to_node."""
        self.add_node(from_node)
        self.add_node(to_node)
        self.edges[from_node].add(to_node)
        self.reverse_edges[to_node].add(from_node)

    def has_cycle(self) -> bool:
        """Detect if the graph contains a cycle using DFS."""
        visited = set()
        rec_stack = set()

        def _dfs(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            for neighbor in self.edges.get(node, set()):
                if neighbor not in visited:
                    if _dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True
            rec_stack.discard(node)
            return False

        for node in self.edges:
            if node not in visited:
                if _dfs(node):
                    return True
        return False

    def topological_sort(self) -> List[str]:
        """Return a valid topological ordering of nodes."""
        if self.has_cycle():
            raise ValueError("Cannot topologically sort a graph with cycles")

        in_degree = {node: len(self.reverse_edges.get(node, set()))
                     for node in self.edges}
        queue = deque([n for n, d in in_degree.items() if d == 0])
        result = []

        while queue:
            node = queue.popleft()
            result.append(node)
            for successor in self.edges.get(node, set()):
                in_degree[successor] -= 1
                if in_degree[successor] == 0:
                    queue.append(successor)

        return result

    def get_parallel_groups(self) -> List[List[str]]:
        """
        Identify groups of tasks that can execute in parallel.
        Each group contains tasks whose dependencies are all
        satisfied by previous groups.
        """
        if self.has_cycle():
            raise ValueError("Cannot compute parallel groups for cyclic graph")

        remaining = set(self.edges.keys())
        completed = set()
        groups = []

        while remaining:
            # Find all nodes whose dependencies are all completed
            ready = [
                node for node in remaining
                if self.reverse_edges.get(node, set()).issubset(completed)
            ]

            if not ready:
                raise ValueError("Deadlock detected in dependency graph")

            groups.append(sorted(ready))
            completed.update(ready)
            remaining -= set(ready)

        return groups

    def critical_path(self) -> Tuple[List[str], float]:
        """
        Compute the critical path — the longest path through
        the DAG by node weights. This determines the minimum
        possible execution time with maximum parallelism.
        """
        if self.has_cycle():
            raise ValueError("Cannot compute critical path for cyclic graph")

        order = self.topological_sort()

        # Dynamic programming: longest path from each node
        dist: Dict[str, float] = {}
        predecessor: Dict[str, Optional[str]] = {}

        for node in order:
            dist[node] = self.node_weights.get(node, 1.0)
            predecessor[node] = None

            for pred in self.reverse_edges.get(node, set()):
                candidate = dist[pred] + self.node_weights.get(node, 1.0)
                if candidate > dist[node]:
                    dist[node] = candidate
                    predecessor[node] = pred

        # Find the end node of the critical path
        end_node = max(dist, key=dist.get)
        critical_length = dist[end_node]

        # Trace back the path
        path = []
        current = end_node
        while current is not None:
            path.append(current)
            current = predecessor[current]

        path.reverse()
        return path, critical_length

    def to_ascii(self) -> str:
        """Generate ASCII representation of the dependency graph."""
        groups = self.get_parallel_groups()
        lines = ["Dependency Graph (parallel groups):"]
        lines.append("=" * 50)

        for i, group in enumerate(groups):
            lines.append(f"Group {i + 1} (parallel):")
            for node in group:
                weight = self.node_weights.get(node, 0)
                deps = self.reverse_edges.get(node, set())
                dep_str = f" ← [{', '.join(sorted(deps))}]" if deps else ""
                lines.append(f"  [{node}] (cost: {weight}){dep_str}")
            if i < len(groups) - 1:
                lines.append("    │")
                lines.append("    ▼")

        return "\n".join(lines)
```

---

## Critical Path Analysis

The critical path determines the minimum execution time for the entire plan, assuming maximum parallelism is exploited.

### Critical Path Formula

$$T_{critical} = \max_{\text{paths } P \text{ from root to leaf}} \sum_{t \in P} w(t)$$

Where $w(t)$ is the execution time weight of task $t$.

### Example Analysis

```
Task Graph:
    t1 (w=2)
   / \
  t2   t3 (w=3, w=1)
  |     |
  t4   t5 (w=2, w=4)
   \ /
    t6 (w=1)

Paths:
  t1 → t2 → t4 → t6: 2 + 3 + 2 + 1 = 8
  t1 → t3 → t5 → t6: 2 + 1 + 4 + 1 = 8  ← Tie

Critical Path Length: 8
With parallelism: Groups = [{t1}, {t2,t3}, {t4,t5}, {t6}]
Parallel Time: 2 + 3 + 4 + 1 = 10 (group max per stage)
```

---

## TypeScript Implementation: Goal Decomposer

```typescript
interface GoalSpec {
  id: string;
  name: string;
  type: "AND" | "OR" | "LEAF";
  children?: GoalSpec[];
  dependencies?: string[];
  estimatedTokens?: number;
  priority?: number;
  preconditions?: string[];
  postconditions?: string[];
}

interface DecompositionResult {
  tree: GoalSpec;
  leafCount: number;
  depth: number;
  totalEstimatedTokens: number;
  executionOrder: string[];
  parallelGroups: string[][];
  criticalPathLength: number;
}

class GoalDecomposer {
  private maxDepth: number = 4;
  private maxLeaves: number = 20;

  decompose(userGoal: string, context: Record<string, unknown>): DecompositionResult {
    // Step 1: Parse goal into structure
    const rootGoal = this.parseGoal(userGoal, context);

    // Step 2: Refine until all leaves are atomic
    const refined = this.refineGoal(rootGoal, 0);

    // Step 3: Compute metrics
    const leaves = this.collectLeaves(refined);
    const depth = this.computeDepth(refined);
    const totalTokens = this.computeTotalCost(refined);
    const order = this.topologicalSort(leaves);
    const groups = this.computeParallelGroups(leaves);
    const criticalPath = this.computeCriticalPathLength(leaves);

    return {
      tree: refined,
      leafCount: leaves.length,
      depth,
      totalEstimatedTokens: totalTokens,
      executionOrder: order,
      parallelGroups: groups,
      criticalPathLength: criticalPath,
    };
  }

  private parseGoal(goal: string, context: Record<string, unknown>): GoalSpec {
    // Heuristic-based goal parsing
    const goalId = this.generateId("g");

    // Detect if goal is simple enough to be a leaf
    const wordCount = goal.split(/\s+/).length;
    if (wordCount <= 5) {
      return {
        id: goalId,
        name: goal,
        type: "LEAF",
        estimatedTokens: 500,
        priority: 2,
      };
    }

    return {
      id: goalId,
      name: goal,
      type: "AND",
      children: [],
      estimatedTokens: 0,
      priority: 3,
    };
  }

  private refineGoal(goal: GoalSpec, depth: number): GoalSpec {
    if (depth >= this.maxDepth || goal.type === "LEAF") {
      return goal;
    }

    if (!goal.children || goal.children.length === 0) {
      // Auto-decompose based on goal name heuristics
      goal.children = this.autoDecompose(goal);
    }

    // Recursively refine children
    goal.children = goal.children.map((child) =>
      this.refineGoal(child, depth + 1)
    );

    return goal;
  }

  private autoDecompose(goal: GoalSpec): GoalSpec[] {
    const name = goal.name.toLowerCase();
    const children: GoalSpec[] = [];

    // Common decomposition patterns
    if (name.includes("refactor") || name.includes("modify")) {
      children.push(
        this.createLeaf("Read target files", 300),
        this.createLeaf("Analyze current structure", 500),
        this.createLeaf("Apply modifications", 800),
        this.createLeaf("Verify changes", 400)
      );
    } else if (name.includes("create") || name.includes("generate")) {
      children.push(
        this.createLeaf("Determine file location", 200),
        this.createLeaf("Generate content", 1000),
        this.createLeaf("Write file", 300)
      );
    } else if (name.includes("test") || name.includes("verify")) {
      children.push(
        this.createLeaf("Identify test targets", 300),
        this.createLeaf("Generate test cases", 800),
        this.createLeaf("Run validation", 400)
      );
    } else {
      // Generic decomposition
      children.push(
        this.createLeaf("Analyze requirements", 400),
        this.createLeaf("Execute primary action", 800),
        this.createLeaf("Verify results", 300)
      );
    }

    // Set sequential dependencies
    for (let i = 1; i < children.length; i++) {
      children[i].dependencies = [children[i - 1].id];
    }

    return children;
  }

  private createLeaf(name: string, tokens: number): GoalSpec {
    return {
      id: this.generateId("t"),
      name,
      type: "LEAF",
      estimatedTokens: tokens,
      dependencies: [],
      priority: 2,
    };
  }

  private collectLeaves(goal: GoalSpec): GoalSpec[] {
    if (goal.type === "LEAF") return [goal];
    const leaves: GoalSpec[] = [];
    for (const child of goal.children ?? []) {
      leaves.push(...this.collectLeaves(child));
    }
    return leaves;
  }

  private computeDepth(goal: GoalSpec): number {
    if (!goal.children || goal.children.length === 0) return 0;
    return 1 + Math.max(...goal.children.map((c) => this.computeDepth(c)));
  }

  private computeTotalCost(goal: GoalSpec): number {
    if (goal.type === "LEAF") return goal.estimatedTokens ?? 0;
    if (goal.type === "AND") {
      return (goal.children ?? []).reduce(
        (sum, c) => sum + this.computeTotalCost(c),
        0
      );
    }
    // OR: minimum cost child
    const costs = (goal.children ?? []).map((c) => this.computeTotalCost(c));
    return costs.length > 0 ? Math.min(...costs) : 0;
  }

  private topologicalSort(leaves: GoalSpec[]): string[] {
    const nodeMap = new Map(leaves.map((l) => [l.id, l]));
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const leaf of leaves) {
      inDegree.set(leaf.id, 0);
      adj.set(leaf.id, []);
    }

    for (const leaf of leaves) {
      for (const dep of leaf.dependencies ?? []) {
        if (nodeMap.has(dep)) {
          adj.get(dep)!.push(leaf.id);
          inDegree.set(leaf.id, (inDegree.get(leaf.id) ?? 0) + 1);
        }
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);
      for (const neighbor of adj.get(node) ?? []) {
        const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    return result;
  }

  private computeParallelGroups(leaves: GoalSpec[]): string[][] {
    const nodeMap = new Map(leaves.map((l) => [l.id, l]));
    const remaining = new Set(leaves.map((l) => l.id));
    const completed = new Set<string>();
    const groups: string[][] = [];

    while (remaining.size > 0) {
      const ready: string[] = [];
      for (const id of remaining) {
        const deps = nodeMap.get(id)?.dependencies ?? [];
        const leafDeps = deps.filter((d) => nodeMap.has(d));
        if (leafDeps.every((d) => completed.has(d))) {
          ready.push(id);
        }
      }

      if (ready.length === 0) break;

      groups.push(ready);
      for (const id of ready) {
        remaining.delete(id);
        completed.add(id);
      }
    }

    return groups;
  }

  private computeCriticalPathLength(leaves: GoalSpec[]): number {
    const groups = this.computeParallelGroups(leaves);
    const nodeMap = new Map(leaves.map((l) => [l.id, l]));
    let total = 0;

    for (const group of groups) {
      const maxInGroup = Math.max(
        ...group.map((id) => nodeMap.get(id)?.estimatedTokens ?? 0)
      );
      total += maxInGroup;
    }

    return total;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
```

---

## Goal Prioritization

### Priority Scoring Formula

$$P(g) = w_{urgency} \cdot U(g) + w_{impact} \cdot I(g) + w_{cost} \cdot (1 - C(g)) + w_{risk} \cdot R(g)$$

Where:
- $U(g) \in [0,1]$: Urgency score (deadline proximity)
- $I(g) \in [0,1]$: Impact score (how many other goals depend on this)
- $C(g) \in [0,1]$: Cost score (normalized resource cost, inverted so cheaper = higher priority)
- $R(g) \in [0,1]$: Risk score (failure probability, high risk = prioritize early)
- $w_i$: Configurable weights summing to 1

### Priority Assignment Table

| Factor | Weight | Scoring Method |
| :--- | :--- | :--- |
| Urgency | 0.3 | Inverse of slack time in critical path |
| Impact | 0.3 | Number of dependents / total goals |
| Cost Efficiency | 0.2 | 1 - (estimated_tokens / max_tokens) |
| Risk | 0.2 | Probability of failure based on task type |

---

## Parallel vs Sequential Decomposition Decision

```
Decomposition Strategy Selection
│
├── Do sub-goals share state?
│   ├── YES → Sequential decomposition
│   │         (Shared file writes, database updates)
│   └── NO
│       │
│       ├── Do sub-goals have ordering constraints?
│       │   ├── YES → Sequential decomposition
│       │   │         (Read before modify, compile before test)
│       │   └── NO
│       │       │
│       │       ├── Are sub-goals independent?
│       │       │   ├── YES → Parallel decomposition
│       │       │   │         (Scan files, read configs, check tools)
│       │       │   └── NO → Mixed decomposition
│       │       │             (Some parallel, some sequential)
│       │       │
│       │       └── Can failures be isolated?
│       │           ├── YES → Parallel with independent error handling
│       │           └── NO → Sequential with checkpoint rollback
```

---

## Anti-Patterns in Goal Decomposition

| Anti-Pattern | Problem | Solution |
| :--- | :--- | :--- |
| **Over-Decomposition** | More than 20 leaf tasks for a simple request | Limit decomposition depth to 4 levels |
| **Under-Decomposition** | Leaf tasks too complex for single action | Ensure each leaf maps to exactly one tool call |
| **Circular Dependencies** | Goal A depends on Goal B which depends on A | Validate DAG acyclicity before execution |
| **OR-Explosion** | Too many alternatives, exponential exploration | Limit OR-branches to 3 alternatives using beam search |
| **Missing Dependencies** | Tasks execute before prerequisites complete | Auto-detect dependencies from precondition/postcondition matching |
| **Flat Decomposition** | No hierarchy, all goals at same level | Use refinement patterns to create meaningful structure |

---

## Handoff & Related References
- Constraint Propagation: [constraint-propagation.md](constraint-propagation.md)
- Task Decomposition Strategies: [task-decomposition-strategies.md](task-decomposition-strategies.md)
- Anticipatory Error Prevention: [anticipatory-error-prevention.md](anticipatory-error-prevention.md)
- OODA Loop Patterns: [ooda-loop-patterns.md](ooda-loop-patterns.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive goal decomposition details preserved)
Strict compliance with AND/OR tree semantics, dependency DAG construction, critical path analysis, and prioritization protocols.
-->
