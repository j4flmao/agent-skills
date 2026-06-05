# Context Compression Strategies

## Theoretical Foundations of Context Compression

When engineering contexts for large language models, the primary physical constraint is the finite context window ($W_c$) and the quadratic computational complexity $O(N^2)$ of the self-attention mechanism. Context compression aims to construct a mapping function $f: C_{raw} \to C_{compressed}$ that transforms a raw input context $C_{raw}$ of length $L_{raw}$ into a compressed representation $C_{compressed}$ of length $L_{compressed}$ such that:

$$L_{compressed} \le B_t \ll L_{raw}$$

where $B_t$ is the token budget, while maximizing the mutual information between the compressed context and the target model output:

$$I(C_{compressed}; Y \mid Q) \approx I(C_{raw}; Y \mid Q)$$

Here, $Y$ represents the model's output distribution and $Q$ is the user query. This process ensures that the core semantic content required to answer the query is preserved while removing redundant tokens.

```
+-------------------------------------------------------------------------+
|                              RAW CONTEXT                                |
|  "Project Alpha is a secure payment processing engine. It uses AWS...   |
+-------------------------------------------------------------------------+
                                     │
                                     ▼
                   [Small LM Likelihood Evaluation]
                   Estimates token-level probability:
                      P(x_i | x_<i) for each token
                                     │
                                     ▼
                      [Self-Information Filter]
                      Prunes tokens where:
                      -log P(x_i | x_<i) < Threshold
                                     │
                                     ▼
+-------------------------------------------------------------------------+
|                           COMPRESSED CONTEXT                            |
|  "Project Alpha secure payment engine. Uses AWS..."                    |
+-------------------------------------------------------------------------+
```

### Information-Entropy Based Pruning

Information-entropy based pruning utilizes token probability distributions evaluated by a smaller, faster model (e.g., Llama-3-8B) to estimate the information content of each token in the raw context. For each token $x_i$ in the raw context sequence, we compute its self-information:

$$I(x_i) = -\log P(x_i \mid x_{<i})$$

Tokens with low self-information (i.e., high probability under the language model) represent redundant grammatical structure, filler words, or highly predictable boilerplate text. These tokens can be pruned with minimal impact on the semantic accuracy of the downstream LLM response.

### Gist Tokens & Soft Prompts

Gist tokens represent a distinct direction in context engineering:
- **Gist Tokens**: Specialized virtual tokens inserted into the model's token vocabulary. The model is trained to compress long prefix sequences into a tiny set of $G$ gist tokens (e.g., 2-4 tokens) using custom attention masking.
- **Soft Prompting**: Training continuous virtual token embeddings via gradient descent to represent static prompt context. The prompt parameters are frozen, and only the soft prompt embeddings are passed to the model, eliminating standard token parsing overheads.

### LLMLingua & Coarse-to-Fine Compression

The LLMLingua framework implements a coarse-to-fine budget allocation:
1. **Coarse Compression**: Prune entire files or paragraphs based on semantic embeddings matching the user's intent.
2. **Fine Compression**: Use token probability self-information checks on remaining sentences to strip high-probability grammatical connectors.
3. **Iterative Checking**: Dynamically verify output semantic overlap score matches expectations.

---

## Summarization Loops & Memory Pipelines

When context size exceeds the physical context window ($W_c$) by orders of magnitude, linear pruning is insufficient. We must employ hierarchical or rolling summarization loops.

### Hierarchical Summarization Loop

1. **Chunking**: Segment $C_{raw}$ into overlapping chunks $C_1, C_2, \dots, C_k$ of size $N_c$.
2. **Local Summary**: Generate summary $S_i = \text{LLM}(C_i, Q)$ targeting key entities, decisions, and outcomes.
3. **Consolidation**: Recursively summarize summaries until $|S_{consolidated}| \le B_t$.

```
                     [Raw Context Document]
                     /         |          \
             [Chunk 1]     [Chunk 2]     [Chunk 3]
             (2048 tok)    (2048 tok)    (2048 tok)
                 |             |             |
            [Summary 1]   [Summary 2]   [Summary 3]
             (250 tok)     (250 tok)     (250 tok)
                     \         |         /
                     [Consolidated Summary]
                           (500 tokens)
```

### Rolling Summary Memory Pattern

For conversational context, the rolling summary keeps a running distillation of past turns while keeping the most recent $N_{active}$ turns in raw form.

$$\text{State}_t = \text{Summarize}(\text{State}_{t-1} + \text{Turn}_{t-N_{active}})$$

---

## Step-by-Step Pruning Algorithm Flow

To execute context pruning programmatically, the system performs the following sequential actions:

1. **Load Tokenizer model**: Bind `tiktoken` for accurate target token boundary checks.
2. **Determine Token Budget ($B_t$)**: Identify maximum input limits and reserve safety boundaries.
3. **Chunk Parsing**: Break down inputs into clean sentence units using compiled regex engines.
4. **Keyword Extraction**: Identify key words in the user query to guide relevance metrics.
5. **Entropy and Semantic Overlay Computation**: Evaluate sentence weights based on query overlap and token density.
6. **Prioritize Headers & Guidelines**: Protect vital structural delimiters.
7. **Assemble final text output**: Merge selected sentences back together in their original order.

---

## Python Prompt Pruning Implementation

Here is a complete, production-grade prompt context compression engine using `tiktoken` and sentence-level semantic scoring.

```python
import tiktoken
import numpy as np
import re
import sys
from typing import List, Tuple, Dict, Any, Optional

class ContextCompressor:
    """
    Compresses prompt contexts dynamically using token budgets, entropy estimation,
    and priority heuristics.
    """
    def __init__(self, model_name: str = "gpt-4", target_budget: int = 2048):
        self.encoder = tiktoken.encoding_for_model(model_name)
        self.target_budget = target_budget
        # Compile sentence regex boundary detector
        self.sentence_end = re.compile(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s')
        print(f"[DEBUG] Initialized ContextCompressor for model '{model_name}' with budget={target_budget} tokens.", file=sys.stderr)

    def split_into_sentences(self, text: str) -> List[str]:
        """Splits text into clean sentence tokens."""
        sentences = self.sentence_end.split(text)
        result = [s.strip() for s in sentences if s.strip()]
        print(f"[DEBUG] Split context into {len(result)} sentences.", file=sys.stderr)
        return result

    def calculate_token_count(self, text: str) -> int:
        """Returns exact token length of a given text block."""
        return len(self.encoder.encode(text))

    def evaluate_entropy_importance(self, sentences: List[str], query: str) -> List[float]:
        """
        Calculates a semantic importance score for each sentence relative to the query.
        Uses Jaccard overlap and length-normalized scoring to simulate semantic density.
        """
        scores = []
        query_words = set(re.findall(r'\w+', query.lower()))
        print(f"[DEBUG] Evaluating entropy relative to query words: {query_words}", file=sys.stderr)
        
        for idx, sentence in enumerate(sentences):
            sentence_words = set(re.findall(r'\w+', sentence.lower()))
            intersection = query_words.intersection(sentence_words)
            
            # Semantic overlap score
            overlap_score = len(intersection) / max(len(query_words), 1)
            
            # Information density: longer sentences containing key terms get higher base weight
            # but normalized to prevent excessive bias to long paragraphs.
            token_len = len(self.encoder.encode(sentence))
            if token_len == 0:
                scores.append(0.0)
                continue
                
            density = len(sentence_words) / token_len
            final_score = (overlap_score * 0.7) + (density * 0.3)
            scores.append(final_score)
            print(f"[DEBUG] Sentence {idx} (tokens={token_len}): score={final_score:.4f}", file=sys.stderr)
            
        return scores

    def compress(self, 
                 raw_context: str, 
                 query: str, 
                 critical_headers: Optional[List[str]] = None,
                 min_compression_ratio: float = 0.1) -> str:
        """
        Compresses raw context down to target_budget tokens while preserving structural headers
        and semantically relevant sentences.
        """
        raw_tokens = self.calculate_token_count(raw_context)
        print(f"[DEBUG] Starting compression: Raw count = {raw_tokens} tokens.", file=sys.stderr)
        if raw_tokens <= self.target_budget:
            print(f"[DEBUG] Raw count already under target budget. Skipping compression.", file=sys.stderr)
            return raw_context

        sentences = self.split_into_sentences(raw_context)
        scores = self.evaluate_entropy_importance(sentences, query)
        
        # Sort sentences by semantic score (descending)
        scored_sentences = list(zip(sentences, scores, range(len(sentences))))
        scored_sentences.sort(key=lambda x: x[1], reverse=True)
        
        selected_indices = set()
        current_tokens = 0
        
        # Keep critical headers or instructions always if present in sentences
        if critical_headers:
            print(f"[DEBUG] Checking for critical headers: {critical_headers}", file=sys.stderr)
            for idx, sentence in enumerate(sentences):
                if any(hdr.lower() in sentence.lower() for hdr in critical_headers):
                    selected_indices.add(idx)
                    sentence_cost = self.calculate_token_count(sentence)
                    current_tokens += sentence_cost
                    print(f"[DEBUG] Locked critical sentence {idx} (tokens={sentence_cost}): '{sentence[:30]}...'", file=sys.stderr)
        
        # Select highest scoring sentences until token budget is reached
        for sentence, score, original_idx in scored_sentences:
            if original_idx in selected_indices:
                continue
                
            sentence_tokens = self.calculate_token_count(sentence)
            if current_tokens + sentence_tokens <= self.target_budget:
                selected_indices.add(original_idx)
                current_tokens += sentence_tokens
                print(f"[DEBUG] Selected sentence {original_idx} (tokens={sentence_tokens}): score={score:.4f}", file=sys.stderr)
            else:
                # Keep filling with smaller remaining sentences if possible
                continue
                
        # Reconstruct the text in its original sequential order
        compressed_sentences = [
            sentences[i] for i in sorted(list(selected_indices))
        ]
        
        result_text = " ".join(compressed_sentences)
        final_tokens = self.calculate_token_count(result_text)
        print(f"[DEBUG] Initial compression complete: Output count = {final_tokens} tokens.", file=sys.stderr)
        
        # Enforce minimum ratio guardrail
        if final_tokens < (self.target_budget * min_compression_ratio):
            print(f"[WARNING] Output tokens ({final_tokens}) below min_compression_ratio threshold. Re-filling.", file=sys.stderr)
            # Fallback: fill with next highest scoring sentences until target reached
            for sentence, score, original_idx in scored_sentences:
                if original_idx not in selected_indices:
                    sentence_tokens = self.calculate_token_count(sentence)
                    if current_tokens + sentence_tokens <= self.target_budget:
                        selected_indices.add(original_idx)
                        current_tokens += sentence_tokens
            
            compressed_sentences = [sentences[i] for i in sorted(list(selected_indices))]
            result_text = " ".join(compressed_sentences)
            print(f"[DEBUG] Re-fill complete: Output count = {self.calculate_token_count(result_text)} tokens.", file=sys.stderr)

        return result_text

import unittest

class TestContextCompressor(unittest.TestCase):
    """Unit tests for the ContextCompressor."""
    
    def setUp(self):
        self.sample_context = (
            "Project Alpha is a secure payment processing engine. "
            "It uses AWS DynamoDB as the primary transactional database and runs on EKS clusters. "
            "The security protocol requires OAuth 2.0 with JWT verification for all external endpoints. "
            "We noticed that database queries suffer latency spikes during peak load times. "
            "Docker container memory limit is set to 2GB. "
            "The logging framework uses Winston in a Nodejs application."
        )
        self.compressor = ContextCompressor(target_budget=55)

    def test_compression_budget(self):
        compressed = self.compressor.compress(self.sample_context, "AWS DynamoDB database", critical_headers=["Project Alpha"])
        token_count = self.compressor.calculate_token_count(compressed)
        self.assertLessEqual(token_count, 55)
        self.assertIn("Project Alpha", compressed)

    def test_under_budget_no_compression(self):
        under_budget_context = "This is a short string."
        compressed = self.compressor.compress(under_budget_context, "short")
        self.assertEqual(compressed, under_budget_context)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        unittest.main(argv=[sys.argv[0]])
    else:
        sample_context = (
            "Project Alpha is a secure payment processing engine. "
            "It uses AWS DynamoDB as the primary transactional database and runs on EKS clusters. "
            "The security protocol requires OAuth 2.0 with JWT verification for all external endpoints. "
            "We noticed that database queries suffer latency spikes during peak load times. "
            "Docker container memory limit is set to 2GB. "
            "The logging framework uses Winston in a Nodejs application."
        )
        user_query = "What database and hosting infrastructure does Project Alpha use?"
        
        compressor = ContextCompressor(target_budget=55)
        compressed_text = compressor.compress(
            raw_context=sample_context,
            query=user_query,
            critical_headers=["Project Alpha"]
        )
        print(f"Original token count: {compressor.calculate_token_count(sample_context)}")
        print(f"Compressed token count: {compressor.calculate_token_count(compressed_text)}")
        print(f"Result: {compressed_text}")
```

---

## Detailed Pruning Strategy Rules

When implementing a custom context compression layer, you should follow these rules:

1. **System Directives are Sacred**: Never compress or prune core instructions, safety constraints, or output schema definitions.
2. **Entity Consistency**: When pruning intermediate sentences, verify that referenced entities (e.g. project names, variable declarations, parameters) are not orphaned.
3. **No Semantic Fragmentation**: Keep sentence boundaries clean. Avoid slicing sentences mid-way, which results in broken parsing tree paths.
4. **Log Pruning Hierarchy**: For system log inputs, prioritize:
   - Level 1: Stack traces and Error exceptions.
   - Level 2: Warnings and configuration parameters.
   - Level 3: Info level messages (prune first).

---

## Metric Verification Framework

When applying compression strategies, you must monitor three critical validation metrics:

| Metric | Calculation | Impact |
| :--- | :--- | :--- |
| **Compression Ratio** | $R_c = \frac{L_{compressed}}{L_{raw}}$ | Measures data reduction efficiency. |
| **Token Efficiency** | $E_t = \frac{\Delta \text{Task Score}}{\Delta R_c}$ | Quantifies task accuracy preserved per token removed. |
| **Semantic Drift Ratio** | $\cos(\theta(S_{raw}, S_{compressed}))$ | Measures semantic alignment between embeddings. |

---

## Handoff & Related References
- Dynamic Injection Patterns: [dynamic-injection-patterns.md](dynamic-injection-patterns.md)
- Prompt Token Optimization: [prompt-token-optimization.md](prompt-token-optimization.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
