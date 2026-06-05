# Context Drift Mitigation

## Semantic Drift in Long-Context Agent Systems

Context drift occurs when consecutive agent operations, chat turns, or dynamic prompt injections cause the context to shift away from the primary task goal. This leads to issues such as:

* **Instruction Loss**: The model ignores system guidelines because they are buried under historical conversation logs.
* **Goal Divergence**: The focus of the conversation drifts from the core objective to secondary subtasks.
* **Hallucination Amplification**: Irrelevant contextual information is treated as high-priority, introducing errors.

```
[Initial Goal State] ──► Turn 1 ──► Turn 2 ──► Turn 3 (Minor Drift)
                                                 │
[Corrective Reset] ◄── [Drift Detector Triggered] ◄── Turn N (Major Drift Detected)
```

### Manifestations of Context Drift
- **Conversational Side-Tracking**: The agent spends tokens arguing with compilation errors rather than referencing the initial codebase layout.
- **Negative Constraint Decoupling**: Constraining instructions like "do not delete files" get lost when the agent is flooded with raw file contents.
- **State Shadowing**: Intermediate variable states override initial systemic environment variables.

---

## Detailed Pruning & Correction Heuristics

When semantic drift exceeds the safety threshold ($\theta_{drift}$), the mitigation engine triggers one of the following restoration levels:

| Mitigation Level | Name | Trigger Condition | Remediation Strategy |
| :--- | :--- | :--- | :--- |
| **Level 1** | Soft Reset | $\theta_{drift} \in [0.20, 0.30)$ | Move system instructions to the absolute bottom of the prompt (sandwich format). |
| **Level 2** | Moderate Reset | $\theta_{drift} \in [0.30, 0.45)$ | Prune intermediate chat turns, leaving system instruction + 2 most recent turns. |
| **Level 3** | Hard Reset | $\theta_{drift} \ge 0.45$ | Flush history queue, re-hydrate state parameters from `progress.txt` checkpoint. |

---

## Detailed Step-by-Step Drift Assessment and Remediation Flow

To assess and resolve semantic drift programmatically, the mitigation compiler executes this routine:

1. **Vectorise the active target goal text** ($V_{goal}$).
2. **Compile the current prompt block** that will be submitted to the LLM.
3. **Extract text tokens** from the compiled prompt block and vectorise them ($V_{current}$).
4. **Compute cosine similarity** between the two vectors.
5. **Deduct similarity from 1.0** to obtain the Drift score ($D$).
6. **Compare $D$ against the safety threshold** ($\theta_{drift}$).
7. **If drift exceeds limits**:
   - Prune intermediate history logs.
   - Insert system-level realignment notices.
8. **Forward the sanitized prompt** sequence to the API interface.

---

## Mathematical Formulation of Semantic Drift

We model semantic drift using cosine distance. Let $V_{goal}$ be the embedding vector of the initial project system instructions, and let $V_{current}$ be the embedding vector of the active context window presented to the LLM.

The semantic overlap score is:

$$\text{Overlap}(V_{goal}, V_{current}) = \frac{V_{goal} \cdot V_{current}}{\|V_{goal}\| \|V_{current}\|}$$

We define Context Drift ($D$) as the cosine distance:

$$D = 1 - \text{Overlap}(V_{goal}, V_{current})$$

The mitigation protocol is triggered when drift exceeds a threshold value:

$$D \ge \theta_{drift}$$

Typical values are $\theta_{drift} \in [0.25, 0.40]$ depending on task requirements.

---

## Python Context Drift Detector & Correction Pipeline

The following Python script computes context drift using token-vector representations and triggers correction protocols (re-injecting instructions, cleaning old history).

```python
import collections
import math
import sys
import unittest
from typing import Dict, Any, List, Tuple

class DriftDetector:
    """
    Monitors changes in context semantics relative to the system's core goals.
    """
    def __init__(self, goal_text: str, drift_threshold: float = 0.35):
        self.goal_text = goal_text
        self.goal_vector = self._vectorize(goal_text)
        self.drift_threshold = drift_threshold
        print(f"[DEBUG] DriftDetector initialized with drift_threshold={drift_threshold}.", file=sys.stderr)

    def _vectorize(self, text: str) -> Dict[str, int]:
        """Creates token frequency vectors from input text strings."""
        words = text.lower().split()
        return dict(collections.Counter(words))

    def _cosine_similarity(self, vec1: Dict[str, int], vec2: Dict[str, int]) -> float:
        """Computes cosine similarity between frequency dictionary vectors."""
        intersection = set(vec1.keys()) & set(vec2.keys())
        
        numerator = sum(vec1[x] * vec2[x] for x in intersection)
        
        sum1 = sum(val ** 2 for val in vec1.values())
        sum2 = sum(val ** 2 for val in vec2.values())
        
        denominator = math.sqrt(sum1) * math.sqrt(sum2)
        
        if not denominator:
            return 0.0
        return numerator / denominator

    def calculate_drift(self, current_context: str) -> float:
        """Returns the context drift score (1.0 - similarity)."""
        current_vector = self._vectorize(current_context)
        similarity = self._cosine_similarity(self.goal_vector, current_vector)
        drift = round(1.0 - similarity, 4)
        print(f"[DEBUG] Drift evaluation: similarity={similarity:.4f} -> drift score={drift:.4f}", file=sys.stderr)
        return drift

    def verify_and_correct(self, 
                            current_context: str, 
                            chat_history: List[Dict[str, str]]) -> Tuple[bool, List[Dict[str, str]]]:
        """
        Detects drift. If it exceeds the threshold, runs corrections by
        removing intermediate turns and re-injecting the system goal.
        """
        drift = self.calculate_drift(current_context)
        triggered = drift >= self.drift_threshold
        
        corrected_history = chat_history.copy()
        
        if triggered:
            print(f"[WARNING] Context Drift ({drift}) exceeded threshold ({self.drift_threshold}). Triggering Level 2 history reset.", file=sys.stderr)
            if len(chat_history) > 4:
                system_messages = [m for m in chat_history if m.get("role") == "system"]
                recent_messages = chat_history[-2:]
                
                corrected_history = system_messages + recent_messages
                
                # Append correction system notice
                corrected_history.append({
                    "role": "system",
                    "content": "[SYSTEM DRIFT MITIGATION TRIGGERED: Conversation context has been pruned to focus on primary goals.]"
                })
                print(f"[DEBUG] Pruned history from {len(chat_history)} turns to {len(corrected_history)} turns.", file=sys.stderr)
        else:
            print(f"[DEBUG] Context alignment verification passed (drift={drift} < threshold).", file=sys.stderr)
                
        return triggered, corrected_history

class TestDriftDetector(unittest.TestCase):
    """Unit tests for the DriftDetector."""
    
    def test_aligned_context(self):
        detector = DriftDetector(goal_text="Setup database indexing")
        drift = detector.calculate_drift("I will setup the database indexes now.")
        self.assertLess(drift, 0.4)

    def test_drifted_context(self):
        detector = DriftDetector(goal_text="Setup database indexing")
        drift = detector.calculate_drift("Let's go grab a slice of pizza for dinner.")
        self.assertGreaterEqual(drift, 0.4)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        unittest.main(argv=[sys.argv[0]])
    else:
        initial_goal = "Build a dynamic context loader using PostgreSQL pgvector indexing."
        detector = DriftDetector(goal_text=initial_goal, drift_threshold=0.3)
        
        aligned_context = "I need to set up the postgres pgvector schema for our dynamic context engine."
        print(f"Aligned Drift Score: {detector.calculate_drift(aligned_context)}")
        
        drifted_context = "Let's check the weather in Seattle and look up some restaurants nearby."
        drift_score = detector.calculate_drift(drifted_context)
        print(f"Drifted Drift Score: {drift_score}")
        
        history = [
            {"role": "system", "content": "Initial Goal: " + initial_goal},
            {"role": "user", "content": "Can we configure the database connection?"},
            {"role": "assistant", "content": "Sure, we can use SQLAlchemy."},
            {"role": "user", "content": "Also, can you tell me a joke about database administrators?"},
            {"role": "assistant", "content": "Why did the database administrator leave his wife? She had too many relations."},
            {"role": "user", "content": "Where is Seattle situated on the map?"}
        ]
        
        triggered, new_history = detector.verify_and_correct(drifted_context, history)
        print(f"Mitigation Triggered: {triggered}")
        print("\n--- Corrected History Payload ---")
        for msg in new_history:
            print(f"[{msg['role'].upper()}]: {msg['content']}")
```

---

## Handoff & Related References
- Sliding Window Implementations: [sliding-window-implementations.md](sliding-window-implementations.md)
- Prompt Token Optimization: [prompt-token-optimization.md](prompt-token-optimization.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
