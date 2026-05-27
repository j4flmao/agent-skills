# Model Training Evaluation

## Overview
Evaluating model training requires tracking metrics at three stages: pre-training baseline, in-training progress, and post-training benchmark. A robust evaluation strategy detects overfitting, catastrophic forgetting, and quality regressions.

## Evaluation Stages

### Stage 1: Pre-Training Baseline
```python
class BaselineEvaluation:
    def __init__(self, base_model, eval_tasks: list[dict]):
        self.model = base_model
        self.tasks = eval_tasks
        self.results = {}

    def establish_baseline(self) -> dict:
        for task in self.tasks:
            task_name = task["name"]
            metric_fn = task["metric"]

            predictions = []
            for example in task["dataset"][:task.get("sample_size", 100)]:
                output = self.model.generate(example["input"])
                predictions.append({"expected": example["expected"], "actual": output})

            score = metric_fn(predictions)
            self.results[task_name] = {
                "score": score,
                "samples": len(predictions),
                "timestamp": datetime.utcnow().isoformat(),
            }

        return self.results
```

### Stage 2: In-Training Monitoring
```python
class TrainingMonitor:
    def __init__(self, eval_every_n_steps: int = 100):
        self.eval_interval = eval_every_n_steps
        self.history = {"step": [], "eval_loss": [], "perplexity": []}

    def evaluate_checkpoint(self, model, eval_dataset, step: int) -> dict:
        if step % self.eval_interval != 0:
            return None

        self.model = model
        eval_loss = self.compute_eval_loss(eval_dataset)
        perplexity = math.exp(eval_loss)

        self.history["step"].append(step)
        self.history["eval_loss"].append(eval_loss)
        self.history["perplexity"].append(perplexity)

        return {
            "step": step,
            "eval_loss": eval_loss,
            "perplexity": perplexity,
            "overfitting_risk": self._detect_overfitting(),
        }

    def _detect_overfitting(self) -> float:
        if len(self.history["eval_loss"]) < 5:
            return 0.0
        recent = self.history["eval_loss"][-5:]
        trend = recent[-1] - recent[0]
        return max(0, trend)  # Positive = overfitting

    def should_stop_early(self, patience: int = 3) -> bool:
        if len(self.history["eval_loss"]) < patience:
            return False
        recent = self.history["eval_loss"][-patience:]
        return all(recent[i] <= recent[i + 1] for i in range(len(recent) - 1))
```

### Stage 3: Post-Training Benchmark
```python
class PostTrainingEvaluation:
    def __init__(self, trained_model, benchmarks: dict):
        self.model = trained_model
        self.benchmarks = benchmarks

    def run_benchmarks(self) -> dict:
        results = {}
        for name, benchmark in self.benchmarks.items():
            try:
                score = self._evaluate_benchmark(benchmark)
                results[name] = {"score": score, "status": "completed"}
            except Exception as e:
                results[name] = {"error": str(e), "status": "failed"}
        return results

    def compare_to_baseline(self, current: dict, baseline: dict) -> dict:
        comparison = {}
        for task, current_score in current.items():
            baseline_score = baseline.get(task, {}).get("score", 0)
            delta = current_score["score"] - baseline_score if "score" in current_score else 0
            comparison[task] = {
                "current": current_score.get("score", 0),
                "baseline": baseline_score,
                "delta": delta,
                "regressed": delta < -0.02,
                "improved": delta > 0.02,
            }
        return comparison

    def check_catastrophic_forgetting(self, current: dict, baseline: dict, threshold: float = 0.05) -> list:
        forgets = []
        for task, data in self.compare_to_baseline(current, baseline).items():
            if data["regressed"] and abs(data["delta"]) > threshold:
                forgets.append({
                    "task": task,
                    "baseline": data["baseline"],
                    "current": data["current"],
                    "drop": abs(data["delta"]),
                })
        return forgets
```

## Evaluation Tasks

### Standard Benchmarks
```python
BENCHMARKS = {
    "mmlu": {
        "name": "MMLU (Massive Multitask Language Understanding)",
        "tasks": 57,
        "metric": "accuracy",
        "target": 0.7,
    },
    "hellaswag": {
        "name": "HellaSwag (Commonsense Reasoning)",
        "metric": "accuracy",
        "target": 0.8,
    },
    "truthfulqa": {
        "name": "TruthfulQA (Truthfulness)",
        "metric": "mc_accuracy",
        "target": 0.6,
    },
    "human_eval": {
        "name": "HumanEval (Code Generation)",
        "metric": "pass@1",
        "target": 0.3,
    },
}

class BenchmarkRunner:
    def __init__(self, model, tokenizer, batch_size: int = 8):
        self.model = model
        self.tokenizer = tokenizer
        self.batch_size = batch_size

    def evaluate_mmlu(self, dataset) -> dict:
        correct = 0
        total = 0
        for batch in self._batch(dataset, self.batch_size):
            inputs = self.tokenizer(batch["questions"], padding=True, truncation=True, return_tensors="pt")
            outputs = self.model.generate(**inputs, max_new_tokens=5)
            predictions = self.tokenizer.batch_decode(outputs, skip_special_tokens=True)
            for pred, expected in zip(predictions, batch["answers"]):
                if pred.strip().startswith(expected.strip()):
                    correct += 1
                total += 1
        return {"accuracy": correct / max(total, 1), "total": total, "correct": correct}

    def evaluate_code(self, dataset) -> dict:
        import itertools
        passed = 0
        total = 0
        for problem in dataset:
            prompt = f"```python\n{problem['prompt']}\n"
            output = self.model.generate(prompt, max_new_tokens=512)
            code = self._extract_code(output)
            if self._run_tests(code, problem["tests"]):
                passed += 1
            total += 1
        return {"pass@1": passed / max(total, 1), "total": total, "passed": passed}
```

## Custom Task Evaluation

```python
class CustomTaskEvaluator:
    def __init__(self, model, eval_dataset: list[dict], metrics: list[str]):
        self.model = model
        self.dataset = eval_dataset
        self.metrics = metrics

    def evaluate(self) -> dict:
        results = {m: [] for m in self.metrics}
        for example in self.dataset:
            output = self.model.generate(example["input"])

            if "exact_match" in self.metrics:
                results["exact_match"].append(output.strip() == example["expected"].strip())

            if "f1" in self.metrics:
                pred_tokens = set(output.split())
                ref_tokens = set(example["expected"].split())
                if pred_tokens or ref_tokens:
                    precision = len(pred_tokens & ref_tokens) / max(len(pred_tokens), 1)
                    recall = len(pred_tokens & ref_tokens) / max(len(ref_tokens), 1)
                    f1 = 2 * precision * recall / max(precision + recall, 1e-6)
                    results["f1"].append(f1)

            if "rouge_l" in self.metrics:
                results["rouge_l"].append(self._rouge_l(output, example["expected"]))

        return {metric: statistics.mean(scores) for metric, scores in results.items() if scores}
```

## Reporting

```python
class EvaluationReport:
    def generate(self, baseline: dict, current: dict, comparison: dict) -> str:
        lines = ["## Training Evaluation Report\n"]
        lines.append("### Metric Comparison\n")
        lines.append("| Task | Baseline | Current | Delta | Status |")
        lines.append("|------|----------|---------|-------|--------|")

        for task, data in sorted(comparison.items()):
            icon = "✅" if not data.get("regressed") else "❌"
            lines.append(f"| {task} | {data['baseline']:.3f} | {data['current']:.3f} | {data['delta']:+.3f} | {icon} |")

        forgotten = [t for t, d in comparison.items() if d.get("regressed")]
        if forgotten:
            lines.append(f"\n### ⚠️ Catastrophic Forgetting Detected\n")
            for task in forgotten:
                lines.append(f"- {task}")

        return "\n".join(lines)
```

## Key Points
- Establish baseline before training starts (pre-trained model)
- Monitor eval loss and perplexity during training
- Detect overfitting by monitoring eval loss trend
- Early stopping when eval loss plateaus or increases
- Run comprehensive benchmarks after training
- Compare post-training scores to baseline
- Check for catastrophic forgetting on held-out tasks
- Use multiple metrics: accuracy, F1, ROUGE, BLEU, perplexity
- Sample eval subsets during training (fast), full eval after
- Generate comparison reports for each training run
- Track hyperparameters and data version alongside results
