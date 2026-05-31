# Experiment Reproducibility

## Overview

Reproducibility is the ability to obtain the same results from a given experiment when repeating it under the same conditions. It is the foundation of scientific ML development. Without reproducibility, you cannot debug model regressions, audit model behavior, compare experiments fairly, or trust your evaluation results. This reference covers all dimensions of reproducibility: code, data, environment, parameters, randomness, and hardware.

## The Reproducibility Spectrum

### Levels of Reproducibility

| Level | Name | Description | Effort |
|-------|------|-------------|--------|
| L0 - Read-only | Someone can read the experiment report | Document results | Minimal |
| L1 - Repeatable | Same person, same environment, can repeat | Log all parameters | Low |
| L2 - Replicable | Different person, same environment, gets same result | Version code, data, env | Medium |
| L3 - Reproducible | Different person, different environment, gets same result | Containerize everything | High |
| L4 - Portable | Different hardware, different OS, same result | Abstract hardware dependencies | Very High |

### Target Level by Context

```yaml
reproducibility_targets:
  research_exploration:
    target: L1
    rationale: "Fast iteration is more important than perfect reproducibility"
    must_have:
      - "Log all hyperparameters"
      - "Log final metrics"
      - "Log git commit"

  team_collaboration:
    target: L2
    rationale: "Team members need to build on each other's work"
    must_have:
      - "Version data (hash or DVC)"
      - "Pin environment (requirements.txt or conda)"
      - "Set random seeds"
      - "Log all metrics per epoch"

  production_ml:
    target: L3
    rationale: "Need to debug production issues and audit model behavior"
    must_have:
      - "Containerized environment (Docker)"
      - "Full data lineage"
      - "Model signature"
      - "Deterministic GPU flags"

  regulated_industry:
    target: L4
    rationale: "Compliance requires bit-exact reproducibility"
    must_have:
      - "Fixed hardware configuration"
      - "Deterministic algorithms throughout"
      - "Signed artifacts"
      - "Complete audit trail"
```

## Dimensions of Reproducibility

### Dimension 1: Code Versioning

```yaml
code_versioning:
  minimum_viable:
    - "Log git commit hash in every experiment"
    - "Tag important commits with experiment names"
    - "Branch per significant experiment direction"

  recommended:
    - "Log git commit hash, branch name, and any uncommitted changes"
    - "Use `git diff` to capture uncommitted modifications"
    - "Tag reproducible runs with release tags"

  best_practice:
    - "Use MLflow Projects or DVC pipelines to define entry points"
    - "Dockerfile for complete environment"
    - "Signed commits for audit trail"
```

```python
# code_version_tracking.py
import git
import mlflow
import json

def capture_code_context() -> dict:
    repo = git.Repo(search_parent_directories=True)
    context = {
        'git_commit': repo.head.object.hexsha,
        'git_branch': repo.active_branch.name,
        'git_remote': repo.remotes.origin.url if repo.remotes else None,
        'uncommitted_changes': repo.is_dirty(untracked_files=True),
    }

    if context['uncommitted_changes']:
        diff = repo.git.diff()
        context['uncommitted_diff'] = diff

    # Tag files in the diff for visibility
    if context['uncommitted_changes']:
        changed_files = [item.a_path for item in repo.index.diff(None)]
        context['changed_files'] = changed_files

    return context

def log_code_context():
    context = capture_code_context()
    mlflow.log_params({
        'git.commit': context['git_commit'],
        'git.branch': context['git_branch'],
        'git.dirty': str(context['uncommitted_changes']),
    })
    mlflow.set_tags({
        'git_commit': context['git_commit'],
        'git_branch': context['git_branch'],
    })

    if context['uncommitted_changes']:
        mlflow.log_text(
            context['uncommitted_diff'],
            'code/uncommitted_diff.patch'
        )
```

### Dimension 2: Data Versioning

```python
# data_version_tracking.py
import hashlib
import mlflow

def compute_dataset_hash(file_path: str) -> str:
    """Compute SHA-256 hash of dataset for reproducibility tracking."""
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    return sha256.hexdigest()

class DataVersionTracker:
    def __init__(self):
        self.datasets = {}

    def register_dataset(self, name: str, file_path: str, metadata: dict = None):
        dataset_hash = compute_dataset_hash(file_path)
        self.datasets[name] = {
            'path': file_path,
            'hash': dataset_hash,
            'hash_algorithm': 'sha256',
            'metadata': metadata or {},
            'row_count': self._count_rows(file_path),
        }
        return self.datasets[name]

    def log_dataset_version(self, prefix: str = 'data'):
        for name, info in self.datasets.items():
            mlflow.log_params({
                f'{prefix}.{name}.hash': info['hash'],
                f'{prefix}.{name}.path': info['path'],
            })
            if info.get('row_count'):
                mlflow.log_param(f'{prefix}.{name}.rows', info['row_count'])
            if info['metadata']:
                mlflow.log_params({
                    f'{prefix}.{name}.{k}': v
                    for k, v in info['metadata'].items()
                })

    def _count_rows(self, file_path: str) -> int:
        import pandas as pd
        if file_path.endswith('.parquet'):
            return pd.read_parquet(file_path, columns=[]).shape[0]
        elif file_path.endswith('.csv'):
            return sum(1 for _ in open(file_path)) - 1
        return 0

# DVC integration for data versioning
def log_dvc_data_version():
    import subprocess
    import yaml

    # Get DVC tracked files and their hashes
    result = subprocess.run(
        ['dvc', 'status', '--show-checksums'],
        capture_output=True, text=True
    )

    # Parse DVC lock file for complete dependency graph
    with open('dvc.lock') as f:
        lock_data = yaml.safe_load(f)

    deps = {}
    for stage_name, stage_data in lock_data.items():
        deps[stage_name] = {
            'deps': stage_data.get('deps', []),
            'outs': stage_data.get('outs', []),
        }

    mlflow.log_artifact('dvc.lock', 'data/dvc')
    mlflow.log_params({
        'dvc.stages': json.dumps(list(deps.keys())),
    })
```

### Dimension 3: Environment Pinning

```python
# environment_capture.py
import mlflow
import pkg_resources
import platform
import subprocess
import json

def capture_environment() -> dict:
    """Capture complete environment specification."""
    env = {
        'python': platform.python_version(),
        'os': f"{platform.system()} {platform.release()}",
        'machine': platform.machine(),
        'processor': platform.processor(),
        'packages': {},
    }

    # Capture all installed packages with versions
    for pkg in sorted(
        pkg_resources.working_set,
        key=lambda x: x.key
    ):
        env['packages'][pkg.key] = pkg.version

    return env

def log_environment():
    env = capture_environment()
    mlflow.log_params({
        'env.python': env['python'],
        'env.os': env['os'],
    })

    # Log full requirements as artifact
    requirements = '\n'.join(
        f"{k}=={v}" for k, v in env['packages'].items()
        if k in CORE_DEPENDENCIES  # Defined list of ML-relevant packages
    )
    mlflow.log_text(requirements, 'environment/requirements.txt')

    # Log complete environment for full reproducibility
    full_requirements = '\n'.join(
        f"{k}=={v}" for k, v in env['packages'].items()
    )
    mlflow.log_text(full_requirements, 'environment/full_environment.txt')

def log_conda_environment():
    """Capture conda environment if using conda."""
    result = subprocess.run(
        ['conda', 'env', 'export', '--no-builds'],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        mlflow.log_text(result.stdout, 'environment/conda_env.yaml')
```

### Dimension 4: Random Seed Management

```python
# reproducibility_seeds.py
import random
import numpy as np
import os

class SeedManager:
    def __init__(self, base_seed: int = 42):
        self.base_seed = base_seed
        self.seeds = {}

    def set_all_seeds(self, seed: int = None):
        """Set seeds across all random number generators."""
        if seed is None:
            seed = self.base_seed

        # Python random
        random.seed(seed)

        # NumPy
        np.random.seed(seed)

        # PyTorch
        try:
            import torch
            torch.manual_seed(seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed(seed)
                torch.cuda.manual_seed_all(seed)
                # Enable deterministic algorithms for GPU reproducibility
                torch.backends.cudnn.deterministic = True
                torch.backends.cudnn.benchmark = False
        except ImportError:
            pass

        # TensorFlow
        try:
            import tensorflow as tf
            tf.random.set_seed(seed)
        except ImportError:
            pass

        # Python hash randomization (for dict ordering)
        os.environ['PYTHONHASHSEED'] = str(seed)

        self.seeds['training'] = seed
        return seed

    def set_data_split_seed(self, seed: int = None):
        """Seed specifically for train/test splitting."""
        if seed is None:
            seed = self.base_seed + 1
        self.seeds['data_split'] = seed
        return seed

    def set_validation_seed(self, seed: int = None):
        """Seed for cross-validation folds."""
        if seed is None:
            seed = self.base_seed + 2
        self.seeds['validation'] = seed
        return seed

    def log_seeds(self):
        """Log all seeds for reproducibility."""
        mlflow.log_params({
            f'seed.{k}': v for k, v in self.seeds.items()
        })
```

### Dimension 5: Hardware and Non-Determinism

```yaml
hardware_determinism:
  cpu:
    sources_of_nondeterminism:
      - "Floating-point operation ordering"
      - "Multithreading non-determinism"
      - "CPU instruction set differences (AVX, SSE)"
    mitigations:
      - "Set OMP_NUM_THREADS=1"
      - "Use single-threaded BLAS (MKL_NUM_THREADS=1)"
      - "Avoid parallel data loading"

  gpu:
    sources_of_nondeterminism:
      - "CUDA atomic operations"
      - "GPU algorithm selection (cudnn.benchmark)"
      - "Floating-point accumulation order in GPU kernels"
    mitigations:
      - "torch.backends.cudnn.deterministic = True"
      - "torch.backends.cudnn.benchmark = False"
      - "Set CUDA_LAUNCH_BLOCKING=1"
      - "Use deterministic algorithms flag (PyTorch 2.0+)"

  distributed_training:
    sources_of_nondeterminism:
      - "Parameter server vs all-reduce"
      - "Non-deterministic gradient accumulation order"
      - "Network latency in gradient synchronization"
    mitigations:
      - "Use deterministic gradient accumulation"
      - "Log topology and synchronization strategy"
      - "Hardware-level reproducibility is extremely difficult in distributed settings"
```

```python
# hardware_capture.py
import mlflow
import subprocess
import json

def capture_hardware_info() -> dict:
    info = {
        'cpu': {},
        'gpu': [],
        'memory_gb': 0,
    }

    # CPU info
    import platform
    info['cpu']['model'] = platform.processor()
    info['cpu']['cores'] = os.cpu_count()

    # GPU info (NVIDIA)
    try:
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=name,memory.total,driver_version',
             '--format=csv,noheader'],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            for line in result.stdout.strip().split('\n'):
                parts = [p.strip() for p in line.split(',')]
                info['gpu'].append({
                    'name': parts[0],
                    'memory': parts[1],
                    'driver': parts[2] if len(parts) > 2 else 'unknown',
                })
    except FileNotFoundError:
        pass

    # RAM
    try:
        if platform.system() == 'Linux':
            result = subprocess.run(
                ['grep', 'MemTotal', '/proc/meminfo'],
                capture_output=True, text=True
            )
            mem_kb = int(result.stdout.split()[1])
            info['memory_gb'] = round(mem_kb / (1024 * 1024), 1)
    except:
        pass

    return info

def log_hardware():
    info = capture_hardware_info()
    mlflow.log_params({
        'hardware.cpu.cores': info['cpu']['cores'],
        'hardware.memory_gb': info['memory_gb'],
    })

    for i, gpu in enumerate(info['gpu']):
        mlflow.log_params({
            f'hardware.gpu.{i}.name': gpu['name'],
            f'hardware.gpu.{i}.memory': gpu['memory'],
        })
        mlflow.set_tags({f'hardware.gpu.{i}': gpu['name']})
```

## Reproducibility Checklist

### Pre-Experiment

```markdown
## Pre-Experiment Reproducibility Checklist

### Code
- [ ] Git commit hash captured
- [ ] Branch name captured
- [ ] Uncommitted changes documented or committed
- [ ] Training script is versioned (not notebook-only)

### Data
- [ ] Dataset hash computed and logged
- [ ] Data version (DVC, Git LFS) referenced
- [ ] Training/validation/test split seed fixed
- [ ] Data preprocessing script versioned

### Environment
- [ ] Python version captured
- [ ] All package versions pinned (requirements.txt or conda env)
- [ ] OS and kernel version captured
- [ ] CUDA/cuDNN version captured (if using GPU)

### Randomness
- [ ] Python random seed set
- [ ] NumPy random seed set
- [ ] PyTorch/TensorFlow random seed set (if applicable)
- [ ] Data loader shuffle seed set
- [ ] PYTHONHASHSEED fixed
- [ ] Deterministic GPU flags enabled (if using GPU)

### Hardware
- [ ] CPU model and core count captured
- [ ] GPU model and driver version captured (if using GPU)
- [ ] RAM size captured
```

### Post-Experiment

```markdown
## Post-Experiment Reproducibility Checklist

- [ ] All hyperparameters logged (including defaults you did not change)
- [ ] Training and evaluation metrics logged per epoch
- [ ] Model artifact saved with signature
- [ ] Test set predictions logged for external validation
- [ ] Experiment notes captured (wandb notes, mlflow description)
- [ ] Full requirements.txt or conda env exported
- [ ] Any non-obvious settings documented (data loading, augmentation, etc.)
- [ ] Model weights exported in standard format (not framework-specific)
- [ ] Random seed successfully reproduced at least once
```

## Full Reproducibility Implementation

```python
# full_reproducibility_setup.py
"""Complete reproducibility setup for ML experiments."""

import mlflow
import os
import random
import numpy as np
import torch
import git

class ReproducibilityManager:
    """Central manager for experiment reproducibility."""

    def __init__(self, experiment_name: str, tracking_uri: str = None):
        if tracking_uri:
            mlflow.set_tracking_uri(tracking_uri)
        mlflow.set_experiment(experiment_name)
        self.seed_manager = SeedManager()
        self.data_tracker = DataVersionTracker()
        self.run_id = None

    def initialize_run(self, run_name: str, base_seed: int = 42,
                       tags: dict = None):
        """Start a fully reproducible experiment run."""
        # Set seeds first
        self.seed_manager.set_all_seeds(base_seed)

        # Start MLflow run
        run = mlflow.start_run(run_name=run_name)
        self.run_id = run.info.run_id

        # Log reproducibility metadata
        self._log_reproducibility_metadata()

        if tags:
            mlflow.set_tags(tags)

        return self.run_id

    def _log_reproducibility_metadata(self):
        """Log all reproducibility-related metadata."""
        # Code
        log_code_context()

        # Environment
        log_environment()

        # Hardware
        log_hardware()

        # Seeds
        self.seed_manager.log_seeds()

        # Data (if registered)
        self.data_tracker.log_dataset_version()

    def register_and_log_data(self, name: str, path: str, metadata: dict = None):
        self.data_tracker.register_dataset(name, path, metadata)

    def log_metrics_with_epoch(self, metrics: dict, epoch: int = None):
        mlflow.log_metrics(metrics, step=epoch)

    def log_model_with_signature(self, model, X_sample, model_name: str):
        from mlflow.models import infer_signature
        predictions = model.predict(X_sample)
        signature = infer_signature(X_sample, predictions)

        mlflow.sklearn.log_model(
            sk_model=model,
            artifact_path='model',
            signature=signature,
            registered_model_name=model_name,
        )

    def finalize_run(self):
        """End run and verify basic reproducibility."""
        # Export full environment
        log_conda_environment()

        # Verify seed reproducibility
        self._verify_seed_reproducibility()

        mlflow.end_run()

    def _verify_seed_reproducibility(self):
        """Quick check that seeds produce consistent first value."""
        seed = self.seed_manager.base_seed
        random.seed(seed)
        expected = random.random()

        random.seed(seed)
        actual = random.random()
        assert expected == actual, "Random seed verification failed"

    def load_and_verify_run(self, run_id: str) -> dict:
        """Load a previous run and verify its reproducibility context."""
        run = mlflow.get_run(run_id)
        return {
            'params': run.data.params,
            'metrics': run.data.metrics,
            'tags': run.data.tags,
            'artifact_uri': run.info.artifact_uri,
        }

# Usage example
def run_reproducible_experiment():
    rm = ReproducibilityManager(
        experiment_name='reproducible-demo',
        tracking_uri='http://mlflow-server:5000',
    )

    rm.initialize_run(
        run_name='xgboost-v3',
        base_seed=42,
        tags={'model_type': 'xgboost', 'status': 'production_ready'},
    )

    # Register data version
    rm.register_and_log_data(
        'training',
        'data/training.parquet',
        {'source': 's3://data/features/v3', 'features': 45},
    )

    # Log hyperparameters
    params = {
        'model.max_depth': 8,
        'model.learning_rate': 0.01,
        'model.n_estimators': 1000,
        'model.subsample': 0.8,
    }
    mlflow.log_params(params)

    # Simulate training
    for epoch in range(5):
        metrics = {
            'train.loss': 0.5 - epoch * 0.08,
            'val.loss': 0.55 - epoch * 0.07,
            'val.auc': 0.75 + epoch * 0.03,
        }
        rm.log_metrics_with_epoch(metrics, epoch)

    # Log model
    rm.log_model_with_signature(model, X_test[:5], 'demo-model')

    rm.finalize_run()
```

## Reproducibility Verification

### Automated Verification Script

```python
# verify_reproducibility.py
"""Verify that an experiment can be reproduced."""

class ReproducibilityVerifier:
    def __init__(self, source_run_id: str, tracking_uri: str):
        mlflow.set_tracking_uri(tracking_uri)
        self.source_run = mlflow.get_run(source_run_id)

    def verify_data_version(self):
        """Verify data hashes match."""
        source_hashes = {
            k: v for k, v in self.source_run.data.params.items()
            if k.startswith('data.') and k.endswith('.hash')
        }
        for key, expected_hash in source_hashes.items():
            data_path = self.source_run.data.params[
                key.replace('.hash', '.path')
            ]
            actual_hash = compute_dataset_hash(data_path)
            assert actual_hash == expected_hash, (
                f"Data hash mismatch for {key}: "
                f"expected {expected_hash}, got {actual_hash}"
            )
        print("Data version verification: PASSED")

    def verify_environment(self):
        """Verify package versions match."""
        import pkg_resources
        source_packages = self._parse_requirements(
            self.source_run.data.params.get('env.python', '')
        )
        for pkg_name, expected_version in source_packages.items():
            actual_version = pkg_resources.get_distribution(pkg_name).version
            assert actual_version == expected_version, (
                f"Package version mismatch for {pkg_name}: "
                f"expected {expected_version}, got {actual_version}"
            )
        print("Environment verification: PASSED")

    def verify_seeds(self):
        """Verify seeds produce the same initial state."""
        source_seeds = {
            k: int(v) for k, v in self.source_run.data.params.items()
            if k.startswith('seed.')
        }
        for seed_key, seed_value in source_seeds.items():
            random.seed(seed_value)
            first_value = random.random()
            random.seed(seed_value)
            assert random.random() == first_value, (
                f"Seed verification failed for {seed_key}"
            )
        print("Seed verification: PASSED")

    def verify_all(self):
        self.verify_data_version()
        self.verify_environment()
        self.verify_seeds()
        print("Full reproducibility verification: PASSED")
```

## Reproducibility in Different Frameworks

### Scikit-Learn

```python
# sklearn_reproducibility.py
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# Set global seed
np.random.seed(42)

# Reproducible train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Reproducible model
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=8,
    random_state=42,  # Controls tree randomness
    n_jobs=1,  # Single thread for reproducibility
)
```

### PyTorch

```python
# pytorch_reproducibility.py
import torch
import numpy as np
import random

def set_pytorch_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)

    # Deterministic settings
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

    # PyTorch 2.0+ deterministic flag
    if hasattr(torch, 'use_deterministic_algorithms'):
        torch.use_deterministic_algorithms(True)

set_pytorch_seed(42)

# DataLoader with fixed seed
train_loader = DataLoader(
    train_dataset,
    batch_size=32,
    shuffle=True,
    generator=torch.Generator().manual_seed(42),  # Fixed shuffle order
    num_workers=2,
    worker_init_fn=lambda wid: np.random.seed(42 + wid),  # Per-worker seed
)

# Model with reproducible initialization
model = torch.nn.Sequential(
    torch.nn.Linear(45, 64),
    torch.nn.ReLU(),
    torch.nn.Linear(64, 1),
)

def init_weights(m):
    if isinstance(m, torch.nn.Linear):
        torch.nn.init.xavier_uniform_(m.weight, generator=torch.Generator().manual_seed(42))

model.apply(init_weights)
```

### TensorFlow/Keras

```python
# tf_reproducibility.py
import tensorflow as tf
import os

# Set all seeds
os.environ['PYTHONHASHSEED'] = '42'
os.environ['TF_DETERMINISTIC_OPS'] = '1'
os.environ['TF_CUDNN_DETERMINISTIC'] = '1'

tf.random.set_seed(42)

# Reproducible data pipeline
dataset = tf.data.Dataset.from_tensor_slices((X_train, y_train))
dataset = dataset.shuffle(
    buffer_size=1000,
    seed=42,  # Fixed shuffle
    reshuffle_each_iteration=False,  # Same order every epoch
).batch(32)

# Reproducible model
model = tf.keras.Sequential([
    tf.keras.layers.Dense(64, activation='relu', kernel_initializer=tf.keras.initializers.GlorotUniform(seed=42)),
    tf.keras.layers.Dropout(0.2, seed=42),
    tf.keras.layers.Dense(1, activation='sigmoid', kernel_initializer=tf.keras.initializers.GlorotUniform(seed=42)),
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss='binary_crossentropy',
)
```

## References
- references/experiment-tracking-tools.md — Experiment Tracking Tools
- references/data-versioning.md — Data Versioning
- references/experiment-platforms.md — Experiment Tracking Platforms
- references/mlflow-setup.md — MLflow Setup and Configuration
- references/experiment-tracking-advanced.md — Experiment Tracking Advanced Topics
- references/experiment-collaboration.md — Experiment Collaboration
