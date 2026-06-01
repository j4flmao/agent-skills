# GPU and Accelerated Computing on Kubernetes

## GPU Node Configuration
NVIDIA GPU Operator: automates driver, toolkit, runtime, monitoring installation. GPU node labels: nvidia.com/gpu.present=true for node selection. GPU resource limits: nvidia.com/gpu: 1 in pod spec. MIG (Multi-Instance GPU): partition A100/H100 into up to 7 instances. Time-slicing: share GPU across multiple pods (no isolation). GPU monitoring: DCGM (Data Center GPU Manager) for metrics.

## GPU Workload Scheduling
Node affinity for GPU node selection. Tolerations for dedicated GPU nodes. GPU request/limit: must set both equal. Fractional GPU: possible only with MIG or time-slicing. Binpack vs spread GPU scheduling strategy. GPU fanout: one GPU serving multiple inference requests.

## Training Infrastructure
Distributed training: Horovod, PyTorch DDP, TensorFlow distributed. Kubeflow Training Operator: TFJob, PyTorchJob, MPIJob. Elastic training: fault-tolerant, dynamic node join/leave. NCCL: NVIDIA Collective Communications Library, requires fast interconnects. GPU topologies: NVLink, NVSwitch, InfiniBand for multi-node training.

## Inference Serving
NVIDIA Triton Inference Server: multi-framework, dynamic batching. KServe: serverless inference on Kubernetes. GPU sharing: Triton concurrent model execution. Automatic scaling: KEDA scaler based on inference queue depth. Model warm-up: pre-load models to avoid cold start latency.

## Storage for GPU Workloads
High-throughput FS: Lustre, GPUDirect Storage for direct GPU↔storage path. NVMe local SSDs for training data caching. ReadWriteMany PVC for shared dataset access. Object store (S3, GCS) for checkpoint storage. Dataset preloading: fuse mount or CSI driver for cloud storage.

## Cost Optimization
GPU utilization monitoring: DCGM exporter + Prometheus. Spot GPU instances for fault-tolerant training. GPU sharing for inference (Triton, MIG). Right-sizing: monitor GPU memory utilization per pod. Preemptible training jobs with checkpointing.

## References
- kubernetes-for-data-fundamentals.md -- Fundamentals
- gpu-storage-k8s.md -- GPU and Storage
- data-processing-k8s.md -- Data Processing
- data-infrastructure-k8s.md -- Infrastructure
- data-workloads-k8s.md -- Workloads
