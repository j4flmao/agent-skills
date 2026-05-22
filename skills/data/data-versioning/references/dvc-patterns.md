# DVC Patterns

## Setup

```bash
# Install
pip install dvc dvc-s3

# Initialize in existing Git repo
cd project
git init
dvc init

# Configure remote storage
dvc remote add -d storage s3://my-bucket/dvc
dvc remote modify storage access_key_id ${AWS_ACCESS_KEY_ID}
dvc remote modify storage secret_access_key ${AWS_SECRET_ACCESS_KEY}
dvc remote modify storage region us-east-1

# Verify
dvc remote list
dvc config list
```

## Tracking Data

```bash
# Track a single file
dvc add data/raw/customers_2026-05-01.csv
# Creates: data/raw/customers_2026-05-01.csv.dvc + .gitignore entry

# Track a directory
dvc add data/raw/
# Creates: data/raw.dvc

# Add to Git
git add data/raw.dvc .gitignore
git commit -m "add raw data"
```

### .dvc File Structure

```yaml
# data/raw/customers.csv.dvc
outs:
- md5: a1b2c3d4e5f6...  # content hash
  size: 2458624           # bytes
  path: customers.csv
  cloud:
    etag: abc123...
    version_id: null
```

## Pipeline Versioning

### dvc.yaml

```yaml
stages:
  preprocess:
    cmd: python src/preprocess.py --input data/raw --output data/processed
    deps:
      - data/raw
      - src/preprocess.py
    params:
      - preprocess.min_samples
      - preprocess.max_features
    outs:
      - data/processed
    metrics:
      - metrics/preprocess_stats.json:
          cache: false

  train:
    cmd: python src/train.py --train data/processed/train --test data/processed/test
    deps:
      - data/processed
      - src/train.py
    params:
      - train.lr
      - train.epochs
      - train.batch_size
    outs:
      - models/model.pkl
    metrics:
      - metrics/accuracy.json:
          cache: false
    plots:
      - metrics/confusion_matrix.png
```

### params.yaml

```yaml
preprocess:
  min_samples: 10
  max_features: 1000
train:
  lr: 0.01
  epochs: 50
  batch_size: 32
```

### Running Pipeline

```bash
# Run full pipeline
dvc repro

# Run specific stage
dvc repro train

# Force rerun ignoring cache
dvc repro --force

# Check pipeline DAG
dvc dag
```

## Experiment Tracking

```bash
# Run experiment with different params
dvc exp run --set-param train.lr=0.001
dvc exp run --set-param train.lr=0.1

# List experiments
dvc exp show
# ─────────────────────────────────────────────────────
#  Experiment      train.lr   accuracy
# ─────────────────────────────────────────────────────
#  workspace       0.01       0.923
#  exp-abc123      0.001      0.945  ← best
#  exp-def456      0.1        0.891
# ─────────────────────────────────────────────────────

# Apply specific experiment
dvc exp apply exp-abc123

# Push experiments to remote
dvc exp push origin exp-abc123

# Pull experiments
dvc exp pull origin exp-abc123
```

### Compare Metrics

```bash
dvc metrics diff
# Path                     Metric    Old      New      Change
# metrics/accuracy.json    accuracy  0.923    0.945    +0.022
# metrics/accuracy.json    loss      0.18     0.12     -0.06

dvc plots diff
# Generates HTML diff of all tracked plots
```

## Pull/Push

```bash
# Push data to remote
dvc push

# Pull data for specific Git commit
git checkout <commit>
dvc checkout

# Pull latest
dvc pull

# Push specific file
dvc push data/raw/customers.csv.dvc
```
