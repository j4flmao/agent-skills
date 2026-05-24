# Distributed Hyperparameter Tuning

## Ray Tune Distributed

```python
import ray
from ray import tune
from ray.tune.search.optuna import OptunaSearch

# Initialize Ray cluster
ray.init(address="auto")

# Distributed tuning with Ray Tune
tuner = tune.Tuner(
    training_function,
    tune_config=tune.TuneConfig(
        num_samples=1000,
        max_concurrent_trials=50,  # Run 50 trials in parallel
        search_alg=OptunaSearch(),
        scheduler=ASHAScheduler(max_t=100),
    ),
    param_space={
        "lr": tune.loguniform(1e-5, 1e-1),
        "batch_size": tune.choice([32, 64, 128, 256]),
        "hidden_dim": tune.randint(64, 512),
        "dropout": tune.uniform(0.1, 0.5),
        "num_layers": tune.randint(1, 6),
    },
    run_config=ray.train.RunConfig(
        storage_path="s3://my-bucket/tune-results",
        name="distributed-tuning-v1",
    ),
)
results = tuner.fit()
```

## Optuna Distributed

```python
import optuna
from optuna.storages import RDBStorage

# PostgreSQL-backed distributed storage
storage = RDBStorage(
    url="postgresql://user:pass@host:5432/optuna",
    heartbeat_interval=60,
    grace_period=120,
)

study = optuna.create_study(
    storage=storage,
    study_name="distributed-tuning",
    direction="maximize",
    load_if_exists=True,
)
study.optimize(objective, n_trials=1000)
```

## Evolutionary Strategies

```python
# CMA-ES for black-box optimization
import cma

def cma_optimization(objective, initial_params, sigma=0.5):
    es = cma.CMAEvolutionStrategy(initial_params, sigma)

    while not es.stop():
        solutions = es.ask()  # Generate candidates
        fitness = [objective(s) for s in solutions]
        es.tell(solutions, fitness)
        es.logger.add()
        es.disp()

    return es.result.xbest
```

## Neural Architecture Search (NAS)

| Method | GPU-Days | Performance | Search Space |
|--------|----------|-------------|--------------|
| Random NAS | 10-50 | Good | Any |
| ENAS | 1-5 | Very Good | DAG |
| DARTS | 1-4 | Good | Cell-based |
| Bayesian NAS | 2-10 | Very Good | Any |
| RL-based NAS | 100-1000 | Very Good | Any |
| Zero-shot NAS | 0.1-1 | Acceptable | Any |

```python
# DARTS — Differentiable Architecture Search (simplified)
class MixedOp(nn.Module):
    def __init__(self, operations):
        super().__init__()
        self.ops = nn.ModuleList(operations)
        self.alphas = nn.Parameter(torch.randn(len(operations)))

    def forward(self, x):
        weights = F.softmax(self.alphas, dim=0)
        return sum(w * op(x) for w, op in zip(weights, self.ops))
```

## Infrastructure Requirements

| Scale | Trials | GPUs | Time | Storage |
|-------|--------|------|------|---------|
| Small | < 100 | 1-4 | Hours | Local |
| Medium | 100-1000 | 4-16 | Days | Shared FS |
| Large | 1000-10000 | 16-128 | Weeks | S3/GCS |
| Massive | 10K-100K | 128-1024 | Months | Distributed storage |

## Best Practices

| Practice | Why |
|----------|-----|
| Use ASHA + Bayesian for most scenarios | Best trade-off between speed and optimality |
| Log all configs and results to central DB | Necessary for distributed tuning |
| Set trial timeouts | Prevent runaway trials (GPU hours wasted) |
| Warm-start with prior results | Reduce search space from best-known configs |
| Use population-based training for DL | Evolves hyperparameters during training |
| Monitor for failed trials | Network issues, OOM can silently kill trials |
| Checkpoint models at regular intervals | Resume interrupted trials without losing progress |
