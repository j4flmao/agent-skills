# Reasoning Trace Visualization

## Overview

Reasoning trace visualization transforms opaque agent thought processes into interpretable,
navigable visual representations. This reference covers the complete stack for capturing,
structuring, and rendering agent reasoning paths—from raw LLM output parsing through
interactive trace tree UIs.

---

## 1. Trace Data Model

### 1.1 Core Schema

Every reasoning trace is modeled as a directed acyclic graph (DAG) of `TraceNode` objects.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ReasoningTraceNode",
  "type": "object",
  "required": ["node_id", "type", "timestamp", "content"],
  "properties": {
    "node_id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier for this trace node"
    },
    "parent_id": {
      "type": ["string", "null"],
      "description": "Parent node ID, null for root nodes"
    },
    "type": {
      "type": "string",
      "enum": [
        "thought",
        "observation",
        "action",
        "tool_call",
        "tool_result",
        "decision_point",
        "branch",
        "conclusion",
        "error",
        "retry"
      ]
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "duration_ms": {
      "type": "number",
      "minimum": 0
    },
    "content": {
      "type": "object",
      "properties": {
        "text": { "type": "string" },
        "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
        "tokens_used": { "type": "integer" },
        "model": { "type": "string" },
        "metadata": { "type": "object" }
      }
    },
    "children": {
      "type": "array",
      "items": { "$ref": "#" }
    },
    "annotations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "label": { "type": "string" },
          "severity": { "type": "string", "enum": ["info", "warning", "error", "critical"] },
          "message": { "type": "string" }
        }
      }
    }
  }
}
```

### 1.2 Trace Envelope

The top-level container wrapping a complete reasoning trace:

```json
{
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "agent_id": "research-agent-v2",
  "session_id": "sess_abc123",
  "started_at": "2026-06-04T10:00:00Z",
  "completed_at": "2026-06-04T10:00:12Z",
  "total_duration_ms": 12340,
  "total_tokens": 4521,
  "total_cost_usd": 0.0089,
  "status": "completed",
  "root_nodes": [],
  "summary": {
    "total_steps": 14,
    "decision_points": 3,
    "tool_calls": 5,
    "branches_explored": 2,
    "branches_pruned": 1,
    "retries": 0,
    "errors": 0
  }
}
```

---

## 2. Trace Tree Rendering

### 2.1 Python Trace Tree Builder

```python
"""
trace_tree.py — Build and render reasoning trace trees.
"""
from __future__ import annotations

import uuid
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Any
from datetime import datetime, timezone


class NodeType(Enum):
    THOUGHT = "thought"
    OBSERVATION = "observation"
    ACTION = "action"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    DECISION_POINT = "decision_point"
    BRANCH = "branch"
    CONCLUSION = "conclusion"
    ERROR = "error"
    RETRY = "retry"


@dataclass
class TraceNode:
    """Single node in a reasoning trace tree."""
    node_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    node_type: NodeType = NodeType.THOUGHT
    content: str = ""
    confidence: float = 1.0
    tokens_used: int = 0
    model: str = ""
    parent_id: Optional[str] = None
    children: list[TraceNode] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    duration_ms: float = 0.0
    annotations: list[dict] = field(default_factory=list)

    def add_child(self, child: TraceNode) -> TraceNode:
        child.parent_id = self.node_id
        self.children.append(child)
        return child

    def annotate(self, label: str, message: str, severity: str = "info") -> None:
        self.annotations.append({
            "label": label,
            "message": message,
            "severity": severity,
        })

    def depth(self) -> int:
        if not self.children:
            return 0
        return 1 + max(c.depth() for c in self.children)

    def total_nodes(self) -> int:
        return 1 + sum(c.total_nodes() for c in self.children)

    def total_tokens(self) -> int:
        return self.tokens_used + sum(c.total_tokens() for c in self.children)


class TraceTreeBuilder:
    """Constructs reasoning trace trees from agent execution events."""

    def __init__(self, agent_id: str, session_id: str):
        self.trace_id = str(uuid.uuid4())
        self.agent_id = agent_id
        self.session_id = session_id
        self.root_nodes: list[TraceNode] = []
        self._node_index: dict[str, TraceNode] = {}
        self._started_at = datetime.now(timezone.utc)
        self._active_node: Optional[TraceNode] = None

    def begin_node(
        self,
        node_type: NodeType,
        content: str,
        parent_id: Optional[str] = None,
        **kwargs,
    ) -> TraceNode:
        node = TraceNode(
            node_type=node_type,
            content=content,
            parent_id=parent_id,
            **kwargs,
        )
        self._node_index[node.node_id] = node

        if parent_id and parent_id in self._node_index:
            self._node_index[parent_id].add_child(node)
        elif parent_id is None:
            self.root_nodes.append(node)

        self._active_node = node
        return node

    def end_node(self, node_id: str, duration_ms: float, tokens_used: int = 0) -> None:
        if node_id in self._node_index:
            node = self._node_index[node_id]
            node.duration_ms = duration_ms
            node.tokens_used = tokens_used

    def create_decision_point(
        self,
        question: str,
        options: list[str],
        parent_id: Optional[str] = None,
    ) -> tuple[TraceNode, list[TraceNode]]:
        dp = self.begin_node(
            NodeType.DECISION_POINT,
            content=question,
            parent_id=parent_id,
            metadata={"options": options},
        )
        branches = []
        for opt in options:
            branch = self.begin_node(
                NodeType.BRANCH,
                content=opt,
                parent_id=dp.node_id,
            )
            branches.append(branch)
        return dp, branches

    def get_node(self, node_id: str) -> Optional[TraceNode]:
        return self._node_index.get(node_id)

    def to_dict(self) -> dict:
        completed_at = datetime.now(timezone.utc)
        total_ms = (completed_at - self._started_at).total_seconds() * 1000
        return {
            "trace_id": self.trace_id,
            "agent_id": self.agent_id,
            "session_id": self.session_id,
            "started_at": self._started_at.isoformat(),
            "completed_at": completed_at.isoformat(),
            "total_duration_ms": total_ms,
            "total_tokens": sum(r.total_tokens() for r in self.root_nodes),
            "root_nodes": [self._node_to_dict(n) for n in self.root_nodes],
            "summary": {
                "total_steps": len(self._node_index),
                "decision_points": sum(
                    1 for n in self._node_index.values()
                    if n.node_type == NodeType.DECISION_POINT
                ),
                "tool_calls": sum(
                    1 for n in self._node_index.values()
                    if n.node_type == NodeType.TOOL_CALL
                ),
            },
        }

    def _node_to_dict(self, node: TraceNode) -> dict:
        return {
            "node_id": node.node_id,
            "type": node.node_type.value,
            "content": node.content,
            "confidence": node.confidence,
            "tokens_used": node.tokens_used,
            "duration_ms": node.duration_ms,
            "timestamp": node.timestamp.isoformat(),
            "metadata": node.metadata,
            "annotations": node.annotations,
            "children": [self._node_to_dict(c) for c in node.children],
        }
```

### 2.2 ASCII Trace Tree Renderer

```python
"""
ascii_renderer.py — Render trace trees as ASCII art for terminal output.
"""
from trace_tree import TraceNode, NodeType


# Node type symbols for visual distinction
NODE_SYMBOLS = {
    NodeType.THOUGHT:        "💭",
    NodeType.OBSERVATION:    "👁 ",
    NodeType.ACTION:         "⚡",
    NodeType.TOOL_CALL:      "🔧",
    NodeType.TOOL_RESULT:    "📋",
    NodeType.DECISION_POINT: "🔀",
    NodeType.BRANCH:         "🌿",
    NodeType.CONCLUSION:     "✅",
    NodeType.ERROR:          "❌",
    NodeType.RETRY:          "🔄",
}

SEVERITY_MARKERS = {
    "info":     "[i]",
    "warning":  "[!]",
    "error":    "[E]",
    "critical": "[X]",
}


def render_trace_tree(
    nodes: list[TraceNode],
    indent: int = 0,
    is_last: bool = True,
    prefix: str = "",
) -> str:
    """Render a list of trace nodes as an indented ASCII tree."""
    output_lines: list[str] = []

    for i, node in enumerate(nodes):
        is_last_child = (i == len(nodes) - 1)
        connector = "└── " if is_last_child else "├── "
        child_prefix = prefix + ("    " if is_last_child else "│   ")

        symbol = NODE_SYMBOLS.get(node.node_type, "•")
        truncated = _truncate(node.content, 60)
        timing = f" ({node.duration_ms:.0f}ms)" if node.duration_ms > 0 else ""
        tokens = f" [{node.tokens_used}tok]" if node.tokens_used > 0 else ""
        conf = f" conf={node.confidence:.2f}" if node.confidence < 1.0 else ""

        line = f"{prefix}{connector}{symbol} {node.node_type.value}: {truncated}{timing}{tokens}{conf}"
        output_lines.append(line)

        # Render annotations
        for ann in node.annotations:
            marker = SEVERITY_MARKERS.get(ann.get("severity", "info"), "[?]")
            ann_line = f"{child_prefix}  {marker} {ann['label']}: {ann['message']}"
            output_lines.append(ann_line)

        # Recurse into children
        if node.children:
            child_output = render_trace_tree(
                node.children,
                indent=indent + 1,
                prefix=child_prefix,
            )
            output_lines.append(child_output)

    return "\n".join(output_lines)


def render_trace_summary(trace_data: dict) -> str:
    """Render a one-line summary bar for a trace."""
    s = trace_data.get("summary", {})
    return (
        f"Trace {trace_data['trace_id'][:8]}... | "
        f"Steps: {s.get('total_steps', '?')} | "
        f"Decisions: {s.get('decision_points', '?')} | "
        f"Tools: {s.get('tool_calls', '?')} | "
        f"Duration: {trace_data.get('total_duration_ms', 0):.0f}ms | "
        f"Tokens: {trace_data.get('total_tokens', 0)}"
    )


def _truncate(text: str, max_len: int) -> str:
    text = text.replace("\n", " ").strip()
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."
```

---

## 3. Step-by-Step Thought Visualization

### 3.1 TypeScript Trace Viewer Component

```typescript
/**
 * trace-viewer.ts — Interactive trace step viewer.
 */

interface TraceStep {
  stepId: string;
  type: "thought" | "action" | "tool_call" | "tool_result" | "observation" | "conclusion";
  content: string;
  timestamp: string;
  durationMs: number;
  tokensUsed: number;
  model?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
  children?: TraceStep[];
}

interface TraceTimeline {
  traceId: string;
  agentId: string;
  steps: TraceStep[];
  totalDurationMs: number;
  totalTokens: number;
}

class TraceStepRenderer {
  private colorMap: Record<string, string> = {
    thought: "#6366f1",
    action: "#f59e0b",
    tool_call: "#10b981",
    tool_result: "#3b82f6",
    observation: "#8b5cf6",
    conclusion: "#06b6d4",
  };

  renderTimeline(timeline: TraceTimeline): string {
    const headerBar = this.renderHeader(timeline);
    const stepBlocks = timeline.steps.map((step, idx) =>
      this.renderStep(step, idx, timeline.totalDurationMs)
    );
    return [headerBar, ...stepBlocks].join("\n");
  }

  private renderHeader(timeline: TraceTimeline): string {
    return [
      `┌─────────────────────────────────────────────────────┐`,
      `│ Trace: ${timeline.traceId.slice(0, 8)}              │`,
      `│ Agent: ${timeline.agentId.padEnd(20)}               │`,
      `│ Duration: ${timeline.totalDurationMs}ms              │`,
      `│ Tokens: ${timeline.totalTokens}                      │`,
      `└─────────────────────────────────────────────────────┘`,
    ].join("\n");
  }

  private renderStep(step: TraceStep, index: number, totalMs: number): string {
    const pct = ((step.durationMs / totalMs) * 100).toFixed(1);
    const bar = "█".repeat(Math.max(1, Math.round(step.durationMs / totalMs * 40)));
    const conf = step.confidence !== undefined ? ` (conf: ${step.confidence.toFixed(2)})` : "";
    return [
      `  Step ${index + 1}: [${step.type}]`,
      `    ${step.content.slice(0, 80)}${step.content.length > 80 ? "..." : ""}`,
      `    ⏱ ${step.durationMs}ms (${pct}%) ${bar}`,
      `    📊 ${step.tokensUsed} tokens${conf}`,
    ].join("\n");
  }

  computeStepMetrics(steps: TraceStep[]): StepMetrics {
    const byType: Record<string, { count: number; totalMs: number; totalTokens: number }> = {};

    for (const step of steps) {
      if (!byType[step.type]) {
        byType[step.type] = { count: 0, totalMs: 0, totalTokens: 0 };
      }
      byType[step.type].count++;
      byType[step.type].totalMs += step.durationMs;
      byType[step.type].totalTokens += step.tokensUsed;
    }

    return {
      totalSteps: steps.length,
      byType,
      avgDurationMs: steps.reduce((s, st) => s + st.durationMs, 0) / steps.length,
      avgTokens: steps.reduce((s, st) => s + st.tokensUsed, 0) / steps.length,
    };
  }
}

interface StepMetrics {
  totalSteps: number;
  byType: Record<string, { count: number; totalMs: number; totalTokens: number }>;
  avgDurationMs: number;
  avgTokens: number;
}
```

---

## 4. Decision Point Highlighting

### 4.1 Decision Point Analyzer

```python
"""
decision_analyzer.py — Identify and highlight critical decision points in traces.
"""
from dataclasses import dataclass
from typing import Optional
from trace_tree import TraceNode, NodeType


@dataclass
class DecisionAnalysis:
    """Analysis of a single decision point."""
    node_id: str
    question: str
    options_considered: list[str]
    selected_option: str
    selection_confidence: float
    alternatives_explored: int
    alternatives_pruned: int
    reasoning_depth: int
    total_tokens_spent: int
    time_spent_ms: float
    impact_score: float  # 0-1 how much this decision affected the outcome


class DecisionPointAnalyzer:
    """Analyze decision points in reasoning traces."""

    def __init__(self, confidence_threshold: float = 0.7):
        self.confidence_threshold = confidence_threshold

    def find_decision_points(self, root_nodes: list[TraceNode]) -> list[DecisionAnalysis]:
        """Walk the trace tree and extract all decision points."""
        decisions: list[DecisionAnalysis] = []
        for node in root_nodes:
            self._walk(node, decisions)
        return decisions

    def _walk(self, node: TraceNode, results: list[DecisionAnalysis]) -> None:
        if node.node_type == NodeType.DECISION_POINT:
            analysis = self._analyze_decision(node)
            results.append(analysis)
        for child in node.children:
            self._walk(child, results)

    def _analyze_decision(self, node: TraceNode) -> DecisionAnalysis:
        branches = [c for c in node.children if c.node_type == NodeType.BRANCH]
        explored = [b for b in branches if b.children]
        pruned = [b for b in branches if not b.children]

        selected = max(explored, key=lambda b: b.confidence, default=None)
        selected_option = selected.content if selected else "unknown"
        selected_conf = selected.confidence if selected else 0.0

        total_tokens = node.total_tokens()
        total_time = node.duration_ms + sum(b.duration_ms for b in branches)

        impact = self._compute_impact_score(node, branches)

        return DecisionAnalysis(
            node_id=node.node_id,
            question=node.content,
            options_considered=[b.content for b in branches],
            selected_option=selected_option,
            selection_confidence=selected_conf,
            alternatives_explored=len(explored),
            alternatives_pruned=len(pruned),
            reasoning_depth=node.depth(),
            total_tokens_spent=total_tokens,
            time_spent_ms=total_time,
            impact_score=impact,
        )

    def _compute_impact_score(
        self, decision_node: TraceNode, branches: list[TraceNode]
    ) -> float:
        """
        Estimate how impactful this decision was.
        Factors: number of downstream nodes, token expenditure, depth.
        """
        total_downstream = sum(b.total_nodes() for b in branches)
        depth = decision_node.depth()
        if total_downstream == 0:
            return 0.0
        raw = min(1.0, (total_downstream * 0.1) + (depth * 0.15))
        return round(raw, 3)

    def flag_low_confidence_decisions(
        self, decisions: list[DecisionAnalysis]
    ) -> list[DecisionAnalysis]:
        """Return decisions below the confidence threshold."""
        return [d for d in decisions if d.selection_confidence < self.confidence_threshold]

    def generate_decision_report(self, decisions: list[DecisionAnalysis]) -> str:
        """Generate a human-readable decision report."""
        lines = ["=" * 72, "DECISION POINT ANALYSIS REPORT", "=" * 72, ""]
        for i, d in enumerate(decisions, 1):
            flag = " ⚠️ LOW CONFIDENCE" if d.selection_confidence < self.confidence_threshold else ""
            lines.extend([
                f"Decision #{i}{flag}",
                f"  Question: {d.question}",
                f"  Options:  {', '.join(d.options_considered)}",
                f"  Selected: {d.selected_option} (confidence: {d.selection_confidence:.2f})",
                f"  Explored: {d.alternatives_explored} | Pruned: {d.alternatives_pruned}",
                f"  Depth: {d.reasoning_depth} | Tokens: {d.total_tokens_spent} | Time: {d.time_spent_ms:.0f}ms",
                f"  Impact Score: {d.impact_score:.3f}",
                "-" * 72,
            ])
        return "\n".join(lines)
```

---

## 5. Branching Path Display

### 5.1 Branch Visualization Architecture

```
┌──────────────────────────────────────────────────────┐
│                    ROOT THOUGHT                       │
│              "Analyze user request"                   │
└──────────────┬───────────────────────────────────────┘
               │
      ┌────────▼────────┐
      │  DECISION POINT  │
      │ "Choose strategy" │
      └──┬────┬────┬────┘
         │    │    │
    ┌────▼┐ ┌▼───┐ ┌▼────┐
    │ B1  │ │ B2 │ │ B3  │
    │Code │ │API │ │Cache│
    │Look │ │Call│ │Hit  │
    └──┬──┘ └─┬──┘ └──┬──┘
       │      │     [PRUNED]
    ┌──▼──┐ ┌─▼──┐
    │Tool │ │Tool│
    │grep │ │fetch│
    └──┬──┘ └─┬──┘
       │      │
    ┌──▼──────▼──┐
    │  MERGE      │
    │  Combine    │
    │  results    │
    └──────┬─────┘
           │
    ┌──────▼──────┐
    │ CONCLUSION   │
    │ Final answer │
    └─────────────┘
```

### 5.2 Branch Comparison Engine

```python
"""
branch_comparator.py — Compare and visualize alternative reasoning branches.
"""
from dataclasses import dataclass
from trace_tree import TraceNode, NodeType


@dataclass
class BranchComparison:
    """Side-by-side comparison of two reasoning branches."""
    branch_a_id: str
    branch_b_id: str
    branch_a_label: str
    branch_b_label: str
    depth_a: int
    depth_b: int
    tokens_a: int
    tokens_b: int
    duration_a_ms: float
    duration_b_ms: float
    nodes_a: int
    nodes_b: int
    tool_calls_a: int
    tool_calls_b: int
    outcome_a: str
    outcome_b: str
    winner: str  # "a", "b", or "tie"


class BranchComparator:
    """Compare alternative branches at decision points."""

    def compare_branches(self, branch_a: TraceNode, branch_b: TraceNode) -> BranchComparison:
        return BranchComparison(
            branch_a_id=branch_a.node_id,
            branch_b_id=branch_b.node_id,
            branch_a_label=branch_a.content,
            branch_b_label=branch_b.content,
            depth_a=branch_a.depth(),
            depth_b=branch_b.depth(),
            tokens_a=branch_a.total_tokens(),
            tokens_b=branch_b.total_tokens(),
            duration_a_ms=self._total_duration(branch_a),
            duration_b_ms=self._total_duration(branch_b),
            nodes_a=branch_a.total_nodes(),
            nodes_b=branch_b.total_nodes(),
            tool_calls_a=self._count_type(branch_a, NodeType.TOOL_CALL),
            tool_calls_b=self._count_type(branch_b, NodeType.TOOL_CALL),
            outcome_a=self._find_conclusion(branch_a),
            outcome_b=self._find_conclusion(branch_b),
            winner=self._determine_winner(branch_a, branch_b),
        )

    def _total_duration(self, node: TraceNode) -> float:
        return node.duration_ms + sum(self._total_duration(c) for c in node.children)

    def _count_type(self, node: TraceNode, target: NodeType) -> int:
        count = 1 if node.node_type == target else 0
        return count + sum(self._count_type(c, target) for c in node.children)

    def _find_conclusion(self, node: TraceNode) -> str:
        if node.node_type == NodeType.CONCLUSION:
            return node.content[:100]
        for child in node.children:
            result = self._find_conclusion(child)
            if result:
                return result
        return "no conclusion"

    def _determine_winner(self, a: TraceNode, b: TraceNode) -> str:
        score_a = a.confidence - (a.total_tokens() / 10000)
        score_b = b.confidence - (b.total_tokens() / 10000)
        if abs(score_a - score_b) < 0.01:
            return "tie"
        return "a" if score_a > score_b else "b"

    def render_comparison_table(self, comp: BranchComparison) -> str:
        """Render a side-by-side ASCII comparison table."""
        winner_marker = {"a": " ◀ WINNER", "b": " ◀ WINNER", "tie": ""}
        w_a = winner_marker["a"] if comp.winner == "a" else ""
        w_b = winner_marker["b"] if comp.winner == "b" else ""

        return f"""
╔══════════════════════╦══════════════════════╦══════════════════════╗
║ Metric               ║ Branch A{w_a:<13}║ Branch B{w_b:<13}║
╠══════════════════════╬══════════════════════╬══════════════════════╣
║ Label                ║ {comp.branch_a_label:<20} ║ {comp.branch_b_label:<20} ║
║ Depth                ║ {comp.depth_a:<20} ║ {comp.depth_b:<20} ║
║ Total Nodes          ║ {comp.nodes_a:<20} ║ {comp.nodes_b:<20} ║
║ Tokens Used          ║ {comp.tokens_a:<20} ║ {comp.tokens_b:<20} ║
║ Duration (ms)        ║ {comp.duration_a_ms:<20.0f} ║ {comp.duration_b_ms:<20.0f} ║
║ Tool Calls           ║ {comp.tool_calls_a:<20} ║ {comp.tool_calls_b:<20} ║
║ Outcome              ║ {comp.outcome_a[:20]:<20} ║ {comp.outcome_b[:20]:<20} ║
╚══════════════════════╩══════════════════════╩══════════════════════╝"""
```

---

## 6. Tool Call Sequence Diagrams

### 6.1 Sequence Diagram Generator

```python
"""
sequence_diagram.py — Generate tool call sequence diagrams from traces.
"""
from trace_tree import TraceNode, NodeType


class SequenceDiagramGenerator:
    """Generate ASCII sequence diagrams from tool call traces."""

    def __init__(self):
        self.participants: list[str] = ["Agent"]
        self._messages: list[dict] = []

    def extract_tool_calls(self, root_nodes: list[TraceNode]) -> None:
        """Walk the trace and extract tool call sequences."""
        for node in root_nodes:
            self._walk_for_tools(node)

    def _walk_for_tools(self, node: TraceNode) -> None:
        if node.node_type == NodeType.TOOL_CALL:
            tool_name = node.metadata.get("tool_name", "UnknownTool")
            if tool_name not in self.participants:
                self.participants.append(tool_name)
            self._messages.append({
                "from": "Agent",
                "to": tool_name,
                "label": node.content[:40],
                "duration_ms": node.duration_ms,
                "type": "request",
            })
        elif node.node_type == NodeType.TOOL_RESULT:
            tool_name = node.metadata.get("tool_name", "UnknownTool")
            self._messages.append({
                "from": tool_name,
                "to": "Agent",
                "label": node.content[:40],
                "duration_ms": node.duration_ms,
                "type": "response",
            })
        for child in node.children:
            self._walk_for_tools(child)

    def render(self) -> str:
        """Render the sequence diagram as ASCII."""
        col_width = 25
        cols = {p: i * col_width for i, p in enumerate(self.participants)}
        total_width = len(self.participants) * col_width

        lines: list[str] = []

        # Header
        header = ""
        for p in self.participants:
            header += p.center(col_width)
        lines.append(header)
        lines.append("─" * total_width)

        # Lifelines + messages
        for msg in self._messages:
            from_col = cols[msg["from"]] + col_width // 2
            to_col = cols[msg["to"]] + col_width // 2

            lifeline = list(" " * total_width)
            for p in self.participants:
                pos = cols[p] + col_width // 2
                lifeline[pos] = "│"

            arrow_start = min(from_col, to_col)
            arrow_end = max(from_col, to_col)
            direction = ">" if to_col > from_col else "<"

            for i in range(arrow_start + 1, arrow_end):
                lifeline[i] = "─"
            lifeline[arrow_end if direction == ">" else arrow_start] = direction

            label_pos = (from_col + to_col) // 2 - len(msg["label"]) // 2
            timing = f" [{msg['duration_ms']:.0f}ms]"
            label = msg["label"] + timing

            lines.append("".join(lifeline))
            label_line = list(" " * total_width)
            for j, ch in enumerate(label):
                pos = label_pos + j
                if 0 <= pos < total_width:
                    label_line[pos] = ch
            lines.append("".join(label_line))

        return "\n".join(lines)
```

### 6.2 Tool Call Statistics

```python
"""
tool_stats.py — Compute statistics on tool usage from traces.
"""
from collections import Counter, defaultdict
from trace_tree import TraceNode, NodeType


def compute_tool_statistics(root_nodes: list[TraceNode]) -> dict:
    """Aggregate tool call statistics from a trace tree."""
    calls: list[dict] = []
    _collect_tool_calls(root_nodes, calls)

    tool_counter = Counter(c["tool_name"] for c in calls)
    tool_durations = defaultdict(list)
    tool_tokens = defaultdict(list)

    for c in calls:
        tool_durations[c["tool_name"]].append(c["duration_ms"])
        tool_tokens[c["tool_name"]].append(c["tokens_used"])

    stats = {}
    for tool_name, count in tool_counter.items():
        durations = tool_durations[tool_name]
        tokens = tool_tokens[tool_name]
        stats[tool_name] = {
            "call_count": count,
            "total_duration_ms": sum(durations),
            "avg_duration_ms": sum(durations) / len(durations),
            "max_duration_ms": max(durations),
            "min_duration_ms": min(durations),
            "total_tokens": sum(tokens),
            "avg_tokens": sum(tokens) / len(tokens) if tokens else 0,
        }

    return {
        "total_tool_calls": len(calls),
        "unique_tools": len(tool_counter),
        "tools": stats,
        "call_order": [c["tool_name"] for c in calls],
    }


def _collect_tool_calls(nodes: list[TraceNode], results: list[dict]) -> None:
    for node in nodes:
        if node.node_type == NodeType.TOOL_CALL:
            results.append({
                "tool_name": node.metadata.get("tool_name", "unknown"),
                "duration_ms": node.duration_ms,
                "tokens_used": node.tokens_used,
                "timestamp": node.timestamp.isoformat(),
                "content": node.content,
            })
        _collect_tool_calls(node.children, results)
```

---

## 7. Configuration Reference

### 7.1 Visualization Configuration

```yaml
# trace-viz-config.yaml
visualization:
  renderer: "ascii"  # ascii | html | json
  max_depth: 20
  truncate_content_at: 80
  show_timestamps: true
  show_tokens: true
  show_confidence: true
  show_duration: true
  highlight_low_confidence: true
  confidence_warning_threshold: 0.6
  confidence_critical_threshold: 0.3

  colors:
    thought: "#6366f1"
    action: "#f59e0b"
    tool_call: "#10b981"
    tool_result: "#3b82f6"
    decision_point: "#ef4444"
    branch: "#8b5cf6"
    conclusion: "#06b6d4"
    error: "#dc2626"

  filtering:
    hide_node_types: []
    min_duration_ms: 0
    min_tokens: 0
    only_decision_paths: false

  export:
    format: "json"  # json | yaml | html | png
    include_metadata: true
    include_annotations: true
    compress: false

storage:
  backend: "file"  # file | s3 | gcs | postgresql
  retention_days: 90
  max_trace_size_mb: 50
  index_fields:
    - "trace_id"
    - "agent_id"
    - "session_id"
    - "status"
```

---

## 8. Best Practices

| Practice | Description |
|----------|-------------|
| Trace every LLM call | Each model invocation should be a distinct node with token counts |
| Capture decision rationale | Store the "why" alongside the "what" at decision points |
| Use confidence scores | Assign confidence values to enable low-confidence flagging |
| Limit trace depth | Cap recursion depth to prevent unbounded trace trees |
| Prune noisy nodes | Filter out repetitive intermediate thoughts for readability |
| Index for search | Build secondary indexes on agent_id, session_id, timestamp |
| Retention policies | Expire old traces to manage storage costs |
| Structured annotations | Use machine-readable annotations, not free-text comments |

---

## 9. Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|--------------|--------------|-----|
| Logging raw LLM output as trace | Massive, unstructured, unsearchable | Parse into structured TraceNode objects |
| No parent-child linking | Flat list loses reasoning structure | Always set parent_id on child nodes |
| Missing timing data | Cannot identify bottlenecks | Wrap every node in start/end timing |
| Ignoring pruned branches | Loses context about why alternatives were rejected | Record pruned branches with pruning reason |
| Hardcoded visualization | Cannot adapt to different trace shapes | Use configurable renderers |
| No trace sampling | Storage explodes in production | Implement head/tail sampling strategies |

---

## 10. Integration Patterns

### 10.1 Trace Export Pipeline

```
Agent Runtime
    │
    ├─▶ TraceTreeBuilder (in-process)
    │       │
    │       ├─▶ JSON serialization
    │       │       │
    │       │       ├─▶ Local file store
    │       │       ├─▶ S3 / GCS bucket
    │       │       └─▶ OpenTelemetry exporter
    │       │
    │       └─▶ Real-time WebSocket stream
    │               │
    │               └─▶ Dashboard UI
    │
    └─▶ Prometheus metrics (counters, histograms)
```

### 10.2 Cross-Reference

- For OpenTelemetry integration details, see `opentelemetry-agent-integration.md`
- For distributed tracing across agents, see `distributed-tracing-agents.md`
- For performance profiling of traces, see `performance-profiling.md`
- For decision audit requirements, see `decision-audit-logging.md`
