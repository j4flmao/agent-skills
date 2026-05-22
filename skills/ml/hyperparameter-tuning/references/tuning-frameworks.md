# Tuning Frameworks

## Optuna

### Study & Trial Lifecycle
```
import optuna

def objective(trial):
    lr = trial.suggest_float("learning_rate", 1e-5, 1e-1, log=True)
    depth = trial.suggest_int("max_depth", 3, 12)
    units = trial.suggest_int("units", 32, 512, log=True)
    optimizer = trial.suggest_categorical("optimizer", ["adam", "sgd"])
    if optimizer == "sgd":
        momentum = trial.suggest_float("momentum", 0.8, 0.99)
    model = create_model(lr, depth, units, optimizer)
    score = train_and_evaluate(model)
    return score

study = optuna.create_study(study_name="tuning", direction="minimize",
                            storage="sqlite:///tuning.db", load_if_exists=True)
study.optimize(objective, n_trials=100, n_jobs=4)
print(f"Best: {study.best_params}, value: {study.best_value:.4f}")
```

### Pruning
```
def objective(trial):
    model = create_model(trial)
    for epoch in range(100):
        score = train_one_epoch(model)
        trial.report(score, epoch)
        if trial.should_prune():
            raise optuna.TrialPruned()
    return score

study = optuna.create_study(
    direction="minimize",
    pruner=MedianPruner(n_startup_trials=10, n_warmup_steps=20, interval_steps=5),
)
```

| Pruner | Strategy | Best For |
|--------|----------|----------|
| MedianPruner | Stop if below median of completed | General purpose |
| Hyperband | Adaptive resource allocation | Variable budget, many trials |
| PercentilePruner | Stop if below Nth percentile | Known threshold |
| ThanosHoldPruner | Stop if above/below fixed value | Known acceptable range |
| SuccessiveHalving | Aggressive early stopping | Very large search spaces |

| Sampler | Strategy | Best For |
|---------|----------|----------|
| TPESampler | Tree-structured Parzen Estimator | General, mixed spaces |
| RandomSampler | Uniform random | Baseline, very high dim |
| GridSampler | Exhaustive grid | Small discrete spaces |
| CmaEsSampler | CMA-ES evolution | Continuous optimization |
| NSGAIISampler | Multi-objective genetic | Pareto front discovery |

### Multi-Objective
```
study = optuna.create_study(directions=["maximize", "minimize"],
                            sampler=optuna.samplers.NSGAIISampler())
study.optimize(objective, n_trials=100)
for t in study.best_trials:
    print(f"Accuracy: {t.values[0]:.4f}, Latency: {t.values[1]:.2f}ms")
```

## Ray Tune

```
from ray import tune
from ray.tune.schedulers import ASHAScheduler
from ray.tune.search.optuna import OptunaSearch

config = {
    "learning_rate": tune.loguniform(1e-5, 1e-1),
    "batch_size": tune.choice([16, 32, 64, 128]),
    "hidden_units": tune.randint(32, 512),
    "dropout": tune.uniform(0.0, 0.5),
}

tuner = tune.Tuner(
    train_fn,
    param_space=config,
    tune_config=tune.TuneConfig(
        num_samples=100,
        search_alg=OptunaSearch(),
        scheduler=ASHAScheduler(max_t=100, grace_period=10, reduction_factor=3),
        metric="val_loss", mode="min",
    ),
    run_config=tune.RunConfig(name="exp1", storage_path="~/ray_results"),
)
results = tuner.fit()
best_result = results.get_best_result(metric="val_loss", mode="min")
print(f"Best config: {best_result.config}")
```

| Scheduler | Strategy | Best For |
|-----------|----------|----------|
| ASHAScheduler | Asynchronous Hyperband | Distributed, many trials |
| PopulationBasedTraining | Evolve params across workers | Deep learning, long training |
| MedianStoppingRule | Stop if below median | Simple early stopping |

### Resource Allocation
```
tuner = tune.Tuner(
    train_fn,
    tune_config=tune.TuneConfig(num_samples=100, max_concurrent_trials=8),
    run_config=tune.RunConfig(resources_per_trial={"cpu": 2, "gpu": 0.5}),
)
```

## Hyperopt

```
from hyperopt import fmin, tpe, hp, Trials, STATUS_OK, space_eval

space = {
    "learning_rate": hp.loguniform("lr", math.log(1e-5), math.log(1e-1)),
    "max_depth": hp.quniform("depth", 3, 15, 1),
    "n_estimators": hp.quniform("n_est", 50, 500, 10),
    "subsample": hp.uniform("subsample", 0.5, 1.0),
}

def objective(params):
    params = {k: int(v) if k in ("max_depth","n_estimators") else v for k, v in params.items()}
    model = RandomForestClassifier(**params)
    score = cross_val_score(model, X, y, cv=5, scoring="accuracy").mean()
    return {"loss": -score, "status": STATUS_OK}

trials = Trials()
best = fmin(fn=objective, space=space, algo=tpe.suggest, max_evals=200, trials=trials)
```

## Distributed Tuning
```
# Optuna with PostgreSQL for distributed
study = optuna.create_study(storage="postgresql://user:pass@host/db",
                            study_name="distributed-tuning", direction="minimize",
                            load_if_exists=True)

# Ray with cluster
from ray import init; init(address="auto")
study.optimize(objective, n_trials=1000, n_jobs=16)
```

## Best Practices
- Set random seed per trial for reproducibility.
- Log all trials to study database — params, metrics, runtime.
- Warm-start: start new study with best params from previous run.
