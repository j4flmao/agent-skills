# Memory Retrieval Architectures

## Tiered Memory Spaces in Agentic Systems

In complex harness-engineering frameworks, agents require tiered memory architectures to emulate human cognitive processes and manage token limits. Systems divide memory into three core tiers:

```
                          ┌────────────────────────┐
                          │    Sensory Input       │
                          └──────────┬─────────────┘
                                     │
                                     ▼
                          ┌────────────────────────┐
                          │   Working Memory       │ ◄─── (Transient, volatile state,
                          │   (Current Turn)       │      retained in active prompt)
                          └─────┬────────────┬─────┘
                                │            │
            Consolidate logs    │            │ Retrieve relevant contexts
            and execution paths │            │
                                ▼            ▼
                    ┌──────────────┐      ┌──────────────┐
                    │   Episodic   │      │   Semantic   │
                    │    Memory    │      │    Memory    │
                    │ (Trace Logs) │      │ (Doc Store)  │
                    └──────────────┘      └──────────────┘
```

1. **Working Memory**: Represents the immediate active variables, the user's latest queries, and critical task rules. This is short-lived and non-persistent.
2. **Episodic Memory**: Tracks the history of execution runs, past tool calls, and success/failure traces of steps.
3. **Semantic Memory**: Stores factual knowledge, API structures, codebase documents, and rules that can be retrieved via embeddings.

### Practical Implementation of Tiered Memory
- **Working Memory**: Lives in memory during the execution turn. It contains the raw prompt template and system flags.
- **Episodic Memory**: Serialized to structured JSON databases after each milestone. It captures task inputs, tool arguments, outputs, execution time, and outcome labels (success/failure).
- **Semantic Memory**: Stored in a database (such as PostgreSQL with pgvector) and indexed via HNSW. It is accessed on-demand using similarity queries.

---

## Memory Consolidation Policies & Graph Implementations

To transition memory records from transient working configurations to persistent semantic knowledge structures, systems run background consolidation loops.

| Memory Space | Write Frequency | Expiration Policy | Persistence Adapter |
| :--- | :--- | :--- | :--- |
| **Working Memory** | Multi-turn active updates | Immediate upon chat session closure | RAM / Thread Context |
| **Episodic Memory** | Written at step milestones | Kept for active session tracking | Local JSON file or SQL DB |
| **Semantic Memory** | Batch-consolidated periodically | Infinite retention | HNSW Vector Database |

---

## Detailed Step-by-Step Memory Retrieval Workflow

To hydrate prompts dynamically using multi-tiered memory archives, follow this sequence:

1. **Read active task context**: Determine the target goal parameters.
2. **Query Semantic Memory**: Retrieve factual definitions or installation code matching user terms.
3. **Filter results**: Discard search matches that fall below the minimum similarity threshold.
4. **Inspect Episodic Logs**: Extract historical completion traces of the last 3 tasks.
5. **Summarize logs**: Format historical logs into a compact summary block.
6. **Inject payloads**: Update system prompt sections with synthesized supporting contexts.
7. **Verify token limits**: Ensure compilation outputs fit safely within active quotas.

---

## Consolidation Formulas

To transfer records from volatile working memory into permanent storage, we compute a consolidation threshold based on relevance and impact:

$$C_{impact}(E) = w_{errors} \cdot N_{errors} + w_{changes} \cdot N_{changes}$$

where $E$ represents an execution episode. An episode is selected for episodic archiving if its impact exceeds a specific threshold:

$$C_{impact}(E) \ge \theta_{consolidate}$$

To find facts in semantic memory, the similarity search uses a threshold cutoff filter:

$$\text{Retrieve}(Q) = \{ D_i \in \text{Semantic} \mid \text{Similarity}(Q, D_i) \ge \tau \}$$

---

## Python Multi-Tiered Memory Manager

Below is a Python implementation of a tiered agent memory system that coordinates short-term messages, historical episodic traces, and semantic lookups.

```python
import time
import sys
import unittest
from typing import List, Dict, Any, Optional

class TieredMemoryManager:
    """
    Coordinates working memory (active context), episodic memory (execution history),
    and semantic memory (general reference facts).
    """
    def __init__(self, semantic_threshold: float = 0.6):
        self.working_memory: List[Dict[str, str]] = []
        self.episodic_memory: List[Dict[str, Any]] = []
        self.semantic_memory: List[Dict[str, Any]] = []
        self.semantic_threshold = semantic_threshold
        print(f"[DEBUG] TieredMemoryManager initialized (semantic_threshold={semantic_threshold}).", file=sys.stderr)

    def set_working_context(self, active_vars: Dict[str, Any]):
        """Sets the working memory variables."""
        self.working_memory = [
            {"role": "system", "content": f"Active state: {active_vars}"}
        ]
        print(f"[DEBUG] Hydrated Working Memory with active variables: {active_vars}", file=sys.stderr)

    def record_episode(self, task_name: str, status: str, errors: int, notes: str):
        """Archives a completed execution step into Episodic memory."""
        episode = {
            "timestamp": time.time(),
            "task": task_name,
            "status": status,
            "errors": errors,
            "notes": notes
        }
        self.episodic_memory.append(episode)
        print(f"[DEBUG] Archived Episodic trace: task='{task_name}', status='{status}', errors={errors}", file=sys.stderr)

    def add_semantic_fact(self, key_term: str, explanation: str):
        """Registers a fact or API rule into the semantic knowledge base."""
        self.semantic_memory.append({
            "key_term": key_term.lower(),
            "content": explanation
        })
        print(f"[DEBUG] Registered Semantic knowledge under key: '{key_term.lower()}'", file=sys.stderr)

    def search_semantic_memory(self, query: str) -> List[str]:
        """Returns semantic matches that intersect with query keywords."""
        query_words = set(query.lower().split())
        matches = []
        
        for item in self.semantic_memory:
            term = item["key_term"]
            # Simplified text overlap metric
            overlap = len(query_words.intersection(set(term.split())))
            score = overlap / max(len(query_words), 1)
            
            if score >= self.semantic_threshold:
                matches.append(item["content"])
                print(f"[DEBUG] Semantic match hit: '{term}' (score={score:.4f})", file=sys.stderr)
                
        return matches

    def generate_context_payload(self, user_query: str) -> Dict[str, Any]:
        """Assembles working, episodic, and relevant semantic memories for LLM ingestion."""
        # Retrieve relevant facts
        facts = self.search_semantic_memory(user_query)
        
        # Summarize episodic history
        episodes_summary = []
        for ep in self.episodic_memory[-3:]: # Get last 3 episodes
            episodes_summary.append(
                f"- Task '{ep['task']}' finished with status '{ep['status']}' ({ep['errors']} errors)"
            )
            
        semantic_payload = "\n".join(f"- {f}" for f in facts) if facts else "No specific facts retrieved."
        episodic_payload = "\n".join(episodes_summary) if episodes_summary else "No execution history."
        
        payload_text = (
            f"=== SEMANTIC KNOWLEDGE ===\n{semantic_payload}\n\n"
            f"=== EPISODIC HISTORY ===\n{episodic_payload}\n"
        )
        
        return {
            "working_memory": self.working_memory,
            "supporting_context": payload_text
        }

class TestTieredMemoryManager(unittest.TestCase):
    """Unit tests for TieredMemoryManager verification."""
    
    def test_semantic_retrieval(self):
        manager = TieredMemoryManager(semantic_threshold=0.3)
        manager.add_semantic_fact("sql index", "Indexes speed up read performance.")
        
        results = manager.search_semantic_memory("how to make a sql index?")
        self.assertEqual(len(results), 1)
        self.assertIn("Indexes speed up", results[0])

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        unittest.main(argv=[sys.argv[0]])
    else:
        memory = TieredMemoryManager(semantic_threshold=0.3)
        
        # Load semantic facts
        memory.add_semantic_fact("postgres index", "PostgreSQL supports HNSW indexes via pgvector.")
        memory.add_semantic_fact("eks config", "EKS clusters require node group access configurations.")
        
        # Record execution history
        memory.record_episode("Setup database connection", "COMPLETED", 0, "No issues.")
        memory.record_episode("Initialize pgvector extension", "FAILED", 1, "Extension missing in DB image.")
        
        # User query triggers context synthesis
        query = "How to install pgvector index on postgres?"
        payload = memory.generate_context_payload(query)
        
        print("--- GENERATED CONTEXT PAYLOAD ---")
        print(payload["supporting_context"])
```

---

## Handoff & Related References
- Dynamic Injection Patterns: [dynamic-injection-patterns.md](dynamic-injection-patterns.md)
- Persistent State Management: [persistent-state-management.md](persistent-state-management.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
