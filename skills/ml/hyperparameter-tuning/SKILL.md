---
name: ml-hyperparameter-tuning
description: >
  Use this skill when performing hyperparameter tuning, optimizing model performance via search strategies, or configuring tuning frameworks (Optuna, Ray Tune, Hyperopt).
  This skill enforces: search space definition, strategy selection (grid/random/Bayesian), framework configuration, pruning/early stopping, distributed execution, multi-objective optimization.
  Do NOT use for: model architecture search (NAS), feature selection, threshold tuning for classification, experiment tracking (use ml-experiment-tracking).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, hyperparameter, optimization, phase-11]
---

# ML Hyperparameter Tuning

## Purpose
Design hyperparameter tuning pipelines with structured search spaces, optimal strategy selection, and production-ready framework configuration.

## Agent Protocol

### Trigger
User request includes: hyperparameter tuning, Optuna, Ray Tune, Hyperopt, grid search, random search, Bayesian optimization, pruning, early stopping, search space, trial, study, HP optimization, parameter sweep, learning rate search, neural architecture HP, auto-ML, parameter search, tune model, optimize hyperparams, model selection.

### Input Context
Before activating, verify:
- Model type and training pipeline (sklearn, PyTorch, TensorFlow, XGBoost/LightGBM, custom).
- Approximate training time per trial (seconds, minutes, hours).
- Available compute resources (single machine, multi-core, multi-GPU, cluster, cloud).
- Which hyperparameters are known to matter from prior experiments or domain knowledge.
- Whether the data fit criteria is known — smaller search space for limited budget.
- Whether cross-validation is needed inside each trial (adds Nx cost to each evaluation).
- Whether the objective function is deterministic or stochastic (affects number of repeats needed).

### Protocol
1. Identify model type and which hyperparameters matter most (learning rate, depth, regularization, batch size, optimizer, architecture-specific params).
2. Define search space with ranges, distributions (uniform, log-uniform, categorical), and conditional dependencies between parameters.
3. Select search strategy based on budget and dimensionality of the search space — grid for <4 dims, random for cheap high-dim, Bayesian for expensive trials.
4. Configure tuning framework with study/trial management, sampling algorithm, and result persistence.
5. Set pruning policy for early stopping of unpromising trials to save compute — median, Hyperband, ASHA.
6. Enable distributed execution for parallel trial evaluation across workers.
7. Configure multi-objective optimization if multiple competing metrics exist (accuracy vs latency, F1 vs model size).
8. Define trial logging, checkpointing, and result persistence to experiment tracking system.
9. Plan post-tuning analysis: parameter importance, best config stability, optimization convergence.

### Output Artifact
Hyperparameter tuning setup with search space design, strategy selection, framework configuration, pruning policy, and distributed execution plan.

### Response Format
```
## Tuning Config
### Search Space
Param: {name} | Type: {float/int/categorical} | Range: [{min}, {max}] | Scale: {linear/log}
Param: {name} | Type: {float/int/categorical} | Choices: [{a}, {b}, {c}]

### Strategy
Method: {grid / random / Bayesian / TPE / CMA-ES}
Budget: {N trials} | Parallel: {N workers} | Timeout: {duration}

### Framework
Tool: {Optuna / Ray Tune / Hyperopt}
Study: {name} | Direction: {minimize / maximize}
Metric: {metric_name} | Pruning: {none / median / Hyperband / ASHA}

### Distributed
Executor: {local / Dask / Ray / Kubernetes}
Workers: {N} | Timeout: {duration} | Fault Tolerance: {true/false}

### Multi-Objective
Objectives: [{metric1}, {metric2}]
Weights: [{w1}, {w2}] | Strategy: {Pareto / scalarized}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Search space defined with all tunable parameters and their distributions and scales.
- [ ] Search strategy selected based on trial budget and dimensionality of the space.
- [ ] Tuning framework configured with study/trial lifecycle and database storage.
- [ ] Pruning policy set to terminate unpromising trials early with minimum budget checks.
- [ ] Distributed execution configured with appropriate parallelism and fault tolerance.
- [ ] Result persistence configured for best params and trial history.
- [ ] Random seed set for reproducibility of each individual trial.
- [ ] Parameter importance analysis planned after tuning completion.

### Max Response Length
200 lines of configuration and code.

## Workflow

### Step 1: Search Space Definition
Define parameter types and ranges properly. Use log-uniform scale for positive-valued parameters that span orders of magnitude — learning rate (1e-5 to 1e-1), regularization strength (1e-4 to 1e-1), weight decay (1e-6 to 1e-2), L1/L2 penalties. Use uniform scale for bounded additive parameters — tree depth (3-15), hidden units (32-512), number of layers (1-5), dropout rate (0.0-0.5). Use categorical choices for discrete options — optimizer (adam, sgd, adamw), activation (relu, gelu, tanh), pooling type (max, avg, adaptive), initialization scheme. Define conditional search spaces where parameters depend on other choices — momentum only when optimizer is sgd, kernel size only when layer type is conv, num_heads only when using transformer. For tree-based models (XGBoost, LightGBM, RF): n_estimators (50-1000, log scale), max_depth (3-15, linear), min_samples_split (2-20), learning_rate (0.01-0.3, log), subsample (0.5-1.0), colsample_bytree (0.3-1.0), reg_alpha (1e-4 to 10, log), reg_lambda (1e-4 to 10, log), min_child_weight (1-10). For neural networks: learning rate (1e-5 to 1e-1, log), batch size (16, 32, 64, 128, 256, categorical), hidden units per layer (32-1024, log), num_layers (1-5), dropout (0.0-0.5), weight decay (1e-6 to 1e-2, log), optimizer type, activation function. For gradient boosting: max_leaves, min_data_in_leaf, feature_fraction, bagging_fraction, bagging_freq, lambda_l1, lambda_l2, min_gain_to_split. Recommended pilot ranges: start with wide ranges (at least one order of magnitude beyond expected optimum), run 20-30 pilot trials, then use param importance to narrow ranges for second phase.

### Step 2: Strategy Selection
Grid search: exhaustive enumeration over discrete grid points. Only use when dimensionality < 4 AND budget covers full grid. Total runs = product of cardinalities — 3 params with 5 values each = 125 trials, 4 params = 625 trials. Exponential cost makes grid infeasible beyond 4 dimensions. Random search: sample uniformly from defined distributions. Always prefer over grid when dimensionality > 4 — with same budget, random covers more distinct values per parameter. With 100 trials and 10 params: random explores ~10 distinct values per param, grid explores only ~2. Random search finds good regions faster when only some parameters matter (the 10% rule). Bayesian optimization (GP or TPE): builds surrogate model of objective and uses acquisition function to guide search. GP works well for <10 continuous params and <1000 trials O(n^3). TPE scales better to mixed/categorical/high-dimensional spaces. Requires 10-20 initial random trials for surrogate warm-up. Expected Improvement (EI) acquisition balances exploration vs exploitation. CMA-ES: covariance matrix adaptation evolution strategy for continuous optimization. Best for 5-20 continuous parameters, non-convex rugged landscapes, deterministic objectives. Population-based training (PBT): evolves both hyperparameters and model weights simultaneously. Best for deep learning with long training times (>1 hour per trial). Uses checkpoint migration between workers. Decision guide: trial <10s with <4 params = grid; trial <10s with >4 params = random; trial >1 min <1 hour = Bayesian (TPE); trial >1 hour = PBT or Bayesian with aggressive ASHA pruning.

### Step 3: Framework Configuration
Optuna: objective function uses trial.suggest_float(name, low, high, log=True) for log scale, trial.suggest_int() for integers, trial.suggest_categorical() for choices. Create study with create_study(direction=minimize, sampler=TPESampler(n_startup_trials=10), pruner=MedianPruner(n_startup_trials=10, n_warmup_steps=20)). Run with study.optimize(objective, n_trials=100, timeout=3600, n_jobs=4, callbacks=[callback]). Storage: SQLite for single-machine (sqlite:///study.db), PostgreSQL for distributed (postgresql://user:pass@host/db). Visualize with optuna.visualization module: plot_param_importances, plot_parallel_coordinate, plot_contour. Load existing study with load_study(study_name, storage). Ray Tune: config space uses tune.loguniform(), tune.uniform(), tune.randint(), tune.choice(). Use Tuner(train_fn, param_space=config, tune_config=TuneConfig(metric=val_loss, mode=min, num_samples=100, search_alg=OptunaSearch(), scheduler=ASHAScheduler(max_t=100, grace_period=10, reduction_factor=3)), run_config=RunConfig(name=exp, storage_path=~/ray_results, log_to_file=True)). Automatic logging to MLflow, W&B, TensorBoard. Hyperopt: space uses hp.loguniform(lr, log_lo, log_hi), hp.uniform(), hp.quniform(), hp.choice(). Run with fmin(fn=objective, space=space, algo=tpe.suggest, max_evals=100, trials=Trials(), rstate=np.random.RandomState(42)).

### Step 4: Pruning & Early Stopping
Median pruner: stop trial if intermediate value metric falls below median of all completed trials at same step. Requires n_startup_trials (minimum trials before pruning activates, default 10), n_warmup_steps (minimum steps before evaluating, default 20), interval_steps (check frequency, default 5). Hyperband: adaptive resource allocation across brackets. Each bracket evaluates many configurations with minimal budget, promotes top 1/eta to larger budget. eta=3 (reduction factor) means each round keeps 1/3 of trials and gives 3x budget. Number of brackets = 4-6. Best for variable-budget optimization. ASHA (Asynchronous Successive Halving): distributed variant of Hyperband for parallel settings. Handles stragglers well — doesn't wait for all trials in bracket. Best when >32 parallel trials. Threshold pruner: stop if metric exceeds known acceptable range (e.g., validate loss > 10). Percentile pruner: stop trials in bottom Nth percentile at each checkpoint. Always set minimum budget checks: at least 10% of total epochs, minimum 1 epoch for rapid-convergence models, minimum 5 epochs for deep learning. Never prune on first evaluation — single noisy evaluation can cause incorrect early termination.

### Step 5: Distributed Execution
Local multi-core CPU: set n_jobs=-1 for sklearn, n_jobs=4 for Optuna. Works for tree-based models and small neural networks (<10 min per trial). Dask distributed: wrap Optuna with DaskStorage or use OptunaSearchCV with Dask ML backend for sklearn. Scales to dozens of workers. Ray distributed: native parallelism with tune.run(resources_per_trial={cpu: 2, gpu: 0.5}). Ray can distribute across a cluster with ray.init(address=auto). Best for deep learning on multi-GPU clusters. Kubernetes: run Optuna with PostgreSQL shared storage, each trial as a Kubernetes job. Use Kueue or Volcano for batch scheduling. NFS or S3 for checkpoint storage. Fault tolerance: checkpoint each trial to shared filesystem (NFS, S3, GCS). On worker failure, trial is retried from last checkpoint (Optuna supports this with storage backends). Per-trial timeout: use timeout parameter to prevent single hanging trial from blocking the study. Scale guideline: start with 4-8 parallel workers, monitor efficiency (total compute time / wall clock time). If efficiency < 50%, workers spend too much time waiting for results — increase trials per batch or reduce parallelism. For GPU tuning: use fractional GPUs (gpu=0.5 for 2 trials per GPU) to maximize utilization.

### Step 6: Multi-Objective Optimization
Define two or more competing objectives: classification accuracy vs inference latency (ms), F1 score vs model size (MB), RMSE vs prediction time, revenue vs recommendation diversity, precision vs recall. Pareto front approach: find set of non-dominated solutions where no objective can be improved without degrading another. Solutions on Pareto front are equally optimal — choice depends on business constraints. Optuna supports directions=[maximize, minimize] with NSGA-II sampler (genetic algorithm) or MOTPE sampler (multi-objective TPE). Scalarized approach: combine objectives into single score using weighted sum or product — alpha * normalized_metric1 + (1-alpha) * normalized_metric2. Normlize metrics to same scale (0-1) before combining. Tune alpha weights based on business priorities: 0.7 accuracy + 0.3 latency for latency-sensitive apps, 0.5 F1 + 0.5 model size for edge deployment. Pareto front analysis: after tuning, select final configuration based on deployment constraint. Example: if latency must be <10ms, pick the highest-accuracy config meeting that latency constraint. Report the full Pareto front in the output, not just a single selected point.

### Step 7: Tracking & Reproducibility
Log every trial's full parameter config, intermediate metrics per iteration, final metrics, trial duration, system resource utilization (GPU/CPU memory, temperature). Save best configuration as JSON or YAML in experiment tracking system (MLflow, W&B, Neptune, Comet). Set random seed per trial: base_seed + trial_number as reproducible seed. Use deterministic algorithms where available — XGBoost deterministic mode, PyTorch with torch.use_deterministic_algorithms(True), sklearn with fixed random_state. Cross-validate within each trial to reduce noise from data split variance: use same CV splitter across all trials by fixing CV indices. For sklearn: pass fixed cv object to RandomizedSearchCV rather than integer. After tuning: run best config 3-5 times with different random seeds to estimate performance variance. Export results: best_params dict, best_value scalar, param_importance dataframe, optimization history plot image. Store study database durably — it contains the entire search history for future analysis.

### Step 8: Post-Tuning Analysis
Parameter importance analysis: use Optuna study.param_importances (based on fANOVA) to identify which parameters most influence the objective. Critical for prioritizing future tuning efforts — tune important params more finely, fix unimportant params to default values. Parallel coordinate plot: visualize which parameter combinations produce best and worst results. Identify regions of search space that consistently underperform. Contour plot: 2D interaction between top two parameters — check if effect is additive (parallel contours) or interactive (crossing contours). Optimization history: plot best value vs trial number — should show improvement then plateau. Stop study early if best value does not improve for 20-50 trials (use Optuna callbacks). Failure analysis: check which parameter combinations caused trial failures (NaN loss, OOM errors, divergence). Common failure patterns: learning rate too high (NaN), batch size too large (OOM), network too deep (vanishing gradients). Archive: save study database, best configs for each deployment target (most accurate, fastest inference, smallest model), and parameter importance ranking for future tuning iterations.

### Common Pitfalls
Learning rate too high → loss diverges to NaN.
Learning rate too low → training stalls, slow convergence.
Batch size too large → OOM on GPU, poor generalization.
Too many epochs with pruning → trials pruned before convergence.
Overlapping trial evaluations on same GPU → memory contention.
Not fixing CV splits → high variance in objective values, misleading comparisons.
Overly narrow search space → best optimum outside bounds.
Overly wide search space → wasted budget exploring irrelevant regions.
Ignoring conditional params → momentum sampled even for Adam, wasting budget.

### Integration with Experiment Tracking
Log every trial to MLflow or Weights and Biases for full traceability.
Store study database in a persistent shared location for team access.
Tag experiments with project name, model type, and dataset version.
Export best parameters as a configuration file consumable by training pipeline.
Link tuned model checkpoints to the study trial that produced them.
Generate a tuning report with optimization history, parameter importance, and Pareto front visualizations.
Automate retuning when new data arrives or model architecture changes — use study.load_if_exists=True to continue from previous state.

## Rules
- Random search beats grid search when dimensionality > 4 — always prefer random over grid.
- Bayesian optimization requires at least 10-20 initial random trials to seed the surrogate model.
- Pruning must have a minimum budget (e.g., 10% of total epochs) before termination.
- Log-scale learning rates, regularization, and any positive parameter spanning orders of magnitude.
- Use conditional search spaces for hierarchical parameters (momentum depends on optimizer choice).
- Each trial must be deterministic given its parameter seed for reproducibility.
- Never prune too aggressively: minimum 5-10 trials before any pruning decision.
- Distributed tuning requires shared filesystem or object store for checkpoints.
- Multi-objective optimization: always show the Pareto front, not just a single point.
- Parameter importance analysis reveals which parameters to prioritize in future tuning iterations.
- Warm-start subsequent studies from best parameters of prior study when possible.
- Use same CV splits across all trials for fair comparison — fix cross-validation folds.
- Monitor trial failure rate: >10% failures indicates bug or resource issue, investigate before scaling up.
- Set study timeout (wall time limit) to prevent runaway experiments exceeding budget.
- Store study database durably — losing the study means losing all trial history.
- A single tuning run is not enough — validate best config with multiple random seeds.

### Production Monitoring
Monitor objective value trend over time — if new tuning runs produce worse results, data may have drifted.
Track trial failure rate (>10% indicates pipeline issues: data loading, OOM, NaN losses).
Monitor search space utilization — if best params cluster at boundary, space is too narrow.
Alert on convergence failure: best value not improving after 50 trials.
Log study metadata: number of trials, best params, optimization history every run.
Track per-trial compute cost (GPU hours, wall time) for budget forecasting.
Compare best value against baseline (default params) to quantify tuning ROI.

### Troubleshooting Guide
Trials failing with NaN → reduce learning rate upper bound, add gradient clipping, check for data issues.
Trials running out of memory → reduce batch size range, reduce model size range, add memory profiling.
Pruning all trials early → increase n_warmup_steps, reduce pruning aggressiveness, check if pruning metric correlates with final metric.
Best params at search space boundary → expand the range in that direction for the next tuning phase.
High variance in objective values → increase CV folds, fix random seeds, increase training data.
Tuning too slow → reduce n_trials, increase parallelism, use pruner, reduce search space.
Multi-objective producing trivial solutions → normalize objectives to same scale, adjust weights.

### Deployment Checklist
Pickle or ONNX-export the model trained with best hyperparameters for production deployment.
Embed the best hyperparameter configuration in the model artifact metadata for traceability.
Store the study database in a durable location for future reference and warm-starting.
Automate retuning when dataset size grows by more than 2x or when new features are added.
Set up a tuning schedule: full search weekly for stable models, daily for rapidly changing pipelines.
Pin the random seed for each trial to enable exact reproduction of the best run.
Document search space bounds, strategy, and budget for reproducibility by other team members.
Archive the parameter importance analysis to guide future tuning iterations.
Tag the experiment in the tracking system with git commit hash, dataset version, and model name.
Run the best configuration with 3-5 different seeds to estimate performance variance before production.
Create a configuration file (YAML/JSON) consumable by the training pipeline for hands-free retraining.
Validate that the tuned model generalizes on a truly held-out test set untouched during tuning.
Set up CI pipeline to run a light tuning (50 trials) on every significant code change.
Define a rollback plan: store previous best config and study snapshot for easy reversion.
Establish a maximum compute budget per tuning run and enforce it via timeout limits.

## References
- references/search-strategies.md — Grid, random, Bayesian optimization, GP, TPE, search space design
- references/tuning-frameworks.md — Optuna study/trial/pruning, Ray Tune schedulers/search algos, Hyperopt, distributed tuning

### Advanced Configuration Tips
Use Optuna's OptunaSearchCV for scikit-learn estimators with built-in cross-validation.
For distributed Optuna: set shared PostgreSQL storage, use --storage flag across workers.
Ray Tune with GPU: set resources_per_trial={gpu: 0.25} to run 4 trials per GPU.
Enable trial checkpointing for expensive trials: resume from checkpoint on worker failure.
Use study.enqueue_trial() to inject known-good parameter configurations as seed trials.
Warm-start successive studies by passing study object to create_study with load_if_exists=True.
For Hyperopt: use Trials object to persist and analyze full trial history across runs.
Set direction=minimize for loss/error, direction=maximize for accuracy/F1.

## Handoff
Pass tuned hyperparameters to ml-experiment-tracking for logging. Hand off to ml-model-evaluation for evaluating tuned model performance. For model architecture search (NAS), use a separate neural architecture search skill.
