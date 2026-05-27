# Lineage Visualization

## Visualization Approaches

Lineage visualization helps data consumers understand data flow, dependencies, and impact.

### Graph Model for Lineage

```python
import networkx as nx
from datetime import datetime

class LineageGraph:
    def __init__(self):
        self.graph = nx.DiGraph()

    def add_node(self, node: LineageNode):
        self.graph.add_node(
            node.id,
            name=node.name,
            type=node.type,
            schema=node.schema,
            metadata=node.metadata,
        )

    def add_edge(self, source: str, target: str, transformation: str):
        self.graph.add_edge(source, target, transformation=transformation)

    def get_upstream(self, node_id: str, depth: int = 3) -> list[LineagePath]:
        paths = []
        for source in nx.ancestors(self.graph, node_id):
            path = nx.shortest_path(self.graph, source, node_id)
            if len(path) <= depth + 1:
                paths.append(LineagePath(
                    source=source,
                    target=node_id,
                    path=path,
                    transformations=[
                        self.graph.edges[p, n].get("transformation", "direct")
                        for p, n in zip(path[:-1], path[1:])
                    ],
                ))
        return paths

    def get_downstream(self, node_id: str, depth: int = 3) -> list[LineagePath]:
        paths = []
        for target in nx.descendants(self.graph, node_id):
            path = nx.shortest_path(self.graph, node_id, target)
            if len(path) <= depth + 1:
                paths.append(LineagePath(
                    source=node_id,
                    target=target,
                    path=path,
                    transformations=[
                        self.graph.edges[p, n].get("transformation", "direct")
                        for p, n in zip(path[:-1], path[1:])
                    ],
                ))
        return paths
```

### Column-Level Lineage

```python
class ColumnLineageTracker:
    def __init__(self):
        self.column_graph = nx.DiGraph()

    def add_column_mapping(self, source_table: str, source_col: str,
                           target_table: str, target_col: str,
                           transform: str = None):
        source = f"{source_table}.{source_col}"
        target = f"{target_table}.{target_col}"
        self.column_graph.add_edge(source, target, transform=transform)

    def trace_column(self, table: str, column: str) -> ColumnTrace:
        source_key = f"{table}.{column}"
        ancestors = list(nx.ancestors(self.column_graph, source_key))
        descendants = list(nx.descendants(self.column_graph, source_key))

        return ColumnTrace(
            column=f"{table}.{column}",
            source_columns=[a for a in ancestors if a.startswith("source.")],
            intermediate_columns=[a for a in ancestors if not a.startswith("source.")],
            downstream_columns=descendants,
            transformations=[
                self.column_graph.edges[e].get("transform")
                for e in self.column_graph.in_edges(source_key)
            ],
        )
```

## Visualization Rendering

```python
class LineageVisualizer:
    def render_dag(self, graph: LineageGraph, center_node: str = None) -> str:
        if center_node:
            sub_nodes = {center_node}
            sub_nodes.update(nx.ancestors(graph.graph, center_node))
            sub_nodes.update(nx.descendants(graph.graph, center_node))
            subgraph = graph.graph.subgraph(sub_nodes)
        else:
            subgraph = graph.graph

        node_colors = {
            "table": "#4A90D9",
            "view": "#50C878",
            "pipeline": "#FF8C00",
            "dashboard": "#9B59B6",
            "report": "#E74C3C",
        }

        dot = ["digraph Lineage {"]
        dot.append("  rankdir=LR;")
        dot.append("  node [shape=box, style=rounded];")

        for node_id, data in subgraph.nodes(data=True):
            color = node_colors.get(data.get("type"), "#95A5A6")
            dot.append(f'  "{node_id}" [label="{data["name"]}", fillcolor="{color}", style="filled,rounded"];')

        for source, target in subgraph.edges():
            dot.append(f'  "{source}" -> "{target}";')

        dot.append("}")
        return "\n".join(dot)
```

## Key Points

- Directed acyclic graph models upstream and downstream dependencies
- Column-level lineage traces individual field origins
- Impact analysis shows all downstream consumers of a dataset
- Source analysis traces a dataset back to its origins
- Node coloring by type: table, view, pipeline, dashboard, report
- Subgraph filtering centers visualization on a specific node
- Depth-limited traversal prevents overwhelming visualizations
- Transformation labels on edges describe the data processing step
- Interactive exploration enabled through web-based visualization tools
- Export to Graphviz DOT format for custom rendering
