# Roadmapping Dependency & Risk Management

## Overview

Complex software products depend on structural network topologies. A delay in a core infrastructure service can trigger cascading delays across application layers, SDKs, and consumer-facing features. This document details the mathematical framework for modeling roadmaps as Directed Acyclic Graphs (DAGs), running topological sort algorithms to calculate execution paths, executing critical path method (CPM) analyses, and applying risk buffer calculation formulas.

## 1. Roadmap Dependency Modeling (DAG)

In an outcome-based roadmap, every initiative or Epic can be represented as a node in a graph, with directed edges indicating prerequisite relationships.

```
                  ┌────────────────────────┐
                  │ [Core Auth Service]    │ (Epic A)
                  └───────────┬────────────┘
                              │
                    Depends   │   Depends
                              ▼
        ┌─────────────────────┴──┐        ┌────────────────────────┐
        │  [API Gateway OAuth]   │        │   [Billing Engine]     │ (Epic C)
        │  (Epic B)              │        └───────────┬────────────┘
        └─────────────┬──────────┘                    │
                      │                               │ Depends
            Depends   │   ┌───────────────────────────┘
                      ▼   ▼
        ┌─────────────────────┴──┐
        │   [Developer Portal]   │ (Epic D)
        └────────────────────────┘
```

A valid roadmap schedule must ensure that `Epic A` is scheduled before `Epic B`, and both `Epic B` and `Epic C` are scheduled before `Epic D`. If circular dependencies exist (e.g., Epic D depends on Epic A, which depends on Epic D), the schedule is mathematically invalid and execution will block indefinitely.

## 2. Topological Sort for Roadmap Epics

To compute a valid linear schedule from a complex dependency graph, we utilize Kahn's Algorithm for topological sorting. This algorithm also detects circular dependencies, allowing product managers to identify blocking loops during the roadmapping phase.

### Python Implementation of Kahn's Algorithm

```python
import logging
from collections import deque, defaultdict
from typing import Dict, List, Set, Tuple

logger = logging.getLogger("DependencyAnalyzer")

class DependencyGraph:
    def __init__(self):
        self.adj_list: Dict[str, Set[str]] = defaultdict(set)
        self.in_degree: Dict[str, int] = defaultdict(int)
        self.nodes: Set[str] = set()

    def add_dependency(self, parent: str, child: str):
        """Adds a dependency indicating child depends on parent (Parent -> Child)."""
        self.nodes.add(parent)
        self.nodes.add(child)
        
        if child not in self.adj_list[parent]:
            self.adj_list[parent].add(child)
            self.in_degree[child] += 1
            if parent not in self.in_degree:
                self.in_degree[parent] = 0

    def compute_schedule_order(self) -> Tuple[List[str], bool]:
        """
        Computes a valid execution sequence.
        Returns:
            Tuple[List[str], bool]: (Ordered list of items, True if successful, False if loop detected)
        """
        in_deg = self.in_degree.copy()
        # Initialize queue with nodes having 0 in-degree
        queue = deque([n for n in self.nodes if in_deg[n] == 0])
        ordered_schedule = []

        while queue:
            node = queue.popleft()
            ordered_schedule.append(node)

            for neighbor in self.adj_list[node]:
                in_deg[neighbor] -= 1
                if in_deg[neighbor] == 0:
                    queue.append(neighbor)

        has_cycle = len(ordered_schedule) != len(self.nodes)
        if has_cycle:
            logger.error("Circular dependency detected! No valid roadmap execution order exists.")
            return [], False
            
        return ordered_schedule, True
```

## 3. Risk Score Matrix

To prioritize buffer allocation, each roadmap initiative is evaluated across Likelihood and Impact dimensions to calculate a risk score.

$$\text{Risk Score} = \text{Likelihood} \times \text{Impact}$$

### Risk Classification Matrix

| Likelihood | Impact: Low (1) | Impact: Medium (2) | Impact: High (3) | Impact: Critical (4) |
|---|---|---|---|---|
| **Rare (1)** | 1 (Low) | 2 (Low) | 3 (Medium) | 4 (Medium) |
| **Unlikely (2)** | 2 (Low) | 4 (Medium) | 6 (Medium) | 8 (High) |
| **Possible (3)** | 3 (Medium) | 6 (Medium) | 9 (High) | 12 (Critical) |
| **Likely (4)** | 4 (Medium) | 8 (High) | 12 (Critical) | 16 (Critical) |

*   **Low (1–2)**: Acceptable risk. No buffer required.
*   **Medium (3–6)**: Standard buffer allocation.
*   **High (8–9)**: Extended buffer allocation, weekly reviews.
*   **Critical (12–16)**: Requires architectural de-risking, immediate spikes, or dual-track execution.

## 4. Capacity & Buffer Calculation Formulas

To compute realistic schedules, we must factor in historical velocity variations using a statistical buffer formula instead of simple linear estimation.

### Estimation Metrics

*   **Base Estimate ($E_{\text{base}}$)**: Ideal duration (person-weeks) under normal conditions.
*   **Worst-Case Estimate ($E_{\text{worst}}$)**: Duration assuming known-unknown risks materialize.
*   **Confidence ($C$)**: Estimation confidence percentage expressed from $0.0$ to $1.0$.

### Statistical Duration Formula

$$D_{\text{scheduled}} = E_{\text{base}} + \left( (E_{\text{worst}} - E_{\text{base}}) \times (1 - C) \right)$$

### Python Buffer Allocator Implementation

```python
class RoadmapRiskModel:
    @staticmethod
    def calculate_scheduled_duration(
        base_weeks: float,
        worst_weeks: float,
        confidence: float,
        team_velocity_multiplier: float = 1.0
    ) -> float:
        """
        Calculates de-risked initiative duration based on estimation uncertainty.
        """
        assert 0.0 <= confidence <= 1.0, "Confidence must be a value between 0.0 and 1.0"
        
        # Calculate raw buffer based on confidence delta
        raw_buffer = (worst_weeks - base_weeks) * (1.0 - confidence)
        scheduled = base_weeks + raw_buffer
        
        # Adjust based on team velocity factors (e.g. holiday seasonality, onboarding overhead)
        final_duration = scheduled / team_velocity_multiplier
        return round(final_duration, 2)

    @staticmethod
    def calculate_risk_score(likelihood: int, impact: int) -> int:
        """Calculates risk score (scale: 1 to 16)."""
        if not (1 <= likelihood <= 4) or not (1 <= impact <= 4):
            raise ValueError("Likelihood and Impact values must reside between 1 and 4 inclusive.")
        return likelihood * impact
```

## Key Points

- Represent roadmap schedules as Directed Acyclic Graphs (DAGs) to formalize dependencies.
- Use Kahn's Algorithm to verify scheduling feasibility and detect circular blocks.
- Perform critical path analysis to determine which epics govern the final delivery date.
- Apply statistically weighted buffer formulas ($E_{\text{base}}$ + worst-case risk scaling) to allocate buffers scientifically.
- Build risk mitigation registers directly into the roadmap tooling metrics.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with strategic roadmapping, dependency graphs, topological sorting algorithms, and risk formulas.
-->
