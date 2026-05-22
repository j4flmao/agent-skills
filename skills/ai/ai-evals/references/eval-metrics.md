# Evaluation Metrics

## Metric Categories

| Category | Metrics | Measurement Type |
|----------|---------|-----------------|
| Faithfulness | Faithfulness, Hallucination rate | LLM-as-judge, NLI |
| Relevance | Answer relevance, Context relevance | Embedding similarity, LLM judge |
| Precision/Recall | Context precision, Context recall | RAGAS metrics |
| Lexical | BLEU, ROUGE, METEOR | N-gram overlap |
| Task-specific | Accuracy, F1, Exact match | Ground truth comparison |
| Agent | Tool accuracy, Task completion | Functional verification |

## Faithfulness

### Definition
Does the generated answer contain claims that are supported by the provided context? Also called "groundedness" or "consistency." The most critical metric for RAG systems.

### Measurement: LLM-as-Judge
```
System: You are an evaluation assistant. Your task is to determine if the
answer is faithful to the provided context.

For each claim in the answer, determine if it is:
- Supported: directly stated or clearly implied by the context
- Unsupported: contradicted by or absent from the context

Context:
{context}

Answer:
{answer}

Output JSON:
{
  "claims": [
    {"claim": "...", "supported": true/false, "evidence": "..."}
  ],
  "faithfulness_score": 0.0-1.0,
  "reasoning": "brief explanation"
}
```

### Scoring
```
faithfulness = number_of_supported_claims / total_claims
```
Range: [0.0, 1.0]. Target: >0.9 for production RAG.

### Measurement: NLI-Based
Use a dedicated NLI model (e.g., TrueTeacher, BART-based NLI) to classify each claim-premise pair:
- Entailment (supported)
- Contradiction (unsupported)
- Neutral (unsupported — no evidence either way)

NLI models are faster and cheaper than LLM-as-judge but slightly less accurate.

### Hallucination Rate
```
hallucination_rate = 1 - faithfulness
```
Target: <5% for production. >10% requires pipeline intervention.

### Failure Modes
- **Subtle hallucination**: claim is mostly correct but adds an incorrect detail.
- **Context over-reliance**: answer is faithful but misses key information outside context.
- **Paraphrase distortion**: correctly paraphrased but changes meaning slightly.

## Answer Relevance

### Definition
Does the generated answer actually address the user's question? An answer can be faithful to context but irrelevant to the query.

### Measurement: Embedding Similarity
Embed the question and answer separately, compute cosine similarity.
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')
q_emb = model.encode(question)
a_emb = model.encode(answer)
relevance = cosine_similarity([q_emb], [a_emb])[0][0]
```

### Measurement: LLM-as-Judge
```
Given the question and answer, rate how well the answer addresses the question:
1 = completely irrelevant
2 = tangentially related
3 = partially addresses
4 = mostly addresses
5 = directly and completely addresses

Question: {question}
Answer: {answer}

Score (1-5):
```

### Scoring
Target: >0.8 (embedding) or >4.0 (LLM judge 1-5 scale).

### Failure Modes
- **Topic drift**: answer is on-topic but doesn't answer the specific question.
- **Over-generation**: answer includes extra information that dilutes relevance.
- **Partial answer**: addresses only part of a multi-part question.

## Context Relevance

### Definition
What fraction of the retrieved context is actually relevant to answering the question? Measures retrieval precision.

### RAGAS Context Precision
```
context_precision = Σ (precision_at_k × relevance_k) / total_retrieved
```
Where relevance_k is 1 if the k-th chunk is relevant, 0 otherwise.
precision_at_k = Σ relevance_i / k for i in 1..k

### Implementation
```python
def context_precision(relevance_scores):
    # relevance_scores: [1, 0, 1, 1, 0] for 5 chunks
    precision_at_k = []
    for k in range(1, len(relevance_scores) + 1):
        precision = sum(relevance_scores[:k]) / k
        precision_at_k.append(precision * relevance_scores[k-1])
    return sum(precision_at_k) / len(relevance_scores)
```

### Scoring
Target: >0.7 for production. Higher is better — means retrieval is returning relevant chunks.

## Context Recall

### Definition
What fraction of the information needed to answer the question was present in the retrieved context? Measures retrieval recall.

### RAGAS Context Recall
Compare the answer (or reference answer) against the retrieved context. Each claim in the answer is attributed to a context chunk if it appears there.

```
context_recall = claims_attributed_to_context / total_claims
```

### Scoring
Target: >0.8. Low recall means the retriever is missing important chunks — need to expand top-K or improve chunking.

## RAGAS Score

### Composite Metric
```
RAGAS Score = (faithfulness + answer_relevance + context_precision + context_recall) / 4
```

### Interpretation
| Score | Quality | Action Needed |
|-------|---------|---------------|
| >0.9 | Excellent | Minor tuning |
| 0.7-0.9 | Good | Check lowest component |
| 0.5-0.7 | Poor | Major pipeline changes |
| <0.5 | Failing | Redesign RAG pipeline |

## Lexical Metrics

### BLEU (Bilingual Evaluation Understudy)
Measures n-gram precision between generated and reference text.
```python
from nltk.translate.bleu_score import sentence_bleu
bleu = sentence_bleu([reference_tokens], candidate_tokens, weights=[0.25, 0.25, 0.25, 0.25])
```
- Range: [0, 1]. Higher = better.
- Limitation: penalizes valid paraphrasing. Use only for translation or highly constrained outputs.

### ROUGE (Recall-Oriented Understudy for Gisting Evaluation)
Measures n-gram recall between generated and reference text. Multiple variants:
- ROUGE-1: unigram recall
- ROUGE-2: bigram recall
- ROUGE-L: longest common subsequence

```python
from rouge_score import rouge_scorer
scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)
scores = scorer.score(reference, candidate)
```
- Best for summarization evaluation.
- Same limitation as BLEU: surface-level matching.

### When to Use Lexical Metrics
- Translation tasks.
- Summarization with constrained outputs.
- As weak signals — never as primary LLM evaluation.

## Task-Specific Metrics

### Classification
```
accuracy = correct_predictions / total_predictions
precision = true_positives / (true_positives + false_positives)
recall = true_positives / (true_positives + false_negatives)
f1 = 2 × precision × recall / (precision + recall)
```

### Extraction
```
exact_match = exact_matches / total
f1_score = character or token-level F1 between prediction and ground truth
```
Use exact match for strict extraction, token F1 for lenient evaluation.

### Code Generation
```
pass_rate = passing_test_cases / total_test_cases
syntax_valid = valid_compilation or not
functional_correctness = behavioral test results
```

## Agent-Specific Metrics

| Metric | Definition | Measurement |
|--------|-----------|-------------|
| Tool Selection Accuracy | Did agent pick the right tool? | Compare to golden tool call |
| Parameter Accuracy | Were tool arguments correct? | Exact match or semantic match |
| Task Completion Rate | Did agent complete the task? | Human or LLM judge |
| Efficiency | Number of tool calls vs optimal | Ratio to optimal path |
| Hallucination Rate | False claims in final answer | LLM-as-judge on final output |

## Custom Metrics

### Design Pattern
```python
class CustomMetric:
    def __init__(self, name, evaluator_fn, threshold):
        self.name = name
        self.evaluator = evaluator_fn
        self.threshold = threshold

    def evaluate(self, question, answer, context=None, ground_truth=None):
        score = self.evaluator(question, answer, context, ground_truth)
        passed = score >= self.threshold
        return {"metric": self.name, "score": score, "passed": passed}
```

### Example: Claim Density
```python
def claim_density(answer):
    # Rough heuristic: number of factual claims per 100 words
    claims = extract_claims(answer)  # NER + relation extraction
    words = len(answer.split())
    return len(claims) / max(words, 1) * 100
```
Use to ensure the model is providing substantive answers (high density) vs. generic filler (low density).

## Metric Selection Guide

| Task | Primary Metric | Secondary Metrics |
|------|---------------|-------------------|
| RAG QA | Faithfulness | Answer relevance, Context precision |
| Summarization | ROUGE-L | Faithfulness, Conciseness |
| Translation | BLEU | COMET (learned metric) |
| Chat | Human preference | Answer relevance, Safety |
| Code gen | Pass rate | Syntax validity |
| Classification | Accuracy | F1 per class |
| Extraction | Exact match | Token F1 |
| Agent | Task completion | Tool accuracy, Efficiency |
