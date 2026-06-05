# Task Decomposition Strategies

## Theoretical Foundation

Task decomposition is the process of breaking complex goals into smaller, manageable sub-tasks that can be individually planned, executed, and verified. In AI agent systems, effective decomposition is critical because LLMs perform best when given focused, well-defined tasks rather than ambiguous, multi-faceted objectives.

The decomposition quality metric is defined as:

$$Q_{decomp} = \frac{\sum_{i=1}^{n} \text{clarity}(t_i) \times \text{atomicity}(t_i)}{n} \times \text{coverage}(T, G)$$

Where $t_i$ is sub-task $i$, $n$ is the total number of sub-tasks, and $\text{coverage}(T, G)$ measures how completely the set of tasks $T$ covers the original goal $G$.

```
+----------------------------------------------------------------------+
|                    TASK DECOMPOSITION HIERARCHY                       |
|                                                                      |
|                        [Top-Level Goal]                              |
|                       /        |        \                            |
|               [Sub-Goal 1] [Sub-Goal 2] [Sub-Goal 3]                |
|               /     \          |         /     \                    |
|         [Task 1a] [Task 1b] [Task 2a] [Task 3a] [Task 3b]         |
|            |         |         |         |         |                |
|         [Action]  [Action]  [Action]  [Action]  [Action]            |
+----------------------------------------------------------------------+
```

---

## Decomposition Strategies

### 1. Top-Down Hierarchical Decomposition

The most common strategy. Start from the top-level goal and recursively break it down into sub-goals until atomic tasks are reached.

```
Algorithm: TOP-DOWN-DECOMPOSE(goal, max_depth)
1. IF is_atomic(goal) OR depth >= max_depth:
2.     RETURN [goal]
3. sub_goals = IDENTIFY-SUB-GOALS(goal)
4. tasks = []
5. FOR EACH sub_goal IN sub_goals:
6.     tasks.extend(TOP-DOWN-DECOMPOSE(sub_goal, max_depth))
7. RETURN tasks
```

### 2. Bottom-Up Capability Matching

Start from available tools and capabilities, then compose them into plans that achieve the goal.

```
Algorithm: BOTTOM-UP-COMPOSE(goal, capabilities)
1. relevant_caps = FILTER(capabilities, relates_to(goal))
2. task_chains = FIND-COMPOSITIONS(relevant_caps, goal)
3. optimal_chain = MIN-COST(task_chains)
4. RETURN optimal_chain
```

### 3. Analogy-Based Decomposition

Match the current goal against known task templates and adapt the decomposition pattern.

### 4. Means-Ends Analysis

Identify the gap between current state and goal state, then select operators that reduce the gap.

---

## Python Implementation: Task Decomposition Engine

```python
import json
import uuid
from typing import List, Dict, Optional, Any, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum


class TaskType(Enum):
    COMPOSITE = "composite"  # Can be decomposed further
    ATOMIC = "atomic"        # Cannot be decomposed further
    CONDITIONAL = "conditional"  # Execution depends on a condition
    PARALLEL = "parallel"    # Sub-tasks can run in parallel


class RelationType(Enum):
    AND = "and"   # All children must complete
    OR = "or"     # At least one child must complete
    SEQ = "seq"   # Children must execute in sequence


@dataclass
class TaskNode:
    """Represents a node in the task decomposition tree."""
    task_id: str
    description: str
    task_type: TaskType
    relation: RelationType = RelationType.AND
    children: List['TaskNode'] = field(default_factory=list)
    parent_id: Optional[str] = None
    preconditions: List[str] = field(default_factory=list)
    postconditions: List[str] = field(default_factory=list)
    estimated_effort: float = 1.0  # Relative effort score
    tool_hint: Optional[str] = None
    depth: int = 0

    @property
    def is_leaf(self) -> bool:
        return len(self.children) == 0

    def add_child(self, child: 'TaskNode') -> None:
        child.parent_id = self.task_id
        child.depth = self.depth + 1
        self.children.append(child)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "description": self.description,
            "type": self.task_type.value,
            "relation": self.relation.value,
            "depth": self.depth,
            "effort": self.estimated_effort,
            "tool": self.tool_hint,
            "preconditions": self.preconditions,
            "postconditions": self.postconditions,
            "children": [c.to_dict() for c in self.children],
        }

    def get_leaf_tasks(self) -> List['TaskNode']:
        """Get all leaf (atomic) tasks in execution order."""
        if self.is_leaf:
            return [self]
        leaves = []
        for child in self.children:
            leaves.extend(child.get_leaf_tasks())
        return leaves

    def count_nodes(self) -> int:
        """Count total nodes in the subtree."""
        return 1 + sum(c.count_nodes() for c in self.children)


class TaskDecomposer:
    """
    Decomposes complex goals into hierarchical task trees.
    Supports multiple decomposition strategies.
    """

    MAX_DEPTH = 4
    MIN_DESCRIPTION_LENGTH = 10

    # Decomposition patterns for common task types
    DECOMPOSITION_PATTERNS = {
        "code_modification": {
            "relation": RelationType.SEQ,
            "sub_tasks": [
                {"desc": "Analyze current implementation", "type": TaskType.ATOMIC, "tool": "view_file"},
                {"desc": "Identify modification points", "type": TaskType.ATOMIC, "tool": "grep_search"},
                {"desc": "Generate code changes", "type": TaskType.ATOMIC, "tool": "llm_generate"},
                {"desc": "Apply modifications", "type": TaskType.ATOMIC, "tool": "replace_file_content"},
                {"desc": "Verify correctness", "type": TaskType.ATOMIC, "tool": "run_command"},
            ],
        },
        "feature_implementation": {
            "relation": RelationType.SEQ,
            "sub_tasks": [
                {"desc": "Design feature architecture", "type": TaskType.COMPOSITE},
                {"desc": "Implement core logic", "type": TaskType.COMPOSITE},
                {"desc": "Add tests", "type": TaskType.COMPOSITE},
                {"desc": "Update documentation", "type": TaskType.ATOMIC, "tool": "write_to_file"},
            ],
        },
        "bug_fix": {
            "relation": RelationType.SEQ,
            "sub_tasks": [
                {"desc": "Reproduce the bug", "type": TaskType.ATOMIC, "tool": "run_command"},
                {"desc": "Identify root cause", "type": TaskType.COMPOSITE},
                {"desc": "Implement fix", "type": TaskType.ATOMIC, "tool": "replace_file_content"},
                {"desc": "Verify fix resolves issue", "type": TaskType.ATOMIC, "tool": "run_command"},
                {"desc": "Check for regressions", "type": TaskType.ATOMIC, "tool": "run_command"},
            ],
        },
        "refactoring": {
            "relation": RelationType.SEQ,
            "sub_tasks": [
                {"desc": "Map current code structure", "type": TaskType.ATOMIC, "tool": "grep_search"},
                {"desc": "Identify refactoring targets", "type": TaskType.ATOMIC, "tool": "view_file"},
                {"desc": "Plan refactoring steps", "type": TaskType.ATOMIC, "tool": "llm_generate"},
                {"desc": "Execute refactoring", "type": TaskType.COMPOSITE},
                {"desc": "Run full test suite", "type": TaskType.ATOMIC, "tool": "run_command"},
            ],
        },
    }

    def __init__(self, max_depth: int = 4):
        self.max_depth = max_depth

    def decompose(self, goal: str, goal_type: str = "code_modification",
                  depth: int = 0) -> TaskNode:
        """
        Decompose a goal into a hierarchical task tree.
        """
        root = TaskNode(
            task_id=f"task_{uuid.uuid4().hex[:8]}",
            description=goal,
            task_type=TaskType.COMPOSITE,
            depth=depth,
        )

        if depth >= self.max_depth:
            root.task_type = TaskType.ATOMIC
            print(f"[Decomposer] Max depth reached, making atomic: {goal[:50]}...")
            return root

        pattern = self.DECOMPOSITION_PATTERNS.get(goal_type)
        if not pattern:
            root.task_type = TaskType.ATOMIC
            return root

        root.relation = pattern["relation"]

        for sub_template in pattern["sub_tasks"]:
            child = TaskNode(
                task_id=f"task_{uuid.uuid4().hex[:8]}",
                description=sub_template["desc"],
                task_type=sub_template["type"],
                tool_hint=sub_template.get("tool"),
                depth=depth + 1,
            )

            if child.task_type == TaskType.COMPOSITE and depth + 1 < self.max_depth:
                # Recursively decompose composite children
                child = self._decompose_composite(child, depth + 1)

            root.add_child(child)

        print(f"[Decomposer] Decomposed '{goal[:50]}...' into {len(root.children)} sub-tasks")
        return root

    def _decompose_composite(self, node: TaskNode, depth: int) -> TaskNode:
        """Further decompose a composite node using heuristics."""
        # Use generic decomposition for composite sub-tasks
        generic_children = [
            TaskNode(
                task_id=f"task_{uuid.uuid4().hex[:8]}",
                description=f"Analyze requirements for: {node.description}",
                task_type=TaskType.ATOMIC,
                tool_hint="view_file",
                depth=depth + 1,
            ),
            TaskNode(
                task_id=f"task_{uuid.uuid4().hex[:8]}",
                description=f"Execute: {node.description}",
                task_type=TaskType.ATOMIC,
                tool_hint="llm_generate",
                depth=depth + 1,
            ),
            TaskNode(
                task_id=f"task_{uuid.uuid4().hex[:8]}",
                description=f"Verify: {node.description}",
                task_type=TaskType.ATOMIC,
                tool_hint="run_command",
                depth=depth + 1,
            ),
        ]

        node.relation = RelationType.SEQ
        for child in generic_children:
            node.add_child(child)

        return node

    def compute_dependency_graph(self, root: TaskNode) -> Dict[str, List[str]]:
        """
        Extract a dependency graph from the task tree.
        Sequential children depend on their predecessor.
        AND children have no inter-dependencies (parallel).
        """
        graph: Dict[str, List[str]] = {}
        self._build_deps(root, graph)
        return graph

    def _build_deps(self, node: TaskNode, graph: Dict[str, List[str]]) -> None:
        if node.is_leaf:
            if node.task_id not in graph:
                graph[node.task_id] = []
            return

        if node.relation == RelationType.SEQ:
            prev_leaves: List[str] = []
            for child in node.children:
                child_leaves = child.get_leaf_tasks()
                for leaf in child_leaves:
                    graph[leaf.task_id] = list(prev_leaves)
                self._build_deps(child, graph)
                prev_leaves = [l.task_id for l in child_leaves]
        else:
            for child in node.children:
                self._build_deps(child, graph)
                for leaf in child.get_leaf_tasks():
                    if leaf.task_id not in graph:
                        graph[leaf.task_id] = []

    def estimate_total_effort(self, root: TaskNode) -> float:
        """Estimate total effort for the decomposed task tree."""
        leaves = root.get_leaf_tasks()
        return sum(leaf.estimated_effort for leaf in leaves)

    def validate_decomposition(self, root: TaskNode) -> List[str]:
        """Validate the decomposition tree for common issues."""
        issues = []

        # Check max depth
        if root.depth > self.max_depth:
            issues.append(f"Tree exceeds max depth: {root.depth} > {self.max_depth}")

        # Check leaf completeness
        leaves = root.get_leaf_tasks()
        if not leaves:
            issues.append("No leaf tasks found in decomposition")

        # Check description quality
        for leaf in leaves:
            if len(leaf.description) < self.MIN_DESCRIPTION_LENGTH:
                issues.append(f"Task '{leaf.task_id}' has insufficient description: '{leaf.description}'")

        # Check for orphan nodes
        total = root.count_nodes()
        if total > 50:
            issues.append(f"Excessive decomposition: {total} nodes (recommended < 50)")

        return issues


# Execution order generator
class ExecutionOrderGenerator:
    """Generates a flat execution order from a task tree with dependencies."""

    def topological_sort(self, graph: Dict[str, List[str]]) -> List[str]:
        """
        Kahn's algorithm for topological sorting.
        Returns ordered list of task IDs.
        """
        in_degree = {node: 0 for node in graph}
        for node, deps in graph.items():
            for dep in deps:
                if dep in in_degree:
                    # dep must come before node
                    pass
            in_degree[node] = len(deps)

        # Find all nodes with no dependencies
        queue = [node for node, degree in in_degree.items() if degree == 0]
        result = []

        while queue:
            node = queue.pop(0)
            result.append(node)

            # Reduce in-degree for dependent nodes
            for candidate, deps in graph.items():
                if node in deps:
                    in_degree[candidate] -= 1
                    if in_degree[candidate] == 0:
                        queue.append(candidate)

        if len(result) != len(graph):
            raise ValueError("Circular dependency detected in task graph")

        return result

    def get_parallel_groups(self, graph: Dict[str, List[str]]) -> List[List[str]]:
        """
        Group tasks that can execute in parallel.
        Tasks in the same group have no mutual dependencies.
        """
        completed: Set[str] = set()
        remaining = set(graph.keys())
        groups: List[List[str]] = []

        while remaining:
            ready = [
                node for node in remaining
                if all(dep in completed for dep in graph.get(node, []))
            ]
            if not ready:
                raise ValueError("Circular dependency detected")
            groups.append(ready)
            completed.update(ready)
            remaining -= set(ready)

        return groups
```

---

## Decomposition Quality Metrics

| Metric | Formula | Target Value |
| :--- | :--- | :--- |
| **Atomicity Score** | $A = \frac{\text{atomic tasks}}{\text{total tasks}}$ | $\geq 0.6$ |
| **Coverage Score** | $C = \frac{\text{addressed requirements}}{\text{total requirements}}$ | $= 1.0$ |
| **Depth Efficiency** | $D = \frac{\text{useful depth}}{\text{max depth}}$ | $\leq 0.8$ |
| **Dependency Density** | $\delta = \frac{\text{edges}}{\text{nodes} \times (\text{nodes} - 1)}$ | $\leq 0.3$ |
| **Balance Score** | $B = 1 - \sigma(\text{branch sizes}) / \mu(\text{branch sizes})$ | $\geq 0.5$ |

---

## Decomposition Anti-Patterns

### 1. Over-Decomposition
Breaking tasks into unnecessarily small pieces that increase overhead without improving clarity.

**Signal**: More than 20 leaf tasks for a moderate-complexity goal.
**Fix**: Merge related atomic tasks into coarser-grained units.

### 2. Under-Decomposition
Leaving composite tasks that are too large and ambiguous for effective execution.

**Signal**: Leaf tasks with descriptions longer than 100 words.
**Fix**: Apply one more level of decomposition with specific action verbs.

### 3. Circular Dependencies
Task A depends on Task B which depends on Task A.

**Signal**: Topological sort throws an error.
**Fix**: Restructure the dependency graph; often one dependency is implicit and can be resolved.

### 4. Unbalanced Trees
One branch has 15 sub-tasks while another has 1.

**Signal**: High variance in branch sizes.
**Fix**: Re-examine the decomposition; unbalanced trees often indicate misclassified sub-goals.

---

## TypeScript Decomposition Framework

```typescript
interface DecompositionNode {
  id: string;
  description: string;
  type: "composite" | "atomic" | "conditional";
  relation: "and" | "or" | "seq";
  children: DecompositionNode[];
  toolHint?: string;
  effort: number;
  depth: number;
}

class TaskDecomposerTS {
  private maxDepth: number;

  constructor(maxDepth: number = 4) {
    this.maxDepth = maxDepth;
  }

  decompose(goal: string, depth: number = 0): DecompositionNode {
    const node: DecompositionNode = {
      id: `task_${Math.random().toString(36).slice(2, 10)}`,
      description: goal,
      type: depth >= this.maxDepth ? "atomic" : "composite",
      relation: "seq",
      children: [],
      effort: 1.0,
      depth,
    };

    if (node.type === "atomic") {
      return node;
    }

    // Heuristic decomposition based on goal keywords
    const subtasks = this.identifySubtasks(goal);
    for (const subtask of subtasks) {
      const child = this.decompose(subtask.description, depth + 1);
      child.toolHint = subtask.tool;
      node.children.push(child);
    }

    return node;
  }

  private identifySubtasks(
    goal: string
  ): Array<{ description: string; tool?: string }> {
    // Pattern matching for common goal structures
    const goalLower = goal.toLowerCase();

    if (goalLower.includes("refactor")) {
      return [
        { description: "Analyze current structure", tool: "grep_search" },
        { description: "Plan refactoring changes", tool: "llm_generate" },
        { description: "Apply changes", tool: "replace_file_content" },
        { description: "Run tests", tool: "run_command" },
      ];
    }

    if (goalLower.includes("create") || goalLower.includes("new")) {
      return [
        { description: "Design structure", tool: "llm_generate" },
        { description: "Create files", tool: "write_to_file" },
        { description: "Verify creation", tool: "list_dir" },
      ];
    }

    // Default decomposition
    return [
      { description: `Analyze: ${goal}`, tool: "view_file" },
      { description: `Execute: ${goal}`, tool: "llm_generate" },
      { description: `Verify: ${goal}`, tool: "run_command" },
    ];
  }

  getLeafTasks(node: DecompositionNode): DecompositionNode[] {
    if (node.children.length === 0) {
      return [node];
    }
    return node.children.flatMap((child) => this.getLeafTasks(child));
  }

  estimateTotalEffort(node: DecompositionNode): number {
    const leaves = this.getLeafTasks(node);
    return leaves.reduce((sum, leaf) => sum + leaf.effort, 0);
  }
}
```

---

## Handoff & Related References
- Goal Decomposition Trees: [goal-decomposition-trees.md](goal-decomposition-trees.md)
- Constraint Propagation: [constraint-propagation.md](constraint-propagation.md)
- Plan-Execute Architectures: [plan-execute-architectures.md](plan-execute-architectures.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive task decomposition details preserved)
-->
