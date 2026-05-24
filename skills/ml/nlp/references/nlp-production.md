# NLP Production Deployment

## Production NLP Pipeline

```
Input Text
  ↓
[Preprocessing] → Tokenization, normalization, truncation
  ↓
[Inference] → Model forward pass
  ↓
[Post-processing] → Decode, format, confidence calibration
  ↓
[Validation] → Schema check, confidence threshold
  ↓
[Output] → API response
```

## Serving NLP Models

### ONNX Export & Runtime

```
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch

model = AutoModelForSequenceClassification.from_pretrained("bert-base-uncased")
tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

# Export to ONNX
dummy_input = tokenizer("test", return_tensors="pt")
torch.onnx.export(
    model,
    (dummy_input["input_ids"], dummy_input["attention_mask"]),
    "model.onnx",
    input_names=["input_ids", "attention_mask"],
    output_names=["logits"],
    dynamic_axes={
        "input_ids": {0: "batch_size", 1: "sequence_length"},
        "attention_mask": {0: "batch_size", 1: "sequence_length"},
    },
    opset_version=17,
)

# ONNX Runtime inference
import onnxruntime as ort
session = ort.InferenceSession("model.onnx")
ort_inputs = {
    "input_ids": input_ids.numpy(),
    "attention_mask": attention_mask.numpy(),
}
logits = session.run(None, ort_inputs)
```

### vLLM for LLM Serving

```
# vLLM for efficient LLM inference
from vllm import LLM, SamplingParams

llm = LLM(model="mistralai/Mistral-7B-v0.1")
sampling_params = SamplingParams(temperature=0.7, max_tokens=512)

outputs = llm.generate(["prompt 1", "prompt 2"], sampling_params)
for output in outputs:
    print(output.outputs[0].text)
```

## Latency Optimization

| Technique | Speedup | Quality Loss | Complexity |
|-----------|---------|-------------|------------|
| Quantization (FP16) | 2x | Negligible | Low |
| Quantization (INT8) | 3-4x | <1% | Medium |
| Distillation | 2x | 1-3% | High |
| ONNX Runtime | 2-5x (CPU) | None | Medium |
| TensorRT | 3-5x (GPU) | None | High |
| vLLM PagedAttention | 2-4x | None | Medium |
| KV caching | 10-100x | None | Low |
| Continuous batching | 2-3x throughput | None | Medium |

```
# Continuous batching with TGI
# docker run -p 8080:80 -e MODEL_ID=mistralai/Mistral-7B-v0.1 ghcr.io/huggingface/text-generation-inference:latest

curl http://localhost:8080/generate \
  -X POST \
  -d '{"inputs": "Explain transformers:", "parameters": {"max_new_tokens": 100}}' \
  -H 'Content-Type: application/json'
```

## Preprocessing as Service

```
# Separate tokenization from inference
class TokenizerService:
    def __init__(self, model_name="bert-base-uncased"):
        from transformers import AutoTokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)

    def preprocess(self, texts: list[str], max_length=512):
        return self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=max_length,
            return_tensors="np",
        )

# Tokenizer is lightweight — can be deployed at the edge/API gateway
# Model inference is heavier — deploy on GPU cluster
# Separating enables independent scaling
```

## Monitoring

| Metric | What It Tracks | Alert Threshold |
|--------|---------------|-----------------|
| p50/p95/p99 latency | Response time | >500ms p95 |
| Throughput | Requests per second | <50% of expected |
| Error rate | 4xx/5xx responses | >1% |
| Input length | Token count distribution | >90th percentile |
| OOV rate | Unknown token frequency | >5% increase |
| Confidence drift | Prediction score distribution | >10% shift |
| Data drift | Embedding distribution | MMD > threshold |

## Cost Management

| Strategy | Savings | Implementation |
|----------|---------|---------------|
| Request caching | 30-50% | Cache identical queries |
| Input length capping | 20-40% | Truncate to 256 tokens when possible |
| Batch aggregation | 40-60% | Process 8-32 requests together |
| Model cascading | 50-70% | Small model first, escalate to large |
| Scale-to-zero | 60-80% | Serverless for variable traffic |

```
# Model cascading
def cascade_inference(text):
    # Try small model first
    result = small_model(text)
    if result["confidence"] > 0.95:
        return result
    # Escalate to large model
    return large_model(text)
```

## Best Practices

- Separate tokenization from model inference for independent scaling
- Use ONNX Runtime or vLLM for production — never raw PyTorch
- Implement request-level caching for exact or near-exact query matches
- Set max sequence length based on your production data distribution
- Monitor vocabulary coverage — increasing OOV rate signals distribution shift
- Validate all model outputs against schema before returning to users
- Pin tokenizer version alongside model version for consistent preprocessing
- Implement circuit breaker: degrade gracefully when inference service is slow
- Log sampling: log 1% of requests for debugging, 100% of errors for alerts
- Use separate endpoints for different latency SLAs (batch vs real-time)
