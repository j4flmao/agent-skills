# Multi-Fidelity Optimization

## Successive Halving

```python
# Successive Halving algorithm
def successive_halving(configs, budget_per_config, reduction_factor=3):
    n_configs = len(configs)
    budget = budget_per_config

    while n_configs > 1:
        # Train all configs for `budget` steps
        scores = []
        for config in configs:
            model = train(config, max_steps=budget)
            scores.append(evaluate(model))

        # Keep top 1/reduction_factor configs
        keep = max(1, n_configs // reduction_factor)
        indices = np.argsort(scores)[:keep]
        configs = [configs[i] for i in indices]
        scores = [scores[i] for i in indices]
        n_configs = keep
        budget *= reduction_factor  # Increase budget for survivors

    return configs[0]
```

## HyperBand

| Round | n (configs) | Budget (steps) |
|-------|-------------|----------------|
| 1 | 81 | 1 |
| 2 | 27 | 3 |
| 3 | 9 | 9 |
| 4 | 3 | 27 |
| 5 | 1 | 81 |

```python
# HyperBand implementation
from optuna.pruners import HyperbandPruner

study = optuna.create_study(
    direction="maximize",
    pruner=HyperbandPruner(
        min_resource=1,
        max_resource=81,
        reduction_factor=3
    )
)
study.optimize(objective, n_trials=100)
```

## ASHA (Asynchronous Successive Halving Algorithm)

```python
# Ray Tune ASHA scheduler
from ray.tune.schedulers import ASHAScheduler

asha_scheduler = ASHAScheduler(
    time_attr="training_iteration",
    max_t=100,
    grace_period=10,       # Minimum steps before stopping
    reduction_factor=3,
    brackets=1,             # Number of brackets (1 = aggressive)
)

tuner = tune.Tuner(
    train_func,
    tune_config=tune.TuneConfig(
        scheduler=asha_scheduler,
        num_samples=100,
    ),
    param_space=config_space,
)
results = tuner.fit()
```

## Learning Curve Extrapolation

```python
# Early stopping based on learning curve prediction
import numpy as np

def predict_final_performance(learning_curve, current_step, target_step):
    """Predict final performance from partial learning curve."""
    x = np.arange(len(learning_curve))
    y = np.array(learning_curve)

    # Fit exponential decay model: y = a * exp(-b * x) + c
    from scipy.optimize import curve_fit

    def model(x, a, b, c):
        return a * np.exp(-b * x) + c

    try:
        popt, _ = curve_fit(model, x, y, maxfev=5000)
        predicted = model(target_step, *popt)
        return predicted
    except:
        return np.mean(y[-3:])  # Fallback: average of last 3

# Stop trial if predicted final performance is worse than best seen
if predict_final_performance(curve, step, max_steps) < best_value:
    return Pruned()
```

## Population-Based Training (PBT)

```python
# PBT — evolves hyperparameters during training
def pbt_step(models, population_size=20):
    """One PBT step: exploit + explore."""
    models.sort(key=lambda m: m.score)

    # Top half: continue training
    for i in range(population_size // 2, population_size):
        # Bottom half: copy from top, mutate
        donor = models[i - population_size // 2]
        models[i].weights = donor.weights.copy()

        # Mutate hyperparameters
        for hp in ['lr', 'momentum', 'weight_decay']:
            if np.random.random() < 0.2:
                models[i].config[hp] *= 1.2 ** np.random.choice([-1, 1])

        # Train with mutated hyperparameters
        models[i].train(epochs=1)

    return models
```

## When to Use Each

| Method | Budget | Parallel Resources | Best For |
|--------|--------|-------------------|----------|
| Grid search | Unlimited | Limited | Low-dim, cheap evaluations |
| Random search | Unlimited | Unlimited | Baseline, exploration |
| Bayesian opt | Limited | < 10 | Medium-dim, expensive |
| HyperBand | Limited | 100+ | Large-scale, expensive |
| ASHA | Limited | Unlimited | Large-scale, any budget |
| PBT | Adaptive | 10-100 | Deep learning training |
| Neural Architecture Search | Very large | Many | Architecture discovery |
