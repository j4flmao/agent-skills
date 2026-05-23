# Metrics Quick Reference

## Core Metrics Summary

| Metric | What It Measures | Range | Target | Method |
|--------|-----------------|-------|--------|--------|
| Faithfulness | Claims supported by context | 0-1 | >0.90 | LLM judge, NLI |
| Answer Relevance | Addresses user question | 0-1 | >0.80 | Embedding similarity, LLM judge |
| Context Precision | Fraction of relevant retrieved chunks | 0-1 | >0.70 | RAGAS |
| Context Recall | Information present in retrieved chunks | 0-1 | >0.80 | RAGAS |
| Hallucination Rate | Unsupported claims | 0-1 | <0.05 | 1 - faithfulness |
| Latency P50/P95 | Response time | ms | <2s P95 | Direct measurement |
| Cost per Query | API cost per request | $ | <$0.01 | Token counting |

## Metric Definitions

### Faithfulness
Whether every claim in the answer is supported by the provided context.
- Accepts: "The sky is blue because of Rayleigh scattering" (supported)
- Rejects: "The sky is green due to ozone absorption" (unsupported)
- Detects: subtle hallucinations, over-claiming, factual errors

### Answer Relevance
Whether the answer directly addresses the user's question.
- High: Question="What is the capital?" Answer="Paris"
- Low: Question="What is the capital?" Answer="France has many beautiful cities"
- Detects: topic drift, partial answers, non-answers

### Context Precision
How many of the retrieved chunks are actually useful.
- High: Retrieved 5 docs, all relevant to question
- Low: Retrieved 5 docs, only 1 relevant
- Indicates: retrieval quality, embedding tuning need

### Context Recall
Whether the retrieved chunks contain all information needed.
- High: All facts needed are in one retrieved chunk
- Low: Key information missing from top-k results
- Indicates: chunking strategy, top-k size

## Task-Specific Metrics

| Task | Primary Metric | Secondary Metrics |
|------|---------------|-------------------|
| Classification | Accuracy | Precision, Recall, F1 |
| Extraction | Exact Match | Token F1 |
| Summarization | ROUGE-L | Faithfulness, Conciseness |
| Translation | BLEU | COMET |
| Code Generation | Pass@k | Syntax Validity |
| Chat | Human Preference | Safety, Relevance |
| Agent | Task Completion | Tool Accuracy, Efficiency |
| RAG QA | Faithfulness | Context Precision, Recall |

## Calculation Reference

### Faithfulness (LLM-as-Judge)
```
claims = extract_claims(answer)
supported = count_supported(claims)
faithfulness = supported / len(claims)
```

### Context Precision (RAGAS)
```
precision_at_k = sum(relevance_1..k) / k
context_precision = sum(precision_at_k * relevance_k) / K
```

### Context Recall
```
claims_in_context = count_claims_in(answer, context)
context_recall = claims_in_context / total_claims
```

### RAGAS Score
```
ragas = (faithfulness + answer_relevance + context_precision + context_recall) / 4
```

| RAGAS Range | Quality | Action |
|-------------|---------|--------|
| >0.90 | Excellent | Minor tuning |
| 0.70-0.90 | Good | Fix lowest component |
| 0.50-0.70 | Poor | Major changes needed |
| <0.50 | Failing | Redesign pipeline |

## Agent Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Task Completion | tasks_completed / total_tasks | >0.85 |
| Tool Accuracy | correct_tool_calls / total_tool_calls | >0.90 |
| Efficiency | optimal_steps / actual_steps | >0.70 |
| Replan Rate | replan_count / total_attempts | <0.20 |
| Hallucination Rate | hallucinated_claims / total_claims | <0.05 |

## Monitoring Thresholds

### Alert Levels
```
Critical (page):
  - Faithfulness < 0.70
  - Error rate > 5%
  - P99 latency > 10s

Warning (notify):
  - Faithfulness < 0.85
  - Context Precision < 0.60
  - Cost > 2x daily budget
  - P95 latency > 3s

Info (dashboard):
  - Any metric trending down over 7 days
  - Dataset drift detected
  - Model version change
```

### Trend Analysis
- Compare against trailing 7-day rolling average
- Flag any metric with >5% week-over-week decline
- Track segment-level metrics (by user tier, model, query type)
