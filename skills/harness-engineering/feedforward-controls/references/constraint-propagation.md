# Constraint Propagation for Agent Plans

## Theoretical Foundation

Constraint propagation is the process of systematically reducing the search space of an agent's plan by enforcing consistency across constraint networks. In feedforward control systems, constraints are propagated through the plan tree BEFORE execution begins, ensuring that infeasible branches are pruned early and resource allocation is sound.

A constraint satisfaction problem (CSP) for agent planning is defined as:

$$\text{CSP} = (X, D, C)$$

Where:
- $X = \{x_1, x_2, \ldots, x_n\}$ is a set of variables (plan parameters, task assignments, resource allocations)
- $D = \{D_1, D_2, \ldots, D_n\}$ is a set of domains (possible values for each variable)
- $C = \{c_1, c_2, \ldots, c_m\}$ is a set of constraints (restrictions on variable assignments)

The goal is to find an assignment $\sigma: X \rightarrow \bigcup D_i$ such that all constraints in $C$ are satisfied:

$$\forall c_j \in C: c_j(\sigma) = \text{true}$$

In agent planning, constraint propagation operates as a pre-execution filter:

```
+--------------------------------------------------------------------------+
|                    CONSTRAINT PROPAGATION ENGINE                          |
|                                                                          |
|   [Raw Plan Tree]                                                        |
|        │                                                                 |
|        ├──► [Constraint Extraction]                                      |
|        │        ├── Hard constraints (must-satisfy)                      |
|        │        └── Soft constraints (should-satisfy)                    |
|        │                                                                 |
|        ├──► [Constraint Graph Construction]                              |
|        │        ├── Variable nodes                                       |
|        │        └── Constraint edges                                     |
|        │                                                                 |
|        ├──► [Forward Propagation (Node Consistency)]                     |
|        │        └── Prune domains based on unary constraints             |
|        │                                                                 |
|        ├──► [Arc Consistency (AC-3)]                                     |
|        │        └── Enforce binary constraint consistency                |
|        │                                                                 |
|        ├──► [Conflict Detection]                                         |
|        │        └── Identify unsatisfiable constraint sets               |
|        │                                                                 |
|        └──► [Feasibility Report]                                         |
|                 ├── Feasible → Proceed to execution                      |
|                 └── Infeasible → Report conflicts to user                |
+--------------------------------------------------------------------------+
```

---

## Constraint Types in Agent Planning

### Type Taxonomy

| Constraint Type | Description | Examples | Hardness |
| :--- | :--- | :--- | :--- |
| **Resource Constraints** | Limits on computational and system resources | Token budget ≤ 8000, API calls ≤ 10/min, disk space ≥ 100MB | Hard |
| **Time Constraints** | Deadlines, ordering requirements, concurrency limits | Task B after Task A, total time ≤ 60s, no parallel file writes | Hard |
| **Permission Constraints** | Access control and authorization limits | Read-only files, protected directories, API key scopes | Hard |
| **Quality Constraints** | Standards and correctness requirements | Type-safe code, lint-free output, test coverage ≥ 80% | Soft |
| **Compatibility Constraints** | Environment and version compatibility | Python ≥ 3.9, Node ≥ 18, specific OS requirements | Hard |
| **Dependency Constraints** | Ordering and prerequisite relationships | Install before import, compile before test, read before modify | Hard |

### Constraint Representation Schema

```json
{
  "constraint_id": "c_001",
  "type": "resource",
  "name": "token_budget_limit",
  "description": "Total token consumption must not exceed the available budget",
  "hardness": "hard",
  "variables": ["token_budget", "task_token_cost"],
  "expression": "sum(task_token_cost) <= token_budget",
  "parameters": {
    "token_budget": 8000
  },
  "scope": "global",
  "priority": 1
}
```

---

## Constraint Graphs

A constraint graph $G = (V, E)$ represents the relationships between variables and constraints:
- $V$: Variable nodes, one per plan parameter
- $E$: Constraint edges connecting variables involved in the same constraint

### Graph Properties

$$\text{Constraint Density} = \frac{|E|}{\binom{|V|}{2}} = \frac{2|E|}{|V|(|V|-1)}$$

Higher constraint density indicates tighter coupling between plan components, which increases propagation effectiveness but also increases the probability of conflicts.

### Constraint Graph Visualization

```
Example: 4-Task Plan with Resource + Ordering Constraints

    [task_1_tool]          [task_2_tool]
         │                      │
    ┌────▼────┐           ┌────▼────┐
    │  Task 1 │──ordering─│  Task 2 │
    └────┬────┘           └────┬────┘
         │                      │
    token_cost              token_cost
         │                      │
         └─────────┬────────────┘
                   │
           ┌──────▼───────┐
           │ Token Budget  │
           │  (≤ 8000)     │
           └──────┬────────┘
                   │
         ┌─────────┴────────────┐
         │                      │
    token_cost              token_cost
         │                      │
    ┌────▼────┐           ┌────▼────┐
    │  Task 3 │──ordering─│  Task 4 │
    └─────────┘           └─────────┘
```

---

## Python Implementation: Constraint Engine

```python
import json
import copy
from typing import (
    Dict, List, Set, Tuple, Optional, Any, Callable, Union,
)
from dataclasses import dataclass, field
from enum import Enum
from collections import deque


class ConstraintHardness(Enum):
    HARD = "hard"
    SOFT = "soft"


class ConstraintType(Enum):
    RESOURCE = "resource"
    TIME = "time"
    PERMISSION = "permission"
    QUALITY = "quality"
    COMPATIBILITY = "compatibility"
    DEPENDENCY = "dependency"


class PropagationResult(Enum):
    CONSISTENT = "consistent"
    INCONSISTENT = "inconsistent"
    PRUNED = "pruned"


@dataclass
class Variable:
    """A variable in the constraint satisfaction problem."""
    name: str
    domain: List[Any]
    original_domain: List[Any] = field(default_factory=list)
    assigned_value: Optional[Any] = None

    def __post_init__(self):
        if not self.original_domain:
            self.original_domain = list(self.domain)

    @property
    def is_assigned(self) -> bool:
        return self.assigned_value is not None

    @property
    def domain_size(self) -> int:
        return len(self.domain)

    def prune(self, value: Any) -> bool:
        """Remove a value from the domain. Returns True if domain changed."""
        if value in self.domain:
            self.domain.remove(value)
            return True
        return False

    def is_empty(self) -> bool:
        return len(self.domain) == 0


@dataclass
class Constraint:
    """A constraint between variables."""
    constraint_id: str
    name: str
    constraint_type: ConstraintType
    hardness: ConstraintHardness
    variables: List[str]  # Variable names involved
    check_fn: Callable[..., bool]  # Function that validates the constraint
    description: str = ""
    priority: int = 1

    def is_satisfied(self, assignment: Dict[str, Any]) -> bool:
        """Check if the constraint is satisfied by the given assignment."""
        # Only check if all involved variables are assigned
        values = []
        for var_name in self.variables:
            if var_name not in assignment:
                return True  # Cannot evaluate, assume satisfied
            values.append(assignment[var_name])
        return self.check_fn(*values)

    @property
    def arity(self) -> int:
        return len(self.variables)

    @property
    def is_unary(self) -> bool:
        return self.arity == 1

    @property
    def is_binary(self) -> bool:
        return self.arity == 2


@dataclass
class ConflictReport:
    """Report of constraint conflicts found during propagation."""
    conflicts: List[Dict[str, Any]] = field(default_factory=list)
    pruned_values: Dict[str, List[Any]] = field(default_factory=dict)
    feasible: bool = True
    feasibility_score: float = 1.0

    def add_conflict(self, constraint_id: str, constraint_name: str,
                     variables: List[str], message: str) -> None:
        self.conflicts.append({
            "constraint_id": constraint_id,
            "constraint_name": constraint_name,
            "variables": variables,
            "message": message,
        })
        self.feasible = False

    def add_pruned(self, variable: str, value: Any) -> None:
        if variable not in self.pruned_values:
            self.pruned_values[variable] = []
        self.pruned_values[variable].append(value)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "feasible": self.feasible,
            "feasibility_score": round(self.feasibility_score, 4),
            "conflict_count": len(self.conflicts),
            "conflicts": self.conflicts,
            "pruned_values": {k: [str(v) for v in vs] for k, vs in self.pruned_values.items()},
        }


class ConstraintGraph:
    """
    Graph representation of a constraint satisfaction problem.
    Supports node consistency, arc consistency (AC-3), and backtracking search.
    """

    def __init__(self):
        self.variables: Dict[str, Variable] = {}
        self.constraints: List[Constraint] = []
        self._adjacency: Dict[str, Set[str]] = {}  # var -> connected vars
        self._var_constraints: Dict[str, List[Constraint]] = {}  # var -> constraints

    def add_variable(self, name: str, domain: List[Any]) -> None:
        """Add a variable with its domain to the CSP."""
        self.variables[name] = Variable(name=name, domain=list(domain))
        self._adjacency[name] = set()
        self._var_constraints[name] = []

    def add_constraint(self, constraint: Constraint) -> None:
        """Add a constraint to the CSP."""
        self.constraints.append(constraint)

        # Update adjacency and variable-constraint maps
        for var_name in constraint.variables:
            if var_name not in self._var_constraints:
                self._var_constraints[var_name] = []
            self._var_constraints[var_name].append(constraint)

            for other_var in constraint.variables:
                if other_var != var_name:
                    self._adjacency.setdefault(var_name, set()).add(other_var)
                    self._adjacency.setdefault(other_var, set()).add(var_name)

    def get_neighbors(self, var_name: str) -> Set[str]:
        """Get all variables connected to a given variable via constraints."""
        return self._adjacency.get(var_name, set())

    def get_constraints_for(self, var_name: str) -> List[Constraint]:
        """Get all constraints involving a given variable."""
        return self._var_constraints.get(var_name, [])

    def get_binary_constraints(self, var1: str, var2: str) -> List[Constraint]:
        """Get all binary constraints between two variables."""
        result = []
        for c in self.constraints:
            if c.is_binary and var1 in c.variables and var2 in c.variables:
                result.append(c)
        return result

    @property
    def density(self) -> float:
        """Compute constraint density of the graph."""
        n = len(self.variables)
        if n < 2:
            return 0.0
        edge_count = sum(len(neighbors) for neighbors in self._adjacency.values()) / 2
        max_edges = n * (n - 1) / 2
        return edge_count / max_edges if max_edges > 0 else 0.0


class ConstraintPropagator:
    """
    Constraint propagation engine implementing node consistency,
    arc consistency (AC-3), and backtracking search for agent plans.
    """

    def __init__(self, graph: ConstraintGraph):
        self.graph = graph
        self.report = ConflictReport()

    def propagate(self) -> ConflictReport:
        """
        Run full constraint propagation pipeline.

        Steps:
        1. Node consistency (unary constraints)
        2. Arc consistency (AC-3 for binary constraints)
        3. Conflict detection
        4. Feasibility scoring
        """
        self.report = ConflictReport()

        # Step 1: Node consistency
        self._enforce_node_consistency()

        # Step 2: Check for empty domains after node consistency
        if self._has_empty_domains():
            return self.report

        # Step 3: Arc consistency (AC-3)
        consistent = self._enforce_arc_consistency()

        # Step 4: Check for empty domains after arc consistency
        if not consistent or self._has_empty_domains():
            return self.report

        # Step 5: Compute feasibility score
        self.report.feasibility_score = self._compute_feasibility_score()

        return self.report

    def _enforce_node_consistency(self) -> None:
        """
        Enforce node consistency by applying all unary constraints.
        A variable is node-consistent if every value in its domain
        satisfies all unary constraints on that variable.
        """
        for constraint in self.graph.constraints:
            if not constraint.is_unary:
                continue

            var_name = constraint.variables[0]
            variable = self.graph.variables.get(var_name)
            if not variable:
                continue

            to_remove = []
            for value in variable.domain:
                assignment = {var_name: value}
                if not constraint.is_satisfied(assignment):
                    to_remove.append(value)

            for value in to_remove:
                variable.prune(value)
                self.report.add_pruned(var_name, value)

            if variable.is_empty():
                self.report.add_conflict(
                    constraint.constraint_id,
                    constraint.name,
                    constraint.variables,
                    f"Variable '{var_name}' has empty domain after node consistency "
                    f"with constraint '{constraint.name}'",
                )

    def _enforce_arc_consistency(self) -> bool:
        """
        Enforce arc consistency using the AC-3 algorithm.

        The AC-3 algorithm maintains a queue of arcs (directed edges)
        and iteratively removes values that cannot participate in
        any consistent assignment.

        Time complexity: O(e * d^3) where e = edges, d = max domain size.
        """
        # Initialize queue with all arcs
        queue: deque[Tuple[str, str]] = deque()
        for var_name in self.graph.variables:
            for neighbor in self.graph.get_neighbors(var_name):
                queue.append((var_name, neighbor))

        while queue:
            xi, xj = queue.popleft()
            if self._revise(xi, xj):
                var_xi = self.graph.variables[xi]

                if var_xi.is_empty():
                    self.report.add_conflict(
                        constraint_id="ac3_empty_domain",
                        constraint_name="arc_consistency",
                        variables=[xi, xj],
                        message=f"Variable '{xi}' has empty domain after "
                                f"arc consistency with '{xj}'",
                    )
                    return False

                # Add all arcs (xk, xi) where xk != xj
                for xk in self.graph.get_neighbors(xi):
                    if xk != xj:
                        queue.append((xk, xi))

        return True

    def _revise(self, xi: str, xj: str) -> bool:
        """
        Revise the domain of xi to be arc-consistent with xj.
        Remove values from xi's domain that have no consistent
        support in xj's domain.

        Returns True if xi's domain was reduced.
        """
        revised = False
        var_xi = self.graph.variables[xi]
        var_xj = self.graph.variables[xj]

        constraints = self.graph.get_binary_constraints(xi, xj)
        if not constraints:
            return False

        to_remove = []
        for vi in var_xi.domain:
            # Check if there exists any value in xj that satisfies
            # all constraints between xi and xj
            has_support = False
            for vj in var_xj.domain:
                assignment = {xi: vi, xj: vj}
                if all(c.is_satisfied(assignment) for c in constraints):
                    has_support = True
                    break

            if not has_support:
                to_remove.append(vi)

        for vi in to_remove:
            var_xi.prune(vi)
            self.report.add_pruned(xi, vi)
            revised = True

        return revised

    def _has_empty_domains(self) -> bool:
        """Check if any variable has an empty domain."""
        for var in self.graph.variables.values():
            if var.is_empty():
                return True
        return False

    def _compute_feasibility_score(self) -> float:
        """
        Compute a feasibility score based on domain reduction.
        Score of 1.0 means no constraints were violated.
        Score approaches 0.0 as domains shrink.
        """
        if not self.graph.variables:
            return 1.0

        total_ratio = 0.0
        for var in self.graph.variables.values():
            original_size = len(var.original_domain)
            current_size = var.domain_size
            if original_size > 0:
                total_ratio += current_size / original_size
            else:
                total_ratio += 1.0

        return total_ratio / len(self.graph.variables)
```

---

## Backtracking Search

When constraint propagation alone cannot find a complete assignment, backtracking search is used to systematically explore the remaining search space.

### Backtracking with Forward Checking

```
Backtracking Algorithm
├── Select unassigned variable (MRV heuristic)
│   └── Choose the variable with the smallest remaining domain
│
├── Order domain values (LCV heuristic)
│   └── Try the value that eliminates the fewest options for neighbors
│
├── Assign value
│   └── Check consistency with all constraints
│       ├── Consistent → Recurse on next variable
│       └── Inconsistent → Try next value
│
└── No values left
    └── Backtrack to previous variable
```

### Python Implementation: Backtracking Solver

```python
class BacktrackingSolver:
    """
    CSP solver using backtracking with forward checking,
    MRV (Minimum Remaining Values) variable ordering,
    and LCV (Least Constraining Value) value ordering.
    """

    def __init__(self, graph: ConstraintGraph):
        self.graph = graph
        self.solution: Optional[Dict[str, Any]] = None
        self.nodes_explored = 0
        self.max_nodes = 10000  # Safety limit for agent planning

    def solve(self) -> Optional[Dict[str, Any]]:
        """
        Find a consistent assignment for all variables.
        Returns None if no solution exists.
        """
        # First, run constraint propagation
        propagator = ConstraintPropagator(self.graph)
        report = propagator.propagate()

        if not report.feasible:
            return None

        # Initialize assignment
        assignment: Dict[str, Any] = {}
        self.nodes_explored = 0

        if self._backtrack(assignment):
            self.solution = assignment
            return assignment
        return None

    def _backtrack(self, assignment: Dict[str, Any]) -> bool:
        """Recursive backtracking with forward checking."""
        if len(assignment) == len(self.graph.variables):
            return True  # All variables assigned

        self.nodes_explored += 1
        if self.nodes_explored > self.max_nodes:
            return False  # Safety limit exceeded

        # Select unassigned variable using MRV heuristic
        var_name = self._select_variable(assignment)
        if var_name is None:
            return False

        variable = self.graph.variables[var_name]

        # Order values using LCV heuristic
        ordered_values = self._order_values(var_name, assignment)

        for value in ordered_values:
            assignment[var_name] = value

            if self._is_consistent(var_name, assignment):
                # Forward checking: save domain states
                saved_domains = self._save_domains()

                # Propagate constraints forward
                if self._forward_check(var_name, value, assignment):
                    if self._backtrack(assignment):
                        return True

                # Restore domains on backtrack
                self._restore_domains(saved_domains)

            del assignment[var_name]

        return False

    def _select_variable(self, assignment: Dict[str, Any]) -> Optional[str]:
        """
        Select the next variable to assign using the Minimum
        Remaining Values (MRV) heuristic. Ties are broken by
        the degree heuristic (most constraints).
        """
        unassigned = [
            name for name in self.graph.variables
            if name not in assignment
        ]
        if not unassigned:
            return None

        return min(
            unassigned,
            key=lambda v: (
                self.graph.variables[v].domain_size,
                -len(self.graph.get_constraints_for(v)),
            ),
        )

    def _order_values(self, var_name: str,
                      assignment: Dict[str, Any]) -> List[Any]:
        """
        Order domain values using the Least Constraining Value
        (LCV) heuristic. Prefer values that rule out the fewest
        choices for neighboring variables.
        """
        variable = self.graph.variables[var_name]

        def count_eliminated(value: Any) -> int:
            count = 0
            for neighbor_name in self.graph.get_neighbors(var_name):
                if neighbor_name in assignment:
                    continue
                neighbor = self.graph.variables[neighbor_name]
                constraints = self.graph.get_binary_constraints(var_name, neighbor_name)
                for nval in neighbor.domain:
                    test_assignment = {var_name: value, neighbor_name: nval}
                    if not all(c.is_satisfied(test_assignment) for c in constraints):
                        count += 1
            return count

        return sorted(variable.domain, key=count_eliminated)

    def _is_consistent(self, var_name: str,
                       assignment: Dict[str, Any]) -> bool:
        """Check if the current assignment is consistent with all constraints."""
        for constraint in self.graph.get_constraints_for(var_name):
            if not constraint.is_satisfied(assignment):
                return False
        return True

    def _forward_check(self, var_name: str, value: Any,
                       assignment: Dict[str, Any]) -> bool:
        """
        Forward checking: prune domains of unassigned neighbors
        based on the current assignment. Returns False if any
        domain becomes empty.
        """
        for neighbor_name in self.graph.get_neighbors(var_name):
            if neighbor_name in assignment:
                continue

            neighbor = self.graph.variables[neighbor_name]
            constraints = self.graph.get_binary_constraints(var_name, neighbor_name)

            to_remove = []
            for nval in neighbor.domain:
                test_assignment = {**assignment, neighbor_name: nval}
                if not all(c.is_satisfied(test_assignment) for c in constraints):
                    to_remove.append(nval)

            for nval in to_remove:
                neighbor.prune(nval)

            if neighbor.is_empty():
                return False

        return True

    def _save_domains(self) -> Dict[str, List[Any]]:
        """Save current domain state for backtracking."""
        return {
            name: list(var.domain)
            for name, var in self.graph.variables.items()
        }

    def _restore_domains(self, saved: Dict[str, List[Any]]) -> None:
        """Restore domain state after backtracking."""
        for name, domain in saved.items():
            self.graph.variables[name].domain = domain
```

---

## Forward and Backward Propagation

### Forward Propagation

Forward propagation pushes constraints from root goals DOWN through the plan tree. As a goal is decomposed into sub-goals, the parent's constraints are inherited and refined by each child.

```
Forward Propagation (Top-Down)

[Root Goal: "Refactor auth module"]
    │
    │  Constraint: token_budget ≤ 8000
    │  Constraint: no_breaking_changes
    │
    ├──► [Sub-Goal 1: Read files]
    │    │  Inherited: token_budget ≤ 8000
    │    │  Refined: read_tokens ≤ 2000
    │    │  Inherited: no_breaking_changes
    │
    ├──► [Sub-Goal 2: Modify auth.py]
    │    │  Inherited: token_budget ≤ 8000
    │    │  Refined: modify_tokens ≤ 3000
    │    │  Inherited: no_breaking_changes
    │    │  Added: preserve_api_signature
    │
    └──► [Sub-Goal 3: Update tests]
         │  Inherited: token_budget ≤ 8000
         │  Refined: test_tokens ≤ 3000
         │  Inherited: no_breaking_changes
```

### Backward Propagation

Backward propagation pushes computed values from leaf tasks UP through the tree, aggregating costs and checking cumulative constraints.

```
Backward Propagation (Bottom-Up)

[Sub-Goal 1: Read files]
    │  Computed: actual_tokens = 800
    │  Status: within budget ✓
    │
[Sub-Goal 2: Modify auth.py]
    │  Computed: actual_tokens = 2500
    │  Status: within budget ✓
    │
[Sub-Goal 3: Update tests]
    │  Computed: actual_tokens = 2200
    │  Status: within budget ✓
    │
    └──► [Root Goal]
         │  Aggregated: total_tokens = 800 + 2500 + 2200 = 5500
         │  Check: 5500 ≤ 8000 ✓
         │  Feasibility: PASS
```

### Python Implementation: Bidirectional Propagator

```python
@dataclass
class PlanNode:
    """A node in the plan tree with associated constraints."""
    node_id: str
    name: str
    parent_id: Optional[str] = None
    children: List[str] = field(default_factory=list)
    constraints: Dict[str, Any] = field(default_factory=dict)
    computed_values: Dict[str, Any] = field(default_factory=dict)
    is_leaf: bool = False


class BidirectionalPropagator:
    """
    Propagates constraints forward (top-down) and backward (bottom-up)
    through a plan tree.
    """

    def __init__(self):
        self.nodes: Dict[str, PlanNode] = {}

    def add_node(self, node: PlanNode) -> None:
        self.nodes[node.node_id] = node

    def propagate_forward(self, root_id: str) -> None:
        """
        Forward propagation: push constraints from root down to leaves.
        Children inherit parent constraints and may add refinements.
        """
        queue = deque([root_id])

        while queue:
            node_id = queue.popleft()
            node = self.nodes[node_id]

            for child_id in node.children:
                child = self.nodes.get(child_id)
                if not child:
                    continue

                # Inherit parent constraints
                for key, value in node.constraints.items():
                    if key not in child.constraints:
                        child.constraints[key] = value

                # Refine budget constraints: distribute evenly if not set
                if "token_budget" in node.constraints and "token_budget" not in child.constraints:
                    num_children = len(node.children)
                    if num_children > 0:
                        child.constraints["token_budget"] = (
                            node.constraints["token_budget"] // num_children
                        )

                queue.append(child_id)

    def propagate_backward(self, root_id: str) -> Dict[str, Any]:
        """
        Backward propagation: aggregate computed values from leaves to root.
        Returns the aggregated values at the root.
        """
        def _propagate_up(node_id: str) -> Dict[str, float]:
            node = self.nodes[node_id]

            if node.is_leaf:
                return dict(node.computed_values)

            aggregated = {}
            for child_id in node.children:
                child_values = _propagate_up(child_id)
                for key, value in child_values.items():
                    if isinstance(value, (int, float)):
                        aggregated[key] = aggregated.get(key, 0) + value

            node.computed_values = aggregated
            return aggregated

        return _propagate_up(root_id)

    def check_feasibility(self, root_id: str) -> ConflictReport:
        """
        After bidirectional propagation, check if all constraints
        are satisfied by the computed values.
        """
        report = ConflictReport()

        for node_id, node in self.nodes.items():
            for constraint_key, limit in node.constraints.items():
                actual = node.computed_values.get(constraint_key)
                if actual is not None and isinstance(limit, (int, float)):
                    if actual > limit:
                        report.add_conflict(
                            constraint_id=f"budget_{node_id}_{constraint_key}",
                            constraint_name=f"{constraint_key}_overflow",
                            variables=[node_id],
                            message=(
                                f"Node '{node.name}': {constraint_key} "
                                f"({actual}) exceeds limit ({limit})"
                            ),
                        )

        if not report.conflicts:
            report.feasibility_score = 1.0

        return report
```

---

## Agent Plan Constraint Builder

A convenience class that constructs CSPs from agent execution plans.

```python
class AgentPlanConstraintBuilder:
    """
    Builds a constraint graph from an agent execution plan.
    Translates plan-level constraints (token budgets, ordering,
    tool availability) into formal CSP variables and constraints.
    """

    def __init__(self):
        self.graph = ConstraintGraph()

    def build_from_plan(self, plan: Dict[str, Any]) -> ConstraintGraph:
        """
        Build a constraint graph from a plan specification.

        Expected plan format:
        {
            "tasks": [{"id": "t1", "tool": "read_file", "estimated_tokens": 500}, ...],
            "dependencies": {"t2": ["t1"], "t3": ["t1", "t2"]},
            "constraints": {
                "token_budget": 8000,
                "max_api_calls": 10,
                "allowed_tools": ["read_file", "write_file", "search"]
            }
        }
        """
        tasks = plan.get("tasks", [])
        dependencies = plan.get("dependencies", {})
        constraints = plan.get("constraints", {})

        # Add task variables
        for task in tasks:
            task_id = task["id"]

            # Tool assignment variable
            allowed_tools = constraints.get("allowed_tools", [task.get("tool", "any")])
            self.graph.add_variable(f"{task_id}_tool", allowed_tools)

            # Token allocation variable
            est_tokens = task.get("estimated_tokens", 500)
            token_range = list(range(
                max(100, est_tokens - 200),
                est_tokens + 201,
                100,
            ))
            self.graph.add_variable(f"{task_id}_tokens", token_range)

            # Execution order variable
            self.graph.add_variable(f"{task_id}_order", list(range(len(tasks))))

        # Add tool constraints (unary)
        for task in tasks:
            task_id = task["id"]
            required_tool = task.get("tool")
            if required_tool:
                self.graph.add_constraint(Constraint(
                    constraint_id=f"tool_{task_id}",
                    name=f"{task_id}_requires_{required_tool}",
                    constraint_type=ConstraintType.RESOURCE,
                    hardness=ConstraintHardness.HARD,
                    variables=[f"{task_id}_tool"],
                    check_fn=lambda t, req=required_tool: t == req,
                    description=f"Task {task_id} requires tool {required_tool}",
                ))

        # Add dependency constraints (binary - ordering)
        for task_id, deps in dependencies.items():
            for dep_id in deps:
                self.graph.add_constraint(Constraint(
                    constraint_id=f"dep_{dep_id}_before_{task_id}",
                    name=f"{dep_id}_before_{task_id}",
                    constraint_type=ConstraintType.DEPENDENCY,
                    hardness=ConstraintHardness.HARD,
                    variables=[f"{dep_id}_order", f"{task_id}_order"],
                    check_fn=lambda a, b: a < b,
                    description=f"Task {dep_id} must execute before {task_id}",
                ))

        # Add ordering uniqueness constraints (binary)
        task_ids = [t["id"] for t in tasks]
        for i in range(len(task_ids)):
            for j in range(i + 1, len(task_ids)):
                ti, tj = task_ids[i], task_ids[j]
                self.graph.add_constraint(Constraint(
                    constraint_id=f"unique_order_{ti}_{tj}",
                    name=f"unique_order_{ti}_{tj}",
                    constraint_type=ConstraintType.TIME,
                    hardness=ConstraintHardness.HARD,
                    variables=[f"{ti}_order", f"{tj}_order"],
                    check_fn=lambda a, b: a != b,
                    description=f"Tasks {ti} and {tj} must have different order",
                ))

        return self.graph

    def validate_plan(self, plan: Dict[str, Any]) -> ConflictReport:
        """Build constraint graph and run propagation."""
        graph = self.build_from_plan(plan)
        propagator = ConstraintPropagator(graph)
        return propagator.propagate()
```

---

## Constraint Conflict Resolution Strategies

| Strategy | When to Apply | Description |
| :--- | :--- | :--- |
| **Relaxation** | Soft constraint conflicts | Downgrade the constraint priority or widen acceptable ranges |
| **Redistribution** | Resource budget overflows | Redistribute budget from under-utilizing tasks to over-utilizing ones |
| **Task Splitting** | Single task exceeds limits | Split a large task into smaller sub-tasks that individually fit constraints |
| **Reordering** | Dependency conflicts from ordering | Find an alternative valid topological ordering |
| **Escalation** | Hard constraint conflicts | Report conflict to user for manual resolution or constraint modification |
| **Constraint Removal** | Contradictory constraints | Identify and remove the lowest-priority conflicting constraint |

---

## Performance Characteristics

| Algorithm | Time Complexity | Space Complexity | Best For |
| :--- | :--- | :--- | :--- |
| **Node Consistency** | $O(n \cdot d)$ | $O(n \cdot d)$ | Unary constraint pruning |
| **AC-3** | $O(e \cdot d^3)$ | $O(e)$ | Binary constraint networks |
| **Forward Checking** | $O(n \cdot d^n)$ worst | $O(n \cdot d)$ | Moderate-size CSPs |
| **Backtracking + MRV** | $O(d^n)$ worst | $O(n \cdot d)$ | Small to medium CSPs |

Where $n$ = number of variables, $d$ = max domain size, $e$ = number of constraint edges.

---

## Handoff & Related References
- Goal Decomposition: [goal-decomposition-trees.md](goal-decomposition-trees.md)
- Anticipatory Error Prevention: [anticipatory-error-prevention.md](anticipatory-error-prevention.md)
- Pre-Flight Validation: [preflight-validation.md](preflight-validation.md)
- OODA Loop Patterns: [ooda-loop-patterns.md](ooda-loop-patterns.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive constraint propagation details preserved)
Strict compliance with CSP formulation, AC-3 algorithm, backtracking search, and bidirectional propagation protocols.
-->
