# Inference Optimization

## Semantic Cache

```python
import hashlib
import time
import numpy as np
from sentence_transformers import SentenceTransformer

class SemanticCache:
    def __init__(self, similarity_threshold=0.92, ttl=300, max_size=10000):
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        self.cache = {}
        self.threshold = similarity_threshold
        self.ttl = ttl
        self.max_size = max_size
        self.hits = 0
        self.misses = 0

    def get(self, query):
        query_embed = self.encoder.encode(query, normalize_embeddings=True)
        now = time.time()
        expired = [k for k, v in self.cache.items() if now - v["timestamp"] > self.ttl]
        for k in expired:
            del self.cache[k]

        best_match = None
        best_score = 0
        for key, entry in self.cache.items():
            similarity = np.dot(query_embed, entry["embedding"])
            if similarity > best_score and similarity > self.threshold:
                best_score = similarity
                best_match = entry

        if best_match:
            self.hits += 1
            return {"hit": True, "response": best_match["response"], "similarity": best_score}
        self.misses += 1
        return {"hit": False}

    def set(self, query, response):
        query_embed = self.encoder.encode(query, normalize_embeddings=True)
        key = hashlib.md5(query.encode()).hexdigest()
        if len(self.cache) >= self.max_size:
            oldest = min(self.cache, key=lambda k: self.cache[k]["timestamp"])
            del self.cache[oldest]
        self.cache[key] = {"embedding": query_embed, "response": response, "timestamp": time.time()}

    def get_stats(self):
        total = self.hits + self.misses
        return {"hits": self.hits, "misses": self.misses, "hit_rate": self.hits / total if total > 0 else 0, "cache_size": len(self.cache)}

cache = SemanticCache(threshold=0.92)
def cached_llm_call(prompt):
    cached = cache.get(prompt)
    if cached["hit"]:
        return cached["response"]
    response = llm.generate(prompt)
    cache.set(prompt, response)
    return response
```

## Model Quantization for Inference

```python
import torch
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

model_fp16 = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-2-7b-chat-hf", torch_dtype=torch.float16, device_map="auto")

model_int8 = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-2-7b-chat-hf", load_in_8bit=True, device_map="auto")

bnb_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_use_double_quant=True, bnb_4bit_compute_dtype=torch.float16)
model_int4 = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-2-7b-chat-hf", quantization_config=bnb_config, device_map="auto")

sizes = {"FP32": 28.0, "FP16": 14.0, "INT8": 7.0, "INT4": 3.5}
for prec, gb in sizes.items():
    print(f"{prec}: {gb} GB")
```

## Flash Attention

```python
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-2-7b-chat-hf",
    torch_dtype=torch.float16,
    attn_implementation="flash_attention_2",
    device_map="auto",
)
# Benefits: O(n) memory, 2-4x faster for sequences > 1K tokens, no quality loss
```

## KV Cache Optimization

```python
# Default KV cache (fast, memory heavy)
output = model.generate(input_ids, max_new_tokens=512, use_cache=True)

# Continuous batching with PagedAttention (vLLM)
from vllm import LLM, SamplingParams

llm = LLM(model="meta-llama/Llama-2-7b-chat-hf", tensor_parallel_size=2, gpu_memory_utilization=0.90, enable_prefix_caching=True)

sampling_params = SamplingParams(temperature=0.7, max_tokens=256)
outputs = llm.generate(prompts, sampling_params)
```

## Model Routing

```python
class SmartRouter:
    def __init__(self):
        self.models = {
            "fast": {"model": "gpt-4o-mini", "cost_per_1k_input": 0.00015, "cost_per_1k_output": 0.0006},
            "quality": {"model": "gpt-4o", "cost_per_1k_input": 0.0025, "cost_per_1k_output": 0.01},
            "reasoning": {"model": "o1", "cost_per_1k_input": 0.01, "cost_per_1k_output": 0.04},
        }

    def classify(self, query):
        word_count = len(query.split())
        if word_count < 15 and "?" in query[-3:]:
            return "fast"
        if any(kw in query.lower() for kw in ["reason", "logic", "math", "code", "explain why", "compare", "analyze"]):
            return "reasoning"
        return "quality"

    def route(self, query):
        return self.models[self.classify(query)]["model"]

router = SmartRouter()
for q in ["What is 2+2?", "Explain relativity.", "Write Python to sort a list."]:
    model, cost = router.estimate_cost(q) if hasattr(router, 'estimate_cost') else (router.route(q), 0)
    print(f"'{q[:30]}...' -> {router.route(q)}")
```

## Continuous Batching (vLLM)

```python
from vllm import LLM, SamplingParams

llm = LLM(model="meta-llama/Llama-2-7b-chat-hf")
sampling_params = SamplingParams(temperature=0.8, max_tokens=128)

requests = ["Tell me about ML", "Write a poem", "Explain quantum computing", "What is Paris?", "How do transformers work?"]
outputs = llm.generate(requests, sampling_params)
```

## Cost Monitoring

```python
from collections import defaultdict
from datetime import datetime

class CostMonitor:
    def __init__(self):
        self.daily_logs = defaultdict(list)

    def log_inference(self, model, input_tokens, output_tokens, latency_ms):
        cost = self.calculate_cost(model, input_tokens, output_tokens)
        date = datetime.now().strftime("%Y-%m-%d")
        self.daily_logs[date].append({"model": model, "cost": cost, "latency_ms": latency_ms})

    def calculate_cost(self, model, input_tokens, output_tokens):
        pricing = {"gpt-4o-mini": {"input": 0.00015, "output": 0.0006}, "gpt-4o": {"input": 0.0025, "output": 0.01}}
        p = pricing.get(model, pricing["gpt-4o-mini"])
        return (input_tokens * p["input"] + output_tokens * p["output"]) / 1000

    def daily_summary(self, date=None):
        date = date or datetime.now().strftime("%Y-%m-%d")
        logs = self.daily_logs.get(date, [])
        total_cost = sum(l["cost"] for l in logs)
        return {"date": date, "total_cost": total_cost, "total_requests": len(logs), "avg_latency": sum(l["latency_ms"] for l in logs) / max(len(logs), 1)}
```

## Optimization Decision Tree

```
Reduce inference cost?
├── Cache frequent queries
│   └── Semantic cache with threshold 0.90-0.95
├── Compress prompts
│   └── LLMLingua at 0.5 compression rate
├── Quantize model
│   ├── FP16: 0% quality loss, 2x memory reduction
│   ├── INT8: <1% loss, 4x reduction
│   └── INT4: <2% loss, 8x reduction
├── Route by complexity
│   ├── Simple -> cheap model
│   └── Complex -> expensive model
├── Batch requests
│   └── vLLM continuous batching
└── Optimize infrastructure
    └── Flash Attention, KV cache tuning
```
