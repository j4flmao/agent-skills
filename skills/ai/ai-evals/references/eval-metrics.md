# Evaluation Metrics

This reference details the mathematical formulations, algorithmic implementations, and orchestration patterns for evaluating generative AI systems, RAG pipelines, and autonomous agents.

## Metric Classifications & Target Ranges

| Category | Primary Metrics | Measurement Pattern | Target (Prod) | Threshold (CI) |
| :--- | :--- | :--- | :--- | :--- |
| **Faithfulness** | Entailment ratio, Groundedness | NLI Classifiers, LLM-as-Judge claims check | $\ge 0.95$ | $< 0.90$ (Fail) |
| **Relevance** | Answer relevance, Semantic similarity | Cosine similarity on Embeddings, LLM rubric | $\ge 0.85$ | $< 0.75$ (Fail) |
| **Retrieval** | Context Precision, Context Recall | RAGAS alignment algorithms | $\ge 0.80$ | $< 0.70$ (Fail) |
| **Lexical** | BLEU, ROUGE-L, METEOR | Token-level n-gram overlap | Domain-specific| Variable |
| **Functional**| Tool invocation match, Parameter accuracy | JSON schema matches, execution unit tests | $\ge 0.98$ | $< 0.95$ (Fail) |

---

## Faithfulness (Groundedness) Formulation & Code

Faithfulness measures whether the generated output is strictly grounded in the retrieved context. It excludes external knowledge hallucination.

### Mathematical Formulation

Given a retrieved context $C$ and a generated response $R$:
1. Parse $R$ into a set of discrete factual statements or claims $S = \{s_1, s_2, \dots, s_n\}$.
2. For each claim $s_i$, compute the entailment probability $P(\text{entail} \mid C, s_i) \in \{0, 1\}$.
3. The faithfulness score $F$ is calculated as:
   $$F = \frac{\sum_{i=1}^{n} \mathbb{I}\left(P(\text{entail} \mid C, s_i) = 1\right)}{n}$$

### Programmatic Implementation (NLI + Sentence Extraction)

```python
import spacy
from typing import List, Dict, Any
from transformers import pipeline

class FaithfulnessEvaluator:
    def __init__(self, nli_model_name: str = "facebook/bart-large-mnli"):
        # Load spaCy for precise sentence extraction
        self.nlp = spacy.load("en_core_web_sm")
        # Initialize zero-shot classification pipeline for NLI tasks
        self.nli_pipeline = pipeline("zero-shot-classification", model=nli_model_name)

    def extract_claims(self, response: str) -> List[str]:
        doc = self.nlp(response)
        # Extract individual sentences, filtering out short or generic statements
        return [sent.text.strip() for sent in doc.sents if len(sent.text.strip().split()) > 4]

    def evaluate_faithfulness(self, context: str, response: str) -> Dict[str, Any]:
        claims = self.extract_claims(response)
        if not claims:
            return {"score": 1.0, "reason": "No evaluation claims found in response."}

        supported_claims = 0
        details = []

        for claim in claims:
            # We treat the context as the premise and evaluate if the claim is entailed
            res = self.nli_pipeline(
                sequences=claim,
                candidate_labels=["entailed", "neutral", "contradicted"],
                hypothesis_template=f"Based on the context: {context}. This statement is {{}}."
            )
            top_label = res["labels"][0]
            top_score = res["scores"][0]
            
            # Entailment check matching high probability threshold
            is_supported = top_label == "entailed" and top_score > 0.7
            if is_supported:
                supported_claims += 1
                
            details.append({
                "claim": claim,
                "verdict": top_label,
                "confidence": top_score,
                "supported": is_supported
            })

        score = supported_claims / len(claims)
        return {
            "score": score,
            "claims_details": details,
            "verdict": "FAITHFUL" if score >= 0.95 else "UNFAITHFUL"
        }
```

---

## Answer Relevance Formulation

Answer relevance measures if the response directly addresses the query, disregarding whether it is factually correct or hallucinated.

### Mathematical Formulation

Given a query $Q$ and generated response $R$:
1. Generate $N$ artificial questions $q_i$ that $R$ could be an answer to ($i \in \{1, \dots, N\}$).
2. Embed the original query $Q$ and each generated question $q_i$ using a dense encoder $\phi$:
   $$\mathbf{e}_Q = \phi(Q), \quad \mathbf{e}_{q_i} = \phi(q_i)$$
3. Compute the mean cosine similarity:
   $$\text{Relevance}(Q, R) = \frac{1}{N} \sum_{i=1}^{N} \frac{\mathbf{e}_Q \cdot \mathbf{e}_{q_i}}{\|\mathbf{e}_Q\| \|\mathbf{e}_{q_i}\|}$$

### Python Implementation

```python
import numpy as np
from typing import List
from sentence_transformers import SentenceTransformer

class RelevanceEvaluator:
    def __init__(self, encoder_model: str = "all-MiniLM-L6-v2"):
        self.encoder = SentenceTransformer(encoder_model)

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

    async def evaluate_relevance(self, query: str, response: str, llm_generator) -> float:
        # Step 1: Generate reverse-engineered questions from the response
        generation_prompt = f"""
        Given the following response, generate 3 different search queries or questions that this response directly answers.
        Return ONLY the questions, one per line. No introduction.
        
        Response: {response}
        """
        generated_raw = await llm_generator(generation_prompt)
        generated_questions = [line.strip() for line in generated_raw.split("\n") if line.strip()]

        if not generated_questions:
            return 0.0

        # Step 2: Embed and calculate similarity
        query_emb = self.encoder.encode(query)
        gen_embs = self.encoder.encode(generated_questions)
        
        similarities = [self._cosine_similarity(query_emb, gen_emb) for gen_emb in gen_embs]
        return float(np.mean(similarities))
```

---

## Retrieval Performance Metrics (RAGAS Alignment)

Retrieval metrics ensure context retrieval pipelines isolate high-quality context nodes.

### Context Precision

Measures the proportion of relevant chunks in the top-$K$ results, prioritizing higher ranks.

$$\text{Context Precision}@K = \frac{\sum_{k=1}^{K} \left(\text{Precision}@k \times \mathbb{I}(c_k \text{ is relevant})\right)}{\sum_{k=1}^{K} \mathbb{I}(c_k \text{ is relevant})}$$

Where:
$$\text{Precision}@k = \frac{\sum_{i=1}^{k} \mathbb{I}(c_i \text{ is relevant})}{k}$$

### Context Recall

Measures the proportion of ground truth facts that are present in the retrieved context.

$$\text{Context Recall} = \frac{| \{ f \in \text{Ground Truth Facts} \mid f \text{ is verified in } C \} |}{|\text{Ground Truth Facts}|}$$

---

## Functional & Execution-Based Metrics for Tool Agents

When evaluating agents executing operations, we must check trajectory correctness.

### Implementation of Agent Trajectory Evaluation

```python
from dataclasses import dataclass

@dataclass
class ToolTrajectoryStep:
    tool_name: str
    arguments: dict
    execution_success: bool

class AgentTrajectoryEvaluator:
    def __init__(self, golden_trajectory: list[dict]):
        self.golden = golden_trajectory

    def evaluate_trajectory(self, steps: list[ToolTrajectoryStep]) -> dict:
        if not steps:
            return {"match_score": 0.0, "reason": "No actions executed"}
            
        matches = 0
        for idx, step in enumerate(steps):
            if idx >= len(self.golden):
                break
            golden_step = self.golden[idx]
            
            tool_match = step.tool_name == golden_step["tool"]
            args_match = all(step.arguments.get(k) == v for k, v in golden_step.get("args", {}).items())
            
            if tool_match and args_match:
                matches += 1

        score = matches / len(self.golden)
        return {
            "match_score": score,
            "steps_compared": len(self.golden),
            "steps_executed": len(steps),
            "passed": score >= 0.95
        }
```

---
<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with Spacy, Bart-NLI, cosine similarity formulas, and execution metrics.
-->
