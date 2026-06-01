# Production Experiment Tracking & Model Registry

## Overview
Production experiment tracking captures every training run's configuration, metrics, artifacts, and environment for reproducibility, comparison, and model governance. The model registry versions and manages trained models through their lifecycle from experiment to production.

## Experiment Tracking Tools

### Tool Comparison
| Tool | Hosting | Strengths | Weaknesses |
|------|---------|-----------|------------|
| W&B | Cloud / self-hosted | Rich dashboards, reports, sweeps | Cost at scale (pro) |
| MLflow | Self-hosted / Databricks | Open source, model registry, Python API | UI less polished |
| TensorBoard | Local only | Simple, zero setup | No experiment DB, no registry |
| Neptune | Cloud | Metadata search, comparison | Fewer integrations |
| Comet | Cloud | Automatic logging | Cost |
| ClearML | Self-hosted | Open source, pipeline orchestration | Setup complexity |
| DVC | Git-based | Data versioning, Git-native | No live tracking |
| Guild AI | Local | Open source, simple | Limited ecosystem |

### When to Use Which
- **Solo researcher**: TensorBoard + logging to JSON
- **Small team (< 10)**: MLflow (self-hosted) or W&B (free tier)
- **Org-wide (10+)**: W&B or Neptune with full audit trail
- **Regulated industry**: MLflow (on-prem, full control)
- **Already in Databricks**: MLflow (native integration)

## MLflow Setup

### Local MLflow Server
```bash
# Start tracking server
mlflow server \
    --backend-store-uri sqlite:///mlflow.db \
    --default-artifact-root ./mlruns \
    --host 0.0.0.0 \
    --port 5000
```

### Training with MLflow
```python
import mlflow

# Set tracking URI
mlflow.set_tracking_uri("http://localhost:5000")
mlflow.set_experiment("lora-fine-tuning")

with mlflow.start_run(run_name=f"lora-7b-v{run_number}"):
    # Log hyperparameters
    mlflow.log_params({
        "model": "Mistral-7B",
        "method": "lora",
        "lora_r": 16,
        "lora_alpha": 32,
        "learning_rate": 2e-4,
        "batch_size": 32,
        "gradient_accumulation_steps": 8,
        "warmup_ratio": 0.03,
        "weight_decay": 0.01,
        "num_epochs": 3,
    })

    # Log dataset info
    mlflow.log_params({
        "dataset_name": "support-qa-v5",
        "dataset_size": 15000,
        "dataset_hash": dataset_hash,
    })

    # Log training script version
    mlflow.log_param("git_commit", git_commit_hash)

    # Log metrics during training
    for step, metrics in training_metrics.items():
        mlflow.log_metrics(metrics, step=step)

    # Log artifacts
    mlflow.log_artifact(lora_adapter_path, artifact_path="adapter")
    mlflow.log_artifact(tokenizer_path, artifact_path="tokenizer")
    mlflow.log_artifact(config_path, artifact_path="config")
    mlflow.log_artifact(metrics_json_path, artifact_path="metrics")

    # Register model
    mlflow.register_model(
        f"runs:/{run.info.run_id}/adapter",
        "support-qa-assistant"
    )
```

## W&B Integration

### Setup
```python
import wandb

# Initialize run
wandb.init(
    project="llm-fine-tuning",
    group="lora-experiments",
    job_type="training",
    config={
        "model_name": "Mistral-7B-v0.1",
        "method": "lora",
        "lora_r": 16,
        "lora_alpha": 32,
        "target_modules": ["q_proj", "v_proj", "k_proj", "o_proj"],
        "learning_rate": 2e-4,
        "batch_size": {"train": 32, "eval": 32},
        "precision": "bf16",
        "optimizer": "adamw_torch",
        "scheduler": "cosine",
        "warmup_ratio": 0.03,
        "num_epochs": 3,
        "max_length": 2048,
        "gradient_checkpointing": True,
        "dataset": {"name": "support-qa", "version": "v5", "size": 15000},
    },
    tags=["lora", "instruction-tuning", "experiment-v1"],
    notes="First LoRA fine-tune on support QA dataset",
)

# In training loop
wandb.log({
    "train/loss": loss.item(),
    "train/learning_rate": scheduler.get_last_lr()[0],
    "train/epoch": epoch + step / len(train_loader),
    "train/global_step": global_step,
    "train/grad_norm": grad_norm,
    "system/gpu_util": gpu_util,
    "system/gpu_mem": gpu_mem_alloc,
}, step=global_step)

# After training
wandb.log_artifact(checkpoint_path, name="model-checkpoint", type="model")
wandb.finish()
```

### W&B Sweep Integration
```python
sweep_config = {
    "method": "bayes",
    "metric": {"name": "eval/loss", "goal": "minimize"},
    "parameters": {
        "learning_rate": {"min": 5e-5, "max": 5e-4},
        "lora_r": {"values": [8, 16, 32, 64]},
        "weight_decay": {"min": 0.0, "max": 0.1},
    },
    "early_terminate": {"type": "hyperband", "min_iter": 5, "eta": 2},
}

sweep_id = wandb.sweep(sweep_config, project="llm-hpo")
wandb.agent(sweep_id, train_fn, count=30)
```

## What to Log

### Required Logging (Minimum Viable)
```yaml
hyperparameters:
  model_name, method, lora_r, lora_alpha, learning_rate,
  per_device_batch_size, gradient_accumulation_steps, num_epochs,
  warmup_ratio, weight_decay, precision, max_length

dataset:
  name, version, size, hash (sha256), split_ratios

metrics_per_step:
  train/loss, eval/loss, eval/perplexity, train/learning_rate

final_metrics:
  eval/loss, eval/perplexity, task_accuracy (if applicable),
  mmlu_before, mmlu_after, forgetting_delta

artifacts:
  adapter checkpoint, tokenizer files, training config, eval results
```

### Recommended Logging (Good Practice)
```yaml
hyperparameters_additional:
  target_modules, lora_dropout, scheduler_type, optimizer,
  gradient_checkpointing, flash_attention, seed,
  dataloader_num_workers, ddp_backend

environment:
  torch_version, transformers_version, peft_version,
  cuda_version, gpu_type, gpu_count, nvlink_enabled,
  hostname, user, python_version, os

metrics_detailed:
  train/grad_norm, train/grad_max, train/epoch,
  system/gpu_util, system/gpu_mem, system/gpu_temp,
  system/cpu_util, system/ram_util, throughput/samples_per_sec,
  throughput/tokens_per_sec, time/step_ms, time/data_loading_ms

callbacks:
  learning_rate_curve.png, loss_curve.png,
  gradient_norm_distribution.png, eval_vs_train_loss.png
```

## Model Registry

### MLflow Model Registry
```python
import mlflow
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Register model
result = mlflow.register_model(
    f"runs:/{run_id}/adapter",
    "support-qa-assistant"
)

# Transition stage
client.transition_model_version_stage(
    name="support-qa-assistant",
    version=1,
    stage="staging",  # None, Staging, Production, Archived
)

# Add description
client.update_model_version(
    name="support-qa-assistant",
    version=1,
    description="LoRA fine-tune on support-qa-v5. eval_loss=0.45, accuracy=0.94"
)

# Tag model version
client.set_model_version_tag(
    name="support-qa-assistant",
    version=1,
    key="base_model",
    value="Mistral-7B-v0.1"
)
```

### Model Registry Schema
```python
model_entry = {
    "model_id": "ft-mistral-7b-support-v3",
    "base_model": "mistralai/Mistral-7B-v0.1",
    "method": "lora",

    "hyperparameters": {
        "lora_r": 16,
        "lora_alpha": 32,
        "learning_rate": 2e-4,
        "batch_size": 32,
        "warmup_ratio": 0.03,
    },

    "dataset": {
        "name": "support-qa",
        "version": "v5",
        "size": 15000,
        "hash": "sha256:a1b2c3...",
        "train_split": 0.8,
        "eval_split": 0.1,
        "test_split": 0.1,
    },

    "metrics": {
        "eval_loss": 0.45,
        "eval_perplexity": 1.57,
        "task_accuracy": 0.94,
        "mmlu_before": 0.63,
        "mmlu_after": 0.61,
        "forgetting_delta": -0.02,
    },

    "artifacts": {
        "adapter_path": "s3://models/ft-mistral-7b-v3/adapter/",
        "tokenizer_path": "s3://models/ft-mistral-7b-v3/tokenizer/",
        "config_path": "s3://models/ft-mistral-7b-v3/config.yaml",
        "training_logs": "s3://models/ft-mistral-7b-v3/logs/",
    },

    "compute": {
        "gpu_type": "A100-80GB",
        "gpu_count": 8,
        "total_hours": 48,
        "cost_estimate_usd": 1152,
    },

    "lineage": {
        "experiment_run_id": "wandb-run-abc123",
        "training_script": "train_lora.py",
        "git_commit": "abc123def456",
        "start_time": "2025-06-01T10:00:00Z",
        "end_time": "2025-06-03T10:00:00Z",
    },

    "governance": {
        "status": "experimental",  # experimental, staging, production, archived, deprecated
        "owner": "team-llm",
        "review_status": "pending",  # pending, approved, rejected
        "reviewer": None,
        "notes": "Promising results on support QA, pending eval on held-out set.",
    },

    "tags": ["fine-tuned", "support-qa", "production-candidate"],
}
```

## Reproducibility

### Seeding
```python
def set_all_seeds(seed=42):
    import random, numpy as np, torch
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
    # Note: deterministic mode can slow training ~10%
```

### Environment Capture
```python
import json, subprocess, sys, torch

def capture_environment(output_path):
    env = {
        "python_version": sys.version,
        "torch_version": torch.__version__,
        "cuda_version": torch.version.cuda,
        "cudnn_version": torch.backends.cudnn.version(),
        "gpu_count": torch.cuda.device_count(),
        "gpu_names": [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())],
        "pip_packages": subprocess.check_output([sys.executable, "-m", "pip", "freeze"]).decode().split("\n"),
        "git_commit": subprocess.check_output(["git", "rev-parse", "HEAD"]).decode().strip(),
        "git_diff": subprocess.check_output(["git", "diff", "--stat"]).decode().strip(),
    }
    with open(output_path, "w") as f:
        json.dump(env, f, indent=2)
```

### Data Versioning
```python
# Track dataset hash before training
import hashlib

def compute_dataset_hash(dataset_path):
    hasher = hashlib.sha256()
    with open(dataset_path, "rb") as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()

# Use DVC or HuggingFace datasets commit hash for versioned datasets
# from datasets import load_dataset
# dataset = load_dataset("my/dataset", revision="v1.0.0")
```

## Alerting & Monitoring

### Training Failure Alerts
```python
# Conditions that should trigger alerts:
ALERT_CONDITIONS = {
    "loss_spike": {
        "check": lambda metrics: metrics["train/loss"] > 3 * metrics.get("train/loss_baseline", float("inf")),
        "action": "Reduce LR or check for data corruption",
    },
    "nan_loss": {
        "check": lambda metrics: math.isnan(metrics.get("train/loss", 0)),
        "action": "STOP TRAINING. Check for NaN in model weights or inputs.",
    },
    "gpu_oom": {
        "check": lambda metrics: metrics.get("system/gpu_mem", 0) > 0.95 * metrics.get("system/gpu_mem_total", 1),
        "action": "Reduce batch size or enable gradient checkpointing",
    },
    "overfitting": {
        "check": lambda metrics: metrics.get("eval/train_eval_gap", 0) > 0.3,
        "action": "Stop training or add regularization",
    },
    "throughput_drop": {
        "check": lambda metrics: metrics.get("throughput/samples_per_sec", 0) < 0.5 * metrics.get("throughput/baseline", float("inf")),
        "action": "Check data loading, NCCL, GPU utilization",
    },
    "gpu_stuck": {
        "check": lambda metrics: metrics.get("system/gpu_util", 100) < 10 and metrics.get("train/loss", 0) > 0,
        "action": "Check for data loading bottleneck, NCCL hang",
    },
}
```

## Cost Tracking

```python
def log_cost_metrics(gpu_type, gpu_count, hours_elapsed):
    cost_per_gpu_hour = {
        "A100-80GB": 3.0,
        "H100": 5.0,
        "RTX-4090": 0.5,
        "L40S": 2.0,
        "A10G": 1.5,
    }
    rate = cost_per_gpu_hour.get(gpu_type, 2.0)
    wandb.log({
        "cost/accrued_usd": rate * gpu_count * hours_elapsed,
        "cost/rate_per_hour": rate * gpu_count,
    })
```

## Key Points
- Log everything: hyperparameters, metrics, environment, dataset hash, git commit
- Use experiment tracking from the start — retroactive tracking is painful
- Set up automated alerts for training failures before starting a long run
- Register models in a registry with clear stage transitions (experiment → staging → production)
- Capture full environment for reproducibility (pip freeze, CUDA version, GPU types)
- Track compute cost alongside metrics for cost-per-quality analysis
- Data versioning is as important as model versioning
- Seed all randomness for deterministic reproduction
- Compare experiments with parallel coordinate plots and scatter matrices
- Review and clean up failed/stale experiments to reduce registry clutter
