# RAG Evaluation Metrics

## Overview
Evaluating RAG (Retrieval-Augmented Generation) systems requires metrics that assess both the retrieval and generation components independently and jointly. Poor retrieval can't be compensated by good generation, and vice versa.

## Retrieval Metrics

### Retrieval Quality
```python
class RetrievalEvaluator:
    def __init__(self, retriever, relevance_judgments: dict):
        self.retriever = retriever
        self.judgments = relevance_judgments

    def precision_at_k(self, queries: list[str], k: int = 10) -> float:
        precisions = []
        for query in queries:
            results = self.retriever.retrieve(query, k=k)
            relevant = self.judgments.get(query, [])
            relevant_retrieved = sum(1 for r in results if r["id"] in relevant)
            precisions.append(relevant_retrieved / k)
        return statistics.mean(precisions)

    def recall_at_k(self, queries: list[str], k: int = 10) -> float:
        recalls = []
        for query in queries:
            results = self.retriever.retrieve(query, k=k)
            relevant = self.judgments.get(query, [])
            if not relevant:
                continue
            relevant_retrieved = sum(1 for r in results if r["id"] in relevant)
            recalls.append(relevant_retrieved / len(relevant))
        return statistics.mean(recalls) if recalls else 0.0

    def mean_reciprocal_rank(self, queries: list[str]) -> float:
        ranks = []
        for query in queries:
            results = self.retriever.retrieve(query, k=100)
            relevant = self.judgments.get(query, [])
            for i, r in enumerate(results):
                if r["id"] in relevant:
                    ranks.append(1.0 / (i + 1))
                    break
            else:
                ranks.append(0.0)
        return statistics.mean(ranks)

    def ndcg_at_k(self, queries: list[str], k: int = 10) -> float:
        scores = []
        for query in queries:
            results = self.retriever.retrieve(query, k=k)
            relevant = self.judgments.get(query, {})

            dcg = 0
            for i, r in enumerate(results):
                rel = relevant.get(r["id"], 0)
                dcg += (2 ** rel - 1) / math.log2(i + 2)

            ideal = sorted(relevant.values(), reverse=True)
            idcg = sum((2 ** rel - 1) / math.log2(i + 2) for i, rel in enumerate(ideal[:k]))

            scores.append(dcg / max(idcg, 1e-6))

        return statistics.mean(scores)

    def compute_all(self, queries: list[str]) -> dict:
        return {
            "p@5": self.precision_at_k(queries, 5),
            "p@10": self.precision_at_k(queries, 10),
            "r@5": self.recall_at_k(queries, 5),
            "r@10": self.recall_at_k(queries, 10),
            "mrr": self.mean_reciprocal_rank(queries),
            "ndcg@10": self.ndcg_at_k(queries, 10),
        }
```

## Generation Metrics

### Faithfulness and Relevance
```python
class GenerationEvaluator:
    def __init__(self, judge_model):
        self.judge = judge_model

    def faithfulness(self, answers: list[dict]) -> float:
        scores = []
        for item in answers:
            prompt = f"""
Context: {item['context']}
Answer: {item['answer']}

Rate faithfulness (0-1): Is the answer fully supported by the context?
Score:
"""
            score = float(self.judge.generate(prompt).strip())
            scores.append(min(max(score, 0), 1))
        return statistics.mean(scores)

    def answer_relevancy(self, queries: list[str], answers: list[str]) -> float:
        scores = []
        for q, a in zip(queries, answers):
            prompt = f"""
Question: {q}
Answer: {a}

Rate relevancy (0-1): Does the answer directly address the question?
Score:
"""
            score = float(self.judge.generate(prompt).strip())
            scores.append(min(max(score, 0), 1))
        return statistics.mean(scores)

    def context_precision(self, queries: list[str], contexts: list[list[str]]) -> float:
        scores = []
        for q, ctx in zip(queries, contexts):
            useful = 0
            for c in ctx:
                prompt = f"Is this context useful for answering: {q}\nContext: {c}\nAnswer yes/no:"
                if "yes" in self.judge.generate(prompt).lower():
                    useful += 1
            scores.append(useful / max(len(ctx), 1))
        return statistics.mean(scores)

    def context_recall(self, queries: list[str], contexts: list[list[str]], ground_truth: list[str]) -> float:
        scores = []
        for q, ctx, gt in zip(queries, contexts, ground_truth):
            gt_claims = self._extract_claims(gt)
            covered = 0
            for claim in gt_claims:
                for c in ctx:
                    if claim.lower() in c.lower():
                        covered += 1
                        break
            scores.append(covered / max(len(gt_claims), 1))
        return statistics.mean(scores)
```

## End-to-End Metrics

### RAG Quality Score
```python
class RAGQualityScore:
    def __init__(self, retriever_eval: dict, generation_eval: dict, weights: dict | None = None):
        self.retrieval = retriever_eval
        self.generation = generation_eval
        self.weights = weights or {
            "retrieval": 0.3,
            "faithfulness": 0.25,
            "relevancy": 0.25,
            "context_precision": 0.1,
            "context_recall": 0.1,
        }

    def compute(self) -> dict:
        retrieval_score = statistics.mean([
            self.retrieval.get("p@10", 0),
            self.retrieval.get("r@10", 0),
            self.retrieval.get("mrr", 0),
        ])

        generation_score = statistics.mean([
            self.generation.get("faithfulness", 0),
            self.generation.get("answer_relevancy", 0),
        ])

        overall = (
            self.weights["retrieval"] * retrieval_score +
            self.weights["faithfulness"] * self.generation.get("faithfulness", 0) +
            self.weights["relevancy"] * self.generation.get("answer_relevancy", 0) +
            self.weights["context_precision"] * self.generation.get("context_precision", 0) +
            self.weights["context_recall"] * self.generation.get("context_recall", 0)
        )

        return {
            "overall": overall,
            "retrieval_score": retrieval_score,
            "generation_score": generation_score,
            "components": {**self.retrieval, **self.generation},
        }
```

## A/B Testing RAG Systems

```python
class RAGABTest:
    def __init__(self, control_system, variant_system):
        self.control = control_system
        self.variant = variant_system

    def compare(self, queries: list[str], ground_truth: list[str], n_per: int = 5) -> dict:
        control_scores = []
        variant_scores = []

        for query, truth in zip(queries, ground_truth):
            for _ in range(n_per):
                c_result = self.control(query)
                v_result = self.variant(query)

                control_scores.append(self._score(c_result, truth))
                variant_scores.append(self._score(v_result, truth))

        from scipy import stats
        t_stat, p_value = stats.ttest_ind(control_scores, variant_scores)

        return {
            "control_mean": statistics.mean(control_scores),
            "variant_mean": statistics.mean(variant_scores),
            "improvement": (statistics.mean(variant_scores) - statistics.mean(control_scores)),
            "p_value": p_value,
            "significant": p_value < 0.05,
        }
```

## Continuous Monitoring

```python
class RAGMonitor:
    def __init__(self):
        self.metrics_history = []

    def record(self, metrics: dict):
        metrics["timestamp"] = datetime.utcnow().isoformat()
        self.metrics_history.append(metrics)

    def detect_drift(self, window: int = 7) -> list[dict]:
        if len(self.metrics_history) < window * 2:
            return []

        recent = self.metrics_history[-window:]
        baseline = self.metrics_history[-(window * 2):-window]

        drifts = []
        for metric in ["p@10", "r@10", "faithfulness", "answer_relevancy"]:
            recent_vals = [m.get(metric, 0) for m in recent if metric in m]
            baseline_vals = [m.get(metric, 0) for m in baseline if metric in m]

            if recent_vals and baseline_vals:
                drop = statistics.mean(baseline_vals) - statistics.mean(recent_vals)
                if drop > 0.05:
                    drifts.append({"metric": metric, "drop": drop})

        return drifts
```

## Key Points
- Evaluate retrieval separately: precision@k, recall@k, MRR, NDCG
- Evaluate generation separately: faithfulness, answer relevancy, context precision/recall
- Compute end-to-end RAG quality score weighted by component importance
- A/B test RAG system changes with statistical significance
- Monitor metrics continuously for drift
- Faithfulness is the single most important RAG metric
- Retrieval quality caps generation quality — fix retrieval first
- Use LLM judge for faithfulness and relevancy evaluation
- Track per-query and aggregate metrics
- Compare against non-RAG baseline to measure retrieval value
