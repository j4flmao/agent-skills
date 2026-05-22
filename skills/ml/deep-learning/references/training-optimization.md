# Training Optimization Reference

## DDP (DistributedDataParallel)

```python
# torchrun --nproc_per_node=4 train_ddp.py
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel
from torch.utils.data.distributed import DistributedSampler

def setup(rank, world_size):
    os.environ["MASTER_ADDR"] = "localhost"
    os.environ["MASTER_PORT"] = "12355"
    dist.init_process_group("nccl", rank=rank, world_size=world_size)
    torch.cuda.set_device(rank)

def cleanup(): dist.destroy_process_group()

def train(rank, world_size):
    setup(rank, world_size)
    model = MyModel().to(rank)
    model = DistributedDataParallel(model, device_ids=[rank])

    train_sampler = DistributedSampler(train_dataset, num_replicas=world_size, rank=rank, shuffle=True)
    train_loader = DataLoader(train_dataset, batch_size=64, sampler=train_sampler, num_workers=4, pin_memory=True)
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4 * world_size)

    for epoch in range(10):
        train_sampler.set_epoch(epoch)
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(rank), targets.to(rank)
            optimizer.zero_grad()
            loss = criterion(model(inputs), targets)
            loss.backward()
            optimizer.step()
        if rank == 0:
            torch.save(model.module.state_dict(), f"checkpoint_{epoch}.pt")
    cleanup()
```

## FSDP (Fully Sharded Data Parallel)

```python
from torch.distributed.fsdp import FullyShardedDataParallel as FSDP
from torch.distributed.fsdp.wrap import transformer_auto_wrap_policy
import functools

auto_wrap_policy = functools.partial(
    transformer_auto_wrap_policy, transformer_layer_cls={TransformerBlock})

model = FSDP(model, auto_wrap_policy=auto_wrap_policy,
    mixed_precision=FSDP.MixedPrecision(param_dtype=torch.bfloat16),
    device_id=torch.cuda.current_device())

# CPU offloading for very large models
from torch.distributed.fsdp import CPUOffload
model = FSDP(model, cpu_offload=CPUOffload(offload_params=True))
```

## Mixed Precision (AMP)

```python
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()
for inputs, targets in train_loader:
    optimizer.zero_grad()
    with torch.amp.autocast(device_type="cuda", dtype=torch.float16):
        loss = criterion(model(inputs.to(device)), targets.to(device))
    scaler.scale(loss).backward()
    scaler.unscale_(optimizer)
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    scaler.step(optimizer)
    scaler.update()
```

## Gradient Accumulation

```python
accumulation_steps = 256 // 64  # effective_batch / actual_batch
optimizer.zero_grad()
for i, (inputs, targets) in enumerate(train_loader):
    with torch.amp.autocast(device_type="cuda"):
        loss = criterion(model(inputs.to(device)), targets.to(device)) / accumulation_steps
    scaler.scale(loss).backward()
    if (i + 1) % accumulation_steps == 0:
        scaler.step(optimizer)
        scaler.update()
        optimizer.zero_grad()
```

## CUDA Optimization

```python
# Enable cudnn autotune (faster after warmup)
torch.backends.cudnn.benchmark = True

# TF32 on A100 (faster than FP32)
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True

# Memory management
torch.cuda.empty_cache()
print(f"Allocated: {torch.cuda.memory_allocated() / 1e9:.2f} GB")
print(f"Cached: {torch.cuda.memory_reserved() / 1e9:.2f} GB")

# Gradient checkpointing (trade compute for memory)
model = torch.utils.checkpoint.checkpoint_sequential(blocks, segments=4)

# Optimal DataLoader
train_loader = DataLoader(dataset, batch_size=64, num_workers=8,
    prefetch_factor=4, pin_memory=True, persistent_workers=True, pin_memory_device="cuda")
```

## Checkpointing

```python
def save_checkpoint(state, filename):
    torch.save({
        "epoch": state["epoch"],
        "model_state_dict": state["model"].state_dict(),
        "optimizer_state_dict": state["optimizer"].state_dict(),
        "scheduler_state_dict": state["scheduler"].state_dict(),
        "scaler_state_dict": state["scaler"].state_dict(),
        "best_metric": state["best_metric"],
    }, filename)

def load_checkpoint(filename, model, optimizer=None, scheduler=None, scaler=None):
    checkpoint = torch.load(filename, map_location="cpu")
    model.load_state_dict(checkpoint["model_state_dict"])
    if optimizer: optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
    if scheduler: scheduler.load_state_dict(checkpoint["scheduler_state_dict"])
    if scaler and "scaler_state_dict" in checkpoint:
        scaler.load_state_dict(checkpoint["scaler_state_dict"])
    return checkpoint["epoch"], checkpoint["best_metric"]
```

### Pipeline Parallelism
```python
from torch.distributed.pipeline.sync import Pipe
model = nn.Sequential(*layers_gpu_0, *layers_gpu_1)
model = Pipe(model, chunks=8)  # micro-batches
```

## References
- DDP tutorial: https://pytorch.org/tutorials/intermediate/ddp_tutorial.html
- FSDP docs: https://pytorch.org/docs/stable/fsdp.html
- AMP guide: https://pytorch.org/docs/stable/amp.html
