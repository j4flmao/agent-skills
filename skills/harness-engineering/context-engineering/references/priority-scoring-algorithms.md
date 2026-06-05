# Priority Scoring Algorithms

## Context Scoring Matrix

When resources are limited and the context window is near capacity, the prompt compiler must run priority scoring algorithms. These rank candidates to retain only the most important sections.

```
       [Context Candidates]
      /         |          \
[Semantic]  [Temporal]  [Structural]
  Score       Decay        Weight
      \         |          /
       ▼        ▼         ▼
     [Weighted Aggregator] ──► [Token Length Penalty] ──► Final Ranked Prompt Chunks
```

The system uses three primary metrics:

1. **Semantic Similarity ($S_{semantic}$)**: Measures semantic overlap using embedding cosine distance or token-level TF-IDF between user query $Q$ and candidate context chunk $C$.
2. **Temporal Decay ($S_{recency}$)**: Weights newer events higher in conversational context.
3. **Structural / Metadata Weight ($S_{metadata}$)**: Absolute weights assigned to core system guidelines, error codes, active instructions, or variables.

### Importance Ranking Parameters

In complex agent interactions, the relative importance of context changes based on execution status. For example:
- **Crash Recovery State**: Priority shifts to error logs and execution checklists (high metadata weight).
- **Research/Search State**: Priority shifts to semantic relevance scores matching documentation.
- **Continuous Conversation State**: Priority shifts to recent chat turns (high recency weight).

| Parameter | State: Crash Recovery | State: Research | State: Chat Loop |
| :--- | :--- | :--- | :--- |
| **$w_1$ (Semantic)** | 0.20 | 0.60 | 0.30 |
| **$w_2$ (Recency)** | 0.10 | 0.10 | 0.50 |
| **$w_3$ (Metadata)** | 0.70 | 0.30 | 0.20 |

---

## Detailed Step-by-Step Scoring Process

To sort and rank prompt context chunks, the scoring engine operates as follows:

1. **Tokenize User Query**: Split the user query into active semantic terms.
2. **Calculate Semantic Similarity**: Compute token overlap or vector similarities.
3. **Apply Decay Equation**: Compare the creation timestamp of the context piece with the current time.
4. **Retrieve Metadata Adjustments**: Query custom weight factors defined in config tags.
5. **Estimate Token Length**: Evaluate how many tokens the block occupies.
6. **Compute Combined Score**: Apply weights and deduct length penalties.
7. **Sort and Prune**: Reorder context chunks and drop low priority fragments.

---

## Mathematical Formulation

### Recency (Temporal) Decay

Information relevancy often decays exponentially over time. Let $t_{now}$ be the current timestamp and $t_{doc}$ be the creation or modification timestamp of the context piece. The recency score is:

$$S_{recency}(t) = e^{-\gamma (t_{now} - t_{doc})}$$

where $\gamma > 0$ is the decay coefficient. A higher $\gamma$ values prompt aggressive pruning of old logs or history.

### Length Penalty

To prevent the LLM from being overwhelmed by extremely long documents when shorter ones contain identical data, we apply a length penalty relative to a targeted block size:

$$P_{length}(L) = \frac{1}{1 + \alpha |L - L_{target}|}$$

where:
* $L$ is the token length of the chunk.
* $L_{target}$ is the optimal chunk size (e.g. 150 tokens).
* $\alpha$ is the penalty scaling coefficient.

### Combined Priority Score

The final selection score for any given context component is a linear combination of its sub-scores:

$$S_{final} = w_1 S_{semantic} + w_2 S_{recency}(t) + w_3 S_{metadata} - w_4 P_{length}(L)$$

subject to constraints:

$$\sum_{i=1}^3 w_i = 1.0 \quad \text{and} \quad w_4 \ge 0.0$$

---

## Python Priority Scorer Implementation

Here is a complete, production-grade implementation of a multi-variable context priority scoring engine in Python, containing comprehensive logging and unit tests.

```python
import math
import time
import sys
import unittest
from typing import Dict, Any, List, Optional

class PriorityScorer:
    """
    Computes priority scores for context chunks to filter the most relevant content.
    """
    def __init__(self, 
                 w_semantic: float = 0.5, 
                 w_recency: float = 0.2, 
                 w_metadata: float = 0.3, 
                 w_length_penalty: float = 0.15,
                 decay_gamma: float = 0.0001,
                 target_length: int = 150):
        self.w_semantic = w_semantic
        self.w_recency = w_recency
        self.w_metadata = w_metadata
        self.w_length = w_length_penalty
        self.gamma = decay_gamma
        self.target_length = target_length

        # Normalize core weights to sum to 1.0
        total_w = w_semantic + w_recency + w_metadata
        self.w_semantic /= total_w
        self.w_recency /= total_w
        self.w_metadata /= total_w
        print(f"[DEBUG] PriorityScorer configured with normalized weights: semantic={self.w_semantic:.2f}, recency={self.w_recency:.2f}, metadata={self.w_metadata:.2f}", file=sys.stderr)

    def calculate_recency(self, doc_timestamp: float, now: float) -> float:
        """Applies exponential time decay."""
        elapsed = max(0.0, now - doc_timestamp)
        score = math.exp(-self.gamma * elapsed)
        print(f"[DEBUG] Recency check: elapsed={elapsed:.2f}s -> score={score:.4f}", file=sys.stderr)
        return score

    def calculate_length_penalty(self, length: int) -> float:
        """Calculates penalty for blocks deviating from target length."""
        deviation = abs(length - self.target_length)
        penalty = 1.0 / (1.0 + 0.01 * deviation)
        print(f"[DEBUG] Length penalty check: length={length} (target={self.target_length}) -> penalty factor={penalty:.4f}", file=sys.stderr)
        return penalty

    def calculate_semantic_overlap(self, query: str, doc_text: str) -> float:
        """Token-level overlap Jaccard coefficient."""
        q_words = set(query.lower().split())
        doc_words = set(doc_text.lower().split())
        if not q_words:
            return 0.0
        overlap = len(q_words.intersection(doc_words))
        score = overlap / len(q_words)
        print(f"[DEBUG] Semantic overlap check: '{query[:20]}...' vs '{doc_text[:20]}...' -> score={score:.4f}", file=sys.stderr)
        return score

    def score_chunks(self, 
                      chunks: List[Dict[str, Any]], 
                      query: str, 
                      now: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Scores and ranks context chunks.
        Expects chunk keys: 'text', 'timestamp', 'metadata_weight', 'token_count'
        """
        if now is None:
            now = time.time()
            
        scored_chunks = []
        for idx, chunk in enumerate(chunks):
            text = chunk.get("text", "")
            timestamp = chunk.get("timestamp", now)
            metadata_weight = chunk.get("metadata_weight", 0.5)
            token_count = chunk.get("token_count", len(text.split()))

            print(f"[DEBUG] Scoring Chunk {idx}...", file=sys.stderr)
            # Component score calculations
            s_sem = self.calculate_semantic_overlap(query, text)
            s_rec = self.calculate_recency(timestamp, now)
            s_meta = min(1.0, max(0.0, metadata_weight))
            p_len = self.calculate_length_penalty(token_count)

            # Combined formulation
            final_score = (
                (self.w_semantic * s_sem) +
                (self.w_recency * s_rec) +
                (self.w_metadata * s_meta) -
                (self.w_length * (1.0 - p_len)) # subtract penalty
            )

            chunk_copy = chunk.copy()
            chunk_copy["computed_score"] = round(final_score, 4)
            chunk_copy["sub_scores"] = {
                "semantic": round(s_sem, 4),
                "recency": round(s_rec, 4),
                "metadata": round(s_meta, 4),
                "length_penalty_factor": round(p_len, 4)
            }
            scored_chunks.append(chunk_copy)
            print(f"[DEBUG] Chunk {idx} Final Score = {final_score:.4f}", file=sys.stderr)

        # Sort from highest priority to lowest
        scored_chunks.sort(key=lambda x: x["computed_score"], reverse=True)
        return scored_chunks

class TestPriorityScorer(unittest.TestCase):
    """Unit tests validating PriorityScorer calculations."""
    
    def test_semantic_matching(self):
        scorer = PriorityScorer()
        overlap = scorer.calculate_semantic_overlap("find postgres logs", "postgres database log output")
        self.assertAlmostEqual(overlap, 2/3)

    def test_decay_effect(self):
        scorer = PriorityScorer(decay_gamma=0.1)
        now = time.time()
        score_recent = scorer.calculate_recency(now - 1, now)
        score_old = scorer.calculate_recency(now - 50, now)
        self.assertTrue(score_recent > score_old)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        unittest.main(argv=[sys.argv[0]])
    else:
        scorer = PriorityScorer(decay_gamma=0.01) # Faster decay for demo
        now = time.time()
        
        mock_chunks = [
            {
                "text": "Deployment status is ACTIVE on environment production.",
                "timestamp": now - 10, # Very recent
                "metadata_weight": 0.9, # Core variable status
                "token_count": 8
            },
            {
                "text": "Docker setup instructions: build using node image.",
                "timestamp": now - 3600, # 1 hour ago
                "metadata_weight": 0.4,
                "token_count": 8
            },
            {
                "text": "Production environment database credentials rotated by security admin.",
                "timestamp": now - 500, # Older logs
                "metadata_weight": 0.7,
                "token_count": 9
            }
        ]
        
        query = "Is production active?"
        ranked = scorer.score_chunks(mock_chunks, query, now=now)
        
        print("=== Ranked Output Results ===")
        for idx, chunk in enumerate(ranked):
            print(f"Rank {idx+1}: {chunk['text']}")
            print(f"  Score: {chunk['computed_score']} | Details: {chunk['sub_scores']}")
```

---

## Handoff & Related References
- Context Compression Strategies: [context-compression-strategies.md](context-compression-strategies.md)
- Sliding Window Implementations: [sliding-window-implementations.md](sliding-window-implementations.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->

