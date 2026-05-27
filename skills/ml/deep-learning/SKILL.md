---
name: ml-deep-learning
description: >
  Use this skill when asked about PyTorch, TensorFlow, Keras, neural network, CNN, RNN, LSTM, transformer, GAN, autoencoder, training loop, backpropagation, gradient descent, CUDA, distributed training, or mixed precision. This skill enforces: PyTorch training loop with nn.Module and DataLoader, TensorFlow Keras Sequential/Functional APIs, CNN architectures (ResNet, EfficientNet), RNN/LSTM/GRU for sequences, transformer implementations (self-attention, positional encoding), distributed training (DDP, FSDP), mixed precision (AMP), and CUDA optimization. Do NOT use for: classical ML models, feature engineering, or MLOps pipeline configuration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ml, deep-learning, neural, phase-11]
---

# ML Deep Learning

## Purpose
Design and train deep neural networks with PyTorch and TensorFlow. Build CNN, RNN, and transformer architectures. Optimize training with distributed strategies, mixed precision, and proper GPU utilization.

## Agent Protocol

### Trigger
Exact user phrases: "PyTorch", "TensorFlow", "Keras", "neural network", "CNN", "RNN", "LSTM", "transformer", "GAN", "autoencoder", "training loop", "backpropagation", "gradient descent", "CUDA", "distributed training", "mixed precision", "DDP", "FSDP", "AMP", "CUDA", "ResNet", "EfficientNet".

### Input Context
Before activating, verify:
- Framework (PyTorch, TensorFlow, JAX)
- Problem type (image classification, NLP, time-series, generative)
- Dataset size (images, sequences, total samples)
- Hardware (single GPU, multi-GPU, TPU, CPU)
- GPU type and memory (A100, V100, RTX, etc.)
- Training constraints (time budget, memory budget)
- Prior experiments or baseline results

### Output Artifact
Model architecture definition, training loop, distributed strategy config, and optimization settings as Python.

### Response Format
```python
# Model architecture (nn.Module or Keras)
# Training loop with AMP and logging
# Distributed training launcher
```
```yaml
# Training hyperparameters
# Hardware configuration
# Mixed precision settings
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Framework selected (PyTorch preferred for research, TF for production)
- [ ] Model architecture defined (CNN, RNN, transformer)
- [ ] Data loading configured (DataLoader, tf.data with prefetch/augmentation)
- [ ] Training loop with gradient descent, logging, checkpointing
- [ ] Distributed training configured (DDP for multi-GPU, FSDP for large models)
- [ ] Mixed precision (AMP) configured for throughput
- [ ] Hyperparameter optimization strategy defined
- [ ] Evaluation on held-out test set with proper metrics

### Max Response Length
300 lines of code and configuration.

## Workflow

### Step 1: Framework Selection
PyTorch: imperative/debuggable, research community standard, HuggingFace ecosystem, dynamic computation graphs, easier custom architectures. TensorFlow/Keras: production deployment (TF Serving, TF Lite, TF.js), static graph optimization, TFX pipeline integration, larger industrial ecosystem. JAX: functional, XLA-compiled, high-performance research, growing but smaller ecosystem. Recommendation: PyTorch for research and custom models, TensorFlow for production deployment pipelines.

```python
# PyTorch: explicit training loop
import torch.nn as nn
import torch.optim as optim

class ImageClassifier(nn.Module):
    def __init__(self, num_classes=10):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d(1),
        )
        self.classifier = nn.Linear(128, num_classes)

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        return self.classifier(x)
```

### Step 2: Data Loading
PyTorch: Dataset class + DataLoader with num_workers, prefetch_factor, pin_memory. Augmentation: torchvision.transforms for images, custom transforms for audio/text. Multi-processing: num_workers = 4-8 per GPU, prefetch_factor=2. TensorFlow: tf.data.Dataset with interleave, map (with num_parallel_calls), cache, prefetch. Data pipeline must never be the bottleneck.

```python
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms

class ImageDataset(Dataset):
    def __init__(self, file_paths, labels, transform=None):
        self.file_paths = file_paths
        self.labels = labels
        self.transform = transform or transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    def __len__(self): return len(self.file_paths)

    def __getitem__(self, idx):
        image = Image.open(self.file_paths[idx]).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, self.labels[idx]

train_loader = DataLoader(
    train_dataset, batch_size=64, shuffle=True,
    num_workers=8, pin_memory=True, prefetch_factor=2,
    persistent_workers=True,
)
```

### Step 3: Training Loop
PyTorch: model.train(), optimizer.zero_grad(), loss.backward(), optimizer.step(). Gradient clipping for stability. Learning rate scheduling: cosine annealing, ReduceLROnPlateau, OneCycleLR. Checkpointing: save model state, optimizer state, epoch, best metric. Early stopping: patience=5-10 epochs on validation metric. Logging: loss, learning rate, metrics per epoch.

```python
def train_epoch(model, loader, optimizer, criterion, device, scaler=None):
    model.train()
    total_loss = 0
    for batch_idx, (inputs, targets) in enumerate(loader):
        inputs, targets = inputs.to(device), targets.to(device)

        optimizer.zero_grad()

        if scaler:  # Mixed precision
            with torch.amp.autocast(device_type="cuda"):
                outputs = model(inputs)
                loss = criterion(outputs, targets)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
        else:
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

        total_loss += loss.item()

    return total_loss / len(loader)


def validate(model, loader, criterion, device):
    model.eval()
    total_loss = 0
    correct = 0
    total = 0
    with torch.no_grad():
        for inputs, targets in loader:
            inputs, targets = inputs.to(device), targets.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            total_loss += loss.item()
            _, predicted = outputs.max(1)
            total += targets.size(0)
            correct += predicted.eq(targets).sum().item()
    return total_loss / len(loader), 100.0 * correct / total
```

### Step 4: CNN Architectures
ResNet: residual connections for deep networks (18, 34, 50, 101, 152). ResNet50 is the best accuracy/compute trade-off. EfficientNet: compound scaling (depth, width, resolution). EfficientNet-B0 to B7. MobileNet: depthwise separable convolutions for mobile/edge. ConvNeXt: modernized ResNet with Swish, LayerNorm. Transfer learning: freeze pretrained backbone, train new classifier head. Fine-tune whole network at low learning rate (1e-5 to 1e-4).

```python
# Transfer learning with ResNet50
import torchvision.models as models

model = models.resnet50(weights="DEFAULT")
for param in model.parameters():
    param.requires_grad = False

# Replace classifier
num_features = model.fc.in_features
model.fc = nn.Sequential(
    nn.Dropout(0.2),
    nn.Linear(num_features, 256),
    nn.ReLU(),
    nn.Linear(256, num_classes),
)

# Fine-tune: phase 1 train new head, phase 2 unfreeze all
optimizer = optim.Adam(model.fc.parameters(), lr=1e-3)
# Phase 2: unfreeze backbone, lower learning rate
for param in model.parameters():
    param.requires_grad = True
optimizer = optim.Adam(model.parameters(), lr=1e-5)
```

### Step 5: RNN and Transformer
LSTM: for sequence modeling (time-series, text). Bidirectional LSTM: context from both directions. GRU: lighter than LSTM, similar performance. Transformer: self-attention for parallel processing, positional encoding for sequence order. Multi-head attention: multiple attention heads capture different relationships.

```python
# Transformer encoder for sequence classification
class TransformerClassifier(nn.Module):
    def __init__(self, vocab_size, d_model=256, nhead=8, num_layers=4, num_classes=2):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, d_model)
        self.pos_encoder = PositionalEncoding(d_model, dropout=0.1)
        encoder_layer = nn.TransformerEncoderLayer(d_model, nhead, dim_feedforward=1024, dropout=0.1)
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers)
        self.classifier = nn.Linear(d_model, num_classes)

    def forward(self, x):
        x = self.embedding(x) * math.sqrt(x.size(-1))
        x = self.pos_encoder(x)
        x = self.transformer(x)
        x = x.mean(dim=0)  # Pool over sequence
        return self.classifier(x)


class PositionalEncoding(nn.Module):
    def __init__(self, d_model, dropout=0.1, max_len=5000):
        super().__init__()
        self.dropout = nn.Dropout(dropout)
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0).transpose(0, 1)
        self.register_buffer("pe", pe)

    def forward(self, x):
        x = x + self.pe[:x.size(0), :]
        return self.dropout(x)
```

### Step 6: Distributed Training
DDP (DistributedDataParallel): each GPU has model copy, gradient sync at each step. Best for models fitting in single GPU memory. FSDP (Fully Sharded Data Parallel): shard model parameters, gradients, optimizer states across GPUs. Best for large models (1B+ params). Launch: torchrun for DDP/FSDP. Gradient checkpointing: trade compute for memory (train larger models on fewer GPUs).

```python
# DDP training launcher: torchrun --nproc_per_node=4 train_ddp.py
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel
from torch.utils.data.distributed import DistributedSampler

def setup_ddp(rank, world_size):
    dist.init_process_group("nccl", rank=rank, world_size=world_size)
    torch.cuda.set_device(rank)

def cleanup_ddp():
    dist.destroy_process_group()

def train_ddp(rank, world_size):
    setup_ddp(rank, world_size)
    model = ImageClassifier().to(rank)
    model = DistributedDataParallel(model, device_ids=[rank])
    train_sampler = DistributedSampler(train_dataset, num_replicas=world_size, rank=rank)
    train_loader = DataLoader(train_dataset, batch_size=64, sampler=train_sampler, num_workers=4)
    optimizer = optim.AdamW(model.parameters(), lr=1e-4)

    for epoch in range(10):
        train_sampler.set_epoch(epoch)
        train_epoch(model, train_loader, optimizer, criterion, rank)
    cleanup_ddp()

if __name__ == "__main__":
    world_size = torch.cuda.device_count()
    torch.multiprocessing.spawn(train_ddp, args=(world_size,), nprocs=world_size)
```

## Rules
- Use PyTorch for research/custom models, TensorFlow for TFX production
- DataLoader with num_workers=4-8 and pin_memory=True always
- Mixed precision (AMP) for 1.5-3x throughput on Volta+ GPUs
- Gradient clipping (max_norm=1.0) for RNNs and transformers
- Learning rate scheduling always (cosine annealing or ReduceLROnPlateau)
- Checkpoint every N epochs, keep best 3 checkpoints
- DDP for model fitting in single GPU, FSDP for larger models
- Gradient checkpointing when memory constrained
- Validate on GPU, no .cpu() in validation loop
- Set deterministic flags for reproducibility (at the cost of speed)

## References
  - references/architectures.md — Modern Deep Learning Architectures
  - references/deep-learning-advanced.md — Deep Learning Advanced Topics
  - references/deep-learning-fundamentals.md — Deep Learning Fundamentals
  - references/generative-models.md — Generative Models
  - references/pytorch-tensorflow.md — PyTorch and TensorFlow Reference
  - references/training-optimization.md — Training Optimization Reference
## Handoff
`ml-experiment-tracking` for logging deep learning experiments
`ml-feature-engineering` for deep learning feature extraction
