# Fine-Tuning Guide

## Method Selection

| Scenario | Recommended Method | GPU Required | Time | Cost |
|----------|------------------|--------------|------|------|
| <10K examples, single task | LoRA | 1x A100 | 1-4 hrs | $10-50 |
| 10-100K examples | LoRA or QLoRA | 1x A100 | 4-12 hrs | $50-200 |
| Domain adaptation (>100K) | Full FT | 4-8x A100 | 1-7 days | $500-5000 |
| Consumer GPU (<24GB) | QLoRA | 1x RTX 4090 | 2-8 hrs | $5-20 |
| Multi-task / instruction | LoRA (per task) | 1x A100 | 1-2 hrs each | $10-25 each |

## Data Preparation Pipeline

### Format
```json
{"messages": [
  {"role": "system", "content": "You are a medical coding assistant."},
  {"role": "user", "content": "Code: hypertension, benign essential"},
  {"role": "assistant", "content": "I10"}
]}
```

### Quality Checks
- Deduplication: exact + near-duplicate (0.85 similarity threshold)
- Length outliers: remove completions >3σ from mean
- Answer accuracy: validate 5% sample manually
- Toxicity scan: flag and remove offensive examples
- Format consistency: verify all examples match template
- Label balance: check distribution across categories

### Synthetic Data Generation
```python
def generate_training_data(seed_examples, llm, target_count=1000):
    """Generate synthetic training examples from seeds."""
    dataset = []
    for seed in seed_examples:
        prompt = f"""Generate 10 variations of this QA pair:
        
Original Q: {seed['question']}
Original A: {seed['answer']}

Vary wording while preserving meaning and correctness."""
        response = llm.invoke(prompt)
        dataset.extend(parse_variations(response))
    return dataset
```

## Training Configuration

### Learning Rate Guidelines
```
LoRA: 1e-4 to 5e-4 (start: 2e-4)
QLoRA: 1e-4 to 3e-4 (start: 2e-4)
Full FT: 1e-5 to 5e-5 (start: 2e-5)
```

### Schedule
- Warmup: 3-5% of total steps
- Schedule: cosine or linear decay
- Batch size: maximize GPU memory (4-128 depending on model)
- Gradient accumulation: adjust to reach effective batch size of 32-128

## Evaluation Before/After

### Baseline Metrics
```python
before = evaluate_model(base_model, eval_dataset)
after = evaluate_model(fine_tuned_model, eval_dataset)

report = {
    "task_accuracy": {"before": before["accuracy"], "after": after["accuracy"]},
    "general_capability": {"before": before["mmlu"], "after": after["mmlu"]},
    "forgetting": before["mmlu"] - after["mmlu"],
}
```

### Monitoring
- Training loss: should decrease smoothly
- Eval loss: should not diverge from training
- Gradient norms: should be stable (< 5x baseline)
- Learning rate: follow schedule

## Common Issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| Overfitting | Train loss ↓, Eval loss ↑ | Reduce epochs, increase dropout, add data |
| Underfitting | Both losses high | Increase LR, increase rank, more data |
| Catastrophic forgetting | General benchmark drops | Add replay data, reduce LR |
| Training instability | Loss spikes | Reduce LR, gradient clipping |
| Mode collapse | All outputs similar | Increase temperature in generation, add diversity |
