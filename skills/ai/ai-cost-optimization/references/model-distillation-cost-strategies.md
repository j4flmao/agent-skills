# Model Distillation and Cost Strategies

## Overview
Model distillation is the most aggressive cost optimization technique, reducing per-query cost by 10-100x. It trains a small "student" model to replicate the behavior of a large "teacher" model on a specific task. While requiring significant upfront investment (data collection, training compute, evaluation), distillation delivers transformative cost savings for high-volume, task-specific workloads.

## When to Distill

### Decision: Distill vs. Route vs. Cache

```
Distill when:
├── Query volume > 50K/day AND growing
├── Task is focused (single domain: support, code, classification)
├── Quality requirements are measurable and stable
├── You have ML infra for fine-tuning
└── Payback period < 3 months is acceptable

Do NOT distill when:
├── Query volume < 10K/day (cache + routing is sufficient)
├── Task diversity is high (general assistant)
├── Task requirements change frequently (weekly prompts changes)
├── No ML engineering resources available
└── Frontier-level quality required for ALL responses
```

### Cost-Benefit Analysis

```python
class DistillationROI:
    def evaluate(self, queries_per_day: int, teacher_cost_per_query: float,
                 teacher_tokens_per_query: int, student_cost_per_token: float,
                 data_collection_cost: float, training_cost: float,
                 eval_cost: float, maint_cost_per_month: float) -> dict:
        current_monthly = queries_per_day * teacher_cost_per_query * 30
        student_monthly = (queries_per_day * teacher_tokens_per_query
                          * student_cost_per_token * 30)
        monthly_savings = current_monthly - student_monthly
        upfront_cost = data_collection_cost + training_cost + eval_cost
        payback_months = upfront_cost / max(monthly_savings, 0.01)
        three_year_savings = monthly_savings * 36 - upfront_cost - maint_cost_per_month * 36

        return {
            "current_monthly": round(current_monthly, 2),
            "student_monthly": round(student_monthly, 2),
            "monthly_savings": round(monthly_savings, 2),
            "upfront_cost": round(upfront_cost, 2),
            "payback_months": round(payback_months, 1),
            "annual_savings": round(monthly_savings * 12, 2),
            "three_year_savings": round(three_year_savings, 2),
            "roi_pct": round((monthly_savings * 12 / max(upfront_cost, 1)) * 100, 1),
            "recommend": payback_months < 3,
        }
```

## Distillation Techniques

### 1. Response Distillation (Most Common)
Generate teacher responses for training data, fine-tune student on input → output pairs.

```python
class ResponseDistillation:
    def __init__(self, teacher_model: str, student_model_name: str):
        self.teacher = teacher_model
        self.student_name = student_model_name

    def generate_training_data(self, queries: list[str],
                               output_path: str, max_queries: int = 50000):
        pairs = []
        for i, q in enumerate(queries[:max_queries]):
            response = self._call_teacher(q)
            pairs.append({"messages": [
                {"role": "user", "content": q},
                {"role": "assistant", "content": response},
            ]})
            if (i + 1) % 1000 == 0:
                print(f"Generated {i + 1}/{min(len(queries), max_queries)} pairs")
        with open(output_path, "w") as f:
            json.dump(pairs, f)
        print(f"Data cost: ${len(pairs) * self._teacher_cost(q):.2f}")

    def _call_teacher(self, query: str) -> str:
        return openai.chat.completions.create(
            model=self.teacher,
            messages=[{"role": "user", "content": query}],
            temperature=0.0,  # deterministic for consistent training data
        ).choices[0].message.content

    def _teacher_cost(self, query: str) -> float:
        return len(query) / 4 / 1000 * 0.01  # approximate
```

**Data requirements:**
- Minimum: 5,000 high-quality pairs
- Typical: 10,000-50,000 pairs
- Optimal: 100,000+ pairs for complex tasks
- Budget: $100-$5,000 for data generation (one-time)

### 2. Logit Distillation (Higher Quality)
Train student on teacher's output probability distribution, not just the final token.

```python
import torch
import torch.nn.functional as F

class LogitDistillationLoss:
    def __init__(self, temperature: float = 2.0, alpha: float = 0.7):
        self.T = temperature
        self.alpha = alpha

    def __call__(self, student_logits: torch.Tensor, teacher_logits: torch.Tensor,
                 labels: torch.Tensor) -> torch.Tensor:
        soft_targets = F.softmax(teacher_logits / self.T, dim=-1)
        soft_prob = F.log_softmax(student_logits / self.T, dim=-1)
        distill_loss = F.kl_div(soft_prob, soft_targets, reduction="batchmean")
        distill_loss *= self.T ** 2
        ce_loss = F.cross_entropy(student_logits, labels)
        return self.alpha * distill_loss + (1 - self.alpha) * ce_loss
```

**Advantages over response distillation:**
- Captures teacher's uncertainty and probability distribution
- Better generalization on edge cases
- 2-5% higher quality on held-out evaluations
- More data-efficient (works with 5K-10K examples)

### 3. Task-Specific Distillation
Distill only the specific capabilities needed, not the full model behavior.

```python
class TaskDistillation:
    def __init__(self):
        self.task_definitions = {
            "classification": {
                "prompt_template": "Classify the following text as {labels}. Text: {input}",
                "output_format": "single label",
                "eval_metric": "accuracy",
            },
            "extraction": {
                "prompt_template": "Extract {fields} from: {input}",
                "output_format": "JSON object",
                "eval_metric": "F1 exact match",
            },
            "summarization": {
                "prompt_template": "Summarize: {input}",
                "output_format": "2-3 sentences",
                "eval_metric": "ROUGE-L",
            },
        }

    def create_training_prompts(self, raw_data: list[dict],
                                task: str, teacher_model: str) -> list[dict]:
        task_def = self.task_definitions[task]
        pairs = []
        for item in raw_data:
            prompt = task_def["prompt_template"].format(**item)
            response = self._call_teacher(teacher_model, prompt)
            pairs.append({"prompt": prompt, "completion": response, "raw": item})
        return pairs
```

### 4. Data Augmentation for Distillation

```python
class DistillationDataAugmenter:
    def augment_queries(self, seed_queries: list[str],
                        paraphrases_per_query: int = 5) -> list[str]:
        augmented = []
        for q in seed_queries:
            augmented.append(q)
            for _ in range(paraphrases_per_query):
                para = self._paraphrase(q)
                augmented.append(para)
        return augmented

    def _paraphrase(self, text: str) -> str:
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": f"Paraphrase this query preserving meaning: {text}"
            }],
            temperature=0.8,
        )
        return response.choices[0].message.content

    def augment_with_variations(self, seed: str, n: int = 10) -> list[str]:
        variations = [seed]
        types = ["formal", "casual", "shorter", "with more context",
                 "as a question", "as a command", "with examples"]
        for t in types[:n]:
            response = openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user",
                           "content": f"Rewrite this {t}: {seed}"}],
                temperature=0.7,
            )
            variations.append(response.choices[0].message.content)
        return variations
```

## Training and Deployment

### Fine-Tuning Pipeline

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer
from datasets import Dataset
import torch

class DistillationTrainer:
    def __init__(self, base_model: str = "microsoft/Phi-3.5-mini-instruct"):
        self.base_model = base_model
        self.tokenizer = AutoTokenizer.from_pretrained(base_model)
        self.tokenizer.pad_token = self.tokenizer.eos_token

    def prepare_dataset(self, pairs: list[dict]) -> Dataset:
        def format_fn(example):
            return self.tokenizer(
                example["prompt"],
                text_target=example["completion"],
                truncation=True,
                max_length=2048,
                padding="max_length",
            )
        dataset = Dataset.from_list(pairs)
        return dataset.map(format_fn, batched=True)

    def train(self, train_data: list[dict], output_dir: str,
              val_data: Optional[list[dict]] = None,
              num_epochs: int = 3, learning_rate: float = 2e-5):
        model = AutoModelForCausalLM.from_pretrained(
            self.base_model,
            torch_dtype=torch.float16,
            device_map="auto",
        )
        train_dataset = self.prepare_dataset(train_data)
        args = TrainingArguments(
            output_dir=output_dir,
            per_device_train_batch_size=4,
            gradient_accumulation_steps=4,
            num_train_epochs=num_epochs,
            learning_rate=learning_rate,
            fp16=True,
            save_strategy="epoch",
            evaluation_strategy="epoch" if val_data else "no",
            logging_steps=100,
            report_to="none",
        )
        trainer = Trainer(
            model=model,
            args=args,
            train_dataset=train_dataset,
            eval_dataset=self.prepare_dataset(val_data) if val_data else None,
        )
        trainer.train()
        model.save_pretrained(output_dir)
        self.tokenizer.save_pretrained(output_dir)
        return output_dir

    def train_with_lora(self, train_data: list[dict], output_dir: str,
                        r: int = 16, alpha: int = 32) -> str:
        from peft import LoraConfig, get_peft_model
        model = AutoModelForCausalLM.from_pretrained(
            self.base_model, torch_dtype=torch.float16, device_map="auto",
        )
        lora_config = LoraConfig(
            r=r,
            lora_alpha=alpha,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM",
        )
        model = get_peft_model(model, lora_config)
        model.print_trainable_parameters()
        train_dataset = self.prepare_dataset(train_data)
        args = TrainingArguments(
            output_dir=output_dir,
            per_device_train_batch_size=8,
            gradient_accumulation_steps=2,
            num_train_epochs=3,
            learning_rate=2e-4,
            fp16=True,
            logging_steps=50,
            report_to="none",
        )
        trainer = Trainer(model=model, args=args, train_dataset=train_dataset)
        trainer.train()
        model.save_pretrained(output_dir)
        return output_dir
```

### LoRA vs Full Fine-Tuning

| Aspect | LoRA | Full Fine-Tuning |
|---|---|---|
| Trainable parameters | 0.1-1% | 100% |
| GPU memory (7B) | 16 GB (A10) | 56 GB (A100) |
| Training time (7B, 50K samples) | 2-4 hours | 12-24 hours |
| Quality vs teacher | 95-98% | 98-99.5% |
| Model size on disk | 10-50 MB (adapters) | 14 GB |
| Deployment complexity | Base + adapters | Single model |
| Switching tasks | Multiple adapters, one base | Need separate model per task |

**Recommendation**: Use LoRA for initial distillation (faster, cheaper). Only move to full fine-tuning if LoRA quality is insufficient.

### Deployment Options

```python
class DistilledModelDeployer:
    @staticmethod
    def deploy_api(model_path: str, provider: str = "together") -> dict:
        if provider == "together":
            return {"endpoint": f"together/{model_path}", "cost_per_1m": 0.10}
        if provider == "fireworks":
            return {"endpoint": f"fireworks/{model_path}", "cost_per_1m": 0.08}
        if provider == "modal":
            return {"endpoint": f"modal/{model_path}", "cost_per_1m": 0.05}
        raise ValueError(f"Unknown provider: {provider}")

    @staticmethod
    def deploy_self_hosted(model_path: str, gpu_type: str = "A10") -> dict:
        gpu_costs = {"A10": 0.80, "A100": 2.50, "L4": 0.60}
        hourly = gpu_costs.get(gpu_type, 1.0)
        tps = {"7B": 1500, "3B": 3000, "1B": 5000}
        model_size = self._estimate_size(model_path)
        throughput = tps.get(model_size, 1000)
        cost_per_1m_tokens = (hourly / (throughput * 3600)) * 1_000_000
        return {
            "gpu_type": gpu_type,
            "hourly_cost": hourly,
            "throughput_tps": throughput,
            "cost_per_1m_tokens": round(cost_per_1m_tokens, 6),
        }

    @staticmethod
    def _estimate_size(model_path: str) -> str:
        for size in ["70B", "13B", "8B", "7B", "3B", "1B"]:
            if size in model_path:
                return size
        return "7B"
```

## Evaluating Distillation Quality

### Evaluation Framework

```python
import numpy as np
from typing import Callable, Optional
from collections import defaultdict

class DistillationEvaluator:
    def __init__(self, teacher_model: str, student_model: str):
        self.teacher = teacher_model
        self.student = student_model

    def evaluate(self, eval_queries: list[str],
                 metrics: list[str] = None,
                 student_fn: Optional[Callable] = None) -> dict:
        metrics = metrics or ["exact_match", "semantic_similarity", "task_accuracy"]
        results = defaultdict(list)
        for q in eval_queries:
            teacher_resp = self._call_teacher(q)
            student_resp = student_fn(q) if student_fn else self._call_student(q)
            if "exact_match" in metrics:
                results["exact_match"].append(1.0 if teacher_resp == student_resp else 0.0)
            if "semantic_similarity" in metrics:
                results["semantic_similarity"].append(self._semantic_sim(teacher_resp, student_resp))
            if "length_ratio" in metrics:
                results["length_ratio"].append(len(student_resp) / max(len(teacher_resp), 1))
        return {
            metric: {
                "mean": round(np.mean(values), 4),
                "std": round(np.std(values), 4),
                "p50": round(np.median(values), 4),
                "p95": round(np.percentile(values, 95), 4),
            }
            for metric, values in results.items()
        }

    def acceptance_test(self, eval_queries: list[str], threshold: float = 0.95,
                        acceptance_criteria: str = "semantic_similarity") -> dict:
        results = self.evaluate(eval_queries, metrics=[acceptance_criteria])
        score = results[acceptance_criteria]["mean"]
        passed = score >= threshold
        return {
            "passed": passed,
            "score": score,
            "threshold": threshold,
            "samples": len(eval_queries),
            "gap": round(threshold - score, 4),
        }

    def _semantic_sim(self, a: str, b: str) -> float:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")
        emb_a = model.encode(a, normalize_embeddings=True)
        emb_b = model.encode(b, normalize_embeddings=True)
        return float(np.dot(emb_a, emb_b))
```

### Quality Thresholds

| Task | Minimum Acceptable Score | Target Score | Measurement |
|---|---|---|---|
| Classification | 0.97 | 0.99 | Exact match accuracy |
| Extraction | 0.95 | 0.98 | F1 exact match |
| Summarization | 0.90 | 0.95 | Semantic similarity |
| Code generation | 0.90 | 0.95 | Functional correctness |
| General Q&A | 0.92 | 0.96 | Semantic similarity |
| Creative writing | 0.85 | 0.92 | Human evaluation |

## Cost Comparison Table

| Model | Cost/1M Tokens | Queries/Day for $1000/mo | Quality vs GPT-4o |
|---|---|---|---|
| GPT-4o (API) | $10.00 output | 3,333 | Baseline |
| GPT-4o-mini (API) | $0.60 output | 55,555 | 90-95% |
| Distilled 7B (API-hosted) | $0.10 output | 333,333 | 95-98% |
| Distilled 3B (self-hosted) | $0.02 output | 1,666,666 | 92-96% |
| Distilled 1B (self-hosted) | $0.005 output | 6,666,666 | 85-92% |

## Key Points
- Model distillation: 10-100x cost reduction for task-specific workloads
- Minimum viable data: 5,000-10,000 teacher-student pairs
- LoRA fine-tuning: 95-98% quality at 1-5% of full training cost
- Response distillation is simplest; logit distillation is higher quality
- Always evaluate with semantic similarity, not just exact match
- Payback period for distillation: typically 1-6 months depending on volume
- Distillation + routing: use cheap distilled model + cascade to frontier for edge cases
- Data augmentation with paraphrasing improves student generalization
- Distillation locks in current model behavior — plan for teacher model upgrades
- API-hosted distilled models (Together, Fireworks) offer no-ops deployment
- Self-hosting distilled models requires 3-16 GB VRAM for 1B-7B models
- Task-specific distillation outperforms general distillation for focused use cases
- Monitor student model quality drift over time as data distribution shifts
- Combine distillation with caching for maximum cost savings (30-50x total)
