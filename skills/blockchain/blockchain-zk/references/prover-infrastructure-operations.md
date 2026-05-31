# Prover Infrastructure Operations

## Overview

A prover is the most computationally intensive component in a ZK-rollup or ZK-app stack. Generating proofs for production rollups requires specialized hardware (GPUs, FPGAs, or ASICs), parallelized proving systems, and careful operational management to maintain throughput, latency, and cost targets. This reference covers prover hardware selection, distributed proving architectures, prover cluster orchestration, proving time optimization, economic modeling (proof cost per transaction), and monitoring for prover health and performance.

## Core Architecture Concepts

### Prover in the ZK-Rollup Stack

```
User Transactions
       │
       ▼
┌──────────────┐
│  Sequencer    │  Orders transactions, produces execution trace
└──────┬───────┘
       │ (execution trace / witness)
       ▼
┌──────────────┐
│   Prover     │  Generates validity proof
│  (GPU/FPGA)  │
└──────┬───────┘
       │ (proof)
       ▼
┌──────────────┐
│  Verifier    │  On-chain contract, verifies proof
│  (L1 Contract)│
└──────────────┘
```

### Key Performance Metrics

| Metric | Definition | Target | Measurement |
|---|---|---|---|
| Proving time | Time to generate one proof | < 5 min (rollup), < 1 min (app) | End-to-end timer |
| Throughput | Proofs per hour | > 12 proof/hr (rollup) | Block production rate |
| Cost per proof | Compute cost + amortized hardware | < $0.01 per L2 tx | Cloud billing + depreciation |
| Proof size | Bytes of the final proof | < 256 KB | Proof serialization |
| Verification gas | L1 gas for verify() | < 500k gas | On-chain measurement |
| Latency P95 | 95th percentile proving time | < 2x median | Histogram over 24h |

### Prover Hardware Landscape

| Hardware | Proving System | Throughput | Cost | Power | Availability |
|---|---|---|---|---|---|
| NVIDIA A100 80GB | Groth16, PLONK | 1 proof/3 min (1M constraints) | $15K | 400W | Cloud + on-prem |
| NVIDIA H100 | Groth16, PLONK, STARK | 2-3x A100 | $30K | 700W | Cloud + on-prem |
| NVIDIA RTX 4090 | Groth16 (small circuits) | 1 proof/30 sec (100K constraints) | $1.6K | 450W | Consumer |
| Apple M2 Ultra | STARK (Winterfell) | Competitive with A100 for STARKs | $7K | 100W | Local dev |
| FPGA (Xilinx Alveo) | Custom MSM + NTT | 5-10x GPU for MSM | $20K+ | 150W | Specialized |
| ASIC (Ingonyama) | MSM accelerator | 10-100x GPU for MSM | TBD | TBD | Early access |

## Architecture Decision Trees

### Prover Architecture Selection

```
Designing a proving system?
├── Rollup type?
│   ├── zkEVM (full EVM equivalence) → Parallelized GPU cluster (RISC Zero, Polygon zkEVM)
│   ├── zkApp (specific application) → Single GPU or FPGA
│   └── Validity proof for L1→L2 → Prover-as-a-service (shared prover network)
├── Throughput requirement?
│   ├── < 1 proof/hour → Single GPU sufficient
│   ├── 1-10 proofs/hour → Multi-GPU (2-8 A100s)
│   ├── 10-100 proofs/hour → GPU cluster (8-32 GPUs) + load balancer
│   └── > 100 proofs/hour → FPGA or ASIC acceleration needed
├── Latency requirement?
│   ├── Real-time (< 1 min) → Pre-computation + parallel proving + FPGA
│   ├── Near-real-time (< 10 min) → Multi-GPU parallelization
│   └── Batch (> 30 min) → Single GPU, batch proofs
└── Budget?
    ├── < $50K → Cloud spot GPU instances
    ├── $50K-$500K → Dedicated cloud instances + reserved capacity
    └── > $500K → On-premise GPU cluster
```

### Proving System Selection by Hardware

```
Hardware available?
├── Consumer GPU (RTX 4090)
│   ├── Best for: Groth16 with < 500K constraints
│   ├── Poor for: Large STARK proofs (memory-bound)
│   └── Recommendation: snarkjs / bellman for Groth16
├── Data-center GPU (A100/H100)
│   ├── Best for: PLONK, Halo2, large circuits
│   ├── Good for: STARK proofs with GPU accelerators
│   └── Recommendation: Halo2 with GPU MSM, plonky2
├── FPGA
│   ├── Best for: Fixed proving system, high throughput MSM/NTT
│   ├── Poor for: Rapidly changing circuit logic
│   └── Recommendation: Ingonyama or custom Succinct FPGA
└── CPU cluster
    ├── Best for: STARK proofs (Winterfell, StarkWare)
    ├── Acceptable for: Small Groth16 proofs
    └── Recommendation: Winterfell, StarkWare Stone
```

## Implementation Strategies

### Prover Cluster Orchestration (Kubernetes)

```yaml
# prover-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zk-prover
  namespace: zk-rollup
spec:
  replicas: 4
  selector:
    matchLabels:
      app: zk-prover
  template:
    metadata:
      labels:
        app: zk-prover
    spec:
      # GPU node selector
      nodeSelector:
        cloud.google.com/gke-accelerator: nvidia-a100-80gb
      containers:
      - name: prover
        image: zk-rollup/prover:latest
        resources:
          limits:
            nvidia.com/gpu: 1
            memory: "128Gi"
            cpu: "32"
        env:
        - name: PROVER_MODE
          value: "parallel"
        - name: PROVER_THREADS
          value: "32"
        - name: RUST_LOG
          value: "info"
        - name: PROVER_METRICS_PORT
          value: "9090"
        volumeMounts:
        - name: proving-keys
          mountPath: /keys
        - name: prover-storage
          mountPath: /data
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: proving-keys
        persistentVolumeClaim:
          claimName: proving-keys-pvc
      - name: prover-storage
        emptyDir: {}
---
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: zk-prover-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: zk-prover
  minReplicas: 2
  maxReplicas: 16
  metrics:
  - type: Pods
    pods:
      metric:
        name: prover_queue_depth
      target:
        type: AverageValue
        averageValue: 5
```

### Distributed Proving with Work Queue

```rust
// Distributed prover worker (Rust + Redis queue)
use redis::AsyncCommands;
use std::sync::Arc;
use tokio::sync::Semaphore;

struct ProverWorker {
    redis: redis::aio::ConnectionManager,
    prover: Arc<ProvingSystem>,
    semaphore: Arc<Semaphore>, // Max concurrent proving tasks
}

impl ProverWorker {
    async fn run(&mut self) {
        let mut pubsub = self.redis.as_pubsub();
        pubsub.subscribe("prove:jobs").await.unwrap();
        let mut stream = pubsub.on_message();

        loop {
            let msg = stream.next().await.unwrap();
            let payload: ProvingJob = msg.get_payload().unwrap();

            // Acquire semaphore slot (limit GPU concurrency)
            let permit = self.semaphore.clone().acquire_owned().await.unwrap();
            let prover = self.prover.clone();

            // Spawn proving task
            tokio::spawn(async move {
                let _permit = permit;
                let result = prover.prove(&payload.witness, &payload.public_inputs).await;

                // Publish result
                let mut conn = /* get connection */;
                conn.publish("prove:results", ProvingResult {
                    job_id: payload.job_id,
                    result,
                }).await.unwrap();
            });
        }
    }
}
```

### Proof Compression and Aggregation

```rust
// Recursive proof aggregation for batch submission
struct ProofAggregator {
    inner_prover: Arc<ProvingSystem>,
    max_batch_size: usize,
    aggregation_tree: Vec<Vec<Proof>>,
}

impl ProofAggregator {
    fn add_proof(&mut self, proof: Proof) -> Option<Proof> {
        // Add proof to aggregation tree
        self.aggregation_tree[0].push(proof);

        // When we have enough proofs at a level, aggregate them
        for level in 0..self.aggregation_tree.len() {
            if self.aggregation_tree[level].len() >= self.max_batch_size {
                let proofs = self.aggregation_tree[level].drain(..).collect();
                let aggregated = self.inner_prover.aggregate(proofs);
                self.aggregation_tree[level + 1].push(aggregated);
            } else {
                return None;
            }
        }

        // All levels full: final aggregation proof ready
        let final_aggregation = self.inner_prover.final_aggregate(
            self.aggregation_tree.iter().map(|v| v.last().unwrap()).collect()
        );
        self.aggregation_tree.clear();
        Some(final_aggregation)
    }
}
```

## Integration Patterns

### Prover-As-A-Service Integration

```typescript
// Client SDK for submitting proving jobs to a remote prover service
class ProverClient {
    private baseUrl: string
    private apiKey: string

    constructor(baseUrl: string, apiKey: string) {
        this.baseUrl = baseUrl
        this.apiKey = apiKey
    }

    async submitProvingJob(witness: Witness, publicInputs: string[]): Promise<string> {
        const response = await fetch(`${this.baseUrl}/v1/prove`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({ witness, publicInputs })
        })

        const { jobId } = await response.json()
        return jobId
    }

    async pollForResult(jobId: string, maxRetries: number = 60): Promise<Proof> {
        for (let i = 0; i < maxRetries; i++) {
            const response = await fetch(`${this.baseUrl}/v1/jobs/${jobId}`)
            const job = await response.json()

            if (job.status === 'completed') {
                return job.proof
            }
            if (job.status === 'failed') {
                throw new Error(`Proving failed: ${job.error}`)
            }

            await sleep(5000) // 5 second poll interval
        }
        throw new Error('Proving timed out')
    }
}
```

### Prover Monitoring Stack

```yaml
# prover-metrics.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: zk-prover-monitor
spec:
  selector:
    matchLabels:
      app: zk-prover
  endpoints:
  - port: metrics
    interval: 10s
```

```promql
// Prometheus queries for prover monitoring

// Proving time per job (p95)
histogram_quantile(0.95,
  rate(prover_job_duration_seconds_bucket[5m])
)

// Proof throughput
rate(prover_jobs_completed_total[5m])

// GPU utilization
avg(rate(nvidia_gpu_duty_cycle[5m])) by (gpu)

// Queue depth
prover_queue_depth

// Failure rate
rate(prover_jobs_failed_total[5m]) / rate(prover_jobs_completed_total[5m]) * 100

// Memory pressure
prover_memory_usage_bytes / prover_memory_limit_bytes
```

## Performance Optimization

### Proving Time Optimization Techniques

| Technique | Improvement | Complexity | Risk |
|---|---|---|---|
| MSM parallelization (GPU) | 10-50x | High | GPU memory limit |
| NTT parallelization (GPU) | 5-20x | Medium | Bandwidth bound |
| Multi-threaded witness generation | 2-4x | Low | Thread safety |
| Batch proving (multiple txs per proof) | 5-10x | Medium | Latency increase |
| Recursive proof aggregation | 2-5x per level | High | Additional overhead |
| Pre-computed CRS | 10-100x setup | Low | Storage (hundreds of GB) |
| Custom gate optimization | 1.5-3x | High | Circuit-specific |
| Lookup table optimization | 2-5x (for range checks) | Medium | Circuit changes |

### GPU Memory Management

```rust
// GPU memory pooling for efficient MSM computation
struct GPUWorker {
    device: cudarc::CudaDevice,
    memory_pool: MemoryPool,
    max_batch_constraints: usize,
}

impl GPUWorker {
    fn allocate_for_circuit(&mut self, constraints: usize) -> Result<GpuMemoryHandle> {
        let required_mem = self.calculate_memory(constraints);

        if required_mem > self.memory_pool.available() {
            // Fall back to CPU proving if GPU memory insufficient
            return Err(GpuMemoryError::InsufficientMemory);
        }

        let handle = self.memory_pool.allocate(constraints)?;

        // Pin memory for faster CPU-GPU transfer
        handle.pin()?;

        Ok(handle)
    }

    fn calculate_memory(&self, constraints: usize) -> usize {
        // MSM: O(n) points + O(n) scalars + O(n) results
        // Each point: 64 bytes (G1 affine), each scalar: 32 bytes
        // NTT: O(n log n) temporary storage
        // Rough estimate: ~200 bytes per constraint
        constraints * 200 + (1 << 20) // + 1MB overhead
    }
}
```

## Security Considerations

- **Prover key leakage**: The proving key (CRS / Structured Reference String) must be kept secret in some proof systems (Groth16). Store in HSM or encrypted storage with strict access control.
- **Witness data confidentiality**: The witness contains private inputs. In a remote prover setup, the prover learns the witness. For private inputs, use recursive proofs or trusted execution environments.
- **Prover denial of service**: An adversary can submit expensive proving jobs to exhaust prover resources. Implement rate limiting, cost-based prioritization, and proof-of-work for public prover endpoints.
- **Slashing risk from invalid proofs**: If the prover is bonded / staked (decentralized prover network), generating invalid proofs can lead to slashing. Implement rigorous pre-verification before submission.
- **Timing side channels**: Proving time can leak information about witness values. For privacy-sensitive apps, use constant-time proving or add noise to proving time.

## Operational Excellence

### Prover Incident Response

```markdown
## Prover Failure Runbook

### Symptom: Proving time exceeds SLO
1. Check GPU utilization: `nvidia-smi`
2. Check GPU memory: `nvidia-smi --query-gpu=memory.used --format=csv`
3. Check queue depth: Prometheus `prover_queue_depth`
4. Check for straggler pods: `kubectl top pods -n zk-rollup`
5. Action:
   - Memory pressure → Reduce batch size / increase GPU count
   - Queue depth > 10 → Scale up HPA
   - Single pod slow → Restart pod, check logs for hardware errors

### Symptom: Proof verification failing on L1
1. Verify proof locally: `prover verify --proof proof.bin --public-inputs public.json`
2. Check L1 verifier contract: is it the correct version?
3. Check circuit version mismatch: does the proof match the verifier circuit?
4. Action:
   - Version mismatch → Upgrade verifier contract OR prove with correct circuit
   - Local verify fails → Prover bug, roll back to previous prover version
   - Local verify passes → L1 verifier bug, emergency contract upgrade
```

### Capacity Planning

```yaml
# Prover capacity plan
# Assumes: Groth16 proving, 1M constraints per block, 12 sec block time

capacity_plan:
  current:
    proving_time: 180s  # 3 min per proof
    gpus: 4x A100
    throughput: 48 proofs/hour  # Under-utilized

  target_1_month:
    proving_time: < 120s
    gpus: 8x A100 (2x cluster)
    throughput: 240 proofs/hour

  target_3_month:
    proving_time: < 60s
    gpus: 16x H100 (4x cluster)
    throughput: 960 proofs/hour

  scaling_rule:
    - "Add 2 GPUs per 2x increase in transaction volume"
    - "Upgrade GPU generation annually for 2x perf improvement"
    - "Budget: $X per GPU per month (cloud spot) vs $Y per GPU (reserved)"
```

## Testing Strategy

### Prover Integration Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_prove_and_verify() {
        let circuit = create_test_circuit(1000); // 1K constraints
        let prover = ProvingSystem::new(circuit);
        let verifier = Verifier::new(circuit);

        let witness = create_valid_witness();
        let proof = prover.prove(&witness).unwrap();

        let result = verifier.verify(&proof, &witness.public_inputs());
        assert!(result.is_ok());
    }

    #[test]
    fn test_invalid_witness_rejected() {
        let circuit = create_test_circuit(1000);
        let prover = ProvingSystem::new(circuit);
        let verifier = Verifier::new(circuit);

        let invalid_witness = create_invalid_witness();
        let proof = prover.prove(&invalid_witness).unwrap();

        let result = verifier.verify(&proof, &invalid_witness.public_inputs());
        assert!(result.is_err());
    }

    #[test]
    fn test_proof_size_bounded() {
        let circuit = create_test_circuit(1_000_000); // 1M constraints
        let prover = ProvingSystem::new(circuit);
        let witness = create_valid_witness();

        let proof = prover.prove(&witness).unwrap();
        let serialized = bincode::serialize(&proof).unwrap();

        assert!(serialized.len() < 256 * 1024); // < 256 KB
    }
}
```

## Common Pitfalls

| Pitfall | Consequence | Prevention |
|---|---|---|
| GPU memory exhaustion mid-proof | Prover crash, retry waste | Profile circuit memory before deployment |
| Single prover bottleneck | Rollup stalls | Implement multi-prover with queue |
| Ignoring GPU temperature | Thermal throttling, intermittent failures | Monitor GPU temp, add cooling thresholds |
| Proving key on shared storage | Key leakage, compromised proofs | HSM or encrypted volume for proving keys |
| No prover versioning | Proof-verifier mismatch | Tag proving key with circuit+prover version |
| Oversized batch for GPU memory | OOM on large circuits | Adaptive batch sizing based on circuit size |
| Using spot instances without fallback | Prover unavailable during reclaim | Spot + on-demand hybrid with failover |
| Not testing prover recovery | Extended downtime after crash | Test pod restart, queue replay, state recovery |

## Key Takeaways

1. **GPU is the minimum for production proving** — CPU proving is 10-100x slower and only suitable for development.
2. **Proof aggregation is essential for L1 cost efficiency** — aggregating 10-100 proofs into one reduces verification gas by 10-100x.
3. **Parallelize across GPUs with a work queue** — a single GPU cannot keep up with rollup throughput. Distribute proving jobs with Redis/RabbitMQ queue.
4. **Monitor proving time as the primary SLO** — if proving exceeds block time, the rollup stalls. Set aggressive P95 proving time targets.
5. **Prover version must match verifier version** — circuit changes require coordinated upgrades of both prover and L1 verifier contract.
6. **GPU memory is the bottleneck, not compute** — most proving systems are memory-bound. Choose GPUs with high VRAM (80GB A100/H100).
7. **Cloud spot instances are viable for proving** — proving workloads are interruptible if designed with checkpointing and queue replay.
8. **Test proof generation + verification end-to-end in CI** — ensure proofs generated by the prover always pass the verifier before deployment.