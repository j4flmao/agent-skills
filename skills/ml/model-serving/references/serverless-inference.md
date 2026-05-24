# Serverless Model Inference

## Serverless Serving Platforms

| Platform | Cold Start | Max Timeout | Concurrency | GPU Support | Pricing Model |
|----------|-----------|-------------|-------------|-------------|---------------|
| AWS SageMaker Serverless | 5-30s | 15 min | 1K+ per endpoint | No | Per-invocation |
| GCP Cloud Run | 1-10s | 60 min | 1K per revision | No | Per-request + idle |
| Azure ML Serverless | 5-20s | 30 min | Auto-scale | No | Per-endpoint hour |
| Modal | <1s | 24 hr | Unlimited | Yes | Per-second + GPU |
| Banana.dev | <1s | 30 min | Auto-scale | Yes | Per-second |
| Replicate | 2-10s | 5 min | Auto-scale | Yes | Per-prediction |
| Together AI | <1s | 2 min | Scale-to-zero | Yes | Per-token |

## Cold Start Optimization

```
# Modal: container image caching ensures fast cold starts
import modal

app = modal.App("model-server")

@app.cls(gpu="A10G", container_idle_timeout=300)
class Inference:
    def __init__(self):
        import torch
        self.model = torch.load("model.pt")
        self.model.eval()

    @modal.method()
    def predict(self, input_data):
        return self.model(input_data).tolist()
```

| Strategy | Cold Start | Complexity | Notes |
|----------|-----------|------------|-------|
| Keep-warm instances | <100ms | Low | Cost: pay for idle |
| Predictive warm-up | <500ms | Medium | ML-based warm prediction |
| Container snapshot | <2s | High | Firecracker microVM |
| Model streaming | <3s | Medium | Load model from S3 on demand |
| Model pooling | <200ms | High | Pre-connect model pool |

## Request Batching

```
# AWS Lambda + SQS batching
import json
import boto3

def lambda_handler(event, context):
    # Receive batch of requests
    records = event["Records"]
    inputs = [json.loads(r["body"]) for r in records]

    # Batch inference
    predictions = model.predict(inputs)

    # Return results
    return {"statusCode": 200, "body": json.dumps(predictions)}
```

## Scaling Configuration

| Component | Setting | Rationale |
|-----------|---------|-----------|
| Max concurrency | 100-200 | Per endpoint, higher = more parallelism |
| Provisioned concurrency | 10-50 | Eliminate cold start for base load |
| Scale-in threshold | 5 min | Avoid thrash on traffic dips |
| Burst capacity | 50 | Handle sudden traffic spikes |
| Memory allocation | 3-5 GB | Larger than necessary for compute credit |

## Cost Optimization

```
# Cost comparison: serverless vs dedicated
aws sagemaker list-endpoints --region us-east-1

# Typical savings with serverless:
# - Low traffic (<100 req/min): 60-80% cheaper than dedicated
# - Variable traffic: 40-60% cheaper
# - High steady traffic: 10-20% more expensive
```

| Traffic Pattern | Recommended Strategy |
|-----------------|---------------------|
| Predictable steady | Dedicated (cheaper at scale) |
| Spiky / variable | Serverless (pay per request) |
| Unknown / new | Start serverless, migrate when patterns emerge |
| Bursty (batch jobs) | Serverless with scale-to-zero between jobs |
| Real-time (<100ms) | Dedicated (cold start too slow) |

## Monitoring Serverless Inference

- Track cold start frequency and duration
- Monitor p50/p95/p99 inference latency excluding cold start
- Track invocation rate vs provisioned concurrency utilization
- Alert on throttling errors (HTTP 429/503)
- Monitor model load time as a separate metric
- Log request IDs for end-to-end tracing
- Set up dashboards for cost per invocation

## Limitations

- GPU serverless still immature — most platforms CPU-only
- Cold starts make sub-100ms inference challenging
- Max request timeout (5-15 min typical)
- Payload size limits (6MB for Lambda, 10MB for Cloud Run)
- State management is complex — prefer stateless functions
- VPC networking adds latency (5-10ms)
- Not suitable for large model loading (>10GB) on each invocation

## Best Practices

- Right-size memory allocation: more memory = more CPU credit
- Use provisioned concurrency for production workloads
- Pre-download model to /tmp on Lambda (max 10GB ephemeral storage)
- Implement request queuing via SQS/SNS for burst smoothing
- Cache model in global memory (module-level for Lambda Python)
- Split pre/post-processing from inference for faster cold starts
- Use async inference for long-running predictions
- Set realistic timeout values based on p99.9 latency
