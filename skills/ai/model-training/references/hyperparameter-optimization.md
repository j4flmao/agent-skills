# Hyperparameter Optimization

## Overview
Hyperparameter optimization (HPO) systematically searches the hyperparameter space to find configurations that minimize validation loss or maximize task metrics. For LLM training, the search space is high-dimensional and each trial is expensive, so efficient search strategies are critical.

## Search Strategies

### Grid Search
```python
# Exhaustive search over discrete values
# PRO: Simple, reproducible
# CON: Scales poorly (curse of dimensionality)
# Best for: 1-3 parameters with known ranges

grid = {
    "learning_rate": [1e-4, 2e-4, 5e-4],
    "lora_r": [8, 16, 32],
    "weight_decay": [0.01, 0.05, 0.1],
}
# Total: 3 * 3 * 3 = 27 trials
# At 2 hrs/trial = 54 GPU-hours
```

### Random Search
```python
# Sample uniformly from parameter distributions
# PRO: Often finds good configs faster than grid
# CON: No learning from previous trials
# Best for: 3-6 parameters, budget-constrained
# Theory: Random search covers more unique values per parameter

import random

def random_search(n_trials=20):
    for _ in range(n_trials):
        config = {
            "learning_rate": 10 ** random.uniform(-4.3, -3.0),  # log-uniform
            "lora_r": random.choice([8, 16, 32, 64]),
            "lora_alpha": random.choice([16, 32, 64, 128]),
            "weight_decay": random.uniform(0.0, 0.1),
            "warmup_ratio": random.uniform(0.01, 0.1),
            "lora_dropout": random.uniform(0.0, 0.3),
        }
        yield config
```

### Bayesian Optimization (Optuna)
```python
import optuna
from optuna.samplers import TPESampler

# TPE (Tree-structured Parzen Estimator)
# Builds probabilistic model of objective function
# Samples promising regions based on expected improvement
# 5-10x more efficient than random search

def create_study(pruning=True):
    sampler = TPESampler(
        n_startup_trials=5,
        n_ei_candidates=24,
        multivariate=True,
        group=True,
    )
    pruner = optuna.pruners.MedianPruner(
        n_startup_trials=5,
        n_warmup_steps=50,
        interval_steps=10,
    ) if pruning else optuna.pruners.NopPruner()
    return optuna.create_study(
        direction="minimize",
        sampler=sampler,
        pruner=pruner,
        study_name="lora-ft-optimization",
    )
```

### Optuna with Pruning (Early Stop Bad Trials)
```python
def objective(trial):
    lr = trial.suggest_float("learning_rate", 5e-5, 5e-4, log=True)
    lora_r = trial.suggest_int("lora_r", 8, 64)
    lora_alpha = trial.suggest_int("lora_alpha", 16, 128, step=16)
    weight_decay = trial.suggest_float("weight_decay", 0.0, 0.1)
    warmup_ratio = trial.suggest_float("warmup_ratio", 0.01, 0.1)
    dropout = trial.suggest_float("lora_dropout", 0.0, 0.3)

    model = get_peft_model(base_model, LoraConfig(
        r=lora_r, lora_alpha=lora_alpha, lora_dropout=dropout
    ))

    args = TrainingArguments(
        output_dir=f"./optuna-trial-{trial.number}",
        learning_rate=lr,
        weight_decay=weight_decay,
        warmup_ratio=warmup_ratio,
        num_train_epochs=2,
        report_to="none",
        logging_steps=10,
        save_strategy="no",
        evaluation_strategy="steps",
        eval_steps=50,
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        tokenizer=tokenizer,
        callbacks=[optuna.integration.TFPruningCallback(trial, "eval_loss")],
    )
    trainer.train()
    return trainer.evaluate()["eval_loss"]

study = optuna.create_study(direction="minimize")
study.optimize(objective, n_trials=30, timeout=48 * 3600)  # 48-hour budget
```

### Ray Tune (Distributed HPO)
```python
from ray import tune
from ray.tune.schedulers import ASHAScheduler

# ASHA: Asynchronous Successive Halving Algorithm
# Allocates more resources to promising configs, stops poor ones

scheduler = ASHAScheduler(
    max_t=100,    # max training iterations
    grace_period=10,
    reduction_factor=3,
)
analysis = tune.run(
    train_fn,
    config={
        "learning_rate": tune.loguniform(5e-5, 5e-4),
        "lora_r": tune.choice([8, 16, 32, 64]),
        "weight_decay": tune.uniform(0.0, 0.1),
        "warmup_ratio": tune.uniform(0.01, 0.1),
    },
    num_samples=30,
    scheduler=scheduler,
    resources_per_trial={"gpu": 1},
)
best_config = analysis.get_best_config(metric="eval_loss", mode="min")
```

## Key Hyperparameter Ranges

### SFT / Instruction Tuning
| Parameter | LoRA Range | Full FT Range | Default | Effect |
|-----------|:----------:|:-------------:|:-------:|--------|
| Learning rate | 1e-4 to 5e-4 | 1e-5 to 5e-5 | 2e-4 / 2e-5 | Most important: controls convergence speed |
| LoRA rank | 8-64 | N/A | 16 | Higher = more capacity, more overfit risk |
| LoRA alpha | 16-128 | N/A | 32 | Scaling factor. alpha/r = effective LR scaling |
| Batch size (eff.) | 16-128 | 32-256 | 32 | Larger = more stable, more memory |
| Warmup ratio | 0.03-0.1 | 0.03-0.1 | 0.03 | Helps stabilize early training |
| Weight decay | 0.01-0.1 | 0.01-0.1 | 0.01 | Prevents overfitting (not on bias/norm) |
| Dropout | 0.0-0.3 | 0.0-0.1 | 0.05 | Regularization for LoRA |
| Epochs | 3-10 | 2-5 | 3 | More data = fewer epochs needed |

### DPO Preference Tuning
| Parameter | Range | Default | Effect |
|-----------|:-----:|:-------:|--------|
| Learning rate | 5e-7 to 5e-6 | 5e-6 | Lower than SFT — prefer slow alignment |
| Beta (KL penalty) | 0.01-0.5 | 0.1 | Higher = less deviation from reference |
| Batch size | 8-64 | 16 | Larger = better preference estimation |
| Max prompt length | 512-2048 | 1024 | Truncate prompts to save memory |
| Max target length | 256-1024 | 512 | Response length for chosen/rejected |

### Pre-training
| Parameter | Range | Default | Note |
|-----------|:-----:|:-------:|------|
| Learning rate | 1e-4 to 3e-4 | 3e-4 | Often follows scaling laws |
| Batch size | 512-4096 | 1024 | Very large batches require LR warmup |
| Warmup steps | 1000-10000 | 2000 | More steps for larger batch sizes |
| Weight decay | 0.01-0.1 | 0.1 | Chinchilla optimal: 0.1 |

## Learning Rate Range Test

```python
# Find the optimal LR by increasing LR exponentially over a short run
# Plot loss vs LR — pick LR at the steepest descent point

def lr_find(model, dataloader, optimizer_cls, device, start_lr=1e-7, end_lr=1, num_steps=200):
    optimizer = optimizer_cls(model.parameters(), lr=start_lr)
    lr_mult = (end_lr / start_lr) ** (1.0 / num_steps)
    losses, lrs = [], []

    model.train()
    for step, batch in enumerate(dataloader):
        if step >= num_steps:
            break
        batch = {k: v.to(device) for k, v in batch.items()}
        optimizer.zero_grad()
        loss = model(**batch).loss
        loss.backward()
        optimizer.step()

        losses.append(loss.item())
        lrs.append(optimizer.param_groups[0]["lr"])
        optimizer.param_groups[0]["lr"] *= lr_mult

    return lrs, losses
    # Optimal LR = lr at minimum loss (or point before divergence)
```

## Batch Size Scaling Rules

```python
# Linear scaling: double batch → double LR
# Square root scaling: double batch → sqrt(2) * LR
# For LLMs: square root scaling is more common

# Effective batch = per_device_train_batch_size * gradient_accumulation_steps * num_gpus
# Example: 4 * 8 * 8 = 256 effective batch size

# Rule of thumb:
# - Too small (< 16): noisy gradients, unstable
# - Just right (32-128): good stability-efficiency tradeoff
# - Too large (> 512): diminishing returns, may need more LR warmup
```

## Warmup Strategy Selection

| Strategy | When to Use | Implementation |
|----------|-------------|----------------|
| Linear warmup | Standard fine-tuning | LR: 0 → target in N steps |
| Constant warmup | Pre-training | Hold at small LR for N steps |
| Inverse exp warmup | Very large batches | Exponential decay of LR increase |
| No warmup | Very short LoRA runs | Start at target LR (risk: early instability) |

### Warmup Schedule Comparison
```python
# Linear warmup: simplest, most common
linear = lambda step: min(1.0, step / warmup_steps)

# Cosine warmup: smoother transition
cosine = lambda step: (1 - math.cos(min(step, warmup_steps) / warmup_steps * math.pi)) / 2

# Exponential warmup: gradual start
exponential = lambda step: 1.0 - math.exp(-5.0 * step / warmup_steps)

# Apply to optimizer:
for param_group in optimizer.param_groups:
    param_group["lr"] = target_lr * schedule_fn(current_step)
```

## LoRA Rank Selection Guide

### Rank Selection by Task Complexity
| Rank | Task Type | Examples | Memory Added |
|:----:|-----------|----------|:-----------:|
| 4-8 | Simple classification | Sentiment, intent | ~0.3% |
| 8-16 | Standard | QA, summarization | ~0.5% |
| 16-32 | Complex | Code generation, reasoning | ~1% |
| 32-64 | Domain-heavy | Medical, legal, scientific | ~2% |

### Rank vs Overfitting
- Low rank (4-8): Low capacity, less overfitting, good for small data
- High rank (32-64): High capacity, more overfitting risk, needs more data
- Rule: rank ≤ 4 * sqrt(N) where N = training examples

## Automated HPO with W&B Sweeps
```python
# W&B Sweeps for distributed HPO
sweep_config = {
    "method": "bayes",
    "metric": {"name": "eval_loss", "goal": "minimize"},
    "parameters": {
        "learning_rate": {"distribution": "log_uniform", "min": -10.0, "max": -7.0},
        "lora_r": {"values": [8, 16, 32, 64]},
        "weight_decay": {"distribution": "uniform", "min": 0.0, "max": 0.1},
        "warmup_ratio": {"distribution": "uniform", "min": 0.01, "max": 0.1},
    },
    "early_terminate": {
        "type": "hyperband",
        "min_iter": 3,
        "eta": 2,
        "s": 2,
    },
}
# sweep_id = wandb.sweep(sweep_config, project="lora-hpo")
# wandb.agent(sweep_id, function=train_fn, count=30)
```

## Key Points
- Bayesian optimization (TPE) is 5-10x more sample-efficient than random search
- Prune bad trials early — don't waste compute on clearly poor configs
- LoRA rank should scale with data size and task complexity
- Learning rate is the single most important hyperparameter to tune
- Log-uniform sampling works better for LR (multiplicative scale)
- Always fix the seed across trials to reduce noise in HPO comparisons
- Use validation loss, not training loss, as the optimization objective
- Batch size scaling: larger batches need more warmup steps
- W&B sweeps and Optuna are the most popular tools for LLM HPO
- Budget: allocate 10-20% of total training compute to HPO
